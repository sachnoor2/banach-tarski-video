import React, { useMemo } from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {
  generatePureSphere,
  interpolateColor,
  getHUDState,
  getDensityDisplay,
  SPHERE_RADIUS,
  GOLD_HEX,
  SET_COLORS,
  PHASE_BOUNDARIES,
} from "../shared";

interface ChunkProps {
  /** The global frame offset where this chunk starts */
  globalStartFrame: number;
}

/**
 * Renders the Banach-Tarski visualization for a specific chunk.
 * `useCurrentFrame()` returns local chunk frames (0-based).
 * We add `globalStartFrame` to get the global frame for animation math.
 */
export const BanachTarskiChunk: React.FC<ChunkProps> = ({ globalStartFrame }) => {
  const localFrame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const points = useMemo(() => generatePureSphere(), []);

  // Global frame = local frame + chunk start offset
  const globalFrame = localFrame + globalStartFrame;

  // --- VOICE TIMING SPRINGS (use global frame) ---
  const splitSpring = spring({
    frame: Math.max(0, globalFrame - PHASE_BOUNDARIES.phase1End),
    fps,
    config: { damping: 18, stiffness: 50 },
  });

  const duplicateSpring = spring({
    frame: Math.max(0, globalFrame - PHASE_BOUNDARIES.phase2End),
    fps,
    config: { damping: 22, stiffness: 40, mass: 1.2 },
  });

  // Global rotation
  const rotX = interpolate(globalFrame, [0, PHASE_BOUNDARIES.totalFrames], [0, Math.PI * 12]);
  const rotY = interpolate(globalFrame, [0, PHASE_BOUNDARIES.totalFrames], [0, Math.PI * 24]);

  // HUD state
  const { systemStatus, formulaOverlay } = getHUDState(globalFrame);
  const displayDensity = getDensityDisplay(globalFrame);

  return (
    <AbsoluteFill style={{ backgroundColor: "#020617", fontFamily: "system-ui, sans-serif", overflow: "hidden" }}>
      {/* Background gradient */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(ellipse at center, #1e293b 0%, #020617 50%, #000000 100%)",
        }}
      />

      {/* Top Header */}
      <div
        style={{
          position: "absolute",
          top: 112,
          width: "100%",
          zIndex: 50,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          paddingLeft: 24,
          paddingRight: 24,
        }}
      >
        <h1
          style={{
            fontSize: 54,
            lineHeight: 1.1,
            fontWeight: 900,
            letterSpacing: "-0.02em",
            textAlign: "center",
            textTransform: "uppercase",
            margin: 0,
          }}
        >
          <span
            style={{
              background: "linear-gradient(to right, #fbbf24, #f97316)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            The Math Trap:
          </span>
          <br />
          <span
            style={{
              color: "#ffffff",
              textShadow: "0 0 20px rgba(255,255,255,0.6)",
            }}
          >
            1 Sphere = 2 Duplicates
          </span>
        </h1>
      </div>

      {/* 3D Simulation Canvas */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          perspective: "1500px",
        }}
      >
        {[0, 1, 2, 3, 4].map((setId) => {
          const subset = points.filter((p) => p.setId === setId);

          const angle = (setId / 5) * Math.PI * 2;
          const explodeX = Math.cos(angle) * 380 * splitSpring;
          const explodeY = Math.sin(angle) * 380 * splitSpring;

          const isTopCluster = setId < 3;
          const finalTargetY = isTopCluster ? -420 : 420;

          const currentTransformX = interpolate(duplicateSpring, [0, 1], [explodeX, 0]);
          const currentTransformY = interpolate(duplicateSpring, [0, 1], [explodeY, finalTargetY]);

          const individualScale = interpolate(duplicateSpring, [0, 1], [1, 1.75]);

          // Color transitions
          const phase1To2T = Math.max(
            0,
            Math.min(
              1,
              interpolate(globalFrame, [PHASE_BOUNDARIES.phase1End, PHASE_BOUNDARIES.phase1End + 200], [0, 1])
            )
          );
          const phase1To2Color = interpolateColor(GOLD_HEX, SET_COLORS[setId], phase1To2T);

          const phase2To3T = Math.max(
            0,
            Math.min(
              1,
              interpolate(globalFrame, [PHASE_BOUNDARIES.phase2End, PHASE_BOUNDARIES.phase2End + 400], [0, 1])
            )
          );
          const finalColor = interpolateColor(phase1To2Color, GOLD_HEX, phase2To3T);

          return (
            <div
              key={`subset-${setId}`}
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transformStyle: "preserve-3d",
                transform: `translate(-50%, -50%) translate3d(${currentTransformX}px, ${currentTransformY}px, 0) rotateX(${rotX}rad) rotateY(${rotY}rad)`,
              }}
            >
              {subset.map((point, index) => {
                const posX = point.x * SPHERE_RADIUS * individualScale;
                const posY = point.y * SPHERE_RADIUS * individualScale;
                const posZ = point.z * SPHERE_RADIUS * individualScale;

                const opacity = interpolate(point.z, [-1, 1], [0.2, 1]);
                const blurValue = interpolate(point.z, [-1, 1], [3, 0]);

                return (
                  <div
                    key={`pt-${index}`}
                    style={{
                      position: "absolute",
                      borderRadius: "50%",
                      width: 7,
                      height: 7,
                      backgroundColor: finalColor,
                      boxShadow: `0 0 12px ${finalColor}`,
                      transform: `translate3d(${posX}px, ${posY}px, ${posZ}px)`,
                      opacity,
                      filter: `blur(${blurValue}px)`,
                    }}
                  />
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Bottom HUD Overlay */}
      <div
        style={{
          position: "absolute",
          bottom: 112,
          width: "100%",
          display: "flex",
          justifyContent: "center",
          zIndex: 50,
        }}
      >
        <div
          style={{
            width: "88%",
            backgroundColor: "rgba(15, 23, 42, 0.9)",
            border: "1px solid #1e293b",
            borderRadius: 16,
            padding: 32,
            backdropFilter: "blur(16px)",
            boxShadow: "0 0 50px rgba(0,0,0,0.9)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          {/* Formula */}
          <div
            style={{
              fontSize: 44,
              fontFamily: "monospace",
              fontWeight: 700,
              letterSpacing: "0.1em",
              color: "#22d3ee",
              textShadow: "0 0 12px rgba(34,211,238,0.5)",
              marginBottom: 24,
            }}
          >
            {formulaOverlay}
          </div>

          {/* Divider */}
          <div
            style={{
              height: 1,
              width: "100%",
              background: "linear-gradient(to right, transparent, #334155, transparent)",
              marginBottom: 24,
            }}
          />

          {/* Metadata row */}
          <div
            style={{
              width: "100%",
              display: "flex",
              justifyContent: "space-between",
              paddingLeft: 8,
              paddingRight: 8,
              fontFamily: "monospace",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
              <span style={{ color: "#64748b", fontSize: 18, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Paradox Status
              </span>
              <span style={{ color: "#f1f5f9", fontSize: 24, fontWeight: 600, marginTop: 4 }}>
                {systemStatus}
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
              <span style={{ color: "#64748b", fontSize: 18, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Point Complexity
              </span>
              <span
                style={{
                  color: "#e879f9",
                  fontSize: 24,
                  fontWeight: 700,
                  textShadow: "0 0 8px rgba(232,121,249,0.4)",
                  marginTop: 4,
                }}
              >
                {displayDensity}
              </span>
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
