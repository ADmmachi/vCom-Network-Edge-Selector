import { useState } from "react";
import {
  type CircuitType,
  type CircuitEntry,
  getDefaultHandoff,
  getHandoffOptionsForCircuitType,
  getDownloadOptions,
  getUploadOptions,
  isSymmetrical,
} from "../data/appliances";
import { Box, Text, Group, Select, NumberInput, NativeSelect, Button, SimpleGrid, Paper } from "@mantine/core";
import { IconChevronDown } from "@tabler/icons-react";

interface StepCircuitsProps {
  circuitTypes: CircuitType[];
  circuits: CircuitEntry[];
  onCircuitsChange: (circuits: CircuitEntry[]) => void;
}

const CIRCUIT_COUNT_OPTIONS = [1, 2, 3, 4, 5, 6];

function formatBandwidth(mbps: number): string {
  return mbps >= 1000 ? `${mbps / 1000} Gbps` : `${mbps} Mbps`;
}

function createBlankCircuit(index: number): CircuitEntry {
  return {
    id: `circuit-${Date.now()}-${index}`,
    circuitTypeId: "",
    bandwidthMbps: 0,
    uploadMbps: null,
    handoffId: "",
  };
}

export default function StepCircuits({ circuitTypes, circuits, onCircuitsChange }: StepCircuitsProps) {
  const [customDownload, setCustomDownload] = useState<Record<string, boolean>>({});
  const [customUpload, setCustomUpload] = useState<Record<string, boolean>>({});
  const [handoffOverridden, setHandoffOverridden] = useState<Record<string, boolean>>({});

  const handleCountChange = (count: number) => {
    if (count === circuits.length) return;
    if (count > circuits.length) {
      const newCircuits = [...circuits];
      for (let index = circuits.length; index < count; index++) {
        newCircuits.push(createBlankCircuit(index));
      }
      onCircuitsChange(newCircuits);
    } else {
      onCircuitsChange(circuits.slice(0, count));
    }
  };

  const handleTypeChange = (circuitId: string, circuitTypeId: string) => {
    onCircuitsChange(
      circuits.map(circuit => {
        if (circuit.id !== circuitId) return circuit;
        return { ...circuit, circuitTypeId, bandwidthMbps: 0, uploadMbps: null, handoffId: "" };
      })
    );
    setCustomDownload(prev => ({ ...prev, [circuitId]: false }));
    setCustomUpload(prev => ({ ...prev, [circuitId]: false }));
    setHandoffOverridden(prev => ({ ...prev, [circuitId]: false }));
  };

  const handleDownloadChange = (circuitId: string, downloadMbps: number) => {
    onCircuitsChange(
      circuits.map(circuit => {
        if (circuit.id !== circuitId) return circuit;
        const symmetrical = isSymmetrical(circuit.circuitTypeId);
        const isOther = circuit.circuitTypeId === "other";
        const newHandoff = isOther ? circuit.handoffId : getDefaultHandoff(circuit.circuitTypeId, downloadMbps);
        return {
          ...circuit,
          bandwidthMbps: downloadMbps,
          uploadMbps: symmetrical ? downloadMbps : circuit.uploadMbps,
          handoffId: newHandoff,
        };
      })
    );
    if (!circuits.find(c => c.id === circuitId && c.circuitTypeId === "other")) {
      setHandoffOverridden(prev => ({ ...prev, [circuitId]: false }));
    }
  };

  const handleUploadChange = (circuitId: string, uploadMbps: number) => {
    onCircuitsChange(
      circuits.map(circuit => (circuit.id === circuitId ? { ...circuit, uploadMbps } : circuit))
    );
  };

  const handleHandoffChange = (circuitId: string, handoffId: string) => {
    onCircuitsChange(
      circuits.map(circuit => (circuit.id === circuitId ? { ...circuit, handoffId } : circuit))
    );
    setHandoffOverridden(prev => ({ ...prev, [circuitId]: true }));
  };

  return (
    <Paper p={{ base: "lg", sm: "xl" }} radius="lg" withBorder shadow="lg" bg="white">
      <Group gap={8} mb={4}>
        <Text size="xl" fw={700} c="dark">🔌 WAN Circuits</Text>
      </Group>
      <Text size="sm" c="dimmed" mb="lg">
        How many WAN circuits will connect to this appliance?
      </Text>

      <Group gap={8} mb="xl">
        {CIRCUIT_COUNT_OPTIONS.map(count => (
          <Button
            key={count}
            w={48}
            h={48}
            radius="md"
            variant={circuits.length === count ? "filled" : "outline"}
            color={circuits.length === count ? "vcom-teal" : "gray"}
            fw={700}
            size="md"
            onClick={() => handleCountChange(count)}
            styles={{
              root: {
                padding: 0,
                ...(circuits.length !== count && {
                  borderColor: "#dee2e6",
                  color: "#495057",
                  "&:hover": { borderColor: "#014C71", color: "#014C71" },
                }),
              },
            }}
          >
            {count}
          </Button>
        ))}
      </Group>

      {circuits.length > 0 && (
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
          {circuits.map((circuit, index) => {
            const hasType = circuit.circuitTypeId !== "";
            const isOther = circuit.circuitTypeId === "other";
            const symmetrical = hasType && isSymmetrical(circuit.circuitTypeId);
            const downloadOptions = hasType ? getDownloadOptions(circuit.circuitTypeId) : [];
            const uploadOptions = hasType ? getUploadOptions(circuit.circuitTypeId) : [];
            const handoffOptions = hasType ? getHandoffOptionsForCircuitType(circuit.circuitTypeId) : [];
            const isCustomDl = customDownload[circuit.id] ?? false;
            const isCustomUl = customUpload[circuit.id] ?? false;
            const isHandoffUserChanged = handoffOverridden[circuit.id] ?? false;
            const showHandoff = isOther
              ? hasType && circuit.bandwidthMbps > 0
              : hasType && circuit.bandwidthMbps > 0 && circuit.handoffId !== "";

            return (
              <Paper key={circuit.id} p="md" radius="md" bg="#F7F5F0" withBorder style={{ borderColor: "#e9ecef" }}>
                <Box mb="sm">
                  <Text size="xs" fw={700} c="#014C71" style={{
                    backgroundColor: "rgba(1,76,113,0.1)",
                    display: "inline-block",
                    padding: "2px 10px",
                    borderRadius: 99,
                  }}>
                    WAN {index + 1}
                  </Text>
                </Box>

                {/* Circuit Type */}
                <Box mb="sm">
                  <Text size="xs" fw={600} c="dimmed" tt="uppercase" mb={8} style={{ letterSpacing: "0.05em" }}>
                    Circuit Type
                  </Text>
                  <NativeSelect
                    value={circuit.circuitTypeId}
                    onChange={(e) => handleTypeChange(circuit.id, e.currentTarget.value)}
                    rightSection={<IconChevronDown size={14} />}
                    data={[
                      { label: "Select type...", value: "", disabled: true },
                      ...circuitTypes.map(ct => ({ label: ct.name, value: ct.id })),
                    ]}
                    styles={{
                      input: {
                        backgroundColor: "#fff",
                        borderColor: "#dee2e6",
                        color: hasType ? "#212529" : "#adb5bd",
                      },
                    }}
                  />
                </Box>

                {/* Bandwidth */}
                {hasType && (
                  <Box mb="sm">
                    <Text size="xs" fw={600} c="dimmed" tt="uppercase" mb={8} style={{ letterSpacing: "0.05em" }}>
                      Bandwidth
                      {symmetrical && (
                        <Text span size="xs" c="dimmed" fw={400} ml={8} tt="none" style={{ letterSpacing: 0 }}>
                          (symmetrical — upload matches download)
                        </Text>
                      )}
                    </Text>

                    <SimpleGrid cols={2} spacing="sm">
                      {/* Download */}
                      <Box>
                        <Text size="xs" c="dimmed" mb={4} style={{ fontSize: "0.6rem" }}>
                          {symmetrical ? "Speed" : "Download"}
                        </Text>
                        {!isCustomDl ? (
                          <NativeSelect
                            value={
                              circuit.bandwidthMbps === 0
                                ? ""
                                : downloadOptions.some(opt => opt.valueMbps === circuit.bandwidthMbps)
                                  ? String(circuit.bandwidthMbps)
                                  : ""
                            }
                            onChange={(e) => {
                              const val = e.currentTarget.value;
                              if (val === "custom") {
                                setCustomDownload(prev => ({ ...prev, [circuit.id]: true }));
                                return;
                              }
                              if (val === "") return;
                              handleDownloadChange(circuit.id, parseInt(val, 10));
                            }}
                            data={[
                              { label: "Select speed...", value: "", disabled: true },
                              ...downloadOptions.map(opt => ({ label: opt.label, value: String(opt.valueMbps) })),
                              { label: "Custom...", value: "custom" },
                            ]}
                            styles={{
                              input: {
                                backgroundColor: "#fff",
                                borderColor: "#dee2e6",
                                color: circuit.bandwidthMbps === 0 ? "#adb5bd" : "#212529",
                              },
                            }}
                          />
                        ) : (
                          <Box>
                            <NumberInput
                              placeholder="Enter Mbps"
                              value={circuit.bandwidthMbps > 0 ? circuit.bandwidthMbps : ""}
                              onChange={(val) => {
                                if (typeof val === "number" && val > 0) handleDownloadChange(circuit.id, val);
                              }}
                              min={1}
                              autoFocus
                              styles={{ input: { backgroundColor: "#fff", borderColor: "#dee2e6" } }}
                            />
                            <Text
                              size="xs"
                              c="vcom-teal"
                              mt={4}
                              style={{ cursor: "pointer", fontSize: "0.6rem" }}
                              onClick={() => setCustomDownload(prev => ({ ...prev, [circuit.id]: false }))}
                            >
                              ← Back to presets
                            </Text>
                          </Box>
                        )}
                      </Box>

                      {/* Upload */}
                      {!symmetrical ? (
                        <Box>
                          <Text size="xs" c="dimmed" mb={4} style={{ fontSize: "0.6rem" }}>Upload</Text>
                          {!isCustomUl ? (
                            <NativeSelect
                              value={
                                circuit.uploadMbps === null || circuit.uploadMbps === 0
                                  ? ""
                                  : uploadOptions.some(opt => opt.valueMbps === circuit.uploadMbps)
                                    ? String(circuit.uploadMbps ?? "")
                                    : ""
                              }
                              onChange={(e) => {
                                const val = e.currentTarget.value;
                                if (val === "custom") {
                                  setCustomUpload(prev => ({ ...prev, [circuit.id]: true }));
                                  return;
                                }
                                if (val === "") return;
                                handleUploadChange(circuit.id, parseInt(val, 10));
                              }}
                              data={[
                                { label: "Select speed...", value: "", disabled: true },
                                ...uploadOptions.map(opt => ({ label: opt.label, value: String(opt.valueMbps) })),
                                { label: "Custom...", value: "custom" },
                              ]}
                              styles={{
                                input: {
                                  backgroundColor: "#fff",
                                  borderColor: "#dee2e6",
                                  color: (circuit.uploadMbps === null || circuit.uploadMbps === 0) ? "#adb5bd" : "#212529",
                                },
                              }}
                            />
                          ) : (
                            <Box>
                              <NumberInput
                                placeholder="Enter Mbps"
                                value={circuit.uploadMbps != null && circuit.uploadMbps > 0 ? circuit.uploadMbps : ""}
                                onChange={(val) => {
                                  if (typeof val === "number" && val > 0) handleUploadChange(circuit.id, val);
                                }}
                                min={1}
                                autoFocus
                                styles={{ input: { backgroundColor: "#fff", borderColor: "#dee2e6" } }}
                              />
                              <Text
                                size="xs"
                                c="vcom-teal"
                                mt={4}
                                style={{ cursor: "pointer", fontSize: "0.6rem" }}
                                onClick={() => setCustomUpload(prev => ({ ...prev, [circuit.id]: false }))}
                              >
                                ← Back to presets
                              </Text>
                            </Box>
                          )}
                        </Box>
                      ) : (
                        <Box>
                          <Text size="xs" c="dimmed" mb={4} style={{ fontSize: "0.6rem" }}>Upload</Text>
                          <Box
                            p="xs"
                            style={{
                              backgroundColor: "#f1f3f5",
                              border: "1px solid #e9ecef",
                              borderRadius: 8,
                              color: "#adb5bd",
                              fontSize: "0.875rem",
                            }}
                          >
                            {circuit.bandwidthMbps > 0 ? formatBandwidth(circuit.bandwidthMbps) : "Mirrors download"}
                          </Box>
                        </Box>
                      )}
                    </SimpleGrid>
                  </Box>
                )}

                {/* Hand-off */}
                {showHandoff && (
                  <Box>
                    <Text size="xs" fw={600} c="dimmed" tt="uppercase" mb={8} style={{ letterSpacing: "0.05em" }}>
                      Hand-off
                    </Text>
                    <NativeSelect
                      value={circuit.handoffId}
                      onChange={(e) => handleHandoffChange(circuit.id, e.currentTarget.value)}
                      data={
                        isOther && circuit.handoffId === ""
                          ? [
                              { label: "Select hand-off...", value: "", disabled: true },
                              ...handoffOptions.map(h => ({ label: h.name, value: h.id })),
                            ]
                          : handoffOptions.map(h => ({ label: h.name, value: h.id }))
                      }
                      styles={{
                        input: {
                          backgroundColor: "#fff",
                          borderColor: "#dee2e6",
                          color: circuit.handoffId === "" ? "#adb5bd" : "#212529",
                        },
                      }}
                    />
                    {circuit.handoffId !== "" && (
                      <Text size="xs" c="dimmed" mt={6} style={{ fontSize: "0.6rem" }}>
                        {isOther
                          ? "Manually selected"
                          : isHandoffUserChanged
                            ? "Manually changed by user"
                            : "Auto-selected based on circuit type and bandwidth"}
                      </Text>
                    )}
                  </Box>
                )}
              </Paper>
            );
          })}
        </SimpleGrid>
      )}

      {circuits.length > 0 && circuits.some(circuit => circuit.bandwidthMbps > 0) && (
        <Box mt="md" pt="md" style={{ borderTop: "1px solid #e9ecef" }}>
          <Text size="xs" c="dimmed">
            <Text span fw={700} c="dark">{circuits.length}</Text> circuit{circuits.length !== 1 ? "s" : ""}
            {" · "}
            <Text span fw={700} c="dark">
              {formatBandwidth(circuits.reduce((total, circuit) => total + circuit.bandwidthMbps, 0))}
            </Text> total download
          </Text>
        </Box>
      )}
    </Paper>
  );
}
