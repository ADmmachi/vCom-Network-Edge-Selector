import { Group, Text, Box } from "@mantine/core";
import { IconCheck } from "@tabler/icons-react";

const STEPS = [
  { label: "Circuits" },
  { label: "Hardware" },
  { label: "Results" },
];

interface ProgressBarProps {
  currentStep: number;
}

export default function ProgressBar({ currentStep }: ProgressBarProps) {
  return (
    <Box my="xl">
      <Group justify="center" gap={4}>
        {STEPS.map((step, index) => {
          const stepNumber = index + 1;
          const isActive = stepNumber === currentStep;
          const isCompleted = stepNumber < currentStep;

          return (
            <Group key={step.label} gap={4} wrap="nowrap">
              {index > 0 && (
                <Box
                  w={{ base: 32, sm: 48 }}
                  h={2}
                  style={{
                    backgroundColor: isCompleted ? "#0E8742" : "#dee2e6",
                    transition: "background-color 300ms",
                    borderRadius: 1,
                  }}
                />
              )}
              <Box style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <Box
                  w={36}
                  h={36}
                  style={{
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 14,
                    fontWeight: 600,
                    border: "2px solid",
                    borderColor: isActive
                      ? "#014C71"
                      : isCompleted
                        ? "#0E8742"
                        : "#dee2e6",
                    backgroundColor: isActive
                      ? "#014C71"
                      : isCompleted
                        ? "#0E8742"
                        : "#fff",
                    color: isActive || isCompleted ? "#fff" : "#adb5bd",
                    transition: "all 300ms",
                  }}
                >
                  {isCompleted ? <IconCheck size={16} /> : stepNumber}
                </Box>
                <Text
                  size="xs"
                  mt={6}
                  style={{
                    whiteSpace: "nowrap",
                    color: isActive ? "#014C71" : "#adb5bd",
                    fontWeight: isActive ? 600 : 400,
                    fontSize: "0.65rem",
                    transition: "color 300ms",
                  }}
                >
                  {step.label}
                </Text>
              </Box>
            </Group>
          );
        })}
      </Group>
    </Box>
  );
}
