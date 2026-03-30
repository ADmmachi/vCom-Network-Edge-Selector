import { useState, useMemo } from "react";
import { type Feature, type ApplianceInterface, circuitTypes } from "../data/appliances";
import { type RecommendationResult, type ScoredAppliance, type VendorRecommendation } from "../engine/recommendationEngine";
import { Box, Text, Group, Paper, SimpleGrid, UnstyledButton, Loader, Tooltip } from "@mantine/core";
import { IconCheck, IconX, IconChevronDown, IconChevronRight } from "@tabler/icons-react";
import ScoreTooltip from "./ScoreTooltip";

function formatThroughput(mbps: number): string {
  return mbps >= 1000 ? `${mbps / 1000} Gbps` : `${mbps} Mbps`;
}

function extractModelKey(model: string): { number: number; letter: string; suffixLen: number; suffix: string } {
  const match = model.match(/(\d+)([A-Z])?(-.*)?$/);
  if (!match) return { number: 0, letter: "", suffixLen: 0, suffix: "" };
  return { number: parseInt(match[1], 10), letter: match[2] || "", suffixLen: (match[3] || "").length, suffix: match[3] || "" };
}

function compareModels(modelA: string, modelB: string): number {
  const a = extractModelKey(modelA);
  const b = extractModelKey(modelB);
  if (a.number !== b.number) return a.number - b.number;
  if (a.letter !== b.letter) {
    if (!a.letter) return -1;
    if (!b.letter) return 1;
    return a.letter.localeCompare(b.letter);
  }
  if (a.suffixLen !== b.suffixLen) return a.suffixLen - b.suffixLen;
  if (a.suffix !== b.suffix) return a.suffix.localeCompare(b.suffix);
  return modelA.localeCompare(modelB);
}

function InterfaceTable({ interfaces, maxRows }: { interfaces: ApplianceInterface[]; maxRows?: number }) {
  return (
    <Box style={{ backgroundColor: "#f8f9fa", borderRadius: 4, overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <tbody>
          {interfaces.map((iface, i) => (
            <tr key={i} style={{ borderBottom: i < interfaces.length - 1 ? "1px solid #f1f3f5" : "none" }}>
              <td style={{ padding: "4px 8px", fontSize: "0.65rem", fontWeight: 600, color: "#212529", width: 32 }}>{iface.quantity}×</td>
              <td style={{ padding: "4px 4px", fontSize: "0.65rem", color: "#495057" }}>
                {iface.type}
                {iface.poeCapable && <Text span ml={4} style={{ fontSize: "0.5rem", fontWeight: 700, color: "#EE7C13" }}>PoE</Text>}
              </td>
              <td style={{ padding: "4px 4px" }}>
                <Text span style={{
                  fontSize: "0.55rem", fontWeight: 500, padding: "1px 4px", borderRadius: 3,
                  backgroundColor: iface.purpose.includes("WAN") && !iface.purpose.includes("LAN") ? "rgba(1,76,113,0.08)" :
                    iface.purpose.includes("LAN") && !iface.purpose.includes("WAN") ? "rgba(14,135,66,0.08)" :
                    iface.purpose.includes("HA") ? "rgba(62,26,128,0.08)" : "#e9ecef",
                  color: iface.purpose.includes("WAN") && !iface.purpose.includes("LAN") ? "#014C71" :
                    iface.purpose.includes("LAN") && !iface.purpose.includes("WAN") ? "#0E8742" :
                    iface.purpose.includes("HA") ? "#3E1A80" : "#868e96",
                }}>
                  {iface.purpose}
                </Text>
              </td>
            </tr>
          ))}
          {maxRows && Array.from({ length: maxRows - interfaces.length }).map((_, i) => (
            <tr key={`sp-${i}`}><td style={{ padding: "4px 8px", background: "#fff" }}>&nbsp;</td><td style={{ background: "#fff" }}>&nbsp;</td><td style={{ background: "#fff" }}>&nbsp;</td></tr>
          ))}
        </tbody>
      </table>
    </Box>
  );
}

function NoteBox({ emoji, text, color }: { emoji: string; text: string; color: string }) {
  return (
    <Box style={{ display: "flex", alignItems: "flex-start", gap: 6, backgroundColor: `${color}08`, borderRadius: 4, padding: "6px 8px", marginBottom: 6, fontSize: "0.6rem", color }}>
      <Text span style={{ flexShrink: 0 }}>{emoji}</Text>
      <Text span style={{ fontSize: "0.6rem", color }}>{text}</Text>
    </Box>
  );
}

function RecommendedCard({ result, featureMap, maxInterfaceRows, maxCircuitRows }: {
  result: ScoredAppliance; featureMap: Record<string, string>; maxInterfaceRows: number; maxCircuitRows: number;
}) {
  const { appliance, matchDetails } = result;
  return (
    <Paper p="sm" radius="md" withBorder shadow="sm" bg="white" style={{ borderColor: "#014C71", borderWidth: 2, display: "flex", flexDirection: "column" }}>
      <Text size="xs" fw={700} tt="uppercase" style={{ letterSpacing: "0.08em", backgroundColor: "#014C71", color: "#fff", display: "inline-block", padding: "2px 8px", borderRadius: 99, fontSize: "0.6rem", marginBottom: 8, alignSelf: "flex-start" }}>
        ⭐ Recommended
      </Text>
      <Box style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <Box>
          <Text fw={700} size="md" c="dark">{appliance.model}</Text>
          <Text style={{ fontSize: "0.6rem", color: "#adb5bd" }}>{appliance.category}</Text>
        </Box>
        {appliance.features.length > 0 && (
          <Group gap={4} wrap="wrap" justify="flex-end" style={{ flexShrink: 0 }}>
            {appliance.features.map(fid => (
              <Text key={fid} span style={{ fontSize: "0.55rem", fontWeight: 600, padding: "2px 6px", borderRadius: 99, backgroundColor: "rgba(1,76,113,0.08)", color: "#014C71" }}>
                {featureMap[fid] || fid}
              </Text>
            ))}
          </Group>
        )}
      </Box>
      <SimpleGrid cols={2} spacing={6} mb="sm">
        {[
          ["Throughput", formatThroughput(appliance.throughputMbps)],
          ["FW Throughput", formatThroughput(appliance.firewallThroughputMbps)],
          ["Form Factor", appliance.formFactor],
          ["Price", appliance.priceRange],
        ].map(([label, value]) => (
          <Box key={label} style={{ backgroundColor: "#f8f9fa", borderRadius: 4, padding: "6px 8px" }}>
            <Text style={{ fontSize: "0.55rem", color: "#adb5bd", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</Text>
            <Text style={{ fontSize: "0.7rem", fontWeight: 600, color: "#212529" }}>{value}</Text>
          </Box>
        ))}
      </SimpleGrid>
      <Box mb="sm" style={{ minHeight: maxInterfaceRows * 26 + 20 }}>
        <Text style={{ fontSize: "0.55rem", fontWeight: 600, color: "#adb5bd", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Interfaces</Text>
        <InterfaceTable interfaces={appliance.interfaces} maxRows={maxInterfaceRows} />
      </Box>
      {matchDetails.interfaces && matchDetails.interfaces.matches.length > 0 && (
        <Box mb="sm" style={{ minHeight: maxCircuitRows * 30 + 18 }}>
          <Text style={{ fontSize: "0.55rem", fontWeight: 600, color: "#adb5bd", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Circuit Matching</Text>
          <Box style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {matchDetails.interfaces.matches.map(match => {
              const ctName = circuitTypes.find(ct => ct.id === match.circuitTypeId)?.name ?? match.circuitTypeId;
              return (
                <Box key={match.circuitId} style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "6px 8px", borderRadius: 4, fontSize: "0.65rem",
                  backgroundColor: match.isMatched ? "rgba(14,135,66,0.04)" : "rgba(255,107,107,0.04)",
                }}>
                  {match.isMatched ? <IconCheck size={10} color="#0E8742" style={{ flexShrink: 0 }} /> : <IconX size={10} color="#e03131" style={{ flexShrink: 0 }} />}
                  <Text span fw={500} c="gray.7" style={{ fontSize: "0.65rem" }}>{ctName}</Text>
                  <Text span c="dimmed">·</Text>
                  <Text span c="dimmed" style={{ fontSize: "0.65rem" }}>{formatThroughput(match.bandwidthMbps)}</Text>
                  {match.isMatched && <Text span ml="auto" style={{ fontSize: "0.6rem", color: "#0E8742", flexShrink: 0 }}>→ {match.matchedApplianceInterface}</Text>}
                </Box>
              );
            })}
          </Box>
        </Box>
      )}
      {result.haNote && <NoteBox emoji="🔁" text={result.haNote} color="#014C71" />}
      {result.cellularNote && <NoteBox emoji="📱" text={result.cellularNote} color="#EE7C13" />}
      {result.wifiNote && <NoteBox emoji="📶" text={result.wifiNote} color="#EE7C13" />}
      {result.poeNote && <NoteBox emoji="🔋" text={result.poeNote} color="#EE7C13" />}
    </Paper>
  );
}

function CompactCard({ result, featureMap, isNonMatching, isGrowthPick, growthReason }: {
  result: ScoredAppliance; featureMap: Record<string, string>; isNonMatching?: boolean; isGrowthPick?: boolean; growthReason?: string | null;
}) {
  const { appliance, percentageScore } = result;
  return (
    <Paper p="sm" radius="md" withBorder bg="white" style={{
      borderColor: isGrowthPick ? "#0E8742" : "#e9ecef",
      borderWidth: isGrowthPick ? 2 : 1,
      opacity: isNonMatching ? 0.75 : 1,
    }}>
      {isGrowthPick && (() => {
        const lines = growthReason ? growthReason.split("\n") : [];
        const tierLabel = lines[0] || "Recommended for future bandwidth growth";
        const detail = lines[1] || null;
        return (
          <Tooltip
            label={
              <Box>
                <Text fw={700} style={{ fontSize: "0.7rem", lineHeight: 1.3 }}>{tierLabel}</Text>
                {detail && <Text style={{ fontSize: "0.65rem", lineHeight: 1.3, opacity: 0.85, marginTop: 2 }}>{detail}</Text>}
              </Box>
            }
            position="top"
            withArrow
            multiline
            w={240}
            styles={{
              tooltip: {
                padding: "8px 12px",
                backgroundColor: "#212529",
                color: "#fff",
              },
            }}
          >
            <Text style={{ fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", backgroundColor: "#0E8742", color: "#fff", display: "inline-block", padding: "2px 8px", borderRadius: 99, marginBottom: 8, cursor: "help" }}>
              📈 Growth Pick
            </Text>
          </Tooltip>
        );
      })()}
      <Box style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <Box>
          <Text fw={700} size="sm" c="dark">{appliance.model}</Text>
          <Text style={{ fontSize: "0.6rem", color: "#adb5bd" }}>{appliance.category}</Text>
        </Box>
        <Box style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
          <ScoreTooltip result={result} featureMap={featureMap}>
            <Text span style={{
              fontSize: "0.65rem", fontWeight: 700, padding: "2px 8px", borderRadius: 99, cursor: "help",
              backgroundColor: percentageScore >= 75 ? "rgba(14,135,66,0.08)" : percentageScore >= 50 ? "rgba(238,124,19,0.08)" : "rgba(255,107,107,0.08)",
              color: percentageScore >= 75 ? "#0E8742" : percentageScore >= 50 ? "#EE7C13" : "#e03131",
            }}>
              {percentageScore}%
            </Text>
          </ScoreTooltip>
          {appliance.features.length > 0 && (
            <Group gap={4} wrap="wrap" justify="flex-end">
              {appliance.features.map(fid => (
                <Text key={fid} span style={{ fontSize: "0.55rem", fontWeight: 600, padding: "2px 6px", borderRadius: 99, backgroundColor: "rgba(1,76,113,0.08)", color: "#014C71" }}>
                  {featureMap[fid] || fid}
                </Text>
              ))}
            </Group>
          )}
        </Box>
      </Box>
      <SimpleGrid cols={2} spacing={6} mb={8}>
        <Box style={{ backgroundColor: "#f8f9fa", borderRadius: 4, padding: "6px 8px" }}>
          <Text style={{ fontSize: "0.55rem", color: "#adb5bd", textTransform: "uppercase", letterSpacing: "0.05em" }}>Throughput</Text>
          <Text style={{ fontSize: "0.7rem", fontWeight: 600, color: "#212529" }}>{formatThroughput(appliance.throughputMbps)}</Text>
        </Box>
        <Box style={{ backgroundColor: "#f8f9fa", borderRadius: 4, padding: "6px 8px" }}>
          <Text style={{ fontSize: "0.55rem", color: "#adb5bd", textTransform: "uppercase", letterSpacing: "0.05em" }}>Price</Text>
          <Text style={{ fontSize: "0.7rem", fontWeight: 600, color: "#212529" }}>{appliance.priceRange}</Text>
        </Box>
      </SimpleGrid>
      {appliance.interfaces.length > 0 && (
        <Box mb={8}>
          <Text style={{ fontSize: "0.55rem", fontWeight: 600, color: "#adb5bd", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Interfaces</Text>
          <InterfaceTable interfaces={appliance.interfaces} />
        </Box>
      )}
      {isNonMatching && result.failureReasons.length > 0 && (
        <Box pt={8} style={{ borderTop: "1px solid #f1f3f5" }}>
          {result.failureReasons.map((reason, i) => (
            <Box key={i} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.6rem", color: "#e03131" }}>
              <IconX size={8} style={{ flexShrink: 0 }} /> {reason}
            </Box>
          ))}
        </Box>
      )}
    </Paper>
  );
}

function VendorColumn({ vendorRec, featureMap, maxInterfaceRows, maxCircuitRows }: {
  vendorRec: VendorRecommendation; featureMap: Record<string, string>; maxInterfaceRows: number; maxCircuitRows: number;
}) {
  const [showUpgrades, setShowUpgrades] = useState(false);
  const [showNonMatching, setShowNonMatching] = useState(false);
  const hasRecommendation = vendorRec.recommended !== null;

  return (
    <Box style={{ display: "flex", flexDirection: "column" }}>
      <Box style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", marginBottom: 12, paddingBottom: 12, borderBottom: "1px solid #e9ecef", minHeight: 48 }}>
        <Text size="sm" fw={700} c="dark">{vendorRec.vendor}</Text>
        {!hasRecommendation && <Text style={{ fontSize: "0.6rem", color: "#adb5bd", marginTop: 4 }}>No compatible model</Text>}
      </Box>
      {hasRecommendation && (
        <RecommendedCard result={vendorRec.recommended!} featureMap={featureMap} maxInterfaceRows={maxInterfaceRows} maxCircuitRows={maxCircuitRows} />
      )}
      {vendorRec.oversizedAlternative && (
        <Paper mt="sm" p="sm" radius="md" bg="rgba(1,76,113,0.03)" withBorder style={{ borderColor: "rgba(1,76,113,0.15)" }}>
          <Text style={{ fontSize: "0.65rem", fontWeight: 600, color: "#014C71", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Alternative with built-in features</Text>
          <Text style={{ fontSize: "0.6rem", color: "#868e96", marginBottom: 8 }}>
            The <Text span fw={700}>{vendorRec.oversizedAlternative.appliance.model}</Text> meets all preferred requirements ({formatThroughput(vendorRec.oversizedAlternative.appliance.throughputMbps)} throughput) but may be oversized for this site.
          </Text>
          <CompactCard result={vendorRec.oversizedAlternative} featureMap={featureMap} />
        </Paper>
      )}
      {vendorRec.upgrades.length > 0 && (
        <Box mt="sm">
          <UnstyledButton onClick={() => setShowUpgrades(!showUpgrades)} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.7rem", fontWeight: 500, color: "#014C71" }}>
            {showUpgrades ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
            Alternative Models ({vendorRec.upgrades.length})
          </UnstyledButton>
          {showUpgrades && (
            <Box mt={8} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[...vendorRec.upgrades]
                .sort((a, b) => {
                  const aG = vendorRec.growthPick?.appliance.id === a.appliance.id ? 1 : 0;
                  const bG = vendorRec.growthPick?.appliance.id === b.appliance.id ? 1 : 0;
                  if (aG !== bG) return bG - aG;
                  if (b.percentageScore !== a.percentageScore) return b.percentageScore - a.percentageScore;
                  return compareModels(a.appliance.model, b.appliance.model);
                })
                .map(scored => (
                  <CompactCard
                    key={scored.appliance.id}
                    result={scored}
                    featureMap={featureMap}
                    isGrowthPick={vendorRec.growthPick?.appliance.id === scored.appliance.id}
                    growthReason={vendorRec.growthPick?.appliance.id === scored.appliance.id ? vendorRec.growthReason : null}
                  />
                ))}
            </Box>
          )}
        </Box>
      )}
      {vendorRec.nonMatching.length > 0 && (
        <Box mt="sm">
          <UnstyledButton onClick={() => setShowNonMatching(!showNonMatching)} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.7rem", fontWeight: 500, color: "#adb5bd" }}>
            {showNonMatching ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
            Excluded Models ({vendorRec.nonMatching.length})
          </UnstyledButton>
          {showNonMatching && (
            <Box mt={8} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[...vendorRec.nonMatching]
                .sort((a, b) => {
                  if (b.percentageScore !== a.percentageScore) return b.percentageScore - a.percentageScore;
                  return compareModels(a.appliance.model, b.appliance.model);
                })
                .map(scored => (
                  <CompactCard key={scored.appliance.id} result={scored} featureMap={featureMap} isNonMatching />
                ))}
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}

interface ResultsProps {
  results: RecommendationResult | null;
  features: Feature[];
}

export default function Results({ results, features }: ResultsProps) {
  const featureMap: Record<string, string> = {};
  features.forEach(f => { featureMap[f.id] = f.name; });

  const defaultEnabledVendors = useMemo(() => {
    if (!results) return [];
    return results.vendorRecommendations.filter(v => v.recommended !== null).map(v => v.vendor);
  }, [results]);

  const [enabledVendors, setEnabledVendors] = useState<string[]>(defaultEnabledVendors);

  if (enabledVendors.length === 0 && defaultEnabledVendors.length > 0) {
    setEnabledVendors(defaultEnabledVendors);
    return null;
  }

  const toggleVendor = (vendor: string) => {
    setEnabledVendors(prev => prev.includes(vendor) ? prev.filter(v => v !== vendor) : [...prev, vendor]);
  };

  if (!results) {
    return (
      <Box style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 0", gap: 16 }}>
        <Loader color="vcom-teal" />
        <Text c="dimmed">Analyzing appliances...</Text>
      </Box>
    );
  }

  const visibleVendors = results.vendorRecommendations.filter(v => enabledVendors.includes(v.vendor));
  const maxInterfaceRows = visibleVendors.reduce((max, v) => v.recommended ? Math.max(max, v.recommended.appliance.interfaces.length) : max, 0);
  const maxCircuitRows = visibleVendors.reduce((max, v) => v.recommended ? Math.max(max, v.recommended.matchDetails.interfaces?.matches.length ?? 0) : max, 0);
  const columnCount = visibleVendors.length;

  return (
    <Box>
      <Box ta="center" mb="lg">
        <Text size="xl" fw={700} c="dark">🎯 Recommendations</Text>
        <Text size="sm" c="dimmed" mt={4}>
          Evaluated {results.totalEvaluated} appliances across {results.vendorRecommendations.length} vendors
        </Text>
      </Box>
      <Group justify="center" gap={8} mb="lg">
        {results.vendorRecommendations.map(vr => {
          const isEnabled = enabledVendors.includes(vr.vendor);
          const hasMatch = vr.recommended !== null;
          return (
            <UnstyledButton key={vr.vendor} onClick={() => toggleVendor(vr.vendor)} style={{
              padding: "8px 16px", borderRadius: 8, border: `2px solid ${isEnabled ? "#014C71" : "#dee2e6"}`,
              backgroundColor: isEnabled ? "#014C71" : "#fff", color: isEnabled ? "#fff" : "#868e96",
              fontSize: "0.875rem", fontWeight: 600, transition: "all 200ms",
            }}>
              {isEnabled && <Text span mr={6}>✓</Text>}
              {vr.vendor}
              {!hasMatch && <Text span ml={6} style={{ fontSize: "0.6rem", opacity: 0.7 }}>(no match)</Text>}
            </UnstyledButton>
          );
        })}
      </Group>
      {visibleVendors.length === 0 ? (
        <Box ta="center" py="xl"><Text c="dimmed" size="sm">Select at least one vendor above to see recommendations.</Text></Box>
      ) : (
        <SimpleGrid
          cols={columnCount === 1 ? 1 : columnCount === 2 ? { base: 1, md: 2 } : { base: 1, md: 3 }}
          spacing="lg"
          style={columnCount === 1 ? { maxWidth: 512, margin: "0 auto" } : undefined}
        >
          {visibleVendors.map(vr => (
            <VendorColumn key={vr.vendor} vendorRec={vr} featureMap={featureMap} maxInterfaceRows={maxInterfaceRows} maxCircuitRows={maxCircuitRows} />
          ))}
        </SimpleGrid>
      )}
    </Box>
  );
}
