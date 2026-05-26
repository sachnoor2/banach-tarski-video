// Shared constants and types for Banach-Tarski video chunks
// ALL timing is synced to audio duration: 100.6237 seconds at 60fps = 6037 frames

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

// Audio file: ElevenLabs narration
// Exact duration: 100.6237 seconds (3852 MP3 frames, 128kbps, 44100Hz)
// Total frames at 60fps: 6037 (= 100.6167s, 0.007s shorter than audio — negligible)
//
// Phase boundaries scaled proportionally from original 120s design:
//   Phase 1 (Solid Sphere):       0.00s - 22.36s  → frames 0 - 1342  (1342 frames)
//   Phase 2 (Split):             22.36s - 41.93s  → frames 1342 - 2516 (1174 frames)
//   Phase 3 (Reassembly):        41.93s - 67.08s  → frames 2516 - 4025 (1509 frames)
//   Phase 4 (Infinity):          67.08s - 100.62s → frames 4025 - 6037 (2012 frames)

export const AUDIO_DURATION_SEC = 100.6237;
export const TOTAL_FRAMES = 6037;

export const PHASE_BOUNDARIES = {
  phase1End: 1342,   // 22.36s — Split begins
  phase2End: 2516,   // 41.93s — Reassembly begins
  phase3End: 4025,   // 67.08s — Infinity state begins
  totalFrames: 6037, // 100.62s — Video ends (matches audio)
} as const;

// Color transition points (scaled proportionally)
export const COLOR_TRANSITIONS = {
  phase1To2End: 1510, // frame 1342 + 168 = 22.36s + 2.80s → Gold→Colors complete
  phase2To3End: 2851, // frame 2516 + 335 = 41.93s + 5.58s → Colors→Gold complete
} as const;

// Per-second visual scene descriptor (for alignment validation)
// Maps each second to the expected visual content
export const PER_SECOND_SCENE: Record<number, { phase: string; description: string; formula: string; status: string }> = {};
// Populated below for every second 0-100

function buildSceneMap() {
  for (let sec = 0; sec <= 100; sec++) {
    const frame = sec * FPS;
    if (frame < PHASE_BOUNDARIES.phase1End) {
      PER_SECOND_SCENE[sec] = {
        phase: "Phase 1: Solid Sphere",
        description: "Gold sphere rotating slowly",
        formula: "S = SPHERE",
        status: "BOUNDED SOLID OBJECT",
      };
    } else if (frame < PHASE_BOUNDARIES.phase2End) {
      PER_SECOND_SCENE[sec] = {
        phase: "Phase 2: Decomposition",
        description: "Sphere splitting into 5 colored sets",
        formula: "S = A ∪ B ∪ C ∪ D ∪ E",
        status: "NON-MEASURABLE DECOMPOSITION",
      };
    } else if (frame < PHASE_BOUNDARIES.phase3End) {
      PER_SECOND_SCENE[sec] = {
        phase: "Phase 3: Reassembly",
        description: "Sets reassembling into twin spheres",
        formula: "S → S₁ + S₂ (V → 2V)",
        status: "PARADOXICAL REASSEMBLY",
      };
    } else {
      PER_SECOND_SCENE[sec] = {
        phase: "Phase 4: Infinity",
        description: "Twin spheres stable, infinity equivalence",
        formula: "ℵ₀ + ℵ₀ = ℵ₀",
        status: "ABSTRACT INFINITY EQUIVALENCE",
      };
    }
  }
}
buildSceneMap();

export type Point3D = {
  x: number;
  y: number;
  z: number;
  setId: number;
};

// Golden angle distribution for uniform sphere point placement
export const generatePureSphere = (): Point3D[] => {
  const points: Point3D[] = [];
  const phi = Math.PI * (3 - Math.sqrt(5));

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

// Hex color interpolation
export const interpolateColor = (colorA: string, colorB: string, t: number): string => {
  const clampT = Math.max(0, Math.min(1, t));
  const parseHex = (hex: string) => {
    const h = hex.replace("#", "");
    return {
      r: parseInt(h.substring(0, 2), 16) || 0,
      g: parseInt(h.substring(2, 4), 16) || 0,
      b: parseInt(h.substring(4, 6), 16) || 0,
    };
  };
  const a = parseHex(colorA);
  const b = parseHex(colorB);
  const r = Math.round(a.r + (b.r - a.r) * clampT);
  const g = Math.round(a.g + (b.g - a.g) * clampT);
  const bl = Math.round(a.b + (b.b - a.b) * clampT);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${bl.toString(16).padStart(2, "0")}`;
};

// HUD state machine
export const getHUDState = (frame: number) => {
  if (frame < PHASE_BOUNDARIES.phase1End) {
    return { systemStatus: "BOUNDED SOLID OBJECT", formulaOverlay: "S = SPHERE" };
  } else if (frame < PHASE_BOUNDARIES.phase2End) {
    return { systemStatus: "NON-MEASURABLE DECOMPOSITION", formulaOverlay: "S = A ∪ B ∪ C ∪ D ∪ E" };
  } else if (frame < PHASE_BOUNDARIES.phase3End) {
    return { systemStatus: "PARADOXICAL REASSEMBLY", formulaOverlay: "S → S₁ + S₂ (V → 2V)" };
  } else {
    return { systemStatus: "ABSTRACT INFINITY EQUIVALENCE", formulaOverlay: "ℵ₀ + ℵ₀ = ℵ₀" };
  }
};

// Density display
export const getDensityDisplay = (frame: number): string => {
  if (frame >= PHASE_BOUNDARIES.phase3End) return "\u2135\u2080 (ALEPH-NAUGHT)";
  const densityExponent = Math.max(3, Math.min(45,
    3 + ((frame - PHASE_BOUNDARIES.phase1End) / (5500 - PHASE_BOUNDARIES.phase1End)) * 42
  ));
  return `10^${Math.floor(densityExponent)} points/cm\u00B3`;
};
