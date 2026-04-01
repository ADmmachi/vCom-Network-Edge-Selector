import { useState, useCallback } from "react";
import { Box, Text, Group, Button, Container } from "@mantine/core";
import { IconArrowLeft, IconArrowRight, IconRefresh, IconTarget } from "@tabler/icons-react";
import { circuitTypes, features, type CircuitEntry } from "./data/appliances";
import { getRecommendations, type RecommendationResult } from "./engine/recommendationEngine";
import ProgressBar from "./components/ProgressBar";
import StepCircuits from "./components/StepCircuits";
import StepFeatures from "./components/StepFeatures";
import Results from "./components/Results";

const TOTAL_STEPS = 3;

export default function App() {
  const [currentStep, setCurrentStep] = useState(1);
  const [results, setResults] = useState<RecommendationResult | null>(null);
  const [circuits, setCircuits] = useState<CircuitEntry[]>([]);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [requiredPoePorts, setRequiredPoePorts] = useState(2);
  const [requireHA, setRequireHA] = useState(false);

  const toggleFeature = useCallback((featureId: string) => {
    setSelectedFeatures(prev =>
      prev.includes(featureId)
        ? prev.filter(id => id !== featureId)
        : [...prev, featureId]
    );
  }, []);

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 1:
        return circuits.length > 0 &&
          circuits.every(c => c.circuitTypeId !== "" && c.bandwidthMbps > 0);
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (currentStep < TOTAL_STEPS - 1) {
      setCurrentStep(prev => prev + 1);
    } else if (currentStep === TOTAL_STEPS - 1) {
      const rec = getRecommendations({
        circuits,
        features: selectedFeatures,
        requiredPoePorts: selectedFeatures.includes("poe") ? requiredPoePorts : 0,
        requireHA,
      });
      setResults(rec);
      setCurrentStep(TOTAL_STEPS);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      if (currentStep === TOTAL_STEPS) setResults(null);
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleStartOver = () => {
    setCurrentStep(1);
    setCircuits([]);
    setSelectedFeatures([]);
    setRequiredPoePorts(2);
    setRequireHA(false);
    setResults(null);
  };

  return (
    <Box style={{ display: "flex", flexDirection: "column", minHeight: "100vh", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
      {/* Header */}
      <Box
        component="header"
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          backgroundColor: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid #EDE9DE",
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        }}
      >
        <Container size="lg" py={12}>
          <Group justify="space-between" align="center">
            <img src="/vcom-logo.png" alt="vCom — An AppDirect Company" style={{ height: 40 }} />
            <Box>
              <Text size="sm" fw={700} c="#3E1A80">Network Edge Appliance Selector</Text>
              <Text size="xs" c="dimmed" ta="right">v2.0</Text>
            </Box>
          </Group>
        </Container>
      </Box>

      {/* Main */}
      <Box component="main" style={{ flex: 1 }}>
        <Container size="lg" pb="xl">
          <ProgressBar currentStep={currentStep} />

          {currentStep === 1 && (
            <StepCircuits
              circuitTypes={circuitTypes}
              circuits={circuits}
              onCircuitsChange={setCircuits}
            />
          )}

          {currentStep === 2 && (
            <StepFeatures
              features={features}
              selectedFeatures={selectedFeatures}
              onToggle={toggleFeature}
              requiredPoePorts={requiredPoePorts}
              onPoePortsChange={setRequiredPoePorts}
              requireHA={requireHA}
              onHAChange={setRequireHA}
            />
          )}

          {currentStep === 3 && (
            <Results results={results} features={features} selectedFeatures={selectedFeatures} />
          )}

          {/* Navigation */}
          <Box
            mt="xl"
            pt="lg"
            style={{
              borderTop: "1px solid #EDE9DE",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Box>
              {currentStep > 1 && (
                <Button
                  variant="outline"
                  color="gray"
                  radius="xl"
                  leftSection={<IconArrowLeft size={16} />}
                  onClick={handleBack}
                  styles={{
                    root: {
                      borderColor: "#dee2e6",
                      color: "#868e96",
                      "&:hover": { borderColor: "#014C71", color: "#014C71" },
                    },
                  }}
                >
                  Back
                </Button>
              )}
            </Box>
            <Group gap="sm">
              {currentStep === TOTAL_STEPS && (
                <Button
                  variant="outline"
                  color="gray"
                  radius="xl"
                  leftSection={<IconRefresh size={16} />}
                  onClick={handleStartOver}
                  styles={{
                    root: {
                      borderColor: "#dee2e6",
                      color: "#868e96",
                      "&:hover": { borderColor: "#014C71", color: "#014C71" },
                    },
                  }}
                >
                  Start Over
                </Button>
              )}
              {currentStep < TOTAL_STEPS && (
                <Button
                  radius="xl"
                  disabled={!canProceed()}
                  onClick={handleNext}
                  leftSection={currentStep === TOTAL_STEPS - 1 ? <IconTarget size={16} /> : undefined}
                  rightSection={currentStep < TOTAL_STEPS - 1 ? <IconArrowRight size={16} /> : undefined}
                  style={{
                    backgroundColor: "#014C71",
                    boxShadow: "0 2px 8px rgba(1,76,113,0.3)",
                  }}
                  styles={{
                    root: {
                      "&:hover": { backgroundColor: "#3E1A80" },
                      "&:disabled": { opacity: 0.4, boxShadow: "none" },
                    },
                  }}
                >
                  {currentStep === TOTAL_STEPS - 1 ? "Get Recommendations" : "Next"}
                </Button>
              )}
            </Group>
          </Box>
        </Container>
      </Box>

      {/* Footer */}
      <Box
        component="footer"
        py="lg"
        ta="center"
        style={{ borderTop: "1px solid #EDE9DE", marginTop: "auto" }}
      >
        <Text size="xs" c="dimmed">© vCom Solutions — Network Edge Appliance Selector v2.0</Text>
      </Box>
    </Box>
  );
}
