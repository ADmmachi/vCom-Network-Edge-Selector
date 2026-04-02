import { appliances, handoffTypes, type Appliance, type CircuitEntry } from "../data/appliances";

function formatThroughput(mbps: number): string {
  return mbps >= 1000 ? `${mbps / 1000} Gbps` : `${mbps} Mbps`;
}

export interface SelectionCriteria {
  circuits: CircuitEntry[];
  features: string[];
  requiredPoePorts: number;
  requireHA: boolean;
}

export interface InterfaceMatch {
  circuitId: string;
  circuitTypeId: string;
  bandwidthMbps: number;
  handoffId: string;
  requiredInterfaceType: string;
  matchedApplianceInterface: string | null;
  isMatched: boolean;
}

export interface MatchDetails {
  interfaces?: { score: number; max: number; matches: InterfaceMatch[]; allMatched: boolean };
  throughput?: { score: number; max: number; totalRequired: number; applianceThroughput: number; meetsRequirement: boolean; oversizePenaltyPercent: number };
  features?: { score: number; max: number; matched: string[]; missing: string[] };
}

export interface ScoredAppliance {
  appliance: Appliance;
  totalScore: number;
  maxPossibleScore: number;
  percentageScore: number;
  meetsHardCriteria: boolean;
  meetsAllPreferred: boolean;
  failureReasons: string[];
  matchDetails: MatchDetails;
  cellularNote: string | null;
  cellularInterfaceMapping: { type: string; purpose: string } | null;
  wifiNote: string | null;
  poeNote: string | null;
  haNote: string | null;
  haInterfaceMapping: { type: string; purpose: string } | null;
}

export interface VendorRecommendation {
  vendor: string;
  recommended: ScoredAppliance | null;
  growthPick: ScoredAppliance | null;
  growthReason: string | null;
  upgrades: ScoredAppliance[];
  nonMatching: ScoredAppliance[];
}

export interface RecommendationResult {
  vendorRecommendations: VendorRecommendation[];
  totalEvaluated: number;
}

// Dynamic weight calculation — total always equals 100
// Each requested feature (including HA) takes 2 pts from Interfaces and 1 pt from Throughput = 3 pts per feature
// HA and Cellular carry more weight because they also affect the interface denominator
function calculateWeights(numFeatures: number): { interfaceMatch: number; throughput: number; featureCoverage: number } {
  const featurePoints = numFeatures * 3;
  const interfaceReduction = numFeatures * 2;
  const throughputReduction = numFeatures * 1;
  return {
    interfaceMatch: 60 - interfaceReduction,
    throughput: 40 - throughputReduction,
    featureCoverage: featurePoints,
  };
}

const OVERSIZE_THROUGHPUT_RATIO = 2.0;
const GROWTH_THROUGHPUT_MIN_RATIO = 1.5;
const GROWTH_THROUGHPUT_MAX_RATIO = 3.0;

function getInterfaceTypeForHandoff(handoffId: string): string {
  return handoffTypes.find(handoff => handoff.id === handoffId)?.interfaceType ?? "unknown";
}

function interfaceCanServeHandoff(applianceInterfaceType: string, requiredType: string): boolean {
  if (applianceInterfaceType === requiredType) return true;

  if (requiredType === "GE RJ45") {
    if (applianceInterfaceType.includes("mGig") || applianceInterfaceType.includes("RJ45")) return true;
  }

  // 2.5G mGig RJ45 can be served by mGig interfaces (direct match) or SFP+ and higher (via multi-rate transceiver)
  if (requiredType === "2.5G mGig RJ45") {
    if (applianceInterfaceType.includes("mGig")) return true;
    if (applianceInterfaceType === "10GE SFP+" || applianceInterfaceType === "25GE SFP28" || applianceInterfaceType === "40GE QSFP") return true;
  }

  // 10G RJ45 can be served by 10G+ copper/mGig or SFP+ and higher interfaces
  if (requiredType === "10G RJ45") {
    if (applianceInterfaceType === "10GE SFP+" || applianceInterfaceType === "25GE SFP28" || applianceInterfaceType === "40GE QSFP") return true;
    if (applianceInterfaceType.includes("mGig") && applianceInterfaceType.includes("10G")) return true;
  }

  if (requiredType === "GE SFP" && applianceInterfaceType === "10GE SFP+") return true;

  if (requiredType === "10GE SFP+") {
    if (applianceInterfaceType === "25GE SFP28" || applianceInterfaceType === "40GE QSFP") return true;
  }

  if (applianceInterfaceType.includes("/")) {
    const subTypes = applianceInterfaceType.split("/");
    for (const subType of subTypes) {
      const normalizedSubType = subType.includes("RJ45") ? "GE RJ45" : subType.includes("SFP") ? "GE SFP" : subType;
      if (normalizedSubType === requiredType) return true;
    }
  }

  return false;
}

function countAppliancePoePorts(appliance: Appliance): number {
  let totalPoePorts = 0;
  for (const applianceInterface of appliance.interfaces) {
    if (applianceInterface.poeCapable) {
      totalPoePorts += applianceInterface.quantity;
    }
  }
  return totalPoePorts;
}

function scoreAppliance(appliance: Appliance, criteria: SelectionCriteria): ScoredAppliance {
  // Count total features including HA for dynamic weight calculation
  const totalFeatureCount = criteria.features.length + (criteria.requireHA ? 1 : 0);
  const WEIGHTS = calculateWeights(totalFeatureCount);

  let totalScore = 0;
  let maxPossibleScore = 0;
  const matchDetails: MatchDetails = {};
  const failureReasons: string[] = [];

  // --- HARD: Interface matching ---
  let allInterfacesMatched = true;
  let fortiLinkUsedAsWan = 0;
  if (criteria.circuits.length > 0) {
    // Primary WAN pool: interfaces with "wan" in their purpose
    const wanInterfaces: { type: string; quantity: number }[] = [];
    // Secondary LAN pool: pure LAN or LAN/WAN interfaces that can serve as WAN if needed
    const lanInterfaces: { type: string; quantity: number }[] = [];
    // Last-resort pool: FortiLink interfaces (supported as WAN but not primary use case)
    const fortiLinkInterfaces: { type: string; quantity: number }[] = [];

    for (const applianceInterface of appliance.interfaces) {
      const purposeLower = applianceInterface.purpose.toLowerCase();
      if (purposeLower === "fortilink") {
        fortiLinkInterfaces.push({ type: applianceInterface.type, quantity: applianceInterface.quantity });
      } else if (purposeLower.includes("wan")) {
        wanInterfaces.push({ type: applianceInterface.type, quantity: applianceInterface.quantity });
      } else if (purposeLower.includes("lan")) {
        lanInterfaces.push({ type: applianceInterface.type, quantity: applianceInterface.quantity });
      }
    }

    const wanPool = wanInterfaces.map(iface => ({ ...iface, remaining: iface.quantity }));
    const lanPool = lanInterfaces.map(iface => ({ ...iface, remaining: iface.quantity }));
    const fortiLinkPool = fortiLinkInterfaces.map(iface => ({ ...iface, remaining: iface.quantity }));
    const matches: InterfaceMatch[] = [];

    for (const circuit of criteria.circuits) {
      const requiredType = getInterfaceTypeForHandoff(circuit.handoffId);
      let matched = false;
      let matchedInterfaceType: string | null = null;

      // Try WAN pool first (primary)
      for (const poolEntry of wanPool) {
        if (poolEntry.remaining > 0 && interfaceCanServeHandoff(poolEntry.type, requiredType)) {
          poolEntry.remaining--;
          matched = true;
          matchedInterfaceType = poolEntry.type;
          break;
        }
      }

      // Try LAN pool second (dual-purpose LAN/WAN ports)
      if (!matched) {
        for (const poolEntry of lanPool) {
          if (poolEntry.remaining > 0 && interfaceCanServeHandoff(poolEntry.type, requiredType)) {
            poolEntry.remaining--;
            matched = true;
            matchedInterfaceType = poolEntry.type;
            break;
          }
        }
      }

      // Try FortiLink pool last (last resort — supported but not primary use)
      if (!matched) {
        for (const poolEntry of fortiLinkPool) {
          if (poolEntry.remaining > 0 && interfaceCanServeHandoff(poolEntry.type, requiredType)) {
            poolEntry.remaining--;
            matched = true;
            matchedInterfaceType = `${poolEntry.type} (FortiLink)`;
            fortiLinkUsedAsWan++;
            break;
          }
        }
      }

      if (!matched) {
        allInterfacesMatched = false;
        const handoffName = handoffTypes.find(handoff => handoff.id === circuit.handoffId)?.name ?? circuit.handoffId;
        failureReasons.push(`No WAN port available for ${handoffName} hand-off`);
      }

      matches.push({
        circuitId: circuit.id,
        circuitTypeId: circuit.circuitTypeId,
        bandwidthMbps: circuit.bandwidthMbps,
        handoffId: circuit.handoffId,
        requiredInterfaceType: requiredType,
        matchedApplianceInterface: matchedInterfaceType,
        isMatched: matched,
      });
    }

    const matchedCount = matches.filter(match => match.isMatched).length;

    // HA interface integration: if HA requires a physical interface, count it as an additional required interface
    let haInterfaceMatched = false;
    let haRequiresPhysicalPort = false;
    if (criteria.requireHA) {
      const isMerakiHA = appliance.vendor === "Cisco Meraki";
      haRequiresPhysicalPort = !isMerakiHA; // Meraki uses cloud-managed warm spare — no physical port needed

      if (haRequiresPhysicalPort) {
        // Check dedicated HA ports first
        const haInterfaces = appliance.interfaces.filter(
          iface => iface.purpose.toLowerCase() === "ha"
        );
        const haPortCount = haInterfaces.reduce((total, iface) => total + iface.quantity, 0);

        if (haPortCount > 0) {
          haInterfaceMatched = true;
        } else {
          // Check remaining LAN, LAN/WAN, or FortiLink ports (after WAN allocation)
          const remainingLan = appliance.interfaces
            .filter(iface => {
              const p = iface.purpose.toLowerCase();
              return p.includes("lan") && !p.includes("wan");
            })
            .reduce((t, i) => t + i.quantity, 0);

          const dualPorts = appliance.interfaces
            .filter(iface => {
              const p = iface.purpose.toLowerCase();
              return p.includes("lan") && p.includes("wan");
            })
            .reduce((t, i) => t + i.quantity, 0);
          const usedWanPorts = matches.filter(m => m.isMatched).length;
          const availableDual = Math.max(0, dualPorts - usedWanPorts);

          const flPorts = appliance.interfaces
            .filter(iface => iface.purpose.toLowerCase() === "fortilink")
            .reduce((t, i) => t + i.quantity, 0);
          const availableFL = Math.max(0, flPorts - fortiLinkUsedAsWan);

          if (remainingLan >= 1 || availableDual >= 1 || availableFL >= 1) {
            haInterfaceMatched = true;
          }
        }
      }
    }

    // Cellular interface integration: when cellular is requested, count as an additional required interface
    let cellularInterfaceMatched = false;
    let cellularRequiresInterface = false;
    const cellularRequestedForScoring = criteria.features.includes("lte_failover");
    if (cellularRequestedForScoring) {
      cellularRequiresInterface = true;
      if (appliance.cellularBuiltIn) {
        // Device has built-in cellular modem — direct match
        cellularInterfaceMatched = true;
      } else {
        // No built-in cellular — check if an available WAN RJ45 port exists for external gateway
        // Look for remaining WAN pool RJ45 ports after circuit allocation
        const remainingWanRJ45 = wanPool.filter(p => p.remaining > 0 && (p.type === "GE RJ45" || p.type.includes("mGig") || p.type.includes("RJ45"))).reduce((t, p) => t + p.remaining, 0);
        const remainingLanRJ45 = lanPool.filter(p => p.remaining > 0 && (p.type === "GE RJ45" || p.type.includes("mGig") || p.type.includes("RJ45"))).reduce((t, p) => t + p.remaining, 0);
        if (remainingWanRJ45 > 0 || remainingLanRJ45 > 0) {
          cellularInterfaceMatched = true;
        }
      }
    }

    // Calculate interface score with HA and cellular counted as additional required interfaces
    const totalRequiredInterfaces = criteria.circuits.length + (haRequiresPhysicalPort ? 1 : 0) + (cellularRequiresInterface ? 1 : 0);
    const totalMatchedInterfaces = matchedCount + (haRequiresPhysicalPort && haInterfaceMatched ? 1 : 0) + (cellularRequiresInterface && cellularInterfaceMatched ? 1 : 0);
    let interfaceScore = (totalMatchedInterfaces / totalRequiredInterfaces) * WEIGHTS.interfaceMatch;

    // Small penalty when FortiLink ports are used as WAN (2% per FortiLink port used)
    if (fortiLinkUsedAsWan > 0) {
      const fortiLinkPenalty = 1.0 - (fortiLinkUsedAsWan * 0.02);
      interfaceScore *= Math.max(fortiLinkPenalty, 0.9); // Floor at 90% of interface score
    }

    allInterfacesMatched = allInterfacesMatched && (!haRequiresPhysicalPort || haInterfaceMatched) && (!cellularRequiresInterface || cellularInterfaceMatched);

    totalScore += interfaceScore;
    maxPossibleScore += WEIGHTS.interfaceMatch;

    matchDetails.interfaces = {
      score: interfaceScore,
      max: WEIGHTS.interfaceMatch,
      matches,
      allMatched: allInterfacesMatched,
    };
  } else if (criteria.requireHA && appliance.vendor !== "Cisco Meraki") {
    // No circuits defined, but HA requires a physical interface — score HA port availability alone
    const haInterfaces = appliance.interfaces.filter(iface => iface.purpose.toLowerCase() === "ha");
    const haPortCount = haInterfaces.reduce((total, iface) => total + iface.quantity, 0);
    let haOnlyMatched = false;

    if (haPortCount > 0) {
      haOnlyMatched = true;
    } else {
      const lanPorts = appliance.interfaces
        .filter(iface => { const p = iface.purpose.toLowerCase(); return p.includes("lan"); })
        .reduce((t, i) => t + i.quantity, 0);
      const flPorts = appliance.interfaces
        .filter(iface => iface.purpose.toLowerCase() === "fortilink")
        .reduce((t, i) => t + i.quantity, 0);
      if (lanPorts >= 1 || flPorts >= 1) haOnlyMatched = true;
    }

    const interfaceScore = haOnlyMatched ? WEIGHTS.interfaceMatch : 0;
    allInterfacesMatched = haOnlyMatched;
    totalScore += interfaceScore;
    maxPossibleScore += WEIGHTS.interfaceMatch;
    matchDetails.interfaces = {
      score: interfaceScore,
      max: WEIGHTS.interfaceMatch,
      matches: [],
      allMatched: haOnlyMatched,
    };
  }

  // --- HARD: Throughput adequacy ---
  const totalRequiredBandwidth = criteria.circuits.reduce(
    (total, circuit) => total + circuit.bandwidthMbps, 0
  );
  let throughputMet = true;

  if (totalRequiredBandwidth > 0) {
    let throughputScore = 0;
    let oversizePenaltyPercent = 0;
    if (appliance.ngfwThroughputMbps >= totalRequiredBandwidth) {
      throughputScore = WEIGHTS.throughput;
      const overProvisionRatio = appliance.ngfwThroughputMbps / totalRequiredBandwidth;

      // Graduated oversize penalty — starts beyond Growth Pick max range (3×)
      // Applies to ALL vendors equally
      if (overProvisionRatio > GROWTH_THROUGHPUT_MAX_RATIO) {
        let penalty: number;
        if (overProvisionRatio <= 5) {
          // 3–5×: linear taper from 100% → 70%
          const t = (overProvisionRatio - GROWTH_THROUGHPUT_MAX_RATIO) / (5 - GROWTH_THROUGHPUT_MAX_RATIO);
          penalty = 1.0 - (0.3 * t);
        } else if (overProvisionRatio <= 10) {
          // 5–10×: linear taper from 70% → 40%
          const t = (overProvisionRatio - 5) / 5;
          penalty = 0.7 - (0.3 * t);
        } else if (overProvisionRatio <= 25) {
          // 10–25×: linear taper from 40% → 20%
          const t = (overProvisionRatio - 10) / 15;
          penalty = 0.4 - (0.2 * t);
        } else if (overProvisionRatio <= 50) {
          // 25–50×: linear taper from 20% → 10%
          const t = (overProvisionRatio - 25) / 25;
          penalty = 0.2 - (0.1 * t);
        } else {
          // >50×: floor at 10%
          penalty = 0.1;
        }
        throughputScore *= penalty;
        oversizePenaltyPercent = Math.round((1 - penalty) * 100);
      }
    } else {
      throughputMet = false;
      const ratio = appliance.ngfwThroughputMbps / totalRequiredBandwidth;
      throughputScore = WEIGHTS.throughput * Math.max(ratio - 0.2, 0);
      failureReasons.push(`NGFW Throughput ${appliance.ngfwThroughputMbps} Mbps is below required ${totalRequiredBandwidth} Mbps`);
    }
    totalScore += throughputScore;
    maxPossibleScore += WEIGHTS.throughput;
    matchDetails.throughput = {
      score: throughputScore,
      max: WEIGHTS.throughput,
      totalRequired: totalRequiredBandwidth,
      applianceThroughput: appliance.ngfwThroughputMbps,
      meetsRequirement: throughputMet,
      oversizePenaltyPercent,
    };
  }

  // --- HA peering (note & interface mapping — scoring is integrated into interface matching above) ---
  let haNote: string | null = null;
  let haInterfaceMapping: { type: string; purpose: string } | null = null;

  if (criteria.requireHA) {
    const isMeraki = appliance.vendor === "Cisco Meraki";
    const isVeloCloud = appliance.vendor === "VeloCloud";

    if (isMeraki) {
      // Meraki uses cloud-managed warm spare — no physical port needed
      haNote = "Order 2 units · Cloud-managed warm spare";
      haInterfaceMapping = { type: "Cloud-Managed", purpose: "HA (Warm Spare)" };
    } else {
      // Fortinet, VeloCloud, and others need a physical interface for HA
      const haInterfaces = appliance.interfaces.filter(
        iface => iface.purpose.toLowerCase() === "ha"
      );
      const haPortCount = haInterfaces.reduce((total, iface) => total + iface.quantity, 0);

      if (haPortCount > 0) {
        haNote = "Order 2 units";
        haInterfaceMapping = { type: haInterfaces[0].type, purpose: "HA" };
      } else {
        // Find which port type is available for HA peering
        const pureLanInterfaces = appliance.interfaces
          .filter(iface => { const p = iface.purpose.toLowerCase(); return p.includes("lan") && !p.includes("wan"); });
        const dualPurposeInterfaces = appliance.interfaces
          .filter(iface => { const p = iface.purpose.toLowerCase(); return p.includes("lan") && p.includes("wan"); });
        const fortiLinkInterfaces = appliance.interfaces
          .filter(iface => iface.purpose.toLowerCase() === "fortilink");

        const usedWanPorts = matchDetails.interfaces?.matches.filter((m: InterfaceMatch) => m.isMatched).length ?? 0;
        const availableDual = Math.max(0, dualPurposeInterfaces.reduce((t, i) => t + i.quantity, 0) - usedWanPorts);
        const availableFL = Math.max(0, fortiLinkInterfaces.reduce((t, i) => t + i.quantity, 0) - fortiLinkUsedAsWan);
        const pureLanPorts = pureLanInterfaces.reduce((t, i) => t + i.quantity, 0);

        if (isVeloCloud && (availableDual >= 1 || pureLanPorts >= 1)) {
          const haIface = dualPurposeInterfaces[0] || pureLanInterfaces[0];
          haNote = "Order 2 units";
          haInterfaceMapping = haIface ? { type: haIface.type, purpose: "HA Heartbeat" } : null;
        } else if (pureLanPorts >= 1) {
          haNote = "Order 2 units";
          haInterfaceMapping = { type: pureLanInterfaces[0].type, purpose: "HA Peering" };
        } else if (availableDual >= 1) {
          haNote = "Order 2 units";
          haInterfaceMapping = { type: dualPurposeInterfaces[0].type, purpose: "HA Peering" };
        } else if (availableFL >= 1) {
          haNote = "Order 2 units";
          haInterfaceMapping = { type: fortiLinkInterfaces[0].type, purpose: "HA Peering" };
        } else {
          haNote = "Order 2 units · No available HA port";
          failureReasons.push("No available interface for HA peering");
        }
      }
    }
  }

  // --- PREFERRED: PoE ---
  const poeRequested = criteria.features.includes("poe") && criteria.requiredPoePorts > 0;
  let poeNote: string | null = null;
  let poeMet = true;

  if (poeRequested) {
    const availablePoePorts = countAppliancePoePorts(appliance);
    if (availablePoePorts === 0) {
      poeMet = false;
      poeNote = "No PoE — pair with external PoE switch";
    } else if (availablePoePorts < criteria.requiredPoePorts) {
      poeMet = false;
      poeNote = `Has ${availablePoePorts} PoE port${availablePoePorts !== 1 ? "s" : ""}, need ${criteria.requiredPoePorts} — pair with PoE switch for remaining ${criteria.requiredPoePorts - availablePoePorts}`;
    }
  }

  // --- PREFERRED: Wi-Fi ---
  const wifiRequested = criteria.features.includes("wifi6");
  let wifiNote: string | null = null;
  let wifiMet = true;

  if (wifiRequested && !appliance.features.includes("wifi6")) {
    wifiMet = false;
    wifiNote = "No built-in Wi-Fi — pair with a separate AP";
  }

  // --- PREFERRED: Cellular ---
  const cellularRequestedPref = criteria.features.includes("lte_failover");
  let cellularNote: string | null = null;
  let cellularInterfaceMapping: { type: string; purpose: string } | null = null;
  let cellularMet = true;

  if (cellularRequestedPref) {
    if (appliance.cellularBuiltIn) {
      // Device has built-in cellular modem — direct match
      cellularInterfaceMapping = { type: "Built-in 5G/LTE", purpose: "Cellular" };
    } else {
      cellularMet = false;
      cellularNote = "No built-in cellular — pair with external cellular gateway";
      // Map external gateway to an available WAN RJ45 port
      const availableWanRJ45 = appliance.interfaces.find(iface => {
        const p = iface.purpose.toLowerCase();
        return p.includes("wan") && (iface.type === "GE RJ45" || iface.type.includes("mGig") || iface.type.includes("RJ45"));
      });
      if (availableWanRJ45) {
        cellularInterfaceMapping = { type: availableWanRJ45.type, purpose: "Cellular" };
      } else {
        cellularInterfaceMapping = null;
      }
    }
  }

  // --- Feature scoring (includes HA as a feature) ---
  // HA is tracked as a feature for scoring purposes (separate from its interface impact)
  const haMet = criteria.requireHA ? (haNote !== null && !haNote.includes("No available HA port")) : true;

  if (totalFeatureCount > 0) {
    // Build combined feature list including HA
    const allRequestedFeatures: string[] = [...criteria.features];
    if (criteria.requireHA) allRequestedFeatures.push("ha");

    const matchedFeatures = allRequestedFeatures.filter(featureId => {
      if (featureId === "poe") return poeMet;
      if (featureId === "wifi6") return wifiMet;
      if (featureId === "lte_failover") return cellularMet;
      if (featureId === "ha") return haMet;
      return appliance.features.includes(featureId);
    });
    const featureRatio = matchedFeatures.length / allRequestedFeatures.length;
    const featureScore = WEIGHTS.featureCoverage * featureRatio;
    totalScore += featureScore;
    maxPossibleScore += WEIGHTS.featureCoverage;
    matchDetails.features = {
      score: featureScore,
      max: WEIGHTS.featureCoverage,
      matched: matchedFeatures,
      missing: allRequestedFeatures.filter(featureId => !matchedFeatures.includes(featureId)),
    };
  }

  const meetsHardCriteria = allInterfacesMatched && throughputMet;
  const meetsAllPreferred = poeMet && wifiMet && cellularMet && haMet;

  // --- End of Sale penalty (10% reduction) ---
  if (appliance.endOfSale) {
    totalScore = totalScore * 0.9;
  }

  const percentageScore = maxPossibleScore > 0
    ? Math.round((totalScore / maxPossibleScore) * 100)
    : 0;

  return {
    appliance,
    totalScore: Math.round(totalScore),
    maxPossibleScore,
    percentageScore,
    meetsHardCriteria,
    meetsAllPreferred,
    failureReasons,
    matchDetails,
    cellularNote,
    cellularInterfaceMapping,
    wifiNote,
    poeNote,
    haNote,
    haInterfaceMapping,
  };
}

export function getRecommendations(criteria: SelectionCriteria): RecommendationResult {
  const allScored = appliances.map(appliance => scoreAppliance(appliance, criteria));

  const vendorMap = new Map<string, ScoredAppliance[]>();
  for (const scored of allScored) {
    const vendor = scored.appliance.vendor;
    if (!vendorMap.has(vendor)) vendorMap.set(vendor, []);
    vendorMap.get(vendor)!.push(scored);
  }

  const vendorRecommendations: VendorRecommendation[] = [];

  // WiFi-variant filter: when WiFi is NOT requested, exclude WiFi variants from recommendations
  // Exception: VeloCloud Edge 710-W is always treated as a base model
  const wifiRequested = criteria.features.includes("wifi6");
  const isWifiVariant = (appliance: Appliance): boolean => {
    // VeloCloud Edge 710-W is exempt — always treated as base
    if (appliance.model === "Edge 710-W") return false;
    // Fortinet FortiWiFi models
    if (appliance.model.includes("FortiWiFi")) return true;
    // Meraki W/CW suffix models
    if (/W$|CW$/i.test(appliance.model)) return true;
    return false;
  };

  // PoE-variant filter: when PoE is NOT requested, exclude PoE-specific variants
  const poeRequested = criteria.features.includes("poe") && criteria.requiredPoePorts > 0;
  const isPoeVariant = (appliance: Appliance): boolean => {
    // FortiGate 50G-SFP-PoE is the only PoE-specific variant
    if (appliance.model === "FortiGate 50G-SFP-PoE") return true;
    return false;
  };

  // Cellular-variant filter: when cellular is NOT requested, exclude cellular-specific variants
  const cellularRequested = criteria.features.includes("lte_failover");
  const isCellularVariant = (appliance: Appliance): boolean => {
    // FortiGate 50G-5G — cellular variant of 50G
    if (appliance.model === "FortiGate 50G-5G") return true;
    // MX67C — cellular variant of MX67
    if (appliance.model === "MX67C") return true;
    // MX68CW — already suppressed as WiFi variant, but mark cellular too
    if (appliance.model === "MX68CW") return true;
    // Edge 710-5G — cellular variant of 710-W
    if (appliance.model === "Edge 710-5G") return true;
    return false;
  };

  for (const [vendor, vendorAppliances] of vendorMap) {
    // Split into hard matches and non-matching, then filter WiFi variants if not requested
    let hardMatches = vendorAppliances
      .filter(scored => scored.meetsHardCriteria)
      .sort((resultA, resultB) => resultB.totalScore - resultA.totalScore);

    let nonMatching = vendorAppliances
      .filter(scored => !scored.meetsHardCriteria)
      .sort((resultA, resultB) => resultB.percentageScore - resultA.percentageScore);

    // When WiFi is NOT requested, move WiFi variants from hardMatches to nonMatching
    if (!wifiRequested) {
      const wifiVariantsFromHard = hardMatches.filter(s => isWifiVariant(s.appliance));
      hardMatches = hardMatches.filter(s => !isWifiVariant(s.appliance));
      nonMatching = [...nonMatching, ...wifiVariantsFromHard]
        .sort((resultA, resultB) => resultB.percentageScore - resultA.percentageScore);
    }

    // When PoE is NOT requested, move PoE-specific variants from hardMatches to nonMatching
    if (!poeRequested) {
      const poeVariantsFromHard = hardMatches.filter(s => isPoeVariant(s.appliance));
      hardMatches = hardMatches.filter(s => !isPoeVariant(s.appliance));
      nonMatching = [...nonMatching, ...poeVariantsFromHard]
        .sort((resultA, resultB) => resultB.percentageScore - resultA.percentageScore);
    }

    // When cellular is NOT requested, move cellular-specific variants from hardMatches to nonMatching
    if (!cellularRequested) {
      const cellularVariantsFromHard = hardMatches.filter(s => isCellularVariant(s.appliance));
      hardMatches = hardMatches.filter(s => !isCellularVariant(s.appliance));
      nonMatching = [...nonMatching, ...cellularVariantsFromHard]
        .sort((resultA, resultB) => resultB.percentageScore - resultA.percentageScore);
    }

    if (hardMatches.length === 0) {
      vendorRecommendations.push({
        vendor,
        recommended: null,
        growthPick: null,
        growthReason: null,
        upgrades: [],
        nonMatching,
      });
      continue;
    }

    // --- Fortinet tie-breaker: prefer lowest model number ---
    const fortinetTieBreaker = (candidates: ScoredAppliance[]): ScoredAppliance => {
      if (candidates.length === 1) return candidates[0];

      return candidates.sort((a, b) => {
        const numA = parseInt(a.appliance.model.match(/\d+/)?.[0] || "9999", 10);
        const numB = parseInt(b.appliance.model.match(/\d+/)?.[0] || "9999", 10);
        return numA - numB;
      })[0];
    };

    // --- Cisco Meraki tie-breaker: prefer base model, use hierarchy rank ---
    const merakiTieBreaker = (candidates: ScoredAppliance[]): ScoredAppliance => {
      if (candidates.length === 1) return candidates[0];

      // Define the Meraki model hierarchy (lower rank = preferred)
      const hierarchyOrder: Record<string, number> = {
        "MX67": 10, "MX67W": 11, "MX67C": 12,
        "MX68": 20, "MX68W": 21, "MX68CW": 22,
        "MX75": 30,
        "MX85": 40,
        "C8111-G2-MX": 50, "C8121-G2-MX": 51,
        "MX95": 60,
        "MX105": 70,
        "MX250": 80,
        "MX450": 90,
        "C8455-G2-MX": 100,
      };

      const getRank = (model: string): number => hierarchyOrder[model] ?? 999;
      const isBaseModel = (model: string): boolean => {
        // Base models: no W, C, or CW suffix (e.g., MX67, MX68, MX75, MX85, MX95, etc.)
        return !(/W|C/i.test(model.replace(/^(MX|C)\d+/i, "")));
      };

      return candidates.sort((a, b) => {
        const aBase = isBaseModel(a.appliance.model);
        const bBase = isBaseModel(b.appliance.model);
        // Prefer base models unless requirements call for non-base
        if (aBase !== bBase) return aBase ? -1 : 1;
        // Then use hierarchy rank (lower = preferred)
        return getRank(a.appliance.model) - getRank(b.appliance.model);
      })[0];
    };

    // Best-fit: highest scoring model meeting hard requirements (with vendor-specific tie-breakers)
    const topScore = hardMatches[0].totalScore;
    const tiedForTop = hardMatches.filter(s => s.totalScore === topScore);
    let bestFit: ScoredAppliance;
    if (tiedForTop.length === 1) {
      bestFit = tiedForTop[0];
    } else if (vendor === "Fortinet") {
      bestFit = fortinetTieBreaker(tiedForTop);
    } else if (vendor === "Cisco Meraki") {
      bestFit = merakiTieBreaker(tiedForTop);
    } else if (vendor === "VeloCloud") {
      // VeloCloud tie-breaker: prefer lowest model number (Edge 710 < Edge 720 < Edge 740 etc.)
      bestFit = tiedForTop.sort((a, b) => {
        const numA = parseInt(a.appliance.model.match(/\d+/)?.[0] || "9999", 10);
        const numB = parseInt(b.appliance.model.match(/\d+/)?.[0] || "9999", 10);
        return numA - numB;
      })[0];
    } else {
      bestFit = tiedForTop[0];
    }

    // Full-match: highest scoring model meeting hard + all preferred
    const fullMatches = hardMatches.filter(scored => scored.meetsAllPreferred);
    const fullMatch = fullMatches.length > 0 ? fullMatches[0] : null;

    let recommended: ScoredAppliance;

    // Cellular-aware oversize threshold: when cellular is requested, allow up to 3× oversize
    // to prefer models with built-in cellular modem over smaller models needing external gateway
    const effectiveOversizeRatio = cellularRequested ? GROWTH_THROUGHPUT_MAX_RATIO : OVERSIZE_THROUGHPUT_RATIO;

    if (bestFit.meetsAllPreferred) {
      // Best-fit already meets all preferred — easy case
      recommended = bestFit;
    } else if (fullMatch) {
      // There's a model that meets everything — is it too big?
      const throughputRatio = fullMatch.appliance.ngfwThroughputMbps / bestFit.appliance.ngfwThroughputMbps;

      if (throughputRatio <= effectiveOversizeRatio) {
        // Acceptable step-up — recommend the full match
        recommended = fullMatch;
      } else {
        // Too big — recommend the best-fit with notes
        recommended = bestFit;
      }
    } else {
      // No model meets all preferred at any size — recommend best-fit
      recommended = bestFit;
    }

    // Upgrades: everything in hardMatches above the recommended
    // Sort by throughput ascending for growth pick selection
    const upgrades = hardMatches.filter(scored =>
      scored.appliance.id !== recommended.appliance.id &&
      scored.appliance.ngfwThroughputMbps >= recommended.appliance.ngfwThroughputMbps
    ).sort((a, b) => a.appliance.ngfwThroughputMbps - b.appliance.ngfwThroughputMbps);

    // Growth pick: from upgrades, find a model with moderate room to grow
    // Target: 1.5–3× the required bandwidth, and must be above the recommended model
    const requiredBandwidth = criteria.circuits.reduce(
      (total, circuit) => total + circuit.bandwidthMbps, 0
    );
    const growthMinThroughput = requiredBandwidth * GROWTH_THROUGHPUT_MIN_RATIO;
    const growthMaxThroughput = requiredBandwidth * GROWTH_THROUGHPUT_MAX_RATIO;

    let growthPick: ScoredAppliance | null = null;
    let growthReason: string | null = null;
    if (upgrades.length > 0 && requiredBandwidth > 0) {
      // Find the lowest upgrade within the growth sweet spot
      const growthCandidates = upgrades.filter(scored =>
        scored.appliance.ngfwThroughputMbps >= growthMinThroughput &&
        scored.appliance.ngfwThroughputMbps <= growthMaxThroughput &&
        scored.appliance.ngfwThroughputMbps > recommended.appliance.ngfwThroughputMbps
      );

      if (growthCandidates.length > 0) {
        // Pick the lowest one in the growth range
        growthPick = growthCandidates.sort(
          (resultA, resultB) => resultA.appliance.ngfwThroughputMbps - resultB.appliance.ngfwThroughputMbps
        )[0];
        const ratio = growthPick.appliance.ngfwThroughputMbps / requiredBandwidth;
        const availablePercent = Math.round(((growthPick.appliance.ngfwThroughputMbps - requiredBandwidth) / growthPick.appliance.ngfwThroughputMbps) * 100);
        const tierLabel = ratio >= 2.5 ? "Extensive growth headroom" : ratio >= 2.0 ? "Strong growth headroom" : "Moderate growth headroom";
        growthReason = `${tierLabel}\n${availablePercent}% available for growth`;
      } else {
        // No model in the sweet spot — pick the next step up from recommended if it exists
        const nextStepUp = upgrades.find(scored =>
          scored.appliance.ngfwThroughputMbps > recommended.appliance.ngfwThroughputMbps
        );
        if (nextStepUp) {
          growthPick = nextStepUp;
          const surplus = nextStepUp.appliance.ngfwThroughputMbps - recommended.appliance.ngfwThroughputMbps;
          growthReason = `Next model up from ${recommended.appliance.model}\n${formatThroughput(surplus)} additional capacity`;
        }
      }
    }

    vendorRecommendations.push({
      vendor,
      recommended,
      growthPick,
      growthReason,
      upgrades,
      nonMatching,
    });
  }

  const vendorOrder = ["Fortinet", "Cisco Meraki", "VeloCloud"];
  vendorRecommendations.sort((vendorA, vendorB) => {
    const indexA = vendorOrder.indexOf(vendorA.vendor);
    const indexB = vendorOrder.indexOf(vendorB.vendor);
    return (indexA === -1 ? vendorOrder.length : indexA) - (indexB === -1 ? vendorOrder.length : indexB);
  });

  return {
    vendorRecommendations,
    totalEvaluated: appliances.length,
  };
}
