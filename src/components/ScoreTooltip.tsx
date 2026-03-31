import { useState, useRef, useEffect, type ReactNode } from "react";
import { Box, Text } from "@mantine/core";
import type { ScoredAppliance } from "../engine/recommendationEngine";

interface ScoreTooltipProps {
  result: ScoredAppliance;
  featureMap: Record<string, string>;
  children: ReactNode;
}

export default function ScoreTooltip({ result, featureMap, children }: ScoreTooltipProps) {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState<"bottom" | "top">("bottom");
  const wrapperRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const { matchDetails, percentageScore } = result;

  useEffect(() => {
    if (visible && wrapperRef.current && tooltipRef.current) {
      const wrapperRect = wrapperRef.current.getBoundingClientRect();
      const tooltipHeight = tooltipRef.current.offsetHeight;
      const spaceBelow = window.innerHeight - wrapperRect.bottom;
      setPosition(spaceBelow < tooltipHeight + 12 ? "top" : "bottom");
    }
  }, [visible]);

  const interfaces = matchDetails.interfaces;
  const throughput = matchDetails.throughput;
  const features = matchDetails.features;
  const formatMbps = (mbps: number) =>
    mbps >= 1000 ? `${(mbps / 1000).toFixed(mbps % 1000 === 0 ? 0 : 1)} Gbps` : `${mbps} Mbps`;

  return (
    <Box ref={wrapperRef} style={{ position: "relative", display: "inline-flex" }}
      onMouseEnter={() => setVisible(true)} onMouseLeave={() => setVisible(false)}>
      {children}
      {visible && (
        <Box ref={tooltipRef} style={{
          position: "absolute", zIndex: 50, width: 224, backgroundColor: "#1a1b1e", color: "#fff",
          fontSize: "0.6rem", borderRadius: 8, boxShadow: "0 10px 40px rgba(0,0,0,0.3)", padding: 12,
          pointerEvents: "none", lineHeight: 1.4, right: 0,
          ...(position === "bottom" ? { top: "100%", marginTop: 8 } : { bottom: "100%", marginBottom: 8 }),
        }}>
          <Box style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, paddingBottom: 6, borderBottom: "1px solid #373A40" }}>
            <Text fw={700} style={{ fontSize: "0.65rem", color: "#fff" }}>Score Breakdown</Text>
            <Text fw={700} style={{ fontSize: "0.7rem", color: percentageScore >= 75 ? "#51cf66" : percentageScore >= 50 ? "#fcc419" : "#ff6b6b" }}>{percentageScore}%</Text>
          </Box>
          {interfaces && (
            <Box mb={8}>
              <Box style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                <Text fw={600} style={{ color: "#909296", fontSize: "0.6rem" }}>Interfaces</Text>
                <Text fw={700} style={{ color: interfaces.allMatched ? "#51cf66" : "#fcc419", fontSize: "0.6rem" }}>{Math.round(interfaces.score)}/{interfaces.max}</Text>
              </Box>
              <Text style={{ color: "#909296", fontSize: "0.6rem" }}>
                {interfaces.matches.filter(m => m.isMatched).length}/{interfaces.matches.length} ports matched
                {interfaces.allMatched ? <Text span style={{ color: "#51cf66" }}> ✓</Text> : <Text span style={{ color: "#fcc419" }}> partial</Text>}
              </Text>
            </Box>
          )}
          {throughput && (
            <Box mb={8}>
              <Box style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                <Text fw={600} style={{ color: "#909296", fontSize: "0.6rem" }}>NGFW Throughput</Text>
                <Text fw={700} style={{ color: throughput.meetsRequirement ? "#51cf66" : "#ff6b6b", fontSize: "0.6rem" }}>{Math.round(throughput.score)}/{throughput.max}</Text>
              </Box>
              <Text style={{ color: "#909296", fontSize: "0.6rem" }}>
                {formatMbps(throughput.applianceThroughput)} device / {formatMbps(throughput.totalRequired)} needed
                {throughput.meetsRequirement ? <Text span style={{ color: "#51cf66" }}> ✓</Text> : <Text span style={{ color: "#ff6b6b" }}> ✗</Text>}
              </Text>
            </Box>
          )}
          {features && (
            <Box>
              <Box style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                <Text fw={600} style={{ color: "#909296", fontSize: "0.6rem" }}>Features</Text>
                <Text fw={700} style={{ color: features.missing.length === 0 ? "#51cf66" : "#fcc419", fontSize: "0.6rem" }}>{Math.round(features.score)}/{features.max}</Text>
              </Box>
              <Box style={{ color: "#909296", fontSize: "0.6rem" }}>
                {features.matched.length > 0 && <Text style={{ fontSize: "0.6rem" }}><Text span style={{ color: "#51cf66" }}>✓</Text> {features.matched.map(f => featureMap[f] || f).join(", ")}</Text>}
                {features.missing.length > 0 && <Text style={{ fontSize: "0.6rem" }}><Text span style={{ color: "#ff6b6b" }}>✗</Text> {features.missing.map(f => featureMap[f] || f).join(", ")}</Text>}
                {features.matched.length === 0 && features.missing.length === 0 && <Text style={{ fontSize: "0.6rem" }}>No features required</Text>}
              </Box>
            </Box>
          )}
          <Box style={{ position: "absolute", width: 8, height: 8, backgroundColor: "#1a1b1e", transform: "rotate(45deg)", right: 16, ...(position === "bottom" ? { top: -4 } : { bottom: -4 }) }} />
        </Box>
      )}
    </Box>
  );
}
