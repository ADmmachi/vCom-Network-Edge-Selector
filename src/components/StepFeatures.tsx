import { type Feature } from "../data/appliances";
import { Box, Text, Group, Paper, UnstyledButton } from "@mantine/core";
import { IconCheck } from "@tabler/icons-react";

const POE_PORT_OPTIONS = [1, 2, 3, 4, 6, 8, 12, 16, 24];

interface StepFeaturesProps {
  features: Feature[];
  selectedFeatures: string[];
  onToggle: (featureId: string) => void;
  requiredPoePorts: number;
  onPoePortsChange: (count: number) => void;
  requireHA: boolean;
  onHAChange: (value: boolean) => void;
}

export default function StepFeatures({
  features,
  selectedFeatures,
  onToggle,
  requiredPoePorts,
  onPoePortsChange,
  requireHA,
  onHAChange,
}: StepFeaturesProps) {
  const poeSelected = selectedFeatures.includes("poe");

  return (
    <Paper p={{ base: "lg", sm: "xl" }} radius="lg" withBorder shadow="lg" bg="white">
      <Group gap={8} mb={4}>
        <Text size="xl" fw={700} c="dark">🧩 Hardware Requirements</Text>
      </Group>
      <Text size="sm" c="dimmed" mb="lg">
        Select any built-in hardware capabilities the appliance must have.
        Only select what the site specifically requires.
      </Text>

      <Box style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {features.map((feature) => {
          const isSelected = selectedFeatures.includes(feature.id);
          const isPoE = feature.id === "poe";

          return (
            <Box key={feature.id}>
              <UnstyledButton
                onClick={() => onToggle(feature.id)}
                w="100%"
                p="md"
                style={{
                  textAlign: "left",
                  borderRadius: 12,
                  border: `2px solid ${isSelected ? "#014C71" : "#e9ecef"}`,
                  backgroundColor: isSelected ? "rgba(1,76,113,0.06)" : "#fff",
                  position: "relative",
                  transition: "all 200ms",
                }}
              >
                <Text size="sm" fw={500} c={isSelected ? "dark" : "gray.7"}>
                  {feature.name}
                </Text>
                <Text size="xs" c="dimmed" mt={4}>{feature.description}</Text>
                {isSelected && (
                  <IconCheck
                    size={16}
                    color="#014C71"
                    style={{ position: "absolute", top: 16, right: 16 }}
                  />
                )}
              </UnstyledButton>

              {isPoE && poeSelected && (
                <Paper ml="md" mt="sm" mb="xs" p="md" withBorder radius="md" bg="white">
                  <Text size="xs" fw={600} c="dimmed" mb="sm">
                    How many PoE ports do you need?
                  </Text>
                  <Group gap={8}>
                    {POE_PORT_OPTIONS.map(count => (
                      <UnstyledButton
                        key={count}
                        onClick={() => onPoePortsChange(count)}
                        style={{
                          minWidth: 48,
                          padding: "6px 12px",
                          borderRadius: 8,
                          border: `1px solid ${requiredPoePorts === count ? "#014C71" : "#dee2e6"}`,
                          backgroundColor: requiredPoePorts === count ? "rgba(1,76,113,0.06)" : "#fff",
                          color: requiredPoePorts === count ? "#014C71" : "#495057",
                          fontSize: "0.875rem",
                          fontWeight: 600,
                          textAlign: "center",
                          transition: "all 200ms",
                        }}
                      >
                        {count}
                      </UnstyledButton>
                    ))}
                  </Group>
                  <Text size="xs" c="dimmed" mt={8} style={{ fontSize: "0.65rem" }}>
                    Count of devices needing PoE power (APs, cameras, phones, etc.)
                  </Text>
                </Paper>
              )}
            </Box>
          );
        })}
      </Box>

      {/* HA Toggle */}
      <Box mt="xl" pt="lg" style={{ borderTop: "1px solid #e9ecef" }}>
        <Text size="sm" fw={700} c="dark" mb={4}>Redundancy</Text>
        <Text size="xs" c="dimmed" mb="md">
          Does this site require a high-availability (HA) pair for failover?
        </Text>
        <UnstyledButton
          onClick={() => onHAChange(!requireHA)}
          w="100%"
          p="md"
          style={{
            textAlign: "left",
            borderRadius: 12,
            border: `2px solid ${requireHA ? "#014C71" : "#e9ecef"}`,
            backgroundColor: requireHA ? "rgba(1,76,113,0.06)" : "#fff",
            position: "relative",
            transition: "all 200ms",
          }}
        >
          <Text size="sm" fw={500} c={requireHA ? "dark" : "gray.7"}>
            HA Pair (Active / Passive)
          </Text>
          <Text size="xs" c="dimmed" mt={4}>
            Deploy two identical appliances for automatic failover. Requires quantity of 2 and an available interface for HA peering.
          </Text>
          {requireHA && (
            <IconCheck
              size={16}
              color="#014C71"
              style={{ position: "absolute", top: 16, right: 16 }}
            />
          )}
        </UnstyledButton>
      </Box>
    </Paper>
  );
}
