// Shared constants and types for Banach-Tarski video chunks

export const NUM_POINTS = 1300;
export const SPHERE_RADIUS = 280;
export const GOLD_HEX = "#FFD700";
export const SET_COLORS = [
  "#00FFFF", // Cyan
  "#FF69B4", // Pink
  "#32CD32", // Lime Green
  "#50C878", // Emerald
  "#FF00FF", // Magenta
];

export const VIDEO_WIDTH = 1080;
export const VIDEO_HEIGHT = 1920;
export const FPS = 60;

// Phase boundaries in frames (at 60fps)
// Phase 1: 0 - 26.67s (0 - 1600 frames) - Solid sphere
// Phase 2: 26.67s - 50s (1600 - 3000 frames) - Split/Decomposition
// Phase 3: 50s - 80s (3000 - 4800 frames) - Reassembly/Duplication
// Phase 4: 80s - 120s (4800 - 7200 frames) - Final infinity state
export const PHASE_BOUNDARIES = {
  phase1End: 1600,
  phase2End: 3000,
  phase3End: 4800,
  totalFrames: 7200,
} as const;

export type Point3D = {
  x: number;
  y: number;
  z: number;
  setId: number;
};

// Golden angle distribution for uniform sphere point placement
export const generatePureSphere = (): Point3D[] => {
  const points: Point3D[] = [];
  const phi = Math.PI * (3 - Math.sqrt(5)); // Golden angle

  for (let i = 0; i < NUM_POINTS; i++) {
    const y = 1 - (i / (NUM_POINTS - 1)) * 2;
    const radius = Math.sqrt(1 - y * y);
    const theta = phi * i;

    const x = Math.cos(theta) * radius;
    const z = Math.sin(theta) * radius;

    points.push({ x, y, z, setId: i % 5 });
  }
  return points;
};

// Helper: interpolate colors (hex string interpolation)
export const interpolateColor = (
  colorA: string,
  colorB: string,
  t: number
): string => {
  const clampT = Math.max(0, Math.min(1, t));
  const parseHex = (hex: string) => {
    const h = hex.replace("#", "");
    return {
      r: parseInt(h.substring(0, 2), 16),
      g: parseInt(h.substring(2, 4), 16),
      b: parseInt(h.substring(4, 6), 16),
    };
  };
  const a = parseHex(colorA);
  const b = parseHex(colorB);
  const r = Math.round(a.r + (b.r - a.r) * clampT);
  const g = Math.round(a.g + (b.g - a.g) * clampT);
  const bl = Math.round(a.b + (b.b - a.b) * clampT);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${bl.toString(16).padStart(2, "0")}`;
};

// HUD state machine - returns status text and formula for a given frame
export const getHUDState = (frame: number) => {
  if (frame < PHASE_BOUNDARIES.phase1End) {
    return {
      systemStatus: "BOUNDED SOLID OBJECT",
      formulaOverlay: "S = SPHERE",
    };
  } else if (frame < PHASE_BOUNDARIES.phase2End) {
    return {
      systemStatus: "NON-MEASURABLE DECOMPOSITION",
      formulaOverlay: "S = A ∪ B ∪ C ∪ D ∪ E",
    };
  } else if (frame < PHASE_BOUNDARIES.phase3End) {
    return {
      systemStatus: "PARADOXICAL REASSEMBLY",
      formulaOverlay: "S → S₁ + S₂ (V → 2V)",
    };
  } else {
    return {
      systemStatus: "ABSTRACT INFINITY EQUIVALENCE",
      formulaOverlay: "ℵ₀ + ℵ₀ = ℵ₀",
    };
  }
};

// Density display value
export const getDensityDisplay = (frame: number): string => {
  if (frame >= PHASE_BOUNDARIES.phase3End) {
    return "ℵ₀ (ALEPH-NAUGHT)";
  }
  const densityExponent = Math.max(
    3,
    Math.min(
      45,
      3 +
        ((frame - PHASE_BOUNDARIES.phase1End) /
          (5500 - PHASE_BOUNDARIES.phase1End)) *
          42
    )
  );
  return `10^${Math.floor(densityExponent)} points/cm³`;
};
