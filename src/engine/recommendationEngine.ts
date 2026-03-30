import { appliances, handoffTypes, type Appliance, type CircuitEntry } from "../data/appliances";

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
  throughput?: { score: number; max: number; totalRequired: number; applianceThroughput: number; meetsRequirement: boolean };
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
  wifiNote: string | null;
  poeNote: string | null;
  haNote: string | null;
}

export interface VendorRecommendation {
  vendor: string;
  recommended: ScoredAppliance | null;
  growthPick: ScoredAppliance | null;
  upgrades: ScoredAppliance[];
  nonMatching: ScoredAppliance[];
  oversizedAlternative: ScoredAppliance | null;
}

export interface RecommendationResult {
  vendorRecommendations: VendorRecommendation[];
  totalEvaluated: number;
}

const WEIGHTS = {
  interfaceMatch: 50,
  throughput: 30,
  featureCoverage: 20,
};

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
  let totalScore = 0;
  let maxPossibleScore = 0;
  const matchDetails: MatchDetails = {};
  const failureReasons: string[] = [];

  // --- HARD: Interface matching ---
  let allInterfacesMatched = true;
  if (criteria.circuits.length > 0) {
    const availableInterfaces: { type: string; quantity: number }[] = [];
    for (const applianceInterface of appliance.interfaces) {
      const purposeLower = applianceInterface.purpose.toLowerCase();
      if (purposeLower.includes("wan")) {
        availableInterfaces.push({ type: applianceInterface.type, quantity: applianceInterface.quantity });
      }
    }

    const interfacePool = availableInterfaces.map(iface => ({ ...iface, remaining: iface.quantity }));
    const matches: InterfaceMatch[] = [];

    for (const circuit of criteria.circuits) {
      const requiredType = getInterfaceTypeForHandoff(circuit.handoffId);
      let matched = false;
      let matchedInterfaceType: string | null = null;

      for (const poolEntry of interfacePool) {
        if (poolEntry.remaining > 0 && interfaceCanServeHandoff(poolEntry.type, requiredType)) {
          poolEntry.remaining--;
          matched = true;
          matchedInterfaceType = poolEntry.type;
          break;
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
    const interfaceScore = (matchedCount / criteria.circuits.length) * WEIGHTS.interfaceMatch;
    totalScore += interfaceScore;
    maxPossibleScore += WEIGHTS.interfaceMatch;

    matchDetails.interfaces = {
      score: interfaceScore,
      max: WEIGHTS.interfaceMatch,
      matches,
      allMatched: allInterfacesMatched,
    };
  }

  // --- HARD: Throughput adequacy ---
  const totalRequiredBandwidth = criteria.circuits.reduce(
    (total, circuit) => total + circuit.bandwidthMbps, 0
  );
  let throughputMet = true;

  if (totalRequiredBandwidth > 0) {
    let throughputScore = 0;
    if (appliance.throughputMbps >= totalRequiredBandwidth) {
      throughputScore = WEIGHTS.throughput;
      const overProvisionRatio = appliance.throughputMbps / totalRequiredBandwidth;
      if (overProvisionRatio > 5) {
        throughputScore *= 0.8;
      }
    } else {
      throughputMet = false;
      const ratio = appliance.throughputMbps / totalRequiredBandwidth;
      throughputScore = WEIGHTS.throughput * Math.max(ratio - 0.2, 0);
      failureReasons.push(`Throughput ${appliance.throughputMbps} Mbps is below required ${totalRequiredBandwidth} Mbps`);
    }
    totalScore += throughputScore;
    maxPossibleScore += WEIGHTS.throughput;
    matchDetails.throughput = {
      score: throughputScore,
      max: WEIGHTS.throughput,
      totalRequired: totalRequiredBandwidth,
      applianceThroughput: appliance.throughputMbps,
      meetsRequirement: throughputMet,
    };
  }

  // --- HARD: HA peering ---
  let haNote: string | null = null;
  let haMet = true;

  if (criteria.requireHA) {
    const haInterfaces = appliance.interfaces.filter(
      iface => iface.purpose.toLowerCase() === "ha"
    );
    const haPortCount = haInterfaces.reduce((total, iface) => total + iface.quantity, 0);

    if (haPortCount > 0) {
      haNote = `HA Pair — Order Qty: 2. This model has ${haPortCount} dedicated HA port${haPortCount !== 1 ? "s" : ""} for peering.`;
    } else {
      const totalLanPorts = appliance.interfaces
        .filter(iface => {
          const purposeLower = iface.purpose.toLowerCase();
          return purposeLower.includes("lan") && !purposeLower.includes("wan");
        })
        .reduce((total, iface) => total + iface.quantity, 0);

      const isMeraki = appliance.vendor === "Cisco Meraki";

      if (isMeraki) {
        haNote = "HA Pair — Order Qty: 2. Meraki uses warm spare HA via cloud dashboard — no dedicated peering link required between units.";
      } else if (totalLanPorts >= 1) {
        haNote = `HA Pair — Order Qty: 2. No dedicated HA port — 1 LAN port will be used for HA peering (${totalLanPorts} LAN ports available, ${totalLanPorts - 1} remaining after HA).`;
      } else {
        haMet = false;
        haNote = "HA Pair — Order Qty: 2. No dedicated HA port and no available LAN port for HA peering.";
        failureReasons.push("No available interface for HA peering");
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
      poeNote = `This model does not have PoE ports. Pair with an external PoE switch to power your ${criteria.requiredPoePorts} device${criteria.requiredPoePorts !== 1 ? "s" : ""}.`;
    } else if (availablePoePorts < criteria.requiredPoePorts) {
      poeMet = false;
      poeNote = `This model has ${availablePoePorts} PoE port${availablePoePorts !== 1 ? "s" : ""}, but you need ${criteria.requiredPoePorts}. Pair with a supplemental PoE switch for the remaining ${criteria.requiredPoePorts - availablePoePorts} device${(criteria.requiredPoePorts - availablePoePorts) !== 1 ? "s" : ""}.`;
    }
  }

  // --- PREFERRED: Wi-Fi ---
  const wifiRequested = criteria.features.includes("wifi6");
  let wifiNote: string | null = null;
  let wifiMet = true;

  if (wifiRequested && !appliance.features.includes("wifi6")) {
    wifiMet = false;
    wifiNote = "This model does not have a built-in wireless AP. Deploy a separate access point for Wi-Fi coverage.";
  }

  // --- PREFERRED: Cellular ---
  const cellularRequested = criteria.features.includes("lte_failover");
  let cellularNote: string | null = null;
  let cellularMet = true;

  if (cellularRequested && !appliance.cellularBuiltIn) {
    cellularMet = false;
    cellularNote = "This model does not have a built-in cellular modem. Pair with an external cellular gateway (e.g. Meraki MG, Cradlepoint) connected to a WAN RJ45 port.";
  }

  // --- Feature scoring (for percentage display) ---
  if (criteria.features.length > 0) {
    const matchedFeatures = criteria.features.filter(featureId => {
      if (featureId === "poe") return poeMet;
      if (featureId === "wifi6") return wifiMet;
      if (featureId === "lte_failover") return cellularMet;
      return appliance.features.includes(featureId);
    });
    const featureRatio = matchedFeatures.length / criteria.features.length;
    const featureScore = WEIGHTS.featureCoverage * featureRatio;
    totalScore += featureScore;
    maxPossibleScore += WEIGHTS.featureCoverage;
    matchDetails.features = {
      score: featureScore,
      max: WEIGHTS.featureCoverage,
      matched: matchedFeatures,
      missing: criteria.features.filter(featureId => !matchedFeatures.includes(featureId)),
    };
  }

  const meetsHardCriteria = allInterfacesMatched && throughputMet && haMet;
  const meetsAllPreferred = poeMet && wifiMet && cellularMet;

  const percentageScore = maxPossibleScore > 0
    ? Math.round((totalScore / maxPossibleScore) * 100)
    : 0;

  return {
    appliance,
    totalScore: Math.round(totalScore * 10) / 10,
    maxPossibleScore,
    percentageScore,
    meetsHardCriteria,
    meetsAllPreferred,
    failureReasons,
    matchDetails,
    cellularNote,
    wifiNote,
    poeNote,
    haNote,
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

  for (const [vendor, vendorAppliances] of vendorMap) {
    const hardMatches = vendorAppliances
      .filter(scored => scored.meetsHardCriteria)
      .sort((resultA, resultB) => resultA.appliance.throughputMbps - resultB.appliance.throughputMbps);

    const nonMatching = vendorAppliances
      .filter(scored => !scored.meetsHardCriteria)
      .sort((resultA, resultB) => resultB.percentageScore - resultA.percentageScore);

    if (hardMatches.length === 0) {
      vendorRecommendations.push({
        vendor,
        recommended: null,
        growthPick: null,
        upgrades: [],
        nonMatching,
        oversizedAlternative: null,
      });
      continue;
    }

    // Best-fit: lowest model meeting hard requirements
    const bestFit = hardMatches[0];

    // Full-match: lowest model meeting hard + all preferred
    const fullMatches = hardMatches.filter(scored => scored.meetsAllPreferred);
    const fullMatch = fullMatches.length > 0 ? fullMatches[0] : null;

    let recommended: ScoredAppliance;
    let oversizedAlternative: ScoredAppliance | null = null;

    if (bestFit.meetsAllPreferred) {
      // Best-fit already meets all preferred — easy case
      recommended = bestFit;
    } else if (fullMatch) {
      // There's a model that meets everything — is it too big?
      const throughputRatio = fullMatch.appliance.throughputMbps / bestFit.appliance.throughputMbps;

      if (throughputRatio <= OVERSIZE_THROUGHPUT_RATIO) {
        // Acceptable step-up — recommend the full match
        recommended = fullMatch;
      } else {
        // Too big — recommend the best-fit with notes, reference the full match
        recommended = bestFit;
        oversizedAlternative = fullMatch;

        // Enhance notes on the recommended model to reference the oversized alternative
        if (recommended.poeNote) {
          recommended = {
            ...recommended,
            poeNote: `${recommended.poeNote} The nearest model with built-in PoE is the ${fullMatch.appliance.model}, but it may be oversized for this site.`,
          };
        }
        if (recommended.wifiNote) {
          recommended = {
            ...recommended,
            wifiNote: `${recommended.wifiNote} The nearest model with built-in Wi-Fi is the ${fullMatch.appliance.model}, but it may be oversized for this site.`,
          };
        }
        if (recommended.cellularNote) {
          recommended = {
            ...recommended,
            cellularNote: `${recommended.cellularNote} The nearest model with built-in cellular is the ${fullMatch.appliance.model}, but it may be oversized for this site.`,
          };
        }
      }
    } else {
      // No model meets all preferred at any size — recommend best-fit
      recommended = bestFit;
    }

    // Upgrades: everything in hardMatches above the recommended, excluding oversizedAlternative
    const upgrades = hardMatches.filter(scored =>
      scored.appliance.id !== recommended.appliance.id &&
      scored.appliance.throughputMbps >= recommended.appliance.throughputMbps
    );

    // Growth pick: from upgrades, find a model with moderate room to grow
    // Target: 1.5–3× the required bandwidth, and must be above the recommended model
    const requiredBandwidth = criteria.circuits.reduce(
      (total, circuit) => total + circuit.bandwidthMbps, 0
    );
    const growthMinThroughput = requiredBandwidth * GROWTH_THROUGHPUT_MIN_RATIO;
    const growthMaxThroughput = requiredBandwidth * GROWTH_THROUGHPUT_MAX_RATIO;

    let growthPick: ScoredAppliance | null = null;
    if (upgrades.length > 0 && requiredBandwidth > 0) {
      // Find the lowest upgrade within the growth sweet spot
      const growthCandidates = upgrades.filter(scored =>
        scored.appliance.throughputMbps >= growthMinThroughput &&
        scored.appliance.throughputMbps <= growthMaxThroughput &&
        scored.appliance.throughputMbps > recommended.appliance.throughputMbps
      );

      if (growthCandidates.length > 0) {
        // Pick the lowest one in the growth range
        growthPick = growthCandidates.sort(
          (resultA, resultB) => resultA.appliance.throughputMbps - resultB.appliance.throughputMbps
        )[0];
      } else {
        // No model in the sweet spot — pick the next step up from recommended if it exists
        const nextStepUp = upgrades.find(scored =>
          scored.appliance.throughputMbps > recommended.appliance.throughputMbps
        );
        if (nextStepUp) {
          growthPick = nextStepUp;
        }
      }
    }

    vendorRecommendations.push({
      vendor,
      recommended,
      growthPick,
      upgrades,
      nonMatching,
      oversizedAlternative,
    });
  }

  const vendorOrder = ["Fortinet", "Cisco Meraki", "VeloCloud (Arista)"];
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
