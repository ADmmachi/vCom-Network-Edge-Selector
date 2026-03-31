export interface CircuitType {
  id: string;
  name: string;
  category: string;
}

export interface HandoffType {
  id: string;
  name: string;
  interfaceType: string;
}

export interface CircuitEntry {
  id: string;
  circuitTypeId: string;
  bandwidthMbps: number;
  uploadMbps: number | null;
  handoffId: string;
}

export interface BandwidthOption {
  label: string;
  valueMbps: number;
}

/**
 * Whether a circuit type is symmetrical (DIA) — download and upload are always equal.
 */
export function isSymmetrical(circuitTypeId: string): boolean {
  return circuitTypeId === "dia";
}

const STANDARD_DOWNLOAD_OPTIONS: BandwidthOption[] = [
  { label: "25 Mbps", valueMbps: 25 },
  { label: "50 Mbps", valueMbps: 50 },
  { label: "100 Mbps", valueMbps: 100 },
  { label: "200 Mbps", valueMbps: 200 },
  { label: "300 Mbps", valueMbps: 300 },
  { label: "500 Mbps", valueMbps: 500 },
  { label: "1 Gbps", valueMbps: 1000 },
  { label: "2 Gbps", valueMbps: 2000 },
  { label: "5 Gbps", valueMbps: 5000 },
];

const STANDARD_UPLOAD_OPTIONS: BandwidthOption[] = [
  { label: "5 Mbps", valueMbps: 5 },
  { label: "10 Mbps", valueMbps: 10 },
  { label: "20 Mbps", valueMbps: 20 },
  { label: "35 Mbps", valueMbps: 35 },
  { label: "50 Mbps", valueMbps: 50 },
  { label: "100 Mbps", valueMbps: 100 },
  { label: "200 Mbps", valueMbps: 200 },
  { label: "300 Mbps", valueMbps: 300 },
  { label: "500 Mbps", valueMbps: 500 },
  { label: "1 Gbps", valueMbps: 1000 },
];

/**
 * Returns download speed options for a given circuit type.
 */
export function getDownloadOptions(circuitTypeId: string): BandwidthOption[] {
  if (circuitTypeId === "dia") {
    return [
      { label: "50 Mbps", valueMbps: 50 },
      { label: "100 Mbps", valueMbps: 100 },
      { label: "200 Mbps", valueMbps: 200 },
      { label: "500 Mbps", valueMbps: 500 },
      { label: "1 Gbps", valueMbps: 1000 },
      { label: "2.5 Gbps", valueMbps: 2500 },
      { label: "5 Gbps", valueMbps: 5000 },
      { label: "10 Gbps", valueMbps: 10000 },
    ];
  }
  return STANDARD_DOWNLOAD_OPTIONS;
}

/**
 * Returns upload speed options for a given circuit type.
 * For symmetrical (DIA), this is unused — upload mirrors download.
 */
export function getUploadOptions(circuitTypeId: string): BandwidthOption[] {
  if (circuitTypeId === "dia") return [];
  return STANDARD_UPLOAD_OPTIONS;
}

export interface Feature {
  id: string;
  name: string;
  description: string;
}

export interface SiteType {
  id: string;
  name: string;
  maxUsers: number;
}

export interface ApplianceInterface {
  quantity: number;
  type: string;
  purpose: string;
  speedMbps: number;
  poeCapable?: boolean;
  notes?: string;
}

export interface Appliance {
  id: string;
  vendor: string;
  model: string;
  category: string;
  description: string;
  interfaces: ApplianceInterface[];
  maxWanInterfaces: number;
  maxLanPorts: number;
  ngfwThroughputMbps: number;
  capacityMbps: number;
  features: string[];
  siteTypes: string[];
  maxUsers: number;
  haSupport: boolean;
  poeSupport: boolean;
  cellularBuiltIn: boolean;
  priceRange: string;
  powerConsumptionWatts: number;
  formFactor: string;
  powerSupply: "Single" | "Dual";
  notes: string;
}

export const circuitTypes: CircuitType[] = [
  { id: "dia", name: "Dedicated Internet (DIA)", category: "dedicated" },
  { id: "broadband_fiber", name: "Fiber Broadband", category: "broadband" },
  { id: "broadband_cable", name: "Cable Broadband", category: "broadband" },
  { id: "fixed_wireless", name: "Fixed Wireless", category: "wireless" },
  { id: "starlink", name: "LEO / Satellite", category: "satellite" },
  { id: "other", name: "Other", category: "other" },
];

export const handoffTypes: HandoffType[] = [
  { id: "copper_rj45", name: "1GbE Copper (RJ45)", interfaceType: "GE RJ45" },
  { id: "fiber_smf_lc", name: "1GbE Single-Mode (SMF/LC)", interfaceType: "GE SFP" },
  { id: "fiber_mmf_lc", name: "1GbE Multi-Mode (MMF/LC)", interfaceType: "GE SFP" },
  { id: "fiber_10g_smf", name: "10GbE Single-Mode (SMF/LC)", interfaceType: "10GE SFP+" },
  { id: "fiber_10g_mmf", name: "10GbE Multi-Mode (MMF/LC)", interfaceType: "10GE SFP+" },
];

/**
 * Returns the default handoff ID for a given circuit type and bandwidth.
 * DIA < 100 Mbps: 1GbE Copper (RJ45)
 * DIA 100 Mbps – 1 Gbps: 1GbE Single-Mode (SMF/LC)
 * DIA > 1 Gbps: 10GbE Single-Mode (SMF/LC)
 * All others: 1GbE Copper (RJ45)
 */
export function getDefaultHandoff(circuitTypeId: string, bandwidthMbps: number): string {
  switch (circuitTypeId) {
    case "dia":
      if (bandwidthMbps > 1000) return "fiber_10g_smf";
      if (bandwidthMbps >= 100) return "fiber_smf_lc";
      return "copper_rj45";
    case "broadband_fiber":
    case "broadband_cable":
    case "fixed_wireless":
    case "starlink":
    case "other":
      return "copper_rj45";
    default:
      return "copper_rj45";
  }
}

/**
 * Returns the valid handoff options for a given circuit type.
 */
export function getHandoffOptionsForCircuitType(circuitTypeId: string): HandoffType[] {
  switch (circuitTypeId) {
    case "dia":
      return handoffTypes.filter(handoff =>
        ["copper_rj45", "fiber_smf_lc", "fiber_mmf_lc", "fiber_10g_smf", "fiber_10g_mmf"].includes(handoff.id)
      );
    case "broadband_fiber":
      return handoffTypes.filter(handoff =>
        ["copper_rj45", "fiber_smf_lc", "fiber_mmf_lc"].includes(handoff.id)
      );
    case "broadband_cable":
    case "fixed_wireless":
    case "starlink":
      return handoffTypes.filter(handoff => handoff.id === "copper_rj45");
    case "other":
      return handoffTypes;
    default:
      return handoffTypes;
  }
}

export const features: Feature[] = [
  { id: "wifi6", name: "Built-in Wi-Fi", description: "Integrated 802.11ax (Wi-Fi 6/6E) wireless access point" },
  { id: "lte_failover", name: "Built-in Cellular Modem", description: "Integrated LTE/5G modem for cellular WAN failover or primary uplink" },
  { id: "poe", name: "PoE+ Ports", description: "Power over Ethernet LAN ports for cameras, APs, phones" },
];

export const siteTypes: SiteType[] = [
  { id: "small_office", name: "Small Office / Branch (1–25 users)", maxUsers: 25 },
  { id: "medium_office", name: "Medium Office / Branch (25–100 users)", maxUsers: 100 },
  { id: "large_office", name: "Large Office / Branch (100–500 users)", maxUsers: 500 },
  { id: "datacenter_edge", name: "Data Center Edge", maxUsers: 1000 },
  { id: "retail", name: "Retail / Point of Sale", maxUsers: 15 },
  { id: "remote_worker", name: "Remote Worker / Home Office", maxUsers: 5 },
  { id: "industrial", name: "Industrial / IoT Edge", maxUsers: 50 },
];

export const appliances: Appliance[] = [
  // ──────────────────────────────────────────────
  // Fortinet FortiGate / FortiWiFi
  // ──────────────────────────────────────────────

  // --- FortiGate/FortiWiFi 30G ---
  {
    id: "fortigate-30g",
    vendor: "Fortinet",
    model: "FortiGate 30G",
    category: "Next-Gen Firewall / SD-WAN",
    description: "Ultra-compact NGFW with SD-WAN ASIC for SOHO and teleworker deployments. SP5-powered with hardware-accelerated security.",
    interfaces: [
      { quantity: 1, type: "GE RJ45", purpose: "WAN", speedMbps: 1000 },
      { quantity: 4, type: "GE RJ45", purpose: "LAN", speedMbps: 1000 },
      { quantity: 1, type: "USB-A", purpose: "WAN (3G/4G modem)", speedMbps: 0, notes: "External USB modem for cellular failover" },
    ],
    maxWanInterfaces: 1,
    maxLanPorts: 4,
    ngfwThroughputMbps: 570,
    capacityMbps: 4000,
    features: [],
    siteTypes: ["remote_worker", "small_office"],
    maxUsers: 10,
    haSupport: true,
    poeSupport: false,
    cellularBuiltIn: false,
    priceRange: "$",
    powerConsumptionWatts: 10,
    formFactor: "Desktop",
    powerSupply: "Single",
    notes: "Entry-level model for SOHO/teleworker. 5 GE RJ45 ports (1 WAN, 4 LAN). USB port for 3G/4G modem failover. SP5 ASIC.",
  },
  {
    id: "fortiwifi-30g",
    vendor: "Fortinet",
    model: "FortiWiFi 30G",
    category: "Next-Gen Firewall / SD-WAN + Wi-Fi",
    description: "FortiGate 30G with built-in dual-band Wi-Fi 6 (802.11ax) access point for SOHO sites needing integrated wireless.",
    interfaces: [
      { quantity: 1, type: "GE RJ45", purpose: "WAN", speedMbps: 1000 },
      { quantity: 4, type: "GE RJ45", purpose: "LAN", speedMbps: 1000 },
      { quantity: 1, type: "USB-A", purpose: "WAN (3G/4G modem)", speedMbps: 0, notes: "External USB modem for cellular failover" },
    ],
    maxWanInterfaces: 1,
    maxLanPorts: 4,
    ngfwThroughputMbps: 570,
    capacityMbps: 4000,
    features: ["wifi6"],
    siteTypes: ["remote_worker", "small_office"],
    maxUsers: 10,
    haSupport: true,
    poeSupport: false,
    cellularBuiltIn: false,
    priceRange: "$",
    powerConsumptionWatts: 12,
    formFactor: "Desktop",
    powerSupply: "Single",
    notes: "Same as FortiGate 30G with integrated Wi-Fi 6 AP. Ideal for teleworker or micro-office without separate AP.",
  },

  // --- FortiGate/FortiWiFi 40F ---
  {
    id: "fortigate-40f",
    vendor: "Fortinet",
    model: "FortiGate 40F",
    category: "Next-Gen Firewall / SD-WAN",
    description: "Compact fanless NGFW with SD-WAN for small branches. SOC4 ASIC delivers high IPS throughput in a desktop form factor.",
    interfaces: [
      { quantity: 1, type: "GE RJ45", purpose: "WAN", speedMbps: 1000 },
      { quantity: 1, type: "GE RJ45", purpose: "FortiLink", speedMbps: 1000 },
      { quantity: 3, type: "GE RJ45", purpose: "LAN", speedMbps: 1000 },
      { quantity: 1, type: "USB-A", purpose: "WAN (3G/4G modem)", speedMbps: 0, notes: "External USB modem for cellular failover" },
    ],
    maxWanInterfaces: 1,
    maxLanPorts: 5,
    ngfwThroughputMbps: 800,
    capacityMbps: 5000,
    features: [],
    siteTypes: ["small_office", "retail", "remote_worker"],
    maxUsers: 10,
    haSupport: true,
    poeSupport: false,
    cellularBuiltIn: false,
    priceRange: "$",
    powerConsumptionWatts: 12,
    formFactor: "Desktop",
    powerSupply: "Single",
    notes: "5 GE RJ45 ports (1 WAN, 1 FortiLink, 3 LAN). USB port for 3G/4G modem. SOC4 ASIC. SSL VPN not supported on FortiOS 7.6+ (2GB RAM).",
  },
  {
    id: "fortiwifi-40f",
    vendor: "Fortinet",
    model: "FortiWiFi 40F",
    category: "Next-Gen Firewall / SD-WAN + Wi-Fi",
    description: "FortiGate 40F with built-in dual-band Wi-Fi 5 (802.11ac Wave 2) access point for small sites needing wireless.",
    interfaces: [
      { quantity: 1, type: "GE RJ45", purpose: "WAN", speedMbps: 1000 },
      { quantity: 1, type: "GE RJ45", purpose: "FortiLink", speedMbps: 1000 },
      { quantity: 3, type: "GE RJ45", purpose: "LAN", speedMbps: 1000 },
      { quantity: 1, type: "USB-A", purpose: "WAN (3G/4G modem)", speedMbps: 0, notes: "External USB modem for cellular failover" },
    ],
    maxWanInterfaces: 1,
    maxLanPorts: 5,
    ngfwThroughputMbps: 800,
    capacityMbps: 5000,
    features: ["wifi6"],
    siteTypes: ["small_office", "retail", "remote_worker"],
    maxUsers: 10,
    haSupport: true,
    poeSupport: false,
    cellularBuiltIn: false,
    priceRange: "$",
    powerConsumptionWatts: 15,
    formFactor: "Desktop",
    powerSupply: "Single",
    notes: "Same as FortiGate 40F with integrated Wi-Fi (802.11ac W2). SSL VPN not supported on FortiOS 7.6+ (2GB RAM).",
  },

  // --- FortiGate/FortiWiFi 50G ---
  {
    id: "fortigate-50g",
    vendor: "Fortinet",
    model: "FortiGate 50G",
    category: "Next-Gen Firewall / SD-WAN",
    description: "SP5-powered desktop NGFW with SD-WAN for small branches. Available in DSL and 5G variants.",
    interfaces: [
      { quantity: 1, type: "GE RJ45", purpose: "WAN", speedMbps: 1000 },
      { quantity: 1, type: "GE RJ45", purpose: "FortiLink", speedMbps: 1000 },
      { quantity: 3, type: "GE RJ45", purpose: "LAN", speedMbps: 1000 },
      { quantity: 1, type: "USB-A", purpose: "WAN (3G/4G modem)", speedMbps: 0, notes: "External USB modem for cellular failover" },
    ],
    maxWanInterfaces: 1,
    maxLanPorts: 5,
    ngfwThroughputMbps: 1250,
    capacityMbps: 5000,
    features: [],
    siteTypes: ["small_office", "retail", "remote_worker"],
    maxUsers: 15,
    haSupport: true,
    poeSupport: false,
    cellularBuiltIn: false,
    priceRange: "$",
    powerConsumptionWatts: 12,
    formFactor: "Desktop",
    powerSupply: "Single",
    notes: "5 GE RJ45 ports (1 WAN, 1 FortiLink, 3 LAN). SP5 ASIC. Variants: 50G-DSL (built-in DSL modem), 50G-5G (built-in 5G dual-SIM).",
  },
  {
    id: "fortiwifi-50g",
    vendor: "Fortinet",
    model: "FortiWiFi 50G",
    category: "Next-Gen Firewall / SD-WAN + Wi-Fi",
    description: "FortiGate 50G with built-in dual-band Wi-Fi 6 (802.11ax) access point for small branches needing wireless.",
    interfaces: [
      { quantity: 1, type: "GE RJ45", purpose: "WAN", speedMbps: 1000 },
      { quantity: 1, type: "GE RJ45", purpose: "FortiLink", speedMbps: 1000 },
      { quantity: 3, type: "GE RJ45", purpose: "LAN", speedMbps: 1000 },
      { quantity: 1, type: "USB-A", purpose: "WAN (3G/4G modem)", speedMbps: 0, notes: "External USB modem for cellular failover" },
    ],
    maxWanInterfaces: 1,
    maxLanPorts: 5,
    ngfwThroughputMbps: 1250,
    capacityMbps: 5000,
    features: ["wifi6"],
    siteTypes: ["small_office", "retail", "remote_worker"],
    maxUsers: 15,
    haSupport: true,
    poeSupport: false,
    cellularBuiltIn: false,
    priceRange: "$$",
    powerConsumptionWatts: 15,
    formFactor: "Desktop",
    powerSupply: "Single",
    notes: "Same as FortiGate 50G with integrated Wi-Fi 6 AP. DSL variant (FWF-50G-DSL) also available.",
  },

  // --- FortiGate 50G-SFP ---
  {
    id: "fortigate-50g-sfp",
    vendor: "Fortinet",
    model: "FortiGate 50G-SFP",
    category: "Next-Gen Firewall / SD-WAN",
    description: "SP5-powered desktop NGFW with SFP fiber uplink port for small branches needing direct fiber connectivity.",
    interfaces: [
      { quantity: 1, type: "GE RJ45", purpose: "WAN", speedMbps: 1000 },
      { quantity: 1, type: "GE SFP", purpose: "WAN", speedMbps: 1000, notes: "Fiber WAN uplink" },
      { quantity: 1, type: "GE RJ45", purpose: "FortiLink", speedMbps: 1000 },
      { quantity: 3, type: "GE RJ45", purpose: "LAN", speedMbps: 1000 },
    ],
    maxWanInterfaces: 2,
    maxLanPorts: 5,
    ngfwThroughputMbps: 1250,
    capacityMbps: 5000,
    features: [],
    siteTypes: ["small_office", "retail"],
    maxUsers: 15,
    haSupport: true,
    poeSupport: false,
    cellularBuiltIn: false,
    priceRange: "$$",
    powerConsumptionWatts: 12,
    formFactor: "Desktop",
    powerSupply: "Single",
    notes: "5 GE RJ45 ports + 1 GE SFP port for fiber WAN. PoE variant (50G-SFP-PoE) available. SP5 ASIC.",
  },

  // --- FortiGate 50G-5G ---
  {
    id: "fortigate-50g-5g",
    vendor: "Fortinet",
    model: "FortiGate 50G-5G",
    category: "Next-Gen Firewall / SD-WAN + 5G",
    description: "SP5-powered desktop NGFW with built-in 5G/LTE dual-SIM cellular modem for wireless-first WAN or cellular failover at small branches.",
    interfaces: [
      { quantity: 1, type: "GE RJ45", purpose: "WAN", speedMbps: 1000 },
      { quantity: 1, type: "5G/LTE", purpose: "WAN (cellular)", speedMbps: 4000, notes: "Built-in 5G Sub-6 GHz modem, dual physical SIM with failover" },
      { quantity: 1, type: "GE RJ45", purpose: "FortiLink", speedMbps: 1000 },
      { quantity: 3, type: "GE RJ45", purpose: "LAN", speedMbps: 1000 },
    ],
    maxWanInterfaces: 2,
    maxLanPorts: 5,
    ngfwThroughputMbps: 1250,
    capacityMbps: 5000,
    features: ["lte_failover"],
    siteTypes: ["small_office", "retail", "remote_worker", "industrial"],
    maxUsers: 15,
    haSupport: true,
    poeSupport: false,
    cellularBuiltIn: true,
    priceRange: "$$",
    powerConsumptionWatts: 18,
    formFactor: "Desktop",
    powerSupply: "Single",
    notes: "Same as FortiGate 50G with integrated 5G Sub-6 GHz modem. Dual-SIM with automatic SIM failover. External 5G antennas (TS-9). SP5 ASIC. Ideal for wireless-primary or failover WAN.",
  },

  // --- FortiGate 50G-SFP-PoE ---
  {
    id: "fortigate-50g-sfp-poe",
    vendor: "Fortinet",
    model: "FortiGate 50G-SFP-PoE",
    category: "Next-Gen Firewall / SD-WAN + PoE",
    description: "SP5-powered desktop NGFW with SFP fiber uplink and PoE+ LAN ports for powering APs, cameras, or IP phones without a separate switch.",
    interfaces: [
      { quantity: 1, type: "GE RJ45", purpose: "WAN", speedMbps: 1000 },
      { quantity: 1, type: "GE SFP", purpose: "WAN", speedMbps: 1000, notes: "Fiber WAN uplink" },
      { quantity: 1, type: "GE RJ45", purpose: "FortiLink", speedMbps: 1000 },
      { quantity: 3, type: "GE RJ45", purpose: "LAN (PoE+)", speedMbps: 1000, poeCapable: true, notes: "802.3at 30W each, 65W total PoE budget" },
    ],
    maxWanInterfaces: 2,
    maxLanPorts: 5,
    ngfwThroughputMbps: 1250,
    capacityMbps: 5000,
    features: ["poe"],
    siteTypes: ["small_office", "retail"],
    maxUsers: 15,
    haSupport: true,
    poeSupport: true,
    cellularBuiltIn: false,
    priceRange: "$$",
    powerConsumptionWatts: 80,
    formFactor: "Desktop",
    powerSupply: "Single",
    notes: "Same as FortiGate 50G-SFP with PoE+ on 3 LAN ports (65W total budget). Powers APs/cameras directly. SP5 ASIC. Higher PSU wattage due to PoE.",
  },

  // --- FortiGate/FortiWiFi 60F ---
  {
    id: "fortigate-60f",
    vendor: "Fortinet",
    model: "FortiGate 60F",
    category: "Next-Gen Firewall / SD-WAN",
    description: "Popular compact NGFW with SD-WAN for small-to-mid branches. SOC4 ASIC with high firewall throughput.",
    interfaces: [
      { quantity: 2, type: "GE RJ45", purpose: "WAN", speedMbps: 1000 },
      { quantity: 1, type: "GE RJ45", purpose: "DMZ", speedMbps: 1000 },
      { quantity: 5, type: "GE RJ45", purpose: "LAN", speedMbps: 1000 },
      { quantity: 2, type: "GE RJ45", purpose: "FortiLink", speedMbps: 1000 },
      { quantity: 1, type: "USB-A", purpose: "WAN (3G/4G modem)", speedMbps: 0, notes: "External USB modem for cellular failover" },
    ],
    maxWanInterfaces: 2,
    maxLanPorts: 10,
    ngfwThroughputMbps: 1000,
    capacityMbps: 10000,
    features: [],
    siteTypes: ["small_office", "medium_office", "retail"],
    maxUsers: 30,
    haSupport: true,
    poeSupport: false,
    cellularBuiltIn: false,
    priceRange: "$$",
    powerConsumptionWatts: 18,
    formFactor: "Desktop",
    powerSupply: "Single",
    notes: "10 GE RJ45 ports (2 WAN, 1 DMZ, 5 LAN, 2 FortiLink). SOC4 ASIC. SSL VPN not supported on FortiOS 7.6+ (2GB RAM).",
  },
  {
    id: "fortiwifi-60f",
    vendor: "Fortinet",
    model: "FortiWiFi 60F",
    category: "Next-Gen Firewall / SD-WAN + Wi-Fi",
    description: "FortiGate 60F with built-in dual-band Wi-Fi 5 (802.11ac Wave 2) access point for small-to-mid branches.",
    interfaces: [
      { quantity: 2, type: "GE RJ45", purpose: "WAN", speedMbps: 1000 },
      { quantity: 1, type: "GE RJ45", purpose: "DMZ", speedMbps: 1000 },
      { quantity: 5, type: "GE RJ45", purpose: "LAN", speedMbps: 1000 },
      { quantity: 2, type: "GE RJ45", purpose: "FortiLink", speedMbps: 1000 },
      { quantity: 1, type: "USB-A", purpose: "WAN (3G/4G modem)", speedMbps: 0, notes: "External USB modem for cellular failover" },
    ],
    maxWanInterfaces: 2,
    maxLanPorts: 10,
    ngfwThroughputMbps: 1000,
    capacityMbps: 10000,
    features: ["wifi6"],
    siteTypes: ["small_office", "medium_office", "retail"],
    maxUsers: 30,
    haSupport: true,
    poeSupport: false,
    cellularBuiltIn: false,
    priceRange: "$$",
    powerConsumptionWatts: 22,
    formFactor: "Desktop",
    powerSupply: "Single",
    notes: "Same as FortiGate 60F with integrated Wi-Fi (802.11ac W2). SSL VPN not supported on FortiOS 7.6+ (2GB RAM).",
  },

  // --- FortiGate 70F ---
  {
    id: "fortigate-70f",
    vendor: "Fortinet",
    model: "FortiGate 70F",
    category: "Next-Gen Firewall / SD-WAN",
    description: "Higher-performance desktop NGFW for branches needing more NGFW throughput and session capacity than the 60F.",
    interfaces: [
      { quantity: 2, type: "GE RJ45", purpose: "WAN", speedMbps: 1000 },
      { quantity: 6, type: "GE RJ45", purpose: "LAN", speedMbps: 1000 },
      { quantity: 2, type: "GE SFP", purpose: "LAN/WAN", speedMbps: 1000 },
      { quantity: 1, type: "USB-A", purpose: "WAN (3G/4G modem)", speedMbps: 0, notes: "External USB modem for cellular failover" },
    ],
    maxWanInterfaces: 2,
    maxLanPorts: 8,
    ngfwThroughputMbps: 1000,
    capacityMbps: 10000,
    features: [],
    siteTypes: ["small_office", "medium_office"],
    maxUsers: 40,
    haSupport: true,
    poeSupport: false,
    cellularBuiltIn: false,
    priceRange: "$$",
    powerConsumptionWatts: 20,
    formFactor: "Desktop",
    powerSupply: "Single",
    notes: "8 GE RJ45 ports + 2 SFP slots. 1.5M concurrent sessions. SOC4 ASIC. Higher session capacity than 60F. Supports 200 SSL VPN users.",
  },

  // --- FortiGate/FortiWiFi 70G ---
  {
    id: "fortigate-70g",
    vendor: "Fortinet",
    model: "FortiGate 70G",
    category: "Next-Gen Firewall / SD-WAN",
    description: "SP5-powered desktop NGFW for branches. Significant performance jump over 70F with next-gen ASIC.",
    interfaces: [
      { quantity: 2, type: "GE RJ45", purpose: "WAN", speedMbps: 1000 },
      { quantity: 6, type: "GE RJ45", purpose: "LAN", speedMbps: 1000 },
      { quantity: 2, type: "GE SFP", purpose: "LAN/WAN", speedMbps: 1000 },
      { quantity: 1, type: "USB-A", purpose: "WAN (3G/4G modem)", speedMbps: 0, notes: "External USB modem for cellular failover" },
    ],
    maxWanInterfaces: 2,
    maxLanPorts: 8,
    ngfwThroughputMbps: 1500,
    capacityMbps: 10000,
    features: [],
    siteTypes: ["small_office", "medium_office"],
    maxUsers: 40,
    haSupport: true,
    poeSupport: false,
    cellularBuiltIn: false,
    priceRange: "$$",
    powerConsumptionWatts: 18,
    formFactor: "Desktop",
    powerSupply: "Single",
    notes: "8 GE RJ45 ports + 2 SFP slots. SP5 ASIC. 1.5 Gbps NGFW throughput, 1.3 Gbps threat protection. Supports 200 SSL VPN users.",
  },
  {
    id: "fortiwifi-70g",
    vendor: "Fortinet",
    model: "FortiWiFi 70G",
    category: "Next-Gen Firewall / SD-WAN + Wi-Fi",
    description: "FortiGate 70G with built-in dual-band Wi-Fi 6 (802.11ax) access point for branches needing wireless.",
    interfaces: [
      { quantity: 2, type: "GE RJ45", purpose: "WAN", speedMbps: 1000 },
      { quantity: 6, type: "GE RJ45", purpose: "LAN", speedMbps: 1000 },
      { quantity: 2, type: "GE SFP", purpose: "LAN/WAN", speedMbps: 1000 },
      { quantity: 1, type: "USB-A", purpose: "WAN (3G/4G modem)", speedMbps: 0, notes: "External USB modem for cellular failover" },
    ],
    maxWanInterfaces: 2,
    maxLanPorts: 8,
    ngfwThroughputMbps: 1500,
    capacityMbps: 10000,
    features: ["wifi6"],
    siteTypes: ["small_office", "medium_office"],
    maxUsers: 40,
    haSupport: true,
    poeSupport: false,
    cellularBuiltIn: false,
    priceRange: "$$",
    powerConsumptionWatts: 22,
    formFactor: "Desktop",
    powerSupply: "Single",
    notes: "Same as FortiGate 70G with integrated Wi-Fi 6 AP. SP5 ASIC.",
  },

  // --- FortiGate/FortiWiFi 80F ---
  {
    id: "fortigate-80f",
    vendor: "Fortinet",
    model: "FortiGate 80F",
    category: "Next-Gen Firewall / SD-WAN",
    description: "Mid-range desktop NGFW for medium branches with higher port density and PoE option.",
    interfaces: [
      { quantity: 2, type: "GE RJ45", purpose: "WAN", speedMbps: 1000 },
      { quantity: 6, type: "GE RJ45", purpose: "LAN", speedMbps: 1000 },
      { quantity: 2, type: "GE RJ45/SFP", purpose: "LAN/WAN", speedMbps: 1000, notes: "Shared media pair (RJ45 or SFP)" },
      { quantity: 1, type: "USB-A", purpose: "WAN (3G/4G modem)", speedMbps: 0, notes: "External USB modem for cellular failover" },
    ],
    maxWanInterfaces: 2,
    maxLanPorts: 8,
    ngfwThroughputMbps: 1000,
    capacityMbps: 10000,
    features: [],
    siteTypes: ["small_office", "medium_office"],
    maxUsers: 50,
    haSupport: true,
    poeSupport: false,
    cellularBuiltIn: false,
    priceRange: "$$",
    powerConsumptionWatts: 25,
    formFactor: "Desktop",
    powerSupply: "Single",
    notes: "8 GE RJ45 ports + 2 shared SFP/RJ45 slots. SOC4 ASIC. 1.5M concurrent sessions. PoE variant (80F-PoE) available. Supports 200 SSL VPN users.",
  },
  {
    id: "fortiwifi-80f",
    vendor: "Fortinet",
    model: "FortiWiFi 80F",
    category: "Next-Gen Firewall / SD-WAN + Wi-Fi",
    description: "FortiGate 80F with built-in dual-band Wi-Fi 5 (802.11ac Wave 2) AP for medium branches needing wireless.",
    interfaces: [
      { quantity: 2, type: "GE RJ45", purpose: "WAN", speedMbps: 1000 },
      { quantity: 6, type: "GE RJ45", purpose: "LAN", speedMbps: 1000 },
      { quantity: 2, type: "GE RJ45/SFP", purpose: "LAN/WAN", speedMbps: 1000, notes: "Shared media pair (RJ45 or SFP)" },
      { quantity: 1, type: "USB-A", purpose: "WAN (3G/4G modem)", speedMbps: 0, notes: "External USB modem for cellular failover" },
    ],
    maxWanInterfaces: 2,
    maxLanPorts: 8,
    ngfwThroughputMbps: 1000,
    capacityMbps: 10000,
    features: ["wifi6"],
    siteTypes: ["small_office", "medium_office"],
    maxUsers: 50,
    haSupport: true,
    poeSupport: false,
    cellularBuiltIn: false,
    priceRange: "$$",
    powerConsumptionWatts: 30,
    formFactor: "Desktop",
    powerSupply: "Single",
    notes: "Same as FortiGate 80F with integrated Wi-Fi (802.11ac W2). SOC4 ASIC.",
  },

  // --- FortiGate 90G ---
  {
    id: "fortigate-90g",
    vendor: "Fortinet",
    model: "FortiGate 90G",
    category: "Next-Gen Firewall / SD-WAN",
    description: "High-performance desktop NGFW with SP5 ASIC. Bridges the gap between desktop and 1U rack models with enterprise-grade throughput.",
    interfaces: [
      { quantity: 2, type: "GE RJ45", purpose: "WAN", speedMbps: 1000 },
      { quantity: 12, type: "GE RJ45", purpose: "LAN", speedMbps: 1000 },
      { quantity: 2, type: "GE SFP", purpose: "LAN/WAN", speedMbps: 1000 },
      { quantity: 1, type: "USB-A", purpose: "WAN (3G/4G modem)", speedMbps: 0, notes: "External USB modem for cellular failover" },
    ],
    maxWanInterfaces: 2,
    maxLanPorts: 14,
    ngfwThroughputMbps: 2500,
    capacityMbps: 28000,
    features: [],
    siteTypes: ["medium_office", "large_office"],
    maxUsers: 75,
    haSupport: true,
    poeSupport: false,
    cellularBuiltIn: false,
    priceRange: "$$$",
    powerConsumptionWatts: 35,
    formFactor: "Desktop",
    powerSupply: "Single",
    notes: "14 GE RJ45 ports + 2 SFP slots. SP5 ASIC. 3M concurrent sessions. 2.5 Gbps NGFW / 2.2 Gbps threat protection. Supports 200 SSL VPN users. 120GB SSD on 91G variant.",
  },

  // --- FortiGate 100F ---
  {
    id: "fortigate-100f",
    vendor: "Fortinet",
    model: "FortiGate 100F",
    category: "Next-Gen Firewall / SD-WAN",
    description: "1U rack-mount NGFW for medium-to-large branches and campus deployments. Dual power supplies for redundancy.",
    interfaces: [
      { quantity: 2, type: "GE RJ45", purpose: "WAN", speedMbps: 1000 },
      { quantity: 2, type: "GE RJ45", purpose: "HA", speedMbps: 1000 },
      { quantity: 16, type: "GE RJ45", purpose: "LAN", speedMbps: 1000 },
      { quantity: 2, type: "GE RJ45/SFP", purpose: "LAN/WAN", speedMbps: 1000, notes: "Shared media pair (RJ45 or SFP)" },
      { quantity: 4, type: "10GE SFP+", purpose: "LAN/WAN", speedMbps: 10000 },
    ],
    maxWanInterfaces: 4,
    maxLanPorts: 22,
    ngfwThroughputMbps: 1600,
    capacityMbps: 20000,
    features: [],
    siteTypes: ["medium_office", "large_office"],
    maxUsers: 150,
    haSupport: true,
    poeSupport: false,
    cellularBuiltIn: false,
    priceRange: "$$$",
    powerConsumptionWatts: 45,
    formFactor: "1U Rack",
    powerSupply: "Dual",
    notes: "22 GE RJ45 ports + 2 shared SFP slots + 4 SFP+ 10GbE slots. SOC4/NP6XLite + CP9 ASIC. Dual power supplies (non-hot-swap). 480GB SSD on 101F variant. Supports 500 SSL VPN users.",
  },

  // --- FortiGate 120G ---
  {
    id: "fortigate-120g",
    vendor: "Fortinet",
    model: "FortiGate 120G",
    category: "Next-Gen Firewall / SD-WAN",
    description: "SP5-powered 1U rack-mount NGFW for campus and branch deployments with 10GbE uplinks.",
    interfaces: [
      { quantity: 4, type: "GE RJ45", purpose: "WAN", speedMbps: 1000 },
      { quantity: 2, type: "GE RJ45", purpose: "HA", speedMbps: 1000 },
      { quantity: 12, type: "GE RJ45", purpose: "LAN", speedMbps: 1000 },
      { quantity: 4, type: "10GE SFP+", purpose: "LAN/WAN", speedMbps: 10000 },
    ],
    maxWanInterfaces: 4,
    maxLanPorts: 18,
    ngfwThroughputMbps: 3100,
    capacityMbps: 39000,
    features: [],
    siteTypes: ["medium_office", "large_office"],
    maxUsers: 200,
    haSupport: true,
    poeSupport: false,
    cellularBuiltIn: false,
    priceRange: "$$$",
    powerConsumptionWatts: 55,
    formFactor: "1U Rack",
    powerSupply: "Dual",
    notes: "18 GE RJ45 ports + 4 10GE SFP+ slots. SP5/NP7Lite + CP10 ASIC. Next-gen replacement for 100F with significantly higher throughput. Supports 500 SSL VPN users.",
  },

  // --- FortiGate 200F ---
  {
    id: "fortigate-200f",
    vendor: "Fortinet",
    model: "FortiGate 200F",
    category: "Next-Gen Firewall / SD-WAN",
    description: "High-performance 1U NGFW for large branches and campus deployments. NP6XLite + CP9 acceleration with 10GbE/SFP+ connectivity.",
    interfaces: [
      { quantity: 4, type: "GE RJ45", purpose: "WAN", speedMbps: 1000 },
      { quantity: 2, type: "GE RJ45", purpose: "HA", speedMbps: 1000 },
      { quantity: 12, type: "GE RJ45", purpose: "LAN", speedMbps: 1000 },
      { quantity: 8, type: "GE SFP", purpose: "LAN/WAN", speedMbps: 1000 },
      { quantity: 4, type: "10GE SFP+", purpose: "LAN/WAN", speedMbps: 10000 },
    ],
    maxWanInterfaces: 4,
    maxLanPorts: 30,
    ngfwThroughputMbps: 3500,
    capacityMbps: 27000,
    features: [],
    siteTypes: ["large_office", "datacenter_edge"],
    maxUsers: 400,
    haSupport: true,
    poeSupport: false,
    cellularBuiltIn: false,
    priceRange: "$$$$",
    powerConsumptionWatts: 85,
    formFactor: "1U Rack",
    powerSupply: "Dual",
    notes: "18 GE RJ45 + 8 GE SFP + 4 10GE SFP+ slots. NP6XLite + CP9 ASIC. Dual AC power supplies. 480GB SSD on 201F variant. Supports 500 SSL VPN users.",
  },

  // --- FortiGate 200G ---
  {
    id: "fortigate-200g",
    vendor: "Fortinet",
    model: "FortiGate 200G",
    category: "Next-Gen Firewall / SD-WAN",
    description: "Next-gen 1U NGFW with SP5/NP7Lite ASIC for large campus and branch deployments. Multi-gigabit and 10GbE connectivity.",
    interfaces: [
      { quantity: 2, type: "GE RJ45", purpose: "HA", speedMbps: 1000 },
      { quantity: 8, type: "GE RJ45", purpose: "LAN", speedMbps: 1000 },
      { quantity: 8, type: "5GE RJ45", purpose: "LAN/WAN", speedMbps: 5000 },
      { quantity: 4, type: "GE SFP", purpose: "LAN/WAN", speedMbps: 1000 },
      { quantity: 8, type: "10GE SFP+", purpose: "LAN/WAN", speedMbps: 10000 },
    ],
    maxWanInterfaces: 4,
    maxLanPorts: 30,
    ngfwThroughputMbps: 7000,
    capacityMbps: 39000,
    features: [],
    siteTypes: ["large_office", "datacenter_edge"],
    maxUsers: 500,
    haSupport: true,
    poeSupport: false,
    cellularBuiltIn: false,
    priceRange: "$$$$",
    powerConsumptionWatts: 100,
    formFactor: "1U Rack",
    powerSupply: "Dual",
    notes: "10 GE RJ45 + 8 5GE RJ45 + 4 GE SFP + 8 10GE SFP+ slots. NP7Lite + CP10 ASIC. Next-gen replacement for 200F. Supports 500 SSL VPN users.",
  },

  // --- FortiGate 400F ---
  {
    id: "fortigate-400f",
    vendor: "Fortinet",
    model: "FortiGate 400F",
    category: "Next-Gen Firewall / SD-WAN",
    description: "Enterprise 1U NGFW for large campus, data center edge, and high-throughput SD-WAN hub deployments.",
    interfaces: [
      { quantity: 8, type: "GE RJ45", purpose: "LAN/WAN", speedMbps: 1000 },
      { quantity: 8, type: "GE SFP", purpose: "LAN/WAN", speedMbps: 1000 },
      { quantity: 8, type: "10GE SFP+", purpose: "LAN/WAN", speedMbps: 10000 },
      { quantity: 2, type: "GE RJ45", purpose: "HA", speedMbps: 1000 },
    ],
    maxWanInterfaces: 4,
    maxLanPorts: 24,
    ngfwThroughputMbps: 10000,
    capacityMbps: 79500,
    features: [],
    siteTypes: ["large_office", "datacenter_edge"],
    maxUsers: 750,
    haSupport: true,
    poeSupport: false,
    cellularBuiltIn: false,
    priceRange: "$$$$$",
    powerConsumptionWatts: 200,
    formFactor: "1U Rack",
    powerSupply: "Dual",
    notes: "8 GE RJ45 + 8 GE SFP + 8 10GE SFP+ slots. NP7 + CP9 ASIC. Dual hot-swap PSUs. 480GB SSD on 401F. Supports 5,000 SSL VPN users. Enterprise/DC edge class.",
  },

  // ──────────────────────────────────────────────
  // Cisco Meraki
  // ──────────────────────────────────────────────

  // --- MX67 / MX67W / MX67C ---
  {
    id: "meraki-mx67",
    vendor: "Cisco Meraki",
    model: "MX67",
    category: "SD-WAN / Security Appliance",
    description: "Cloud-managed security & SD-WAN appliance for small branches. Simple zero-touch deployment via Meraki dashboard.",
    interfaces: [
      { quantity: 2, type: "GE RJ45", purpose: "WAN", speedMbps: 1000 },
      { quantity: 10, type: "GE RJ45", purpose: "LAN", speedMbps: 1000 },
      { quantity: 1, type: "USB-A", purpose: "WAN (3G/4G dongle)", speedMbps: 0 },
    ],
    maxWanInterfaces: 2,
    maxLanPorts: 10,
    ngfwThroughputMbps: 400,
    capacityMbps: 700,
    features: [],
    siteTypes: ["small_office", "retail", "remote_worker"],
    maxUsers: 50,
    haSupport: true,
    poeSupport: false,
    cellularBuiltIn: false,
    priceRange: "$$",
    powerConsumptionWatts: 10,
    formFactor: "Desktop",
    powerSupply: "Single",
    notes: "2 GE WAN + 10 GE LAN RJ45 ports. Warm spare HA supported. USB for 3G/4G dongle failover. Requires Meraki license. Dual WAN via convertible LAN port.",
  },
  {
    id: "meraki-mx67w",
    vendor: "Cisco Meraki",
    model: "MX67W",
    category: "SD-WAN / Security Appliance + Wi-Fi",
    description: "MX67 with built-in dual-band 802.11ac Wave 2 wireless AP. All-in-one solution for small sites needing integrated wireless.",
    interfaces: [
      { quantity: 2, type: "GE RJ45", purpose: "WAN", speedMbps: 1000 },
      { quantity: 10, type: "GE RJ45", purpose: "LAN", speedMbps: 1000 },
      { quantity: 1, type: "USB-A", purpose: "WAN (3G/4G dongle)", speedMbps: 0 },
    ],
    maxWanInterfaces: 2,
    maxLanPorts: 10,
    ngfwThroughputMbps: 400,
    capacityMbps: 700,
    features: ["wifi6"],
    siteTypes: ["small_office", "retail", "remote_worker"],
    maxUsers: 50,
    haSupport: true,
    poeSupport: false,
    cellularBuiltIn: false,
    priceRange: "$$",
    powerConsumptionWatts: 12,
    formFactor: "Desktop",
    powerSupply: "Single",
    notes: "Same as MX67 with integrated 802.11ac W2 AP supporting up to 4 SSIDs. External RP-SMA antennas. Ideal where separate AP deployment is impractical.",
  },
  {
    id: "meraki-mx67c",
    vendor: "Cisco Meraki",
    model: "MX67C",
    category: "SD-WAN / Security Appliance + LTE",
    description: "MX67 with built-in Cat 6 LTE modem for cellular WAN failover or primary uplink at locations with unreliable wired circuits.",
    interfaces: [
      { quantity: 2, type: "GE RJ45", purpose: "WAN", speedMbps: 1000 },
      { quantity: 10, type: "GE RJ45", purpose: "LAN", speedMbps: 1000 },
      { quantity: 1, type: "LTE Cat 6", purpose: "WAN (cellular)", speedMbps: 300, notes: "Built-in modem, external antennas, SIM required" },
    ],
    maxWanInterfaces: 2,
    maxLanPorts: 10,
    ngfwThroughputMbps: 400,
    capacityMbps: 700,
    features: ["lte_failover"],
    siteTypes: ["small_office", "retail", "remote_worker"],
    maxUsers: 50,
    haSupport: true,
    poeSupport: false,
    cellularBuiltIn: true,
    priceRange: "$$",
    powerConsumptionWatts: 12,
    formFactor: "Desktop",
    powerSupply: "Single",
    notes: "Same as MX67 with integrated Cat 6 LTE modem. Removable external LTE paddle antennas. SIM card required (not included). Cellular can be active or failover uplink.",
  },

  // --- MX68 / MX68W / MX68CW ---
  {
    id: "meraki-mx68",
    vendor: "Cisco Meraki",
    model: "MX68",
    category: "SD-WAN / Security Appliance + PoE",
    description: "Small branch appliance with 2 PoE+ LAN ports for powering APs or cameras. Higher port count than MX67.",
    interfaces: [
      { quantity: 2, type: "GE RJ45", purpose: "WAN", speedMbps: 1000 },
      { quantity: 8, type: "GE RJ45", purpose: "LAN", speedMbps: 1000 },
      { quantity: 2, type: "GE RJ45", purpose: "LAN (PoE+)", speedMbps: 1000, poeCapable: true, notes: "802.3at 30W each" },
      { quantity: 1, type: "USB-A", purpose: "WAN (3G/4G dongle)", speedMbps: 0 },
    ],
    maxWanInterfaces: 2,
    maxLanPorts: 10,
    ngfwThroughputMbps: 400,
    capacityMbps: 700,
    features: ["poe"],
    siteTypes: ["small_office", "retail", "remote_worker"],
    maxUsers: 50,
    haSupport: true,
    poeSupport: true,
    cellularBuiltIn: false,
    priceRange: "$$",
    powerConsumptionWatts: 35,
    formFactor: "Desktop",
    powerSupply: "Single",
    notes: "2 GE WAN + 10 GE LAN ports (2 PoE+ at 802.3at, 30W each). 100W PSU. Same firewall throughput as MX67 but adds PoE for peripherals.",
  },
  {
    id: "meraki-mx68w",
    vendor: "Cisco Meraki",
    model: "MX68W",
    category: "SD-WAN / Security Appliance + Wi-Fi + PoE",
    description: "MX68 with built-in 802.11ac Wave 2 wireless AP and PoE+ LAN ports. Full-featured all-in-one for small branches.",
    interfaces: [
      { quantity: 2, type: "GE RJ45", purpose: "WAN", speedMbps: 1000 },
      { quantity: 8, type: "GE RJ45", purpose: "LAN", speedMbps: 1000 },
      { quantity: 2, type: "GE RJ45", purpose: "LAN (PoE+)", speedMbps: 1000, poeCapable: true, notes: "802.3at 30W each" },
      { quantity: 1, type: "USB-A", purpose: "WAN (3G/4G dongle)", speedMbps: 0 },
    ],
    maxWanInterfaces: 2,
    maxLanPorts: 10,
    ngfwThroughputMbps: 400,
    capacityMbps: 700,
    features: ["wifi6", "poe"],
    siteTypes: ["small_office", "retail", "remote_worker"],
    maxUsers: 50,
    haSupport: true,
    poeSupport: true,
    cellularBuiltIn: false,
    priceRange: "$$",
    powerConsumptionWatts: 40,
    formFactor: "Desktop",
    powerSupply: "Single",
    notes: "Same as MX68 with integrated 802.11ac W2 AP (up to 4 SSIDs). External RP-SMA antennas. 2 PoE+ LAN ports. 100W PSU.",
  },
  {
    id: "meraki-mx68cw",
    vendor: "Cisco Meraki",
    model: "MX68CW",
    category: "SD-WAN / Security Appliance + Wi-Fi + LTE + PoE",
    description: "All-in-one appliance combining firewall, SD-WAN, 802.11ac Wi-Fi, LTE modem, and PoE+ ports in a single desktop unit.",
    interfaces: [
      { quantity: 2, type: "GE RJ45", purpose: "WAN", speedMbps: 1000 },
      { quantity: 8, type: "GE RJ45", purpose: "LAN", speedMbps: 1000 },
      { quantity: 2, type: "GE RJ45", purpose: "LAN (PoE+)", speedMbps: 1000, poeCapable: true, notes: "802.3at 30W each" },
      { quantity: 1, type: "LTE Cat 6", purpose: "WAN (cellular)", speedMbps: 300, notes: "Built-in modem, fixed antennas, SIM required" },
    ],
    maxWanInterfaces: 2,
    maxLanPorts: 10,
    ngfwThroughputMbps: 400,
    capacityMbps: 700,
    features: ["wifi6", "lte_failover", "poe"],
    siteTypes: ["small_office", "retail", "remote_worker"],
    maxUsers: 50,
    haSupport: true,
    poeSupport: true,
    cellularBuiltIn: true,
    priceRange: "$$$",
    powerConsumptionWatts: 45,
    formFactor: "Desktop",
    powerSupply: "Single",
    notes: "Highest-featured MX67/68 variant: Wi-Fi + LTE + PoE in one unit. Fixed antennas for Wi-Fi and LTE (non-removable). 100W PSU. SIM required.",
  },

  // --- MX75 ---
  {
    id: "meraki-mx75",
    vendor: "Cisco Meraki",
    model: "MX75",
    category: "SD-WAN / Security Appliance",
    description: "Next-gen desktop appliance for small-to-medium branches with SFP WAN ports and PoE+ LAN support.",
    interfaces: [
      { quantity: 2, type: "GE RJ45", purpose: "WAN", speedMbps: 1000 },
      { quantity: 2, type: "GE SFP", purpose: "WAN", speedMbps: 1000, notes: "Fiber WAN uplinks" },
      { quantity: 10, type: "GE RJ45", purpose: "LAN", speedMbps: 1000 },
      { quantity: 2, type: "GE RJ45", purpose: "LAN (PoE+)", speedMbps: 1000, poeCapable: true, notes: "802.3at" },
    ],
    maxWanInterfaces: 2,
    maxLanPorts: 12,
    ngfwThroughputMbps: 1000,
    capacityMbps: 1000,
    features: ["poe"],
    siteTypes: ["small_office", "medium_office", "retail"],
    maxUsers: 200,
    haSupport: true,
    poeSupport: true,
    cellularBuiltIn: false,
    priceRange: "$$$",
    powerConsumptionWatts: 20,
    formFactor: "Desktop",
    powerSupply: "Single",
    notes: "2 GE RJ45 WAN + 2 GE SFP WAN + 12 GE RJ45 LAN (2 PoE+ 802.3at). Warm spare HA. SFP WAN ports for fiber uplinks. Compact desktop form factor.",
  },

  // --- C8111-G2-MX ---
  {
    id: "meraki-8111-g2-mx",
    vendor: "Cisco Meraki",
    model: "C8111-G2-MX",
    category: "Secure Router / SD-WAN",
    description: "Next-gen small branch secure router running MX OS. 2.5G mGig WAN ports with PoE for cellular gateway and 1 PoE LAN port.",
    interfaces: [
      { quantity: 1, type: "2.5G mGig RJ45", purpose: "WAN", speedMbps: 2500 },
      { quantity: 1, type: "2.5G mGig RJ45", purpose: "WAN (PoE)", speedMbps: 2500, poeCapable: true, notes: "802.3at for MG cellular gateway" },
      { quantity: 3, type: "GE RJ45", purpose: "LAN", speedMbps: 1000 },
      { quantity: 1, type: "GE RJ45", purpose: "LAN (PoE)", speedMbps: 1000, poeCapable: true, notes: "802.3at" },
    ],
    maxWanInterfaces: 2,
    maxLanPorts: 4,
    ngfwThroughputMbps: 1200,
    capacityMbps: 2000,
    features: ["poe"],
    siteTypes: ["small_office", "retail", "remote_worker"],
    maxUsers: 200,
    haSupport: true,
    poeSupport: true,
    cellularBuiltIn: false,
    priceRange: "$$",
    powerConsumptionWatts: 30,
    formFactor: "Desktop",
    powerSupply: "Single",
    notes: "2x 2.5G mGig RJ45 WAN (1 PoE 802.3at for MG cellular gateway) + 4 GE RJ45 LAN (1 PoE). Built-in eSIM for ZTP. Cisco 8000 series running MX OS. ~3x throughput vs MX67/68.",
  },

  // --- C8121-G2-MX ---
  {
    id: "meraki-8121-g2-mx",
    vendor: "Cisco Meraki",
    model: "C8121-G2-MX",
    category: "Secure Router / SD-WAN",
    description: "Next-gen small-to-medium branch secure router with 10 LAN ports (3 PoE) and 2.5G mGig WAN. Higher port density than C8111.",
    interfaces: [
      { quantity: 1, type: "2.5G mGig RJ45", purpose: "WAN", speedMbps: 2500 },
      { quantity: 1, type: "2.5G mGig RJ45", purpose: "WAN (PoE)", speedMbps: 2500, poeCapable: true, notes: "802.3at for MG cellular gateway" },
      { quantity: 7, type: "GE RJ45", purpose: "LAN", speedMbps: 1000 },
      { quantity: 3, type: "GE RJ45", purpose: "LAN (UPoE)", speedMbps: 1000, poeCapable: true, notes: "UPoE 802.3bt 45W each" },
    ],
    maxWanInterfaces: 2,
    maxLanPorts: 10,
    ngfwThroughputMbps: 1200,
    capacityMbps: 2000,
    features: ["poe"],
    siteTypes: ["small_office", "medium_office", "retail"],
    maxUsers: 200,
    haSupport: true,
    poeSupport: true,
    cellularBuiltIn: false,
    priceRange: "$$$",
    powerConsumptionWatts: 55,
    formFactor: "Desktop",
    powerSupply: "Single",
    notes: "2x 2.5G mGig RJ45 WAN (1 PoE 802.3at) + 10 GE RJ45 LAN (3 PoE UPoE 45W each). Built-in eSIM for ZTP. Cisco 8000 series running MX OS. Same throughput as C8111 with more ports.",
  },

  // --- MX85 ---
  {
    id: "meraki-mx85",
    vendor: "Cisco Meraki",
    model: "MX85",
    category: "SD-WAN / Security Appliance",
    description: "1U rack-mount cloud-managed appliance for medium branches with SFP WAN ports and PoE WAN for MG gateway.",
    interfaces: [
      { quantity: 2, type: "GE RJ45", purpose: "WAN", speedMbps: 1000, notes: "1 port PoE+ 802.3at for MG gateway" },
      { quantity: 2, type: "GE SFP", purpose: "WAN", speedMbps: 1000 },
      { quantity: 10, type: "GE RJ45", purpose: "LAN", speedMbps: 1000 },
      { quantity: 2, type: "GE SFP", purpose: "LAN", speedMbps: 1000 },
    ],
    maxWanInterfaces: 2,
    maxLanPorts: 10,
    ngfwThroughputMbps: 1000,
    capacityMbps: 1000,
    features: [],
    siteTypes: ["small_office", "medium_office"],
    maxUsers: 250,
    haSupport: true,
    poeSupport: false,
    cellularBuiltIn: false,
    priceRange: "$$$",
    powerConsumptionWatts: 32,
    formFactor: "1U Rack",
    powerSupply: "Single",
    notes: "2 GE RJ45 WAN + 2 GE SFP WAN + 10 GE RJ45 LAN + 2 GE SFP LAN. WAN PoE+ (802.3at) for MG cellular gateway. Fanless/quiet. Warm spare HA.",
  },

  // --- MX95 ---
  {
    id: "meraki-mx95",
    vendor: "Cisco Meraki",
    model: "MX95",
    category: "SD-WAN / Security Appliance",
    description: "1U rack-mount appliance for medium-to-large branches with 2.5G mGig WAN and SFP+ uplinks.",
    interfaces: [
      { quantity: 2, type: "2.5G mGig RJ45", purpose: "WAN", speedMbps: 2500, notes: "1 port PoE+ 802.3at for MG gateway" },
      { quantity: 2, type: "10GE SFP+", purpose: "WAN", speedMbps: 10000 },
      { quantity: 8, type: "GE RJ45", purpose: "LAN", speedMbps: 1000, notes: "Port 4 is PoE+ 802.3at" },
      { quantity: 2, type: "10GE SFP+", purpose: "LAN", speedMbps: 10000 },
    ],
    maxWanInterfaces: 2,
    maxLanPorts: 8,
    ngfwThroughputMbps: 2000,
    capacityMbps: 3000,
    features: ["poe"],
    siteTypes: ["medium_office", "large_office"],
    maxUsers: 500,
    haSupport: true,
    poeSupport: true,
    cellularBuiltIn: false,
    priceRange: "$$$$",
    powerConsumptionWatts: 45,
    formFactor: "1U Rack",
    powerSupply: "Single",
    notes: "2x 2.5G mGig RJ45 WAN + 2 SFP+ WAN + 8 GE RJ45 LAN + 2 SFP+ LAN. PoE+ on GE port 4. WAN PoE+ for MG gateway. 100W PSU.",
  },

  // --- MX105 ---
  {
    id: "meraki-mx105",
    vendor: "Cisco Meraki",
    model: "MX105",
    category: "SD-WAN / Security Appliance",
    description: "High-performance 1U rack-mount appliance for large branches. Dual redundant PSUs and 2.5G mGig WAN with SFP+ uplinks.",
    interfaces: [
      { quantity: 2, type: "2.5G mGig RJ45", purpose: "WAN", speedMbps: 2500, notes: "1 port PoE+ 802.3at for MG gateway" },
      { quantity: 2, type: "10GE SFP+", purpose: "WAN", speedMbps: 10000 },
      { quantity: 8, type: "GE RJ45", purpose: "LAN", speedMbps: 1000, notes: "Port 4 is PoE+ 802.3at" },
      { quantity: 2, type: "10GE SFP+", purpose: "LAN", speedMbps: 10000 },
    ],
    maxWanInterfaces: 2,
    maxLanPorts: 8,
    ngfwThroughputMbps: 2500,
    capacityMbps: 5000,
    features: ["poe"],
    siteTypes: ["medium_office", "large_office"],
    maxUsers: 750,
    haSupport: true,
    poeSupport: true,
    cellularBuiltIn: false,
    priceRange: "$$$$",
    powerConsumptionWatts: 55,
    formFactor: "1U Rack",
    powerSupply: "Dual",
    notes: "Same port layout as MX95. Dual redundant 250W hot-swap PSUs + replaceable fans. PoE+ on GE port 4. WAN PoE+ for MG gateway. Higher user capacity.",
  },

  // --- MX250 ---
  {
    id: "meraki-mx250",
    vendor: "Cisco Meraki",
    model: "MX250",
    category: "SD-WAN / Security Appliance",
    description: "Campus/VPN concentrator for up to 2,000 users. High-throughput 1U rack-mount with 10GbE SFP+ and dual PSUs.",
    interfaces: [
      { quantity: 2, type: "GE RJ45", purpose: "WAN", speedMbps: 1000 },
      { quantity: 8, type: "GE RJ45", purpose: "LAN", speedMbps: 1000 },
      { quantity: 2, type: "10GE SFP+", purpose: "WAN/LAN", speedMbps: 10000 },
    ],
    maxWanInterfaces: 2,
    maxLanPorts: 8,
    ngfwThroughputMbps: 3000,
    capacityMbps: 7500,
    features: [],
    siteTypes: ["large_office", "datacenter_edge"],
    maxUsers: 2000,
    haSupport: true,
    poeSupport: false,
    cellularBuiltIn: false,
    priceRange: "$$$$$",
    powerConsumptionWatts: 105,
    formFactor: "1U Rack",
    powerSupply: "Dual",
    notes: "2 GE RJ45 WAN + 8 GE RJ45 LAN + 2 10GE SFP+ (WAN/LAN). Dual 250W hot-swap PSUs + replaceable fans. Campus or VPN concentrator class.",
  },

  // --- MX450 ---
  {
    id: "meraki-mx450",
    vendor: "Cisco Meraki",
    model: "MX450",
    category: "SD-WAN / Security Appliance",
    description: "Enterprise campus and VPN concentrator for up to 10,000 users. Highest-performance MX with 10 Gbps firewall throughput.",
    interfaces: [
      { quantity: 2, type: "GE RJ45", purpose: "WAN", speedMbps: 1000 },
      { quantity: 8, type: "GE RJ45", purpose: "LAN", speedMbps: 1000 },
      { quantity: 2, type: "10GE SFP+", purpose: "WAN/LAN", speedMbps: 10000 },
    ],
    maxWanInterfaces: 2,
    maxLanPorts: 8,
    ngfwThroughputMbps: 7000,
    capacityMbps: 10000,
    features: [],
    siteTypes: ["large_office", "datacenter_edge"],
    maxUsers: 10000,
    haSupport: true,
    poeSupport: false,
    cellularBuiltIn: false,
    priceRange: "$$$$$",
    powerConsumptionWatts: 190,
    formFactor: "1U Rack",
    powerSupply: "Dual",
    notes: "2 GE RJ45 WAN + 8 GE RJ45 LAN + 2 10GE SFP+ (WAN/LAN). Dual 250W hot-swap PSUs + replaceable fans. 10 Gbps stateful firewall, 6.5 Gbps VPN. Enterprise/DC class.",
  },

  // --- C8455-G2-MX ---
  {
    id: "meraki-8455-g2-mx",
    vendor: "Cisco Meraki",
    model: "C8455-G2-MX",
    category: "Secure Router / SD-WAN",
    description: "Next-gen enterprise secure router with 25GbE SFP28 WAN, 10GbE uplinks, and new secure networking processor for AI/ML workloads.",
    interfaces: [
      { quantity: 8, type: "GE RJ45", purpose: "LAN", speedMbps: 1000 },
      { quantity: 2, type: "10GE SFP+", purpose: "LAN/WAN", speedMbps: 10000 },
      { quantity: 2, type: "25GE SFP28", purpose: "WAN", speedMbps: 25000 },
    ],
    maxWanInterfaces: 2,
    maxLanPorts: 8,
    ngfwThroughputMbps: 8000,
    capacityMbps: 20000,
    features: [],
    siteTypes: ["large_office", "datacenter_edge"],
    maxUsers: 10000,
    haSupport: true,
    poeSupport: false,
    cellularBuiltIn: false,
    priceRange: "$$$$$",
    powerConsumptionWatts: 200,
    formFactor: "1U Rack",
    powerSupply: "Single",
    notes: "8 GE RJ45 + 2 10GE SFP+ + 2 25GE SFP28 WAN. Up to 20 Gbps firewall, 8 Gbps threat protection. Cisco 8000 series running MX OS. New secure networking ASIC. Foundation for SASE.",
  },
  // ──────────────────────────────────────────────
  // VeloCloud SD-WAN
  // ──────────────────────────────────────────────

  // --- Edge 710-W ---
  {
    id: "velocloud-710w",
    vendor: "VeloCloud",
    model: "Edge 710-W",
    category: "SD-WAN Edge + Wi-Fi",
    description: "Entry-level desktop SD-WAN appliance with integrated Wi-Fi 6 for small/remote branches. Consolidates SD-WAN, firewall, router, switch, and Wi-Fi in one unit.",
    interfaces: [
      { quantity: 4, type: "GE RJ45", purpose: "LAN/WAN", speedMbps: 1000 },
      { quantity: 1, type: "GE SFP", purpose: "LAN/WAN", speedMbps: 1000 },
      { quantity: 1, type: "USB-A", purpose: "WAN (3G/4G dongle)", speedMbps: 0 },
    ],
    maxWanInterfaces: 4,
    maxLanPorts: 4,
    ngfwThroughputMbps: 395,
    capacityMbps: 500,
    features: ["wifi6"],
    siteTypes: ["small_office", "retail", "remote_worker"],
    maxUsers: 50,
    haSupport: true,
    poeSupport: false,
    cellularBuiltIn: false,
    priceRange: "$$",
    powerConsumptionWatts: 20,
    formFactor: "Desktop",
    powerSupply: "Single",
    notes: "4 GE RJ45 LAN/WAN + 1 GE SFP. Integrated Wi-Fi 6 (802.11ax). 4 GB RAM / 16 GB flash. Licensed up to 500M bandwidth tier. Fanless desktop/wall/rack mount. Requires SD-WAN release 5.2.2+.",
  },

  // --- Edge 710-5G ---
  {
    id: "velocloud-710-5g",
    vendor: "VeloCloud",
    model: "Edge 710-5G",
    category: "SD-WAN Edge + Wi-Fi + 5G",
    description: "Edge 710 with built-in 5G/LTE dual-SIM cellular modem and Wi-Fi 6. All-in-one for sites with unreliable wired circuits or wireless-first WAN.",
    interfaces: [
      { quantity: 4, type: "GE RJ45", purpose: "LAN/WAN", speedMbps: 1000 },
      { quantity: 1, type: "GE SFP", purpose: "LAN/WAN", speedMbps: 1000 },
      { quantity: 1, type: "5G/LTE", purpose: "WAN (cellular)", speedMbps: 4000, notes: "Built-in 5G modem, dual physical SIM, SIM failover" },
      { quantity: 1, type: "USB-A", purpose: "WAN (3G/4G dongle)", speedMbps: 0 },
    ],
    maxWanInterfaces: 4,
    maxLanPorts: 4,
    ngfwThroughputMbps: 395,
    capacityMbps: 500,
    features: ["wifi6", "lte_failover"],
    siteTypes: ["small_office", "retail", "remote_worker", "industrial"],
    maxUsers: 50,
    haSupport: true,
    poeSupport: false,
    cellularBuiltIn: true,
    priceRange: "$$$",
    powerConsumptionWatts: 25,
    formFactor: "Desktop",
    powerSupply: "Single",
    notes: "Same as 710-W + integrated 5G/LTE modem with dual physical SIM support and SIM failover. Wi-Fi 6. 4 GB RAM / 16 GB flash. Ideal for mobile retail, pop-up sites, or wireless-primary WAN. Requires SD-WAN release 5.2.4+.",
  },

  // --- Edge 720 ---
  {
    id: "velocloud-720",
    vendor: "VeloCloud",
    model: "Edge 720",
    category: "SD-WAN Edge",
    description: "Mid-range 1U rack-mount SD-WAN appliance for medium branches and regional offices. Intel Atom processor with 2.5G mGig and 10GbE SFP+ ports.",
    interfaces: [
      { quantity: 6, type: "2.5G mGig RJ45", purpose: "LAN/WAN", speedMbps: 2500 },
      { quantity: 2, type: "10GE SFP+", purpose: "LAN/WAN", speedMbps: 10000 },
    ],
    maxWanInterfaces: 4,
    maxLanPorts: 6,
    ngfwThroughputMbps: 2300,
    capacityMbps: 10000,
    features: [],
    siteTypes: ["medium_office", "large_office"],
    maxUsers: 250,
    haSupport: true,
    poeSupport: false,
    cellularBuiltIn: false,
    priceRange: "$$$",
    powerConsumptionWatts: 45,
    formFactor: "1U Rack",
    powerSupply: "Single",
    notes: "6x 2.5G RJ45 LAN/WAN + 2x 10GE SFP+. 8 GB RAM / 16 GB flash / 64 GB SSD. Licensed up to 10G bandwidth tier. Intel Atom class. Secure Boot + TPM 2.0. Requires SD-WAN release 5.2.4+.",
  },

  // --- Edge 740 ---
  {
    id: "velocloud-740",
    vendor: "VeloCloud",
    model: "Edge 740",
    category: "SD-WAN Edge",
    description: "High-performance 1U rack-mount SD-WAN appliance for large branches and regional hubs. Higher throughput and tunnel scale than the 720.",
    interfaces: [
      { quantity: 6, type: "2.5G mGig RJ45", purpose: "LAN/WAN", speedMbps: 2500 },
      { quantity: 2, type: "10GE SFP+", purpose: "LAN/WAN", speedMbps: 10000 },
    ],
    maxWanInterfaces: 4,
    maxLanPorts: 6,
    ngfwThroughputMbps: 3500,
    capacityMbps: 10000,
    features: [],
    siteTypes: ["large_office", "datacenter_edge"],
    maxUsers: 500,
    haSupport: true,
    poeSupport: false,
    cellularBuiltIn: false,
    priceRange: "$$$$",
    powerConsumptionWatts: 60,
    formFactor: "1U Rack",
    powerSupply: "Single",
    notes: "6x 2.5G RJ45 LAN/WAN + 2x 10GE SFP+. 16 GB RAM / 16 GB flash / 64 GB SSD. Licensed from 100M–10G bandwidth tier. Higher tunnel and session scale vs 720. Secure Boot + TPM 2.0. Requires SD-WAN release 5.2.4+.",
  },

  // --- Edge 4100 ---
  {
    id: "velocloud-4100",
    vendor: "VeloCloud",
    model: "Edge 4100",
    category: "SD-WAN Edge / Hub",
    description: "High-capacity 1U rack-mount SD-WAN appliance for large campus, regional hub, and data center edge deployments. Up to 30 Gbps throughput and 12,000 tunnels.",
    interfaces: [
      { quantity: 10, type: "GE RJ45", purpose: "LAN/WAN", speedMbps: 1000 },
      { quantity: 8, type: "10GE SFP+", purpose: "LAN/WAN", speedMbps: 10000 },
    ],
    maxWanInterfaces: 4,
    maxLanPorts: 10,
    ngfwThroughputMbps: 12000,
    capacityMbps: 40000,
    features: [],
    siteTypes: ["large_office", "datacenter_edge"],
    maxUsers: 2000,
    haSupport: true,
    poeSupport: false,
    cellularBuiltIn: false,
    priceRange: "$$$$$",
    powerConsumptionWatts: 200,
    formFactor: "1U Rack",
    powerSupply: "Dual",
    notes: "10x 1G RJ45 + 8x 10GE SFP+. Dual hot-swap PSUs. Up to 12,000 tunnels. 300% improvement over Edge 3000 series. Supports clustering beyond 100 Gbps. Replaces 3400/3800 series.",
  },

  // --- Edge 5100 ---
  {
    id: "velocloud-5100",
    vendor: "VeloCloud",
    model: "Edge 5100",
    category: "SD-WAN Edge / Data Center",
    description: "Enterprise-class 1U SD-WAN appliance for data centers and high-performance hub sites. Up to 100 Gbps throughput with 25GbE and 40GbE interfaces.",
    interfaces: [
      { quantity: 2, type: "GE RJ45", purpose: "Management", speedMbps: 1000 },
      { quantity: 8, type: "10GE SFP+", purpose: "LAN/WAN", speedMbps: 10000 },
      { quantity: 4, type: "25GE SFP28", purpose: "LAN/WAN", speedMbps: 25000 },
      { quantity: 2, type: "40GE QSFP", purpose: "LAN/WAN", speedMbps: 40000 },
    ],
    maxWanInterfaces: 4,
    maxLanPorts: 16,
    ngfwThroughputMbps: 40000,
    capacityMbps: 100000,
    features: [],
    siteTypes: ["datacenter_edge"],
    maxUsers: 10000,
    haSupport: true,
    poeSupport: false,
    cellularBuiltIn: false,
    priceRange: "$$$$$",
    powerConsumptionWatts: 350,
    formFactor: "1U Rack",
    powerSupply: "Dual",
    notes: "2x 1G RJ45 + 8x 10GE SFP+ + 4x 25GE SFP28 + 2x 40GE QSFP. Dual hot-swap PSUs. Up to 20,000 tunnels. Supports clustering beyond 100 Gbps. Enterprise DC / hub class. AI-ready edge platform.",
  },

];
