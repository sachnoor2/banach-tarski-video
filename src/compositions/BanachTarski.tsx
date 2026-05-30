import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Sequence,
} from "remotion";
import React from "react";

// ═══════════════════════════════════════════════════════════════
//  CANVAS CONSTANTS
// ═══════════════════════════════════════════════════════════════
const W = 1080;
const H = 1920;
const CX = W / 2;
const CY = H / 2;
const FPS = 60;

// ═══════════════════════════════════════════════════════════════
//  SCENE TIMELINE   (frames @ 60fps)
// ═══════════════════════════════════════════════════════════════
const SC = {
  INTRO_START:       0,    // cinematic title smash
  INTRO_END:         410,
  BIRTH_START:       410,  // sphere coalesces from void
  BIRTH_END:         1081,
  SHATTER_START:     1081,  // sphere EXPLODES into 5 sets
  SHATTER_END:       1714,
  DRIFT_START:       1714,  // sets orbit with SO3 lightning
  DRIFT_END:         2385,
  ASSEMBLE_START:    2385, // 5 sets converge → 2 spheres
  ASSEMBLE_END:      3168,
  REVEAL_START:      3168, // twin spheres pulse + equations rain
  REVEAL_END:        3913,
  INFINITY_START:    3913, // infinity / AC visualizer
  INFINITY_END:      4845,
  OUTRO_START:       4845,
  TOTAL:             6037,
};

// ═══════════════════════════════════════════════════════════════
//  COLOR PALETTE
// ═══════════════════════════════════════════════════════════════
const C = {
  gold:    "#FFD700",
  amber:   "#FF9500",
  cyan:    "#00FFFF",
  pink:    "#FF2D78",
  lime:    "#39FF14",
  emerald: "#00FF87",
  violet:  "#BF5FFF",
  magenta: "#FF00DD",
  red:     "#FF3355",
  white:   "#FFFFFF",
  ice:     "#A8F0FF",
};
const SET_C = [C.cyan, C.pink, C.lime, C.emerald, C.magenta];

// ═══════════════════════════════════════════════════════════════
//  DETERMINISTIC MATH
// ═══════════════════════════════════════════════════════════════
const sr = (seed: number) => {
  const x = Math.sin(seed + 1.618) * 43758.5453123;
  return x - Math.floor(x);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const easeOutCubic = (t: number) => 1 - Math.pow(1 - clamp01(t), 3);
const easeInCubic  = (t: number) => Math.pow(clamp01(t), 3);

// 500 deterministic sphere surface points
const SPHERE_PTS = Array.from({ length: 500 }, (_, i) => {
  const phi   = Math.acos(1 - 4 * sr(i * 3 + 1));
  const theta = 2 * Math.PI * sr(i * 3 + 4);
  const r     = 0.25 + 0.75 * sr(i * 3 + 3);
  return {
    x:   r * Math.sin(phi) * Math.cos(theta),
    y:   r * Math.sin(phi) * Math.sin(theta),
    z:   r * Math.cos(phi),
    set: i % 5,
  };
});

// 800 explosion debris particles
const DEBRIS = Array.from({ length: 800 }, (_, i) => ({
  phi:   Math.acos(1 - 4 * sr(i * 5 + 11)),
  theta: 2 * Math.PI * sr(i * 5 + 42),
  speed: 1.2 + sr(i * 5 + 33) * 3.5,
  size:  0.8 + sr(i * 5 + 74) * 2.8,
  set:   i % 5,
  life:  0.4 + sr(i * 5 + 55) * 0.6,
  delay: sr(i * 5 + 66) * 0.3,
}));

// ═══════════════════════════════════════════════════════════════
//  SVG DEFS
// ═══════════════════════════════════════════════════════════════
const Defs: React.FC = () => (
  <defs>
    {/* Filters */}
    <filter id="f-gold"   x="-80%" y="-80%" width="260%" height="260%">
      <feGaussianBlur stdDeviation="9"  result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="f-massive" x="-150%" y="-150%" width="400%" height="400%">
      <feGaussianBlur stdDeviation="28" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="f-soft" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="4"  result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="f-mid" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="10" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="f-halo" x="-200%" y="-200%" width="500%" height="500%">
      <feGaussianBlur stdDeviation="45" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    {/* Color-tinted glows */}
    {[["cyan","0,255,255"],["pink","255,45,120"],["lime","57,255,20"],
      ["em","0,255,135"],["mag","255,0,221"],["vio","191,95,255"]].map(([id, rgb]) => (
      <filter key={id} id={`f-${id}`} x="-80%" y="-80%" width="260%" height="260%">
        <feGaussianBlur stdDeviation="10" result="b"/>
        <feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    ))}
    {/* Gradients */}
    <radialGradient id="g-bg" cx="50%" cy="45%" r="70%">
      <stop offset="0%"   stopColor="#0d0020"/>
      <stop offset="40%"  stopColor="#050012"/>
      <stop offset="100%" stopColor="#000005"/>
    </radialGradient>
    <radialGradient id="g-sph" cx="34%" cy="28%" r="65%">
      <stop offset="0%"   stopColor="#FFFBE0"/>
      <stop offset="35%"  stopColor="#FFD700" stopOpacity="0.95"/>
      <stop offset="75%"  stopColor="#FF8800" stopOpacity="0.65"/>
      <stop offset="100%" stopColor="#AA3300" stopOpacity="0.30"/>
    </radialGradient>
    <radialGradient id="g-core" cx="50%" cy="50%" r="50%">
      <stop offset="0%"   stopColor="#FFFFFF" stopOpacity="0.95"/>
      <stop offset="40%"  stopColor="#FFD700" stopOpacity="0.80"/>
      <stop offset="100%" stopColor="#FF9500" stopOpacity="0"/>
    </radialGradient>
    <radialGradient id="g-inf" cx="50%" cy="50%" r="60%">
      <stop offset="0%"   stopColor="#BF5FFF" stopOpacity="0.25"/>
      <stop offset="60%"  stopColor="#5500AA" stopOpacity="0.10"/>
      <stop offset="100%" stopColor="#000000" stopOpacity="0"/>
    </radialGradient>
    <linearGradient id="g-title" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%"   stopColor="#FFD700"/>
      <stop offset="50%"  stopColor="#FFFFFF"/>
      <stop offset="100%" stopColor="#FF9500"/>
    </linearGradient>
    {/* Scanline */}
    <pattern id="p-scan" x="0" y="0" width="1" height="3" patternUnits="userSpaceOnUse">
      <rect x="0" y="0" width="1" height="1" fill="white" fillOpacity="0.018"/>
    </pattern>
  </defs>
);

// ═══════════════════════════════════════════════════════════════
//  CINEMATIC BACKGROUND — nebula + shifting color atmosphere
// ═══════════════════════════════════════════════════════════════
const CinematicBG: React.FC<{ frame: number }> = ({ frame }) => {
  const t = frame / SC.TOTAL;
  const shatterPulse = frame >= SC.SHATTER_START && frame < SC.SHATTER_START + 168
    ? interpolate(frame, [SC.SHATTER_START, SC.SHATTER_START + 168], [1, 0], { extrapolateRight: "clamp" })
    : 0;
  const revealPulse = frame >= SC.REVEAL_START && frame < SC.REVEAL_START + 424
    ? interpolate(frame, [SC.REVEAL_START, SC.REVEAL_START + 424], [1, 0], { extrapolateRight: "clamp" })
    : 0;

  // Deep nebula colors shift across scenes
  const nebulaHue = interpolate(frame, [0, SC.SHATTER_START, SC.ASSEMBLE_START, SC.INFINITY_START, SC.TOTAL],
    [280, 300, 200, 260, 180], { extrapolateRight: "clamp" });

  return (
    <>
      <rect width={W} height={H} fill="url(#g-bg)"/>
      <rect width={W} height={H} fill="url(#p-scan)" opacity={0.7}/>

      {/* Dynamic nebula atmosphere */}
      <ellipse cx={CX + Math.sin(frame * 0.007) * 120} cy={CY * 0.6}
        rx={680} ry={420} fill={`hsla(${nebulaHue},85%,25%,0.06)`} filter="url(#f-halo)"/>
      <ellipse cx={CX * 0.4 + Math.cos(frame * 0.009) * 80} cy={CY * 1.4}
        rx={500} ry={360} fill={`hsla(${nebulaHue + 60},90%,20%,0.05)`} filter="url(#f-halo)"/>
      <ellipse cx={CX * 1.6 + Math.sin(frame * 0.011) * 60} cy={CY * 0.9}
        rx={420} ry={300} fill={`hsla(${nebulaHue - 75},80%,30%,0.04)`} filter="url(#f-halo)"/>

      {/* Shatter flash atmosphere */}
      {shatterPulse > 0 && (
        <rect width={W} height={H} fill="#FF3355" opacity={shatterPulse * 0.12}/>
      )}
      {/* Reveal warm glow */}
      {revealPulse > 0 && (
        <rect width={W} height={H} fill="#FFD700" opacity={revealPulse * 0.08}/>
      )}

      {/* Star field — 220 deterministic stars */}
      {Array.from({ length: 220 }, (_, i) => {
        const bx   = sr(i * 4 + 1) * W;
        const by   = sr(i * 4 + 4) * H;
        const sz   = 0.4 + sr(i * 4 + 3) * 1.8;
        const twkl = Math.sin(frame * (0.03 + sr(i * 4 + 7) * 0.07) + i) * 0.5 + 0.5;
        const op   = (0.1 + sr(i * 4 + 5) * 0.6) * (0.5 + twkl * 0.5);
        return (
          <circle key={i} cx={bx} cy={by} r={sz}
            fill={i % 8 === 0 ? C.ice : "#FFFFFF"} opacity={op}/>
        );
      })}

      {/* Shooting stars (periodic) */}
      {Array.from({ length: 5 }, (_, i) => {
        const trigger = 180 * i + 168;
        const lf = (frame - trigger) % 720;
        if (lf < 0 || lf > 55) return null;
        const p = lf / 55;
        const sx = sr(i * 9 + 1) * W * 0.6;
        const sy = sr(i * 9 + 4) * H * 0.5;
        const len = 180 + sr(i * 9 + 3) * 240;
        const angle = -0.4 - sr(i * 9 + 7) * 0.4;
        const ex = sx + Math.cos(angle) * len * p;
        const ey = sy + Math.sin(angle) * len * p;
        const op = interpolate(lf, [0, 6, 45, 55], [0, 0.9, 0.9, 0]);
        return (
          <line key={i} x1={sx} y1={sy} x2={ex} y2={ey}
            stroke="#FFFFFF" strokeWidth={1.5} opacity={op}
            strokeLinecap="round"/>
        );
      })}

      {/* Vignette */}
      <radialGradient id="g-vig" cx="50%" cy="50%" r="70%">
        <stop offset="0%"   stopColor="#000000" stopOpacity="0"/>
        <stop offset="100%" stopColor="#000000" stopOpacity="0.72"/>
      </radialGradient>
      <rect width={W} height={H} fill="url(#g-vig)"/>
    </>
  );
};

// ═══════════════════════════════════════════════════════════════
//  SCENE 1: CINEMATIC INTRO TITLE SMASH
// ═══════════════════════════════════════════════════════════════
const SceneIntro: React.FC<{ frame: number }> = ({ frame }) => {
  const lf = frame - SC.INTRO_START;
  if (lf < 0) return null;

  // Title crashes down from top with overshooting spring
  const titleSp = spring({ frame: lf, fps: FPS, config: { stiffness: 120, damping: 9 } });
  const titleY  = interpolate(titleSp, [0, 1], [-300, 0]);

  // Subtitle slides up
  const subSp  = spring({ frame: Math.max(0, lf - 56), fps: FPS, config: { stiffness: 90, damping: 14 } });
  const subY   = interpolate(subSp, [0, 1], [80, 0]);
  const subOp  = interpolate(subSp, [0, 1], [0, 1]);

  // Word-by-word stagger for the descriptor line
  const words  = ["MATHEMATICS", "•", "INFINITY", "•", "PARADOX"];
  const fade   = interpolate(lf, [60, 160], [0, 1], { extrapolateRight: "clamp" });

  // Scanline glitch
  const glitch = lf < 8 ? (sr(lf + 3) - 0.5) * 18 : 0;
  const glitch2= lf < 8 ? (sr(lf + 7) - 0.5) * 10 : 0;

  // Scale pulse after landing
  const landFrame = Math.max(0, lf - 14);
  const punchSp = spring({ frame: landFrame, fps: FPS, config: { stiffness: 300, damping: 8 } });
  const titleSc = interpolate(punchSp, [0, 0.3, 1], [1.8, 0.88, 1]);

  // Exit fade
  const exitOp  = interpolate(lf, [SC.INTRO_END - 75, SC.INTRO_END], [1, 0], { extrapolateRight: "clamp" });

  // Decorative horizontal energy bars
  const barProgress = interpolate(lf, [10, 80], [0, 1], { extrapolateRight: "clamp" });

  return (
    <g opacity={exitOp}>
      {/* Central energy blast on title crash */}
      {lf < 30 && (
        <circle cx={CX} cy={CY - 149}
          r={interpolate(lf, [0, 30], [0, 800])}
          fill="none" stroke={C.gold}
          strokeWidth={interpolate(lf, [0, 14, 30], [8, 3, 0])}
          opacity={interpolate(lf, [0, 14, 30], [0.9, 0.6, 0])}
          filter="url(#f-gold)"/>
      )}

      {/* Top/bottom energy bars */}
      <g transform={`translate(0, ${CY - 160})`}>
        <rect x={CX - 760 * barProgress} y={-2} width={920 * barProgress} height={2}
          fill={C.gold} filter="url(#f-gold)" opacity={0.8}/>
        <rect x={CX - 760 * barProgress} y={160} width={920 * barProgress} height={2}
          fill={C.gold} filter="url(#f-gold)" opacity={0.8}/>
        {/* Corner ticks */}
        {barProgress > 0.95 && (
          <>
            <rect x={CX - 760} y={-16} width={2} height={20} fill={C.gold} opacity={0.9}/>
            <rect x={CX + 758} y={-16} width={2} height={20} fill={C.gold} opacity={0.9}/>
            <rect x={CX - 760} y={158} width={2} height={20} fill={C.gold} opacity={0.9}/>
            <rect x={CX + 758} y={158} width={2} height={20} fill={C.gold} opacity={0.9}/>
          </>
        )}
      </g>

      {/* Main title */}
      <g transform={`translate(${CX}, ${CY + titleY})`}>
        {/* Shadow/chromatic aberration layers */}
        <text x={glitch * 1.2}    y={0} textAnchor="middle"
          fontFamily="'Impact', 'Arial Black', sans-serif" fontWeight="900" fontSize={118}
          fill={C.cyan} opacity={0.25} letterSpacing="-2">BANACH</text>
        <text x={glitch2 * 0.8}   y={0} textAnchor="middle"
          fontFamily="'Impact', 'Arial Black', sans-serif" fontWeight="900" fontSize={118}
          fill={C.pink} opacity={0.20} letterSpacing="-2">BANACH</text>
        <text x={0} y={0} textAnchor="middle"
          fontFamily="'Impact', 'Arial Black', sans-serif" fontWeight="900" fontSize={118}
          fill="url(#g-title)" filter="url(#f-gold)" letterSpacing="-2"
          transform={`scale(${titleSc}, 1)`}>BANACH</text>

        <text x={glitch} y={112} textAnchor="middle"
          fontFamily="'Impact', 'Arial Black', sans-serif" fontWeight="900" fontSize={118}
          fill={C.cyan} opacity={0.25} letterSpacing="-2">TARSKI</text>
        <text x={0}      y={112} textAnchor="middle"
          fontFamily="'Impact', 'Arial Black', sans-serif" fontWeight="900" fontSize={118}
          fill="url(#g-title)" filter="url(#f-gold)" letterSpacing="-2"
          transform={`scale(${titleSc}, 1)`}>TARSKI</text>

        {/* PARADOX subtitle */}
        <g transform={`translate(0, ${subY + 148})`} opacity={subOp}>
          <rect x={-260} y={-2} width={520} height={52} rx={4} fill="#FFFFFF10" stroke={C.gold} strokeWidth={1.5}/>
          <text x={0} y={38} textAnchor="middle"
            fontFamily="'Courier New', monospace" fontWeight="700" fontSize={38}
            fill={C.gold} letterSpacing="14">PARADOX</text>
        </g>
      </g>

      {/* Descriptor words row */}
      <g opacity={fade}>
        {words.map((w, i) => {
          const wop = interpolate(lf, [60 + i * 14, 80 + i * 14], [0, 1], { extrapolateRight: "clamp" });
          const wty = interpolate(lf, [60 + i * 14, 80 + i * 14], [12, 0], { extrapolateRight: "clamp" });
          return (
            <text key={i} x={CX + (i - 4) * 172} y={CY + 190 + wty}
              textAnchor="middle"
              fontFamily="'Courier New', monospace" fontSize={22} fontWeight="600"
              fill={i % 2 === 1 ? C.gold : C.white}
              opacity={wop * 0.8} letterSpacing="3">{w}</text>
          );
        })}
      </g>

      {/* Particle burst on intro */}
      {lf < 60 && Array.from({ length: 60 }, (_, i) => {
        const angle = (i / 60) * Math.PI * 2;
        const spd   = (0.5 + sr(i * 6) * 1.0) * lf;
        const px    = CX + Math.cos(angle) * spd * 8;
        const py    = (CY - 149) + Math.sin(angle) * spd * 8;
        const pop   = interpolate(lf, [0, 5, 60], [0, 1, 0]);
        return (
          <circle key={i} cx={px} cy={py} r={1.5 + sr(i * 6 + 1) * 3}
            fill={i % 3 === 0 ? C.gold : i % 3 === 1 ? C.cyan : C.white}
            opacity={pop * (0.4 + sr(i * 6 + 4) * 0.5)}/>
        );
      })}
    </g>
  );
};

// ═══════════════════════════════════════════════════════════════
//  SCENE 2: SPHERE BIRTH — particles coalesce from void
// ═══════════════════════════════════════════════════════════════
const SceneBirth: React.FC<{ frame: number }> = ({ frame }) => {
  const lf = frame - SC.BIRTH_START;
  if (lf < 0) return null;
  const dur  = SC.BIRTH_END - SC.BIRTH_START;
  const exitP = interpolate(lf, [dur - 50, dur], [1, 0], { extrapolateRight: "clamp" });

  // Camera zoom-in effect via overall scale
  const camSp  = spring({ frame: lf, fps: FPS, config: { stiffness: 30, damping: 18 } });
  const camSc  = interpolate(camSp, [0, 1], [2.2, 1]);
  const camOp  = interpolate(camSp, [0, 0.15, 1], [0, 1, 1]);

  // Sphere materialisation progress
  const matP   = clamp01(lf / 220);
  const matEase= easeOutCubic(matP);
  const rot    = lf * 0.018;
  const pulseA = Math.sin(lf * 0.1) * 0.025;
  const pulseB = Math.sin(lf * 0.07 + 1) * 0.018;
  const totalPulse = 1 + pulseA + pulseB;

  // Squash-stretch entrance (Spider-Verse)
  const squashT = interpolate(lf, [0, 10, 28, 55], [0, 1, 0.4, 0], { extrapolateRight: "clamp" });
  const scX = 1 + squashT * 0.22;
  const scY = 1 - squashT * 0.14;

  const R = 200;

  // Coalescing particles spiral inward
  const coalParticles = SPHERE_PTS.slice(0, 300).map((p, i) => {
    const pLife  = clamp01((lf - i * 0.5) / 180);
    const pEase  = easeInCubic(1 - pLife);
    const startX = p.x * 3.5 + Math.sin(i * 1.3) * 300;
    const startY = p.y * 3.5 + Math.cos(i * 1.1) * 300;
    const px     = lerp(startX, p.x * R, easeOutCubic(pLife));
    const py     = lerp(startY, p.y * R * 0.55, easeOutCubic(pLife));
    const col    = SET_C[p.set];
    if (pLife > 0.98) return null;
    return (
      <circle key={i} cx={px} cy={py} r={1.4 + sr(i * 7) * 1.8}
        fill={col} opacity={0.25 + pLife * 0.6} filter="url(#f-soft)"/>
    );
  });

  // Sphere shell parts (lat/lon rings materialize)
  const latRings = Array.from({ length: 12 }, (_, i) => {
    const phi  = (Math.PI / 11) * i;
    const rr   = R * Math.sin(phi);
    const yy   = -R * Math.cos(phi);
    const ringP = clamp01((matP * 12 - i) / 1.5);
    if (ringP <= 0) return null;
    return (
      <ellipse key={i} cx={0} cy={yy} rx={rr * ringP} ry={(rr * 0.30 + 4) * ringP}
        fill="none" stroke={C.gold} strokeWidth={1.4}
        opacity={0.1 + 0.7 * Math.sin(phi) * ringP}
        filter={i % 3 === 0 ? "url(#f-soft)" : undefined}/>
    );
  });
  const lonRings = Array.from({ length: 18 }, (_, i) => {
    const theta = (Math.PI * 2 * i) / 18 + rot;
    const ringP = clamp01((matP * 18 - i) / 2);
    if (ringP <= 0) return null;
    const d = Array.from({ length: 41 }, (_, j) => {
      const phi2 = (Math.PI * j) / 40;
      return `${j === 0 ? "M" : "L"} ${(R * Math.sin(phi2) * Math.cos(theta)).toFixed(1)} ${(-R * Math.cos(phi2)).toFixed(1)}`;
    }).join(" ");
    const vis = Math.cos(theta) > -0.05 ? 1 : 0.2;
    return (
      <path key={i} d={d} fill="none" stroke={C.gold} strokeWidth={0.9}
        opacity={(0.07 + 0.35 * vis) * ringP}/>
    );
  });

  // Orbital ring of particles around equator
  const orbPts = Array.from({ length: 80 }, (_, i) => {
    const a = (i / 80) * Math.PI * 2 + rot * 2.2;
    const r2 = R * 1.2 + Math.sin(i * 0.6 + lf * 0.05) * 22;
    return { x: r2 * Math.cos(a), y: r2 * Math.sin(a) * 0.22 };
  });

  // Energy tendrils (8 lines from core outward, pulsing)
  const tendrils = Array.from({ length: 8 }, (_, i) => {
    const angle = (i / 8) * Math.PI * 2 + lf * 0.03;
    const len   = R * (0.6 + Math.sin(lf * 0.12 + i) * 0.3) * matEase;
    const op    = (0.3 + Math.sin(lf * 0.15 + i * 0.7) * 0.2) * matEase;
    return (
      <line key={i} x1={0} y1={0}
        x2={Math.cos(angle) * len * 0.9}
        y2={Math.sin(angle) * len * 0.4}
        stroke={i % 2 === 0 ? C.gold : C.amber}
        strokeWidth={0.8 + sr(i) * 1.5} opacity={op}
        filter="url(#f-soft)"/>
    );
  });

  return (
    <g transform={`translate(${CX}, ${CY - 60})`}
      opacity={camOp * exitP}>
      <g transform={`scale(${camSc})`}>

        {/* Deep core halo */}
        <circle cx={0} cy={0} r={R * 1.6 * matEase}
          fill="url(#g-core)" opacity={0.18 * matEase} filter="url(#f-halo)"/>
        <circle cx={0} cy={0} r={R * 1.1 * matEase}
          fill="url(#g-sph)"  opacity={0.12 * matEase} filter="url(#f-massive)"/>

        {/* Energy tendrils */}
        {tendrils}

        {/* Coalescing particles */}
        {coalParticles}

        {/* Sphere shell */}
        <g transform={`scale(${totalPulse}) scale(${scX}, ${scY})`}>
          {/* Main outer shell */}
          <circle cx={0} cy={0} r={R} fill="none"
            stroke={C.gold} strokeWidth={3.2} opacity={0.95 * matEase}
            filter="url(#f-gold)"/>
          {/* Second shell */}
          <circle cx={0} cy={0} r={R * 0.82} fill="none"
            stroke={C.amber} strokeWidth={1.2} opacity={0.30 * matEase}/>
          {/* Lat rings */}
          {latRings}
          {/* Lon arcs */}
          {lonRings}
          {/* Interior point cloud */}
          {SPHERE_PTS.slice(0, 260).map((p, i) => (
            <circle key={i} cx={p.x * R} cy={p.y * R * 0.55} r={1.6}
              fill={C.gold}
              opacity={(0.15 + 0.45 * (p.z * 0.5 + 0.5)) * matEase}/>
          ))}
          {/* Specular */}
          <ellipse cx={-62} cy={-82} rx={50} ry={32} fill="#FFFDE0" opacity={0.22 * matEase}/>
          {/* Label */}
          <text x={0} y={8} textAnchor="middle"
            fontFamily="'Courier New', monospace" fontWeight="900" fontSize={24}
            fill={C.gold} filter="url(#f-gold)" opacity={0.9 * matEase}>S</text>
        </g>

        {/* Orbital ring */}
        {matEase > 0.5 && (
          <>
            <polyline points={orbPts.map(p => `${p.x},${p.y}`).join(" ")}
              fill="none" stroke={C.gold} strokeWidth={1.6}
              opacity={0.25 * matEase} filter="url(#f-soft)" strokeLinejoin="round"/>
            {orbPts.filter((_, i) => i % 5 === 0).map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r={2.5}
                fill={C.gold} opacity={0.5 * matEase} filter="url(#f-soft)"/>
            ))}
          </>
        )}
      </g>

      {/* Birth caption */}
      {lf > 80 && (
        <g opacity={interpolate(lf, [80, 130], [0, 1], { extrapolateRight: "clamp" })}>
          <text x={0} y={R + 72} textAnchor="middle"
            fontFamily="'Courier New', monospace" fontSize={26} fontWeight="700"
            fill={C.gold} filter="url(#f-soft)" letterSpacing="4">ONE PERFECT SPHERE</text>
          <text x={0} y={R + 108} textAnchor="middle"
            fontFamily="'Courier New', monospace" fontSize={18}
            fill={C.white} opacity={0.55} letterSpacing="2">
            Solid. Whole. Unmeasurable in its beauty.</text>
        </g>
      )}
    </g>
  );
};

// ═══════════════════════════════════════════════════════════════
//  SCENE 3: SHATTERING EXPLOSION
// ═══════════════════════════════════════════════════════════════
const SceneShatter: React.FC<{ frame: number }> = ({ frame }) => {
  const lf = frame - SC.SHATTER_START;
  if (lf < 0) return null;
  const dur   = SC.SHATTER_END - SC.SHATTER_START;
  const exitP = interpolate(lf, [dur - 60, dur], [1, 0], { extrapolateRight: "clamp" });
  const R = 200;

  // Crack lines (12 fissures before explosion)
  const crackP = interpolate(lf, [0, 55], [0, 1], { extrapolateRight: "clamp" });
  // Explosion starts at frame 55
  const explodeP = interpolate(lf, [55, 180], [0, 1], { extrapolateRight: "clamp" });
  const shockP   = interpolate(lf, [55, 200], [0, 1], { extrapolateRight: "clamp" });

  // Shockwave rings
  const shockRings = Array.from({ length: 5 }, (_, i) => {
    const delay = i * 22;
    const lf2   = Math.max(0, lf - 55 - delay);
    const rr    = interpolate(lf2, [0, 200], [0, 900], { extrapolateRight: "clamp" });
    const op    = interpolate(lf2, [0, 14, 200], [0, 0.85, 0], { extrapolateRight: "clamp" });
    if (op <= 0) return null;
    return (
      <ellipse key={i} cx={CX} cy={CY - 60}
        rx={rr} ry={rr * 0.5}
        fill="none" stroke={i % 2 === 0 ? C.gold : C.red}
        strokeWidth={interpolate(lf2, [0, 14, 200], [0, 4, 0.5], { extrapolateRight: "clamp" })}
        opacity={op} filter="url(#f-mid)"/>
    );
  });

  // Debris particles flying outward
  const debris = DEBRIS.map((d, i) => {
    const lf2  = Math.max(0, lf - 55 - d.delay * 80);
    const dist = d.speed * lf2 * 2.2;
    const px   = CX + Math.sin(d.phi) * Math.cos(d.theta) * dist;
    const py   = (CY - 60) + Math.cos(d.phi) * dist * 0.45;
    const op   = interpolate(lf2, [0, 8, d.life * 220], [0, d.life, 0], { extrapolateRight: "clamp" });
    if (op <= 0 || lf2 <= 0) return null;
    const col  = SET_C[d.set];
    return (
      <circle key={i} cx={px} cy={py} r={d.size}
        fill={col} opacity={op} filter={i % 14 === 0 ? "url(#f-soft)" : undefined}/>
    );
  });

  // Core remnant (sphere morphs → cracks → vanishes)
  const coreOp  = interpolate(lf, [55, 100], [1, 0], { extrapolateRight: "clamp" });
  const coreSc  = interpolate(lf, [40, 55, 70], [1, 1.35, 0], { extrapolateRight: "clamp" });

  // Crack paths (12 radial lightning-like cracks)
  const cracks = Array.from({ length: 12 }, (_, i) => {
    const angle = (i / 12) * Math.PI * 2;
    const prog  = crackP;
    const segs: string[] = [];
    let cx2 = 0, cy2 = 0;
    for (let j = 0; j < 8; j++) {
      const jP    = j / 7;
      const len   = R * jP * prog;
      const jitter = (sr(i * 12 + j) - 0.5) * 28;
      const nx    = Math.cos(angle) * len + jitter;
      const ny    = Math.sin(angle) * len * 0.50 + (sr(i * 12 + j + 1) - 0.5) * 14;
      segs.push(`${j === 0 ? "M" : "L"} ${nx.toFixed(1)} ${ny.toFixed(1)}`);
    }
    return (
      <path key={i} d={segs.join(" ")} fill="none"
        stroke={i % 3 === 0 ? C.red : i % 3 === 1 ? C.gold : C.white}
        strokeWidth={1.8 + sr(i) * 2}
        opacity={crackP * (0.6 + sr(i) * 0.4)}
        filter="url(#f-soft)"/>
    );
  });

  return (
    <g opacity={exitP}>
      {/* Shockwave rings */}
      {shockRings}

      {/* Core sphere — cracking */}
      <g transform={`translate(${CX}, ${CY - 60}) scale(${coreSc})`} opacity={coreOp}>
        <circle cx={0} cy={0} r={R} fill="none"
          stroke={C.gold} strokeWidth={3} opacity={0.9} filter="url(#f-gold)"/>
        {/* Lat rings */}
        {Array.from({ length: 9 }, (_, i) => {
          const phi = (Math.PI / 8) * i;
          return (
            <ellipse key={i} cx={0} cy={-R * Math.cos(phi)}
              rx={R * Math.sin(phi)} ry={R * Math.sin(phi) * 0.3 + 1}
              fill="none" stroke={C.gold} strokeWidth={1} opacity={0.15 + 0.55 * Math.sin(phi)}/>
          );
        })}
        {/* Crack lines */}
        {cracks}
        {/* Red core pulse */}
        <circle cx={0} cy={0} r={R * 0.4 * (1 + crackP * 1.2)}
          fill={C.red} opacity={crackP * 0.35} filter="url(#f-mid)"/>
      </g>

      {/* Debris cloud */}
      {debris}

      {/* "DECOMPOSE" caption */}
      {lf > 60 && (
        <g opacity={interpolate(lf, [60, 100], [0, 1], { extrapolateRight: "clamp" })}>
          <text x={CX} y={CY + 310} textAnchor="middle"
            fontFamily="'Impact', 'Arial Black', sans-serif" fontWeight="900" fontSize={72}
            fill={C.red} filter="url(#f-mid)" letterSpacing="6">DECOMPOSE</text>
          <text x={CX} y={CY + 382} textAnchor="middle"
            fontFamily="'Courier New', monospace" fontSize={22}
            fill={C.white} opacity={0.65} letterSpacing="3">
            INTO 5 NON-MEASURABLE SETS
          </text>
        </g>
      )}
    </g>
  );
};

// ═══════════════════════════════════════════════════════════════
//  SCENE 4: SETS ORBITING — with SO(3) lightning arcs
// ═══════════════════════════════════════════════════════════════
const SceneDrift: React.FC<{ frame: number }> = ({ frame }) => {
  const lf = frame - SC.DRIFT_START;
  if (lf < 0) return null;
  const dur   = SC.DRIFT_END - SC.DRIFT_START;
  const exitP = interpolate(lf, [dur - 60, dur], [1, 0], { extrapolateRight: "clamp" });
  const R     = 200;

  // 5 sets on pentagonal orbit that breathes
  const ORBITR = 330;
  const targets = Array.from({ length: 5 }, (_, i) => {
    const baseAngle = (i / 5) * Math.PI * 2 - Math.PI / 2;
    const breathe   = Math.sin(lf * 0.04 + i) * 30;
    const orbitR    = ORBITR + breathe;
    const drift     = lf * 0.008;
    return {
      x: orbitR * Math.cos(baseAngle + drift),
      y: orbitR * Math.sin(baseAngle + drift) * 0.52,
    };
  });

  // SO(3) connection lightning arcs between sets
  const lightningArcs = [];
  for (let a = 0; a < 5; a++) {
    for (let b = a + 1; b < 5; b++) {
      const key = `${a}-${b}`;
      const p1  = targets[a];
      const p2  = targets[b];
      const mid = { x: (p1.x + p2.x) * 0.5, y: (p1.y + p2.y) * 0.5 };
      const jitter = Math.sin(lf * 0.2 + a * 2.1 + b * 3.7) * 40;
      const op    = 0.12 + Math.sin(lf * 0.1 + a + b) * 0.06;
      // Segmented lightning path
      const segs = [`M ${p1.x} ${p1.y}`];
      for (let j = 1; j < 8; j++) {
        const t  = j / 8;
        const nx = lerp(p1.x, p2.x, t) + (sr(lf * 0.3 + j * 11 + a * 33 + b * 77) - 0.5) * 55;
        const ny = lerp(p1.y, p2.y, t) + (sr(lf * 0.3 + j * 13 + a * 31 + b * 71) - 0.5) * 28;
        segs.push(`L ${nx.toFixed(1)} ${ny.toFixed(1)}`);
      }
      segs.push(`L ${p2.x} ${p2.y}`);
      lightningArcs.push(
        <path key={key} d={segs.join(" ")} fill="none"
          stroke={SET_C[a]} strokeWidth={1.2} opacity={op}/>
      );
    }
  }

  // Each set: mini sphere + point cloud + label
  const setNodes = targets.map((pos, si) => {
    const lf2    = Math.max(0, lf - si * 35);
    const arrSp  = spring({ frame: lf2, fps: FPS, config: { stiffness: 50, damping: 14 } });
    const nodeOp = interpolate(arrSp, [0, 1], [0, 1]);
    const nodeSc = interpolate(arrSp, [0, 1], [0.1, 1]);
    const col    = SET_C[si];
    const spin   = lf * 0.6 * (si % 2 === 0 ? 1 : -1);
    const setPoints = SPHERE_PTS.filter(p => p.set === si);
    const pulse  = 1 + Math.sin(lf * 0.1 + si * 1.2) * 0.06;

    return (
      <g key={si} transform={`translate(${CX + pos.x}, ${CY - 60 + pos.y})`}
        opacity={nodeOp}>
        <g transform={`scale(${nodeSc * 0.48 * pulse}) rotate(${spin})`}>
          {/* Glow shell */}
          <circle cx={0} cy={0} r={210}
            fill={col + "0A"} stroke={col} strokeWidth={2.4}
            strokeDasharray="14 7" opacity={0.75} filter="url(#f-soft)"/>
          {/* Inner halo */}
          <circle cx={0} cy={0} r={160}
            fill={col + "07"} opacity={0.5} filter="url(#f-soft)"/>
          {/* Point cloud */}
          {setPoints.map((p, i) => {
            const flicker = sr(si * 800 + i + Math.floor(lf * 0.12)) > 0.38;
            return (
              <circle key={i} cx={p.x * R} cy={p.y * R * 0.55} r={2.5}
                fill={col} opacity={flicker ? 0.75 : 0.28} filter="url(#f-soft)"/>
            );
          })}
          {/* Internal mesh lines */}
          {setPoints.filter((_, i) => i % 6 === 0).map((p, i) => {
            const q = setPoints[(i * 9 + 5) % setPoints.length];
            return (
              <line key={i}
                x1={p.x * R} y1={p.y * R * 0.55}
                x2={q.x * R} y2={q.y * R * 0.55}
                stroke={col} strokeWidth={0.6} opacity={0.12}/>
            );
          })}
        </g>
        {/* Label badge */}
        <rect x={-36} y={-22} width={72} height={44} rx={9}
          fill="#000000EE" stroke={col} strokeWidth={2.5}/>
        <text x={0} y={8} textAnchor="middle"
          fontFamily="'Impact', 'Arial Black', sans-serif" fontWeight="900" fontSize={26}
          fill={col} filter="url(#f-soft)">
          {String.fromCharCode(65 + si)}
        </text>
        {/* Set color name */}
        <text x={0} y={62} textAnchor="middle"
          fontFamily="'Courier New', monospace" fontSize={14}
          fill={col} opacity={0.65} letterSpacing="2">
          SET_{String.fromCharCode(65 + si)}
        </text>
      </g>
    );
  });

  // SO(3) label overlay
  const panelOp = interpolate(lf, [80, 140], [0, 1], { extrapolateRight: "clamp" });

  return (
    <g opacity={exitP}>
      {/* Central ghost sphere */}
      <circle cx={CX} cy={CY - 60} r={200} fill="none"
        stroke={C.gold} strokeWidth={1} strokeDasharray="6 8"
        opacity={interpolate(lf, [0, 60], [0.6, 0.1], { extrapolateRight: "clamp" })}/>

      {/* Lightning connection arcs */}
      <g transform={`translate(${CX}, ${CY - 60})`}>
        {lightningArcs}
      </g>

      {/* Set nodes */}
      {setNodes}

      {/* S = A∪B∪C∪D∪E equation */}
      <g opacity={panelOp} transform={`translate(${CX}, ${CY - 60})`}>
        <rect x={-290} y={-36} width={580} height={72} rx={12}
          fill="#000000CC" stroke={C.gold} strokeWidth={1.8}/>
        <text x={0} y={14} textAnchor="middle"
          fontFamily="'Courier New', monospace" fontWeight="700" fontSize={32}
          fill={C.gold} filter="url(#f-gold)" letterSpacing="2">
          S = A ∪ B ∪ C ∪ D ∪ E
        </text>
      </g>

      {/* SO(3) tag */}
      <g opacity={panelOp} transform={`translate(${W - 180}, ${H / 2 - 380})`}>
        <rect x={0} y={0} width={152} height={72} rx={10}
          fill="#00000099" stroke={C.violet} strokeWidth={1.5}/>
        <text x={76} y={28} textAnchor="middle"
          fontFamily="'Courier New', monospace" fontSize={13}
          fill={C.violet} opacity={0.7} letterSpacing="3">USING</text>
        <text x={76} y={56} textAnchor="middle"
          fontFamily="'Courier New', monospace" fontWeight="900" fontSize={22}
          fill={C.violet} filter="url(#f-soft)">SO(3)</text>
      </g>
    </g>
  );
};

// ═══════════════════════════════════════════════════════════════
//  SCENE 5: DRAMATIC REASSEMBLY INTO TWO SPHERES
// ═══════════════════════════════════════════════════════════════
const SceneAssemble: React.FC<{ frame: number }> = ({ frame }) => {
  const lf  = frame - SC.ASSEMBLE_START;
  if (lf < 0) return null;
  const dur = SC.ASSEMBLE_END - SC.ASSEMBLE_START;
  const exitP = interpolate(lf, [dur - 60, dur], [1, 0], { extrapolateRight: "clamp" });

  const R  = 200;
  const S1 = { x: CX - 470, y: CY - 60 };
  const S2 = { x: CX + 470, y: CY - 60 };
  const CONV_END  = 340;
  const FORM_START= 340;
  const FORM_END  = 700;

  const convP  = clamp01(lf / CONV_END);
  const convE  = easeOutCubic(convP);

  const formLF = Math.max(0, lf - FORM_START);
  const formSp = spring({ frame: formLF, fps: FPS, config: { stiffness: 45, damping: 13 } });
  const formOp = interpolate(formSp, [0, 1], [0, 1]);
  const formSc = interpolate(formSp, [0, 1], [0.08, 1]);

  // Pop-in squash
  const stLF     = Math.max(0, Math.floor((formLF / 60) * 14) * (60 / 14));
  const popSquash= interpolate(stLF, [0, 7, 22, 48], [0, 1.0, 0.35, 0], { extrapolateRight: "clamp" });
  const popSX    = 1 + popSquash * 0.28;
  const popSY    = 1 - popSquash * 0.18;

  const rot = lf * 0.014;

  // Start positions (pentagon)
  const startPos = Array.from({ length: 5 }, (_, i) => {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    return { x: CX + 330 * Math.cos(a), y: CY - 60 + 330 * Math.sin(a) * 0.52 };
  });
  // A, B, E → S1   C, D → S2
  const assign = [0, 0, 1, 1, 0];

  // Energy trails behind converging sets
  const trails = Array.from({ length: 5 }, (_, si) => {
    const tgt    = assign[si] === 0 ? S1 : S2;
    const sp     = startPos[si];
    const col    = SET_C[si];
    const tx     = lerp(sp.x, tgt.x, convE);
    const ty     = lerp(sp.y, tgt.y, convE);
    const trailLen= 6;
    return Array.from({ length: trailLen }, (_, j) => {
      const tP  = easeOutCubic(clamp01((lf - j * 3) / CONV_END));
      const ptx = lerp(sp.x, tgt.x, tP);
      const pty = lerp(sp.y, tgt.y, tP);
      const op  = (1 - j / trailLen) * 0.35 * convP;
      const sc2 = 0.45 * (1 - j / trailLen * 0.4);
      return (
        <circle key={`t${si}-${j}`} cx={ptx} cy={pty}
          r={60 * sc2} fill={col} opacity={op} filter="url(#f-soft)"/>
      );
    });
  });

  // Converging fragments
  const fragments = Array.from({ length: 5 }, (_, si) => {
    const tgt   = assign[si] === 0 ? S1 : S2;
    const sp    = startPos[si];
    const tx    = lerp(sp.x, tgt.x, convE);
    const ty    = lerp(sp.y, tgt.y, convE);
    const sc2   = lerp(0.45, 0.22, convE);
    const col   = SET_C[si];
    const fOp   = interpolate(convE, [0, 0.9, 1], [1, 0.8, 0]);
    const setPoints = SPHERE_PTS.filter(p => p.set === si);
    return (
      <g key={si} transform={`translate(${tx}, ${ty}) scale(${sc2})`} opacity={fOp}>
        <circle cx={0} cy={0} r={R} fill="none"
          stroke={col} strokeWidth={2.5} strokeDasharray="12 8" opacity={0.75}/>
        {setPoints.slice(0, 70).map((p, i) => (
          <circle key={i} cx={p.x * R} cy={p.y * R * 0.55} r={2.8}
            fill={col} opacity={0.65} filter="url(#f-soft)"/>
        ))}
      </g>
    );
  });

  // Build a sphere at position
  const renderSphere = (cx: number, cy: number, gradId: string, label: string) => {
    const lat = Array.from({ length: 11 }, (_, i) => {
      const phi = (Math.PI / 10) * i;
      return (
        <ellipse key={i} cx={0} cy={-R * Math.cos(phi)}
          rx={R * Math.sin(phi)} ry={R * Math.sin(phi) * 0.30 + 1.5}
          fill="none" stroke={C.gold} strokeWidth={1.2}
          opacity={0.08 + 0.55 * Math.sin(phi)} filter="url(#f-soft)"/>
      );
    });
    const lon = Array.from({ length: 16 }, (_, i) => {
      const theta = (Math.PI * 2 * i) / 16 + rot;
      const d = Array.from({ length: 41 }, (_, j) => {
        const phi2 = (Math.PI * j) / 40;
        return `${j === 0 ? "M" : "L"} ${(R * Math.sin(phi2) * Math.cos(theta)).toFixed(1)} ${(-R * Math.cos(phi2)).toFixed(1)}`;
      }).join(" ");
      const vis = Math.cos(theta) > -0.05 ? 1 : 0.18;
      return <path key={i} d={d} fill="none" stroke={C.gold} strokeWidth={0.9}
        opacity={0.07 + 0.32 * vis}/>;
    });
    return (
      <g transform={`translate(${cx}, ${cy}) scale(${formSc * 0.52}) scale(${popSX}, ${popSY})`}
        opacity={formOp}>
        {/* Deep halo */}
        <circle cx={0} cy={0} r={R * 2.2}
          fill={`url(#${gradId})`} opacity={0.08} filter="url(#f-halo)"/>
        {/* Shell */}
        <circle cx={0} cy={0} r={R}
          fill="none" stroke={C.gold} strokeWidth={3.2} opacity={0.96} filter="url(#f-gold)"/>
        {/* Inner shells */}
        <circle cx={0} cy={0} r={R * 0.80}
          fill="none" stroke={C.amber} strokeWidth={0.9} opacity={0.22}/>
        {lat}{lon}
        {/* Point cloud */}
        {SPHERE_PTS.slice(0, 240).map((p, i) => (
          <circle key={i} cx={p.x * R} cy={p.y * R * 0.55} r={1.5}
            fill={C.gold} opacity={0.2 + 0.42 * (p.z * 0.5 + 0.5)}/>
        ))}
        <ellipse cx={-62} cy={-82} rx={50} ry={32} fill="#FFFDE0" opacity={0.19}/>
        <text x={0} y={8} textAnchor="middle"
          fontFamily="'Courier New', monospace" fontWeight="900" fontSize={22}
          fill={C.gold} filter="url(#f-gold)" opacity={0.9}>{label}</text>
      </g>
    );
  };

  // Impact flash ring at sphere formation
  const flashRing = formOp > 0.1 && formOp < 0.7 && (
    <>
      <circle cx={S1.x} cy={S1.y}
        r={interpolate(formLF, [0, 80], [0, 400], { extrapolateRight: "clamp" })}
        fill="none" stroke={C.gold} strokeWidth={3}
        opacity={interpolate(formLF, [0, 8, 80], [0, 0.8, 0], { extrapolateRight: "clamp" })}
        filter="url(#f-mid)"/>
      <circle cx={S2.x} cy={S2.y}
        r={interpolate(formLF, [0, 80], [0, 400], { extrapolateRight: "clamp" })}
        fill="none" stroke={C.gold} strokeWidth={3}
        opacity={interpolate(formLF, [0, 8, 80], [0, 0.8, 0], { extrapolateRight: "clamp" })}
        filter="url(#f-mid)"/>
    </>
  );

  return (
    <g opacity={exitP}>
      {trails}
      {fragments}
      {flashRing}
      {renderSphere(S1.x, S1.y, "g-sph",  "S₁")}
      {renderSphere(S2.x, S2.y, "g-core", "S₂")}
      {/* Dashed connector */}
      {formOp > 0.4 && (
        <line x1={S1.x + 56} y1={S1.y} x2={S2.x - 56} y2={S2.y}
          stroke={C.gold} strokeWidth={1.5} strokeDasharray="9 6"
          opacity={formOp * 0.45} filter="url(#f-soft)"/>
      )}
      {/* EQUALS */}
      {formOp > 0.5 && (
        <g transform={`translate(${CX}, ${S1.y})`} opacity={formOp}>
          <rect x={-42} y={-26} width={84} height={52} rx={12}
            fill="#FFD70018" stroke={C.gold} strokeWidth={2}/>
          <text x={0} y={12} textAnchor="middle"
            fontFamily="'Courier New', monospace" fontWeight="900" fontSize={38}
            fill={C.gold} filter="url(#f-gold)">≅</text>
        </g>
      )}
      {/* Labels below spheres */}
      {formOp > 0.65 && [S1, S2].map((s, i) => (
        <g key={i} transform={`translate(${s.x}, ${s.y + 125})`} opacity={formOp}>
          <rect x={-80} y={0} width={160} height={40} rx={9}
            fill="#000000BB" stroke={C.gold} strokeWidth={1.2}/>
          <text x={0} y={27} textAnchor="middle"
            fontFamily="'Courier New', monospace" fontWeight="700" fontSize={20}
            fill={C.gold} filter="url(#f-soft)">COPY {i + 1}</text>
        </g>
      ))}
    </g>
  );
};

// ═══════════════════════════════════════════════════════════════
//  SCENE 6: TWIN SPHERE REVEAL — equations rain down
// ═══════════════════════════════════════════════════════════════
const SceneReveal: React.FC<{ frame: number }> = ({ frame }) => {
  const lf  = frame - SC.REVEAL_START;
  if (lf < 0) return null;
  const dur = SC.REVEAL_END - SC.REVEAL_START;
  const exitP = interpolate(lf, [dur - 60, dur], [1, 0], { extrapolateRight: "clamp" });
  const R = 200;
  const rot = lf * 0.014;

  const S1 = { x: CX - 460, y: CY - 186 };
  const S2 = { x: CX + 460, y: CY - 186 };

  // Pulsing halos
  const halo1 = 1 + Math.sin(lf * 0.12) * 0.08;
  const halo2 = 1 + Math.sin(lf * 0.10 + 1.5) * 0.08;

  // Equation rain (falling math)
  const eqs = [
    "S = A ∪ B ∪ C ∪ D ∪ E",
    "S₁ ≅ SO(3)·(A ∪ B ∪ C)",
    "S₂ ≅ τ·(D ∪ E)",
    "μ(S₁) = μ(S₂) = μ(S)",
    "∀ε>0: ∃ decomposition",
    "AC ⟹ non-measurable sets",
    "Hausdorff 1914 · ZFC axioms",
    "dim(S₁) = dim(S₂) = dim(S) = 3",
  ];
  const rainItems = eqs.map((eq, i) => {
    const delay = i * 48;
    const lf2   = Math.max(0, lf - delay);
    const fy    = interpolate(lf2, [0, dur - delay], [-20, H + 40]);
    const col   = [C.gold, C.cyan, C.magenta, C.lime, C.gold, C.violet, C.cyan, C.emerald][i];
    const xPos  = 60 + (i % 4) * 240;
    return (
      <text key={i} x={xPos} y={fy}
        fontFamily="'Courier New', monospace" fontSize={18} fontWeight="600"
        fill={col} opacity={0.22 + (i % 3) * 0.08} letterSpacing="1">
        {eq}
      </text>
    );
  });

  // Orbital particles spiraling around each sphere
  const buildOrbital = (cx: number, cy: number, halo: number, colShift: number) =>
    Array.from({ length: 120 }, (_, i) => {
      const a  = (i / 120) * Math.PI * 2 + lf * (0.025 + (i % 3) * 0.005) * (i % 2 === 0 ? 1 : -1);
      const rr = R * (halo + 0.15 + (i % 4) * 0.08) + Math.sin(i * 0.7 + lf * 0.06) * 18;
      const px = cx + rr * Math.cos(a);
      const py = cy + rr * Math.sin(a) * 0.28;
      const op = 0.2 + (i % 5) * 0.08;
      const col = SET_C[(i + colShift) % 5];
      return <circle key={i} cx={px} cy={py} r={1.2 + (i % 3) * 0.8}
        fill={col} opacity={op}/>;
    });

  const renderSph = (cx: number, cy: number, halePulse: number) => (
    <g transform={`translate(${cx}, ${cy}) scale(0.54)`}>
      <circle cx={0} cy={0} r={R * 2.5}
        fill="url(#g-sph)" opacity={0.07 * halePulse} filter="url(#f-halo)"/>
      <circle cx={0} cy={0} r={R}
        fill="none" stroke={C.gold} strokeWidth={3} opacity={0.95} filter="url(#f-gold)"/>
      {Array.from({ length: 10 }, (_, i) => {
        const phi = (Math.PI / 9) * i;
        return (
          <ellipse key={i} cx={0} cy={-R * Math.cos(phi)}
            rx={R * Math.sin(phi)} ry={R * Math.sin(phi) * 0.30 + 1.5}
            fill="none" stroke={C.gold} strokeWidth={1.1}
            opacity={0.1 + 0.55 * Math.sin(phi)} filter="url(#f-soft)"/>
        );
      })}
      {Array.from({ length: 16 }, (_, i) => {
        const theta = (Math.PI * 2 * i) / 16 + rot;
        const d = Array.from({ length: 41 }, (_, j) => {
          const phi2 = (Math.PI * j) / 40;
          return `${j === 0 ? "M" : "L"} ${(R * Math.sin(phi2) * Math.cos(theta)).toFixed(1)} ${(-R * Math.cos(phi2)).toFixed(1)}`;
        }).join(" ");
        const vis = Math.cos(theta) > -0.05 ? 1 : 0.18;
        return <path key={i} d={d} fill="none" stroke={C.gold}
          strokeWidth={0.9} opacity={0.07 + 0.3 * vis}/>;
      })}
      {SPHERE_PTS.slice(0, 250).map((p, i) => (
        <circle key={i} cx={p.x * R} cy={p.y * R * 0.55} r={1.5}
          fill={C.gold} opacity={0.2 + 0.42 * (p.z * 0.5 + 0.5)}/>
      ))}
      <ellipse cx={-62} cy={-82} rx={50} ry={32} fill="#FFFDE0" opacity={0.19}/>
    </g>
  );

  // Big central reveal text
  const revealOp = interpolate(lf, [0, 60], [0, 1], { extrapolateRight: "clamp" });
  const revealSp = spring({ frame: lf, fps: FPS, config: { stiffness: 60, damping: 14 } });
  const revealSc = interpolate(revealSp, [0, 1], [0.4, 1]);

  return (
    <g opacity={exitP}>
      {/* Equation rain */}
      {rainItems}

      {/* Orbital particles */}
      {buildOrbital(S1.x, S1.y, halo1, 0)}
      {buildOrbital(S2.x, S2.y, halo2, 2)}

      {/* Spheres */}
      {renderSph(S1.x, S1.y, halo1)}
      {renderSph(S2.x, S2.y, halo2)}

      {/* Twin labels */}
      {[S1, S2].map((s, i) => (
        <g key={i} transform={`translate(${s.x}, ${s.y + 126})`}>
          <rect x={-78} y={0} width={156} height={42} rx={9}
            fill="#000000CC" stroke={C.gold} strokeWidth={1.5}/>
          <text x={0} y={28} textAnchor="middle"
            fontFamily="'Courier New', monospace" fontWeight="700" fontSize={21}
            fill={C.gold} filter="url(#f-soft)">COPY {i + 1}</text>
        </g>
      ))}

      {/* Central = */}
      <g transform={`translate(${CX}, ${CY - 186})`}>
        <rect x={-46} y={-28} width={92} height={56} rx={12}
          fill="#FFD70015" stroke={C.gold} strokeWidth={2}/>
        <text x={0} y={14} textAnchor="middle"
          fontFamily="'Courier New', monospace" fontWeight="900" fontSize={40}
          fill={C.gold} filter="url(#f-gold)">≅</text>
      </g>

      {/* Reveal title */}
      <g transform={`translate(${CX}, ${CY + 634})`}
        opacity={revealOp}>
        <g transform={`scale(${revealSc})`}>
          <rect x={-440} y={-28} width={880} height={120} rx={14}
            fill="#000000CC" stroke={C.gold} strokeWidth={2}/>
          <rect x={-440} y={-28} width={880} height={3} rx={2}
            fill={C.gold} opacity={0.8}/>
          <text x={0} y={20} textAnchor="middle"
            fontFamily="'Impact', 'Arial Black', sans-serif" fontWeight="900" fontSize={52}
            fill={C.gold} filter="url(#f-gold)" letterSpacing="2">
            1 SPHERE → 2 IDENTICAL
          </text>
          <text x={0} y={72} textAnchor="middle"
            fontFamily="'Courier New', monospace" fontSize={22}
            fill={C.white} opacity={0.65} letterSpacing="3">
            SAME VOLUME · SAME SIZE · MATHEMATICAL PROOF
          </text>
        </g>
      </g>
    </g>
  );
};

// ═══════════════════════════════════════════════════════════════
//  SCENE 7: INFINITY / AXIOM OF CHOICE VISUALIZER
// ═══════════════════════════════════════════════════════════════
const SceneInfinity: React.FC<{ frame: number }> = ({ frame }) => {
  const lf  = frame - SC.INFINITY_START;
  if (lf < 0) return null;
  const dur = SC.INFINITY_END - SC.INFINITY_START;
  const exitP = interpolate(lf, [dur - 60, dur], [1, 0], { extrapolateRight: "clamp" });

  const appear = spring({ frame: lf, fps: FPS, config: { stiffness: 45, damping: 16 } });
  const sc = interpolate(appear, [0, 1], [0.8, 1]);
  const op = interpolate(appear, [0, 1], [0, 1]);

  // Spiral of points representing "infinite choice"
  const spiralPts = Array.from({ length: 360 }, (_, i) => {
    const t     = i / 360;
    const angle = t * Math.PI * 12 + lf * 0.04;
    const r     = 50 + t * 340;
    const wave  = Math.sin(t * Math.PI * 8 + lf * 0.08) * 22;
    return {
      x: CX + (r + wave) * Math.cos(angle),
      y: CY - 75 + (r + wave) * Math.sin(angle) * 0.45,
      col: SET_C[i % 5],
      op:  0.15 + t * 0.55,
    };
  });

  // AC cards
  const cards = [
    { icon: "∀", label: "FOR EVERY",   body: "non-empty family F of sets",     col: C.violet },
    { icon: "∃", label: "THERE EXISTS", body: "a choice function  f : F → ⋃F",  col: C.cyan   },
    { icon: "⟹",label: "IMPLIES",      body: "non-measurable subsets of ℝ³",   col: C.lime   },
    { icon: "∴", label: "THEREFORE",   body: "Banach-Tarski decomposition holds", col: C.gold },
  ];

  const lineP = interpolate(lf, [40, 440], [0, cards.length], { extrapolateRight: "clamp" });

  return (
    <g opacity={exitP}>
      {/* Spiral */}
      {spiralPts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={1.2 + (i % 5) * 0.5}
          fill={p.col} opacity={p.op * 0.45}/>
      ))}

      {/* ∞ symbol enormous background */}
      <text x={CX} y={CY + 149} textAnchor="middle"
        fontFamily="'Impact', 'Arial Black', sans-serif" fontSize={520}
        fill={C.violet} opacity={0.04} filter="url(#f-halo)">∞</text>

      {/* Panel */}
      <g transform={`translate(${CX}, ${CY - 740}) scale(${sc})`} opacity={op}>
        <rect x={-460} y={0} width={920} height={90} rx={14}
          fill="#00000099" stroke={C.violet} strokeWidth={2}/>
        <rect x={-460} y={0} width={920} height={4} rx={2}
          fill={C.violet} filter="url(#f-soft)"/>
        <text x={0} y={46} textAnchor="middle"
          fontFamily="'Impact', 'Arial Black', sans-serif" fontWeight="900" fontSize={42}
          fill={C.violet} filter="url(#f-mid)" letterSpacing="4">AXIOM OF CHOICE</text>
        <text x={0} y={76} textAnchor="middle"
          fontFamily="'Courier New', monospace" fontSize={18}
          fill={C.violet} opacity={0.6} letterSpacing="5">ZFC · ZERMELO-FRAENKEL · AXIOM 9</text>
      </g>

      {/* AC Logic cards */}
      {cards.map((card, i) => {
        const cardOp = interpolate(lineP, [i, i + 0.85], [0, 1], { extrapolateRight: "clamp" });
        const cardTX = interpolate(lineP, [i, i + 0.85], [-50, 0], { extrapolateRight: "clamp" });
        return (
          <g key={i}
            transform={`translate(${CX + cardTX - 720}, ${CY - 560 + i * 158})`}
            opacity={cardOp}>
            <rect x={0} y={0} width={840} height={138} rx={14}
              fill={card.col + "12"} stroke={card.col} strokeWidth={1.8}/>
            {/* Icon */}
            <rect x={0} y={0} width={100} height={138} rx={14}
              fill={card.col + "22"}/>
            <text x={50} y={90} textAnchor="middle"
              fontFamily="'Courier New', monospace" fontWeight="900" fontSize={58}
              fill={card.col} filter="url(#f-soft)">{card.icon}</text>
            {/* Label */}
            <text x={124} y={38}
              fontFamily="'Courier New', monospace" fontSize={14} fontWeight="700"
              fill={card.col} opacity={0.7} letterSpacing="4">{card.label}</text>
            {/* Body */}
            <text x={124} y={82}
              fontFamily="'Courier New', monospace" fontSize={28} fontWeight="600"
              fill={C.white} opacity={0.9}>{card.body}</text>
          </g>
        );
      })}
    </g>
  );
};

// ═══════════════════════════════════════════════════════════════
//  SCENE 8: CINEMATIC OUTRO
// ═══════════════════════════════════════════════════════════════
const SceneOutro: React.FC<{ frame: number }> = ({ frame }) => {
  const lf  = frame - SC.OUTRO_START;
  if (lf < 0) return null;
  const dur = SC.TOTAL - SC.OUTRO_START;

  const appear = spring({ frame: lf, fps: FPS, config: { stiffness: 40, damping: 18 } });
  const op     = interpolate(appear, [0, 1], [0, 1]);
  const finalFade = interpolate(frame, [SC.TOTAL - 168, SC.TOTAL], [1, 0], { extrapolateRight: "clamp" });

  // Particle storm swirling outward
  const stormPts = Array.from({ length: 300 }, (_, i) => {
    const baseAngle = sr(i * 3 + 1) * Math.PI * 2;
    const baseR     = sr(i * 3 + 4) * 600;
    const speed     = 0.015 + sr(i * 3 + 3) * 0.04;
    const angle     = baseAngle + lf * speed;
    const r         = baseR + Math.sin(lf * 0.05 + i) * 30;
    const col       = SET_C[i % 5];
    const flop      = sr(i + lf * 0.01) > 0.5;
    return {
      x: CX + r * Math.cos(angle),
      y: CY + r * Math.sin(angle) * 0.4,
      r: 0.8 + sr(i) * 2.2,
      col,
      op: (0.06 + sr(i * 3 + 7) * 0.14) * (flop ? 1 : 0.4),
    };
  });

  const summary = [
    { eq: "S = A ∪ B ∪ C ∪ D ∪ E",                col: C.gold   },
    { eq: "S₁ ≅ SO(3)·(A ∪ B ∪ C)",               col: C.cyan   },
    { eq: "S₂ ≅ τ · (D ∪ E)",                       col: C.magenta},
    { eq: "μ(S₁) = μ(S₂) = μ(S)   [formally]",     col: C.lime   },
  ];

  return (
    <g opacity={op * finalFade}>
      {/* Particle storm */}
      {stormPts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={p.r}
          fill={p.col} opacity={p.op} filter={i % 20 === 0 ? "url(#f-soft)" : undefined}/>
      ))}

      {/* Dark overlay for readability */}
      <rect x={0} y={0} width={W} height={H} fill="#000008" opacity={0.72}/>

      {/* Banach-Tarski title */}
      <g transform={`translate(${CX}, ${CY - 760})`}>
        <text x={0} y={0} textAnchor="middle"
          fontFamily="'Impact', 'Arial Black', sans-serif" fontWeight="900" fontSize={96}
          fill="url(#g-title)" filter="url(#f-gold)" letterSpacing="-1">BANACH-TARSKI</text>
        <text x={0} y={62} textAnchor="middle"
          fontFamily="'Courier New', monospace" fontWeight="700" fontSize={32}
          fill={C.gold} opacity={0.65} letterSpacing="10">PARADOX</text>
        <line x1={-400} y1={88} x2={400} y2={88}
          stroke={C.gold} strokeWidth={1.5} opacity={0.5}/>
      </g>

      {/* Quote */}
      <g transform={`translate(${CX}, ${CY - 560})`}
        opacity={interpolate(lf, [40, 110], [0, 1], { extrapolateRight: "clamp" })}>
        {[
          '"Mathematics requires no experiments.',
          'It requires only imagination."',
          '— Stefan Banach',
        ].map((line, i) => (
          <text key={i} x={0} y={i * 56} textAnchor="middle"
            fontFamily="'Courier New', monospace"
            fontSize={i === 2 ? 21 : 26}
            fontStyle={i < 2 ? "italic" : "normal"}
            fill={i === 2 ? C.gold : C.white}
            opacity={i === 2 ? 0.75 : 0.82}>{line}</text>
        ))}
      </g>

      {/* Summary box */}
      <g opacity={interpolate(lf, [80, 160], [0, 1], { extrapolateRight: "clamp" })}>
        <rect x={80} y={CY + 149} width={W - 160} height={226} rx={16}
          fill="#000000CC" stroke={C.gold} strokeWidth={1.8}/>
        <rect x={80} y={CY + 149} width={W - 160} height={3} rx={2}
          fill={C.gold} opacity={0.75}/>
        {summary.map((row, i) => (
          <text key={i} x={108} y={CY + 140 + i * 44}
            fontFamily="'Courier New', monospace" fontSize={22} fontWeight="600"
            fill={row.col} filter="url(#f-soft)">{row.eq}</text>
        ))}
      </g>

      {/* CTA */}
      <g opacity={interpolate(lf, [140, 220], [0, 1], { extrapolateRight: "clamp" })}>
        <rect x={CX - 560} y={CY + 370} width={600} height={76} rx={38}
          fill={C.gold + "22"} stroke={C.gold} strokeWidth={2.5} filter="url(#f-gold)"/>
        <text x={CX} y={CY + 718} textAnchor="middle"
          fontFamily="'Courier New', monospace" fontWeight="900" fontSize={26}
          fill={C.gold} letterSpacing="3">👍  LIKE  •  🔔  SUBSCRIBE</text>
      </g>

      {/* Watermark */}
      <text x={CX} y={H - 58} textAnchor="middle"
        fontFamily="'Courier New', monospace" fontSize={15}
        fill={C.gold} opacity={0.28} letterSpacing="5">
        REMOTION • TSX • 60FPS • 1080 × 1920
      </text>
    </g>
  );
};

// ═══════════════════════════════════════════════════════════════
//  PERSISTENT HUD (header + progress + frame counter)
// ═══════════════════════════════════════════════════════════════
const HUD: React.FC<{ frame: number }> = ({ frame }) => {
  const appear = spring({ frame, fps: FPS, config: { stiffness: 75, damping: 15 } });
  const ty     = interpolate(appear, [0, 1], [-100, 0]);
  const isOutro= frame >= SC.OUTRO_START;

  // Phase name
  const phaseName =
    frame < SC.BIRTH_START    ? "INTRO"          :
    frame < SC.SHATTER_START  ? "SPHERE BIRTH"   :
    frame < SC.DRIFT_START    ? "DECOMPOSE"      :
    frame < SC.ASSEMBLE_START ? "ORBITAL DRIFT"  :
    frame < SC.REVEAL_START   ? "REASSEMBLE"     :
    frame < SC.INFINITY_START ? "TWIN SPHERES"   :
    frame < SC.OUTRO_START    ? "INFINITY · AC"  : "OUTRO";

  const phaseCol =
    frame < SC.BIRTH_START    ? C.gold     :
    frame < SC.SHATTER_START  ? C.amber    :
    frame < SC.DRIFT_START    ? C.red      :
    frame < SC.ASSEMBLE_START ? C.cyan     :
    frame < SC.REVEAL_START   ? C.magenta  :
    frame < SC.INFINITY_START ? C.lime     :
    frame < SC.OUTRO_START    ? C.violet   : C.gold;

  const progress = frame / SC.TOTAL;
  const BAR_W    = W - 96;

  return (
    <>
      {/* Top header */}
      {!isOutro && (
        <g transform={`translate(0, ${ty})`}>
          <rect x={0} y={0} width={W} height={108} fill="#00000088"/>
          <rect x={0} y={105} width={W} height={3} fill={phaseCol} filter="url(#f-soft)" opacity={0.9}/>
          {/* Chromatic aberration layers */}
          <text x={CX + 3} y={48} textAnchor="middle"
            fontFamily="'Impact', 'Arial Black', sans-serif" fontWeight="900" fontSize={30}
            fill={C.cyan} opacity={0.20} letterSpacing="1">
            THE MATH TRAP: 1 SPHERE → 2 DUPES
          </text>
          <text x={CX - 4} y={48} textAnchor="middle"
            fontFamily="'Impact', 'Arial Black', sans-serif" fontWeight="900" fontSize={30}
            fill={C.pink} opacity={0.18} letterSpacing="1">
            THE MATH TRAP: 1 SPHERE → 2 DUPES
          </text>
          <text x={CX} y={48} textAnchor="middle"
            fontFamily="'Impact', 'Arial Black', sans-serif" fontWeight="900" fontSize={30}
            fill={C.gold} filter="url(#f-soft)" letterSpacing="1">
            THE MATH TRAP: 1 SPHERE → 2 DUPES
          </text>
          <text x={CX} y={84} textAnchor="middle"
            fontFamily="'Courier New', monospace" fontSize={18}
            fill={phaseCol} opacity={0.75} letterSpacing="6">
            ▸ BANACH – TARSKI PARADOX ◂
          </text>
        </g>
      )}

      {/* Phase chip */}
      {!isOutro && (
        <g transform={`translate(48, 130)`}>
          <rect x={0} y={0} width={240} height={46} rx={8}
            fill={phaseCol + "18"} stroke={phaseCol} strokeWidth={1.5}/>
          <rect x={0} y={0} width={56} height={46} rx={8}
            fill={phaseCol + "28"}/>
          <text x={28} y={30} textAnchor="middle"
            fontFamily="'Courier New', monospace" fontWeight="900" fontSize={16}
            fill={phaseCol} filter="url(#f-soft)">▶</text>
          <text x={72} y={30}
            fontFamily="'Courier New', monospace" fontWeight="700" fontSize={17}
            fill={phaseCol}>{phaseName}</text>
        </g>
      )}

      {/* Frame counter */}
      {!isOutro && (
        <g transform={`translate(${W - 420}, 130)`}>
          <rect x={0} y={0} width={192} height={46} rx={8}
            fill="#000000AA" stroke="#FFD70025" strokeWidth={1}/>
          <text x={14} y={30}
            fontFamily="'Courier New', monospace" fontWeight="700" fontSize={17}
            fill={C.gold}>{String(frame).padStart(4, "0")} / {(frame / FPS).toFixed(1)}s</text>
        </g>
      )}

      {/* Timeline bar */}
      <g transform={`translate(48, ${H - 52})`}>
        <rect x={0} y={6} width={BAR_W} height={5} rx={2.5} fill="#FFFFFF12"/>
        <rect x={0} y={6} width={BAR_W * progress} height={5} rx={2.5}
          fill={phaseCol} filter="url(#f-soft)"/>
        <circle cx={BAR_W * progress} cy={8.5} r={7}
          fill={phaseCol} filter="url(#f-soft)"/>
      </g>
    </>
  );
};

// ═══════════════════════════════════════════════════════════════
//  SCENE TRANSITION EFFECTS (flash + shockwave)
// ═══════════════════════════════════════════════════════════════
const SceneTransitions: React.FC<{ frame: number }> = ({ frame }) => {
  const flashes = [
    { f: SC.SHATTER_START,  col: "#FF2200", dur: 6 },
    { f: SC.ASSEMBLE_START, col: "#FFD700", dur: 5 },
    { f: SC.REVEAL_START,   col: "#FFFFFF", dur: 4 },
    { f: SC.INFINITY_START, col: "#BF5FFF", dur: 5 },
    { f: SC.OUTRO_START,    col: "#FFD700", dur: 6 },
  ];
  return (
    <>
      {flashes.map((fl, i) => {
        const lf = frame - fl.f;
        if (lf < 0 || lf > fl.dur) return null;
        const op = interpolate(lf, [0, 1, fl.dur], [0, 0.92, 0]);
        return <rect key={i} x={0} y={0} width={W} height={H}
          fill={fl.col} opacity={op}/>;
      })}
    </>
  );
};

// ═══════════════════════════════════════════════════════════════
//  SCREEN SHAKE
// ═══════════════════════════════════════════════════════════════
function getShake(frame: number): { dx: number; dy: number } {
  const shakeEvents = [
    { at: SC.SHATTER_START, intensity: 22, decay: 55 },
    { at: SC.ASSEMBLE_START + 634, intensity: 14, decay: 40 },
    { at: SC.REVEAL_START,  intensity: 10, decay: 35 },
  ];
  let dx = 0, dy = 0;
  for (const ev of shakeEvents) {
    const lf = frame - ev.at;
    if (lf >= 0 && lf < ev.decay) {
      const mag = ev.intensity * Math.exp(-lf * 0.12);
      dx += (sr(frame * 3.1 + ev.at) - 0.5) * 2 * mag;
      dy += (sr(frame * 2.7 + ev.at + 1) - 0.5) * 2 * mag * 0.5;
    }
  }
  return { dx, dy };
}

// ═══════════════════════════════════════════════════════════════
//  HINDI NARRATION
// ═══════════════════════════════════════════════════════════════
interface Nline { from: number; to: number; hindi: string; rom: string; speaker: "n"|"b"|"e" }
const LINES: Nline[] = [
  { from: 40,   to: 200,  hindi: "एक अद्भुत गणितीय सत्य…", rom: "Ek adbhut ganiteey satya…", speaker: "n" },
  { from: 240,  to: 480,  hindi: "देखो — एक पूर्ण, अखंड गोला।", rom: "Dekho — ek poorn, akhand gola.", speaker: "n" },
  { from: 600,  to: 820,  hindi: "Stefan Banach: मैं इसे तोड़ता हूँ।", rom: "Stefan Banach: Main ise toḍta hoon.", speaker: "b" },
  { from: 840,  to: 1080, hindi: "पाँच अनमापनीय समुच्चय — A, B, C, D, E", rom: "Paanch anmapneey samuchcha — A, B, C, D, E", speaker: "b" },
  { from: 1100, to: 1270, hindi: "ये SO(3) घुमाव द्वारा जुड़े हैं।", rom: "Ye SO(3) ghumaav dvaara jude hain.", speaker: "n" },
  { from: 1300, to: 1560, hindi: "अब देखो जादू — पुनः एकत्रित होते हैं…", rom: "Ab dekho jaadoo — punaḥ ekatrit hote hain…", speaker: "n" },
  { from: 1580, to: 1820, hindi: "दो पूर्ण गोले! मूल के समान!", rom: "Do poorn gole! Mool ke samaan!", speaker: "n" },
  { from: 1840, to: 2080, hindi: "यह जादू नहीं — शुद्ध गणित है!!", rom: "Yah jaadoo nahi — shuddh ganit hai!!", speaker: "b" },
  { from: 2120, to: 2400, hindi: "चयन का स्वयंसिद्ध — अनंत का नियम।", rom: "Chayan ka swayamsiddh — anant ka niyam.", speaker: "n" },
  { from: 2420, to: 2590, hindi: "इसी से यह संभव है।", rom: "Isi se yah sambhav hai.", speaker: "e" },
  { from: 2640, to: 2900, hindi: "गणित की कोई सीमा नहीं।", rom: "Ganit ki koi seema nahi.", speaker: "n" },
  { from: 2920, to: 3200, hindi: "केवल कल्पना की सीमा है।", rom: "Keval kalpana ki seema hai.", speaker: "n" },
];

function wrapT(text: string, n: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > n && cur) { lines.push(cur.trim()); cur = w; }
    else cur = (cur + " " + w).trim();
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 3);
}

const Subtitles: React.FC<{ frame: number }> = ({ frame }) => {
  const active = LINES.find(l => frame >= l.from && frame <= l.to);
  if (!active) return null;
  const lf  = frame - active.from;
  const dur = active.to - active.from;
  const fi  = interpolate(lf, [0, 12], [0, 1], { extrapolateRight: "clamp" });
  const fo  = interpolate(lf, [dur - 16, dur], [1, 0], { extrapolateLeft: "clamp" });
  const op  = Math.min(fi, fo);
  const ty  = interpolate(lf, [0, 12], [30, 0], { extrapolateRight: "clamp" });

  const spCol  = active.speaker === "b" ? C.cyan : active.speaker === "e" ? C.lime : C.gold;
  const spName = active.speaker === "b" ? "📐 BANACH" : active.speaker === "e" ? "⚛ EINSTEIN" : "🎙 NARRATOR";
  const panY   = H - 750;
  const lines  = wrapT(active.hindi, 32);

  return (
    <g transform={`translate(0, ${ty})`} opacity={op}>
      {/* Speaker tag */}
      <rect x={40} y={panY - 75} width={190} height={32} rx={6}
        fill={spCol + "22"} stroke={spCol} strokeWidth={1.5}/>
      <text x={56} y={panY - 18}
        fontFamily="'Courier New', monospace" fontSize={15} fontWeight="700"
        fill={spCol} letterSpacing="1">{spName}</text>
      {/* Main panel */}
      <rect x={40} y={panY} width={W - 149} height={150} rx={12}
        fill="#000000E0" stroke={spCol} strokeWidth={2}/>
      <rect x={40} y={panY} width={W - 149} height={3} rx={2} fill={spCol}/>
      {lines.map((ln, i) => (
        <text key={i} x={62} y={panY + 50 + i * 46}
          fontFamily="serif" fontSize={31} fontWeight="600"
          fill={C.white} filter="url(#f-soft)">{ln}</text>
      ))}
      <text x={62} y={panY + 136}
        fontFamily="'Courier New', monospace" fontSize={16} fontStyle="italic"
        fill={spCol} opacity={0.65}>
        {active.rom.length > 55 ? active.rom.slice(0, 55) + "…" : active.rom}
      </text>
    </g>
  );
};

// ═══════════════════════════════════════════════════════════════
//  ROOT EXPORT
// ═══════════════════════════════════════════════════════════════
export const AnimationScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { dx, dy } = getShake(frame);

  return (
    <AbsoluteFill style={{ background: "#000005" }}>
      <svg
        width={W} height={H}
        viewBox={`${-dx} ${-dy} ${W} ${H}`}
        style={{ display: "block" }}
      >
        <Defs/>
        <CinematicBG frame={frame}/>

        {/* ── SCENES */}
        <SceneIntro    frame={frame}/>
        <SceneBirth    frame={frame}/>
        <SceneShatter  frame={frame}/>
        <SceneDrift    frame={frame}/>
        <SceneAssemble frame={frame}/>
        <SceneReveal   frame={frame}/>
        <SceneInfinity frame={frame}/>
        <SceneOutro    frame={frame}/>

        {/* ── TRANSITIONS (always on top of scenes) */}
        <SceneTransitions frame={frame}/>

        {/* ── HUD */}
        <HUD frame={frame}/>

        {/* ── SUBTITLES */}
        <Subtitles frame={frame}/>
      </svg>
    </AbsoluteFill>
  );
};

/*
 ┌─────────────────────────────────────────────────────┐
 │  Root.tsx — paste this into your Remotion project    │
 ├─────────────────────────────────────────────────────┤
 │  import { Composition }    from "remotion";          │
 │  import { AnimationScene } from "./BanachTarski";    │
 │                                                      │
 │  export const RemotionRoot = () => (                 │
 │    <Composition                                      │
 │      id="BanachTarski"                               │
 │      component={AnimationScene}                      │
 │      durationInFrames={3240}                         │
 │      fps={60}                                        │
 │      width={1080}                                    │
 │      height={1920}                                   │
 │      defaultProps={{}}                               │
 │    />                                                │
 │  );                                                  │
 └─────────────────────────────────────────────────────┘
*/

// ═══════════════════════════════════════════════════════════════
// ██████████████████████████████████████████████████████████████
//  CONTINUATION BLOCK — HYPER-CINEMATIC LAYER ADDITIONS
// ██████████████████████████████████████████████████████████████
// ═══════════════════════════════════════════════════════════════
// Added components (injected as overlays in AnimationScene):
//  1. CinematicLetterbox        — top/bottom black bars + aspect crop feel
//  2. GodRays                   — volumetric radial light shafts
//  3. ChromaticGlitch           — RGB channel-split glitch bursts
//  4. HolographicGrid           — 3-D perspective floor grid
//  5. DNAHelixParticles         — spinning double-helix point cloud
//  6. EnergyArc                 — persistent crackling arcs between objects
//  7. SceneMathCrawl            — cinematic bottom equation ticker tape
//  8. CounterDigits             — fast-counting infinity density display
//  9. ZoomBurst                 — radial motion-blur zoom lines
// 10. ParticleNova              — supernova burst at reveal
// 11. AnimationSceneV2          — upgraded root that wires everything together
// ═══════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────
//  1. CINEMATIC LETTERBOX  (immersive 2.35:1 crop bars)
// ─────────────────────────────────────────────────────────────
const CinematicLetterbox: React.FC<{ frame: number }> = ({ frame }) => {
  // Bars retract on intro, hold during narrative, close on outro
  const openSp  = spring({ frame: Math.max(0, frame - 10), fps: FPS,
    config: { stiffness: 55, damping: 18 } });
  const isOutro = frame >= SC.OUTRO_START - 56;
  const closeSp = spring({ frame: Math.max(0, frame - (SC.OUTRO_START - 56)), fps: FPS,
    config: { stiffness: 55, damping: 18 } });

  // Portrait 1080×1920 → bars = (1920 - 1080/2.35) / 2 ≈ 731px each, but we use 120 for subtle crop
  const BAR_H = 110;
  const openOffset   = interpolate(openSp,  [0, 1], [0, BAR_H]);
  const closeOffset  = isOutro ? interpolate(closeSp, [0, 1], [BAR_H, 0]) : BAR_H;
  const barH = Math.min(openOffset, closeOffset);

  return (
    <>
      {/* Top bar */}
      <rect x={0} y={0} width={W} height={barH} fill="#000000"/>
      {/* Bottom bar */}
      <rect x={0} y={H - barH} width={W} height={barH} fill="#000000"/>
      {/* Subtle inner glow on bar edges */}
      <rect x={0} y={barH - 4} width={W} height={2}
        fill={C.gold} opacity={barH > 60 ? 0.18 : 0}/>
      <rect x={0} y={H - barH} width={W} height={2}
        fill={C.gold} opacity={barH > 60 ? 0.18 : 0}/>
    </>
  );
};

// ─────────────────────────────────────────────────────────────
//  2. GOD RAYS — volumetric radial light shafts from sphere
// ─────────────────────────────────────────────────────────────
const GodRays: React.FC<{ frame: number; cx?: number; cy?: number; color?: string }> = ({
  frame,
  cx = CX,
  cy = CY - 60,
  color = C.gold,
}) => {
  const RAY_COUNT = 24;
  const intensity = 0.5 + Math.sin(frame * 0.06) * 0.25;

  return (
    <g>
      {Array.from({ length: RAY_COUNT }, (_, i) => {
        const baseAngle = (i / RAY_COUNT) * Math.PI * 2;
        const wobble    = Math.sin(frame * 0.04 + i * 0.8) * 0.06;
        const angle     = baseAngle + wobble;

        // Inner radius pulsing
        const innerR = 180 + Math.sin(frame * 0.08 + i * 0.5) * 30;
        // Outer radius varies per ray
        const outerR = 580 + sr(i * 3 + 1) * 300 + Math.sin(frame * 0.05 + i) * 80;
        // Width at base
        const halfW  = (3 + sr(i * 3 + 4) * 8) * intensity;

        const ix1 = cx + Math.cos(angle - halfW * 0.01) * innerR;
        const iy1 = cy + Math.sin(angle - halfW * 0.01) * innerR * 0.45;
        const ix2 = cx + Math.cos(angle + halfW * 0.01) * innerR;
        const iy2 = cy + Math.sin(angle + halfW * 0.01) * innerR * 0.45;
        const ox  = cx + Math.cos(angle) * outerR;
        const oy  = cy + Math.sin(angle) * outerR * 0.45;

        const rayOp = (0.04 + sr(i * 3 + 3) * 0.06) * intensity;

        return (
          <polygon key={i}
            points={`${ix1},${iy1} ${ix2},${iy2} ${ox},${oy}`}
            fill={color}
            opacity={rayOp}/>
        );
      })}
    </g>
  );
};

// ─────────────────────────────────────────────────────────────
//  3. CHROMATIC GLITCH — RGB split + scanline tear bursts
// ─────────────────────────────────────────────────────────────
const ChromaticGlitch: React.FC<{ frame: number }> = ({ frame }) => {
  // Glitch triggers: near shatter, near reveal, random micro-glitches
  const triggers = [
    SC.SHATTER_START - 15,
    SC.SHATTER_START,
    SC.SHATTER_START + 7,
    SC.REVEAL_START - 7,
    SC.REVEAL_START,
    SC.INFINITY_START - 4,
    SC.OUTRO_START,
  ];

  const nearTrigger = triggers.some(t => Math.abs(frame - t) < 6);
  const microGlitch = (frame % 97 < 3) || (frame % 137 < 2);

  if (!nearTrigger && !microGlitch) return null;

  const intensity = nearTrigger ? 1.0 : 0.35;
  const shiftX    = (sr(frame * 7.3) - 0.5) * 22 * intensity;
  const shiftY    = (sr(frame * 5.1) - 0.5) * 4  * intensity;

  // Horizontal tear strips
  const tearCount = nearTrigger ? 6 : 2;
  const tears = Array.from({ length: tearCount }, (_, i) => {
    const ty = sr(frame * 3.1 + i * 17) * H;
    const th = 3 + sr(frame * 2.9 + i * 13) * 18;
    const tx = (sr(frame * 4.1 + i * 19) - 0.5) * 30;
    const op = 0.5 + sr(frame * 3.7 + i) * 0.4;
    return { ty, th, tx, op };
  });

  return (
    <g>
      {/* Red channel shift */}
      <g transform={`translate(${shiftX}, ${shiftY})`} style={{ mixBlendMode: "screen" }}>
        <rect x={0} y={0} width={W} height={H}
          fill="#FF0000" opacity={0.08 * intensity}/>
      </g>
      {/* Blue channel shift */}
      <g transform={`translate(${-shiftX * 0.7}, ${-shiftY})`} style={{ mixBlendMode: "screen" }}>
        <rect x={0} y={0} width={W} height={H}
          fill="#0000FF" opacity={0.08 * intensity}/>
      </g>
      {/* Horizontal tears */}
      {tears.map((t, i) => (
        <rect key={i} x={t.tx} y={t.ty} width={W} height={t.th}
          fill={C.white} opacity={t.op * 0.15 * intensity}/>
      ))}
      {/* Scanline burst */}
      {nearTrigger && Array.from({ length: 8 }, (_, i) => {
        const sy = sr(frame * 2 + i) * H;
        return (
          <rect key={`s${i}`} x={0} y={sy} width={W} height={1}
            fill={C.cyan} opacity={0.3}/>
        );
      })}
    </g>
  );
};

// ─────────────────────────────────────────────────────────────
//  4. HOLOGRAPHIC PERSPECTIVE FLOOR GRID
// ─────────────────────────────────────────────────────────────
const HolographicGrid: React.FC<{ frame: number }> = ({ frame }) => {
  // Only show during Birth and Reveal scenes
  const inBirth  = frame >= SC.BIRTH_START  && frame < SC.SHATTER_START;
  const inReveal = frame >= SC.REVEAL_START && frame < SC.INFINITY_START;
  if (!inBirth && !inReveal) return null;

  const lf  = inBirth ? frame - SC.BIRTH_START : frame - SC.REVEAL_START;
  const dur  = inBirth ? SC.SHATTER_START - SC.BIRTH_START : SC.INFINITY_START - SC.REVEAL_START;
  const fadeP = interpolate(lf, [0, 60, dur - 60, dur], [0, 1, 1, 0], { extrapolateRight: "clamp" });
  const baseCol = inReveal ? C.cyan : C.gold;

  // Perspective vanishing point
  const VP = { x: CX, y: CY + 180 };
  const GRID_W = 1800;
  const GRID_BOTTOM = H + 186;
  const GRID_TOP    = CY + 180;

  // Scroll offset creates movement
  const scroll = (lf * 2.5) % 80;

  // Vertical lines (converging to VP)
  const vLines = Array.from({ length: 20 }, (_, i) => {
    const t  = i / 19;
    const bx = -GRID_W / 2 + t * GRID_W;
    const tx = VP.x + (bx - VP.x) * 0.02;
    const op = 0.08 + (1 - Math.abs(t - 0.5) * 2) * 0.14;
    return (
      <line key={`v${i}`}
        x1={VP.x + bx * 0.001} y1={VP.y}
        x2={CX + bx}            y2={GRID_BOTTOM}
        stroke={baseCol} strokeWidth={0.8} opacity={op * fadeP}/>
    );
  });

  // Horizontal lines (receding into distance)
  const hLines = Array.from({ length: 18 }, (_, i) => {
    const t   = (i + scroll / 80) / 17;
    const y   = lerp(GRID_TOP, GRID_BOTTOM, Math.pow(t, 1.6));
    const halfW = lerp(2, GRID_W / 2, Math.pow(t, 0.8));
    const op  = t * 0.18 * fadeP;
    return (
      <line key={`h${i}`}
        x1={CX - halfW} y1={y}
        x2={CX + halfW} y2={y}
        stroke={baseCol} strokeWidth={0.7} opacity={op}/>
    );
  });

  return (
    <g>
      {/* Grid glow overlay */}
      <rect x={0} y={GRID_TOP} width={W} height={GRID_BOTTOM - GRID_TOP}
        fill={baseCol} opacity={0.012 * fadeP}/>
      {vLines}
      {hLines}
      {/* Horizon line */}
      <line x1={0} y1={VP.y} x2={W} y2={VP.y}
        stroke={baseCol} strokeWidth={1.5}
        opacity={0.35 * fadeP} filter="url(#f-soft)"/>
    </g>
  );
};

// ─────────────────────────────────────────────────────────────
//  5. DNA HELIX PARTICLES — double helix rotating in void
// ─────────────────────────────────────────────────────────────
const DNAHelix: React.FC<{ frame: number }> = ({ frame }) => {
  // Show only during Drift scene (sets orbiting)
  if (frame < SC.DRIFT_START || frame >= SC.ASSEMBLE_START) return null;
  const lf   = frame - SC.DRIFT_START;
  const dur  = SC.ASSEMBLE_START - SC.DRIFT_START;
  const fadeP = interpolate(lf, [0, 80, dur - 149, dur], [0, 1, 1, 0], { extrapolateRight: "clamp" });

  const HELIX_CX = CX;
  const HELIX_CY = CY - 60;
  const HELIX_R  = 60;       // radius of each strand
  const HELIX_H  = 700;      // vertical span
  const STEPS    = 120;

  // Two strands, 180° apart
  const strands = [0, Math.PI].map((phaseOffset, si) => {
    return Array.from({ length: STEPS }, (_, j) => {
      const t      = j / (STEPS - 1);
      const angle  = t * Math.PI * 6 + lf * 0.06 + phaseOffset;
      const px     = HELIX_CX + HELIX_R * Math.cos(angle);
      const py     = HELIX_CY - HELIX_H / 2 + t * HELIX_H;
      const depth  = Math.cos(angle); // -1 (back) to 1 (front)
      const sz     = 2.2 + depth * 1.2;
      const op     = (0.35 + depth * 0.45) * fadeP;
      const col    = si === 0 ? C.cyan : C.magenta;
      return { px, py, sz, op, col };
    });
  });

  // Cross-rungs (connecting the two strands every N steps)
  const rungs = Array.from({ length: 30 }, (_, i) => {
    const t     = i / 29;
    const angle = t * Math.PI * 6 + lf * 0.06;
    const px1   = HELIX_CX + HELIX_R * Math.cos(angle);
    const py    = HELIX_CY - HELIX_H / 2 + t * HELIX_H;
    const px2   = HELIX_CX + HELIX_R * Math.cos(angle + Math.PI);
    const depth = Math.abs(Math.cos(angle));
    const op    = depth * 0.25 * fadeP;
    return { px1, px2, py, op };
  });

  return (
    <g>
      {/* Rungs */}
      {rungs.map((r, i) => (
        <line key={i} x1={r.px1} y1={r.py} x2={r.px2} y2={r.py}
          stroke={C.gold} strokeWidth={0.8} opacity={r.op}/>
      ))}
      {/* Strand dots */}
      {strands.map((strand, si) =>
        strand.map((pt, j) => (
          <circle key={`${si}-${j}`} cx={pt.px} cy={pt.py}
            r={pt.sz} fill={pt.col} opacity={pt.op}
            filter={j % 12 === 0 ? "url(#f-soft)" : undefined}/>
        ))
      )}
      {/* Side label */}
      <text x={HELIX_CX + HELIX_R + 42} y={HELIX_CY}
        fontFamily="'Courier New', monospace" fontSize={14}
        fill={C.violet} opacity={0.55 * fadeP} letterSpacing="2">
        NON-MEASURABLE
      </text>
      <text x={HELIX_CX + HELIX_R + 42} y={HELIX_CY + 42}
        fontFamily="'Courier New', monospace" fontSize={14}
        fill={C.violet} opacity={0.55 * fadeP} letterSpacing="2">
        SET STRUCTURE
      </text>
    </g>
  );
};

// ─────────────────────────────────────────────────────────────
//  6. ENERGY ARC — crackling live lightning between two points
// ─────────────────────────────────────────────────────────────
function buildLightningPath(
  x1: number, y1: number,
  x2: number, y2: number,
  frame: number, seed: number,
  segments: number = 10
): string {
  const pts: Array<{ x: number; y: number }> = [{ x: x1, y: y1 }];
  for (let i = 1; i < segments; i++) {
    const t  = i / segments;
    const bx = lerp(x1, x2, t);
    const by = lerp(y1, y2, t);
    const perp = { x: -(y2 - y1), y: x2 - x1 };
    const plen = Math.sqrt(perp.x * perp.x + perp.y * perp.y) || 1;
    const jitter = (sr(frame * 1.7 + seed * 11 + i * 31) - 0.5) * 55;
    pts.push({
      x: bx + (perp.x / plen) * jitter,
      y: by + (perp.y / plen) * jitter,
    });
  }
  pts.push({ x: x2, y: y2 });
  return pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
}

const EnergyArc: React.FC<{
  frame: number; x1: number; y1: number; x2: number; y2: number;
  color?: string; width?: number; opacity?: number; seed?: number;
}> = ({ frame, x1, y1, x2, y2, color = C.cyan, width = 1.5, opacity = 0.7, seed = 1 }) => {
  // Three offset bolts per arc for thickness illusion
  const paths = [0, 1, 2].map(i => ({
    d:   buildLightningPath(x1, y1, x2, y2, frame + i * 7, seed + i * 100, 12),
    op:  opacity * (1 - i * 0.28),
    w:   width * (1 - i * 0.3),
  }));
  return (
    <g>
      {paths.map((p, i) => (
        <path key={i} d={p.d} fill="none"
          stroke={color} strokeWidth={p.w}
          opacity={p.op} filter="url(#f-soft)"
          strokeLinecap="round"/>
      ))}
    </g>
  );
};

// Persistent arc network shown during Drift & Assemble
const ArcNetwork: React.FC<{ frame: number }> = ({ frame }) => {
  const inDrift    = frame >= SC.DRIFT_START    && frame < SC.ASSEMBLE_START;
  const inAssemble = frame >= SC.ASSEMBLE_START && frame < SC.REVEAL_START;
  if (!inDrift && !inAssemble) return null;

  const lf = inDrift ? frame - SC.DRIFT_START : frame - SC.ASSEMBLE_START;

  // SO(3) axes arcs — three great circles
  const axes = [
    { a1: 0,          a2: Math.PI,     col: C.red,    label: "Rx" },
    { a1: Math.PI/2,  a2: 3*Math.PI/2, col: C.cyan,   label: "Ry" },
    { a1: Math.PI/4,  a2: 5*Math.PI/4, col: C.lime,   label: "Rz" },
  ];

  return (
    <g>
      {axes.map((ax, i) => {
        const rot = lf * (0.016 + i * 0.006) * (i % 2 === 0 ? 1 : -1);
        const R   = 340;
        // Points on the arc
        const pts = Array.from({ length: 24 }, (_, j) => {
          const a = lerp(ax.a1, ax.a2, j / 23) + rot;
          return {
            x: CX + R * Math.cos(a),
            y: (CY - 60) + R * Math.sin(a) * 0.40,
          };
        });
        const op = 0.20 + Math.sin(lf * 0.08 + i * 1.4) * 0.08;
        const d  = pts.map((p, j) => `${j === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
        return (
          <g key={i}>
            <path d={d} fill="none" stroke={ax.col}
              strokeWidth={1.2} opacity={op}
              strokeDasharray="6 4"/>
            {/* Traveling spark on arc */}
            {(() => {
              const sparkT  = ((lf * 0.04 + i * 0.33) % 1);
              const sparkIdx= Math.floor(sparkT * 23);
              const sp      = pts[sparkIdx] || pts[0];
              return (
                <circle cx={sp.x} cy={sp.y} r={4}
                  fill={ax.col} opacity={0.85} filter="url(#f-soft)"/>
              );
            })()}
          </g>
        );
      })}
    </g>
  );
};

// ─────────────────────────────────────────────────────────────
//  7. MATH TICKER — scrolling equation tape at bottom
// ─────────────────────────────────────────────────────────────
const TICKER_EQS = [
  "S = A ∪ B ∪ C ∪ D ∪ E  ·  ",
  "SO(3) rotations preserve shape  ·  ",
  "Axiom of Choice ⟹ non-measurable sets  ·  ",
  "μ(S₁) = μ(S₂) = μ(S)  ·  ",
  "Banach 1924  ·  Tarski 1924  ·  ",
  "ZFC + AC ⟹ Banach-Tarski  ·  ",
  "dim(S) = 3  ·  S ≅ S₁ ≅ S₂  ·  ",
  "Hausdorff paradox (1914) ⟹  ·  ",
  "Non-measurable ≠ impossible  ·  ",
  "S ⊂ ℝ³  ·  |S| = ℵ₁  ·  ",
];

const MathTicker: React.FC<{ frame: number }> = ({ frame }) => {
  if (frame < SC.BIRTH_START) return null;
  if (frame >= SC.OUTRO_START) return null;

  const fullStr  = TICKER_EQS.join("");
  const speed    = 2.8;  // px per frame
  const offset   = (frame * speed) % (fullStr.length * 16);  // ~16px per char at font 18

  // Two copies for seamless loop
  const yPos = H - 168;  // just above progress bar

  return (
    <g>
      <rect x={0} y={yPos - 7} width={W} height={32}
        fill="#000000BB"/>
      <rect x={0} y={yPos - 7} width={W} height={1}
        fill={C.gold} opacity={0.3}/>
      <clipPath id="ticker-clip">
        <rect x={0} y={yPos - 7} width={W} height={32}/>
      </clipPath>
      <g clipPath="url(#ticker-clip)">
        <text y={yPos + 18}
          fontFamily="'Courier New', monospace" fontSize={17}
          fill={C.gold} opacity={0.55} letterSpacing="1"
          transform={`translate(${-offset}, 0)`}>
          {fullStr}{fullStr}
        </text>
      </g>
    </g>
  );
};

// ─────────────────────────────────────────────────────────────
//  8. COUNTER DIGITS — hyper fast infinity density counter
// ─────────────────────────────────────────────────────────────
const CounterDigits: React.FC<{ frame: number }> = ({ frame }) => {
  if (frame < SC.DRIFT_START || frame >= SC.OUTRO_START) return null;
  const lf = frame - SC.DRIFT_START;

  // Exponential escalation
  const exp  = interpolate(lf, [0, SC.INFINITY_END - SC.DRIFT_START],
    [0, 9], { extrapolateRight: "clamp" });
  const val  = Math.floor(Math.pow(10, exp));
  const str  = val > 1e8
    ? `${(val / 1e9).toFixed(3)}B`
    : val > 1e5
    ? `${(val / 1e6).toFixed(4)}M`
    : val.toLocaleString();

  const panX = W - 320;
  const panY = H - 468;

  // Digit flip effect — each digit independently
  const digits = str.split("").map((ch, i) => {
    const flip = Math.sin(frame * (0.3 + i * 0.07) + i * 1.4) > 0.7;
    return { ch, flip };
  });

  return (
    <g>
      <rect x={panX} y={panY} width={300} height={88} rx={10}
        fill="#000000CC" stroke={C.lime} strokeWidth={1.5}/>
      <rect x={panX} y={panY} width={300} height={3} rx={2}
        fill={C.lime} opacity={0.8}/>
      <text x={panX + 14} y={panY + 42}
        fontFamily="'Courier New', monospace" fontSize={13}
        fill={C.lime} opacity={0.6} letterSpacing="3">POINT DENSITY</text>
      <text x={panX + 14} y={panY + 64}
        fontFamily="'Courier New', monospace" fontWeight="900" fontSize={30}
        fill={C.lime} filter="url(#f-soft)" letterSpacing="1">
        ρ → {str}
      </text>
      {/* Infinity approach indicator */}
      <text x={panX + 14} y={panY + 152}
        fontFamily="'Courier New', monospace" fontSize={11}
        fill={C.lime} opacity={0.45} letterSpacing="4">
        pts / unit³  → ∞
      </text>
    </g>
  );
};

// ─────────────────────────────────────────────────────────────
//  9. ZOOM BURST — radial motion lines from screen center
// ─────────────────────────────────────────────────────────────
const ZoomBurst: React.FC<{ frame: number }> = ({ frame }) => {
  // Fire at scene transitions
  const triggers = [SC.SHATTER_START, SC.ASSEMBLE_START, SC.REVEAL_START];
  let bestLF = -1;
  let bestCol = C.gold;
  for (const [i, t] of triggers.entries()) {
    const lf = frame - t;
    if (lf >= 0 && lf < 18) {
      bestLF  = lf;
      bestCol = [C.red, C.magenta, C.white][i];
    }
  }
  if (bestLF < 0) return null;

  const progress = bestLF / 18;
  const op       = interpolate(bestLF, [0, 3, 18], [0, 0.75, 0]);

  return (
    <g>
      {Array.from({ length: 40 }, (_, i) => {
        const angle    = (i / 40) * Math.PI * 2;
        const inner    = 60 + progress * 120;
        const outer    = inner + 400 + sr(i * 3 + 1) * 400 * progress;
        const thickness= 1.5 + sr(i * 3 + 4) * 3.5;
        const lineOp   = op * (0.4 + sr(i * 3 + 3) * 0.5);
        return (
          <line key={i}
            x1={CX + Math.cos(angle) * inner}
            y1={(CY - 60) + Math.sin(angle) * inner * 0.5}
            x2={CX + Math.cos(angle) * outer}
            y2={(CY - 60) + Math.sin(angle) * outer * 0.5}
            stroke={bestCol} strokeWidth={thickness}
            opacity={lineOp}/>
        );
      })}
    </g>
  );
};

// ─────────────────────────────────────────────────────────────
// 10. PARTICLE NOVA — supernova burst at reveal moment
// ─────────────────────────────────────────────────────────────
const NOVA_PARTICLES = Array.from({ length: 600 }, (_, i) => ({
  phi:   Math.acos(1 - 4 * sr(i * 4 + 1)),
  theta: 2 * Math.PI * sr(i * 4 + 4),
  speed: 0.8 + sr(i * 4 + 3) * 2.2,
  size:  0.6 + sr(i * 4 + 7) * 2.4,
  col:   SET_C[i % 5],
  life:  0.3 + sr(i * 4 + 5) * 0.7,
  trail: sr(i * 4 + 6) > 0.6,
}));

const ParticleNova: React.FC<{ frame: number }> = ({ frame }) => {
  const triggerF = SC.REVEAL_START;
  const lf = frame - triggerF;
  if (lf < 0 || lf > 180) return null;

  const progress = lf / 180;

  return (
    <g>
      {NOVA_PARTICLES.map((p, i) => {
        const delay = sr(i * 3) * 0.25;
        const t     = clamp01((progress - delay) / (1 - delay));
        if (t <= 0) return null;
        const dist  = p.speed * t * 480;
        const px    = CX + Math.sin(p.phi) * Math.cos(p.theta) * dist;
        const py    = (CY - 60) + Math.cos(p.phi) * dist * 0.45;
        const op    = interpolate(t, [0, 0.12, p.life, 1], [0, 0.9, 0.7, 0]);
        if (op <= 0) return null;

        // Trail line
        const trailDist = Math.max(0, dist - p.speed * 30);
        const trailX    = CX + Math.sin(p.phi) * Math.cos(p.theta) * trailDist;
        const trailY    = (CY - 60) + Math.cos(p.phi) * trailDist * 0.45;

        return (
          <g key={i}>
            {p.trail && (
              <line x1={trailX} y1={trailY} x2={px} y2={py}
                stroke={p.col} strokeWidth={p.size * 0.5}
                opacity={op * 0.4}/>
            )}
            <circle cx={px} cy={py} r={p.size}
              fill={p.col} opacity={op}
              filter={i % 18 === 0 ? "url(#f-soft)" : undefined}/>
          </g>
        );
      })}
    </g>
  );
};

// ─────────────────────────────────────────────────────────────
// 11. FLOATING MATH SYMBOLS — ambient drifting glyphs
// ─────────────────────────────────────────────────────────────
const MATH_GLYPHS = ["∞", "∂", "∑", "∫", "π", "∀", "∃", "∈", "∅", "ℝ", "ℵ", "∪", "≅", "⊂", "μ"];

const FloatingMathSymbols: React.FC<{ frame: number }> = ({ frame }) => {
  if (frame < SC.BIRTH_START || frame >= SC.OUTRO_START) return null;

  return (
    <g>
      {MATH_GLYPHS.map((glyph, i) => {
        const baseX  = sr(i * 5 + 1) * (W - 186) + 50;
        const baseY  = 160 + sr(i * 5 + 4) * (H - 750);
        const speed  = 0.008 + sr(i * 5 + 3) * 0.015;
        const amp    = 18 + sr(i * 5 + 7) * 40;
        const phase  = sr(i * 5 + 5) * Math.PI * 2;
        const driftX = Math.sin(frame * speed + phase) * amp;
        const driftY = Math.cos(frame * speed * 0.7 + phase) * amp * 0.6;
        const rot    = Math.sin(frame * speed * 0.5 + i) * 15;
        const sz     = 18 + sr(i * 5 + 6) * 32;
        const op     = 0.04 + sr(i * 5 + 7) * 0.07;
        const col    = SET_C[i % 5];

        return (
          <text key={i}
            x={baseX + driftX} y={baseY + driftY}
            textAnchor="middle"
            fontFamily="'Courier New', monospace" fontWeight="900"
            fontSize={sz} fill={col} opacity={op}
            transform={`rotate(${rot}, ${baseX + driftX}, ${baseY + driftY})`}>
            {glyph}
          </text>
        );
      })}
    </g>
  );
};

// ─────────────────────────────────────────────────────────────
// 12. SCENE-SPECIFIC GOD RAY ORCHESTRATOR
// ─────────────────────────────────────────────────────────────
const GodRayOrchestrator: React.FC<{ frame: number }> = ({ frame }) => {
  // Birth: gold from sphere center
  const inBirth = frame >= SC.BIRTH_START + 186 && frame < SC.SHATTER_START;
  // Reveal: multi-color from each twin sphere
  const inReveal = frame >= SC.REVEAL_START && frame < SC.INFINITY_START;
  // Outro: violet from screen center
  const inOutro  = frame >= SC.OUTRO_START;

  const birthLF  = frame - SC.BIRTH_START - 186;
  const revealLF = frame - SC.REVEAL_START;
  const outroLF  = frame - SC.OUTRO_START;

  const birthOp  = inBirth  ? interpolate(birthLF,  [0, 60], [0, 1], { extrapolateRight: "clamp" }) : 0;
  const revOp    = inReveal ? interpolate(revealLF, [0, 60], [0, 1], { extrapolateRight: "clamp" }) : 0;
  const outroOp  = inOutro  ? interpolate(outroLF,  [0, 80], [0, 1], { extrapolateRight: "clamp" }) : 0;

  return (
    <g>
      {/* Birth — single gold sphere */}
      {inBirth && (
        <g opacity={birthOp}>
          <GodRays frame={frame} cx={CX} cy={CY - 60} color={C.gold}/>
        </g>
      )}
      {/* Reveal — two spheres with different colors */}
      {inReveal && (
        <g opacity={revOp}>
          <GodRays frame={frame} cx={CX - 460} cy={CY - 186} color={C.cyan}/>
          <GodRays frame={frame} cx={CX + 460} cy={CY - 186} color={C.magenta}/>
        </g>
      )}
      {/* Outro — violet from center */}
      {inOutro && (
        <g opacity={outroOp}>
          <GodRays frame={frame} cx={CX} cy={CY - 400} color={C.violet}/>
        </g>
      )}
    </g>
  );
};

// ─────────────────────────────────────────────────────────────
// 13. SPHERE HEART BEAT — visible pulse rings during Birth
// ─────────────────────────────────────────────────────────────
const SphereHeartbeat: React.FC<{ frame: number }> = ({ frame }) => {
  if (frame < SC.BIRTH_START + 149 || frame >= SC.SHATTER_START) return null;
  const lf = frame - SC.BIRTH_START - 149;

  // Beat every 90 frames
  const BEAT_PERIOD = 90;
  const beatLF = lf % BEAT_PERIOD;

  const rings = [0, 18, 36].map(delay => {
    const bf = Math.max(0, beatLF - delay);
    const r  = interpolate(bf, [0, BEAT_PERIOD - delay], [200, 460], { extrapolateRight: "clamp" });
    const op = interpolate(bf, [0, 10, BEAT_PERIOD - delay], [0, 0.6, 0], { extrapolateRight: "clamp" });
    return { r, op };
  });

  return (
    <g>
      {rings.map((ring, i) => (
        <ellipse key={i} cx={CX} cy={CY - 60}
          rx={ring.r} ry={ring.r * 0.42}
          fill="none" stroke={C.gold}
          strokeWidth={2.5 - i * 0.5}
          opacity={ring.op} filter="url(#f-soft)"/>
      ))}
    </g>
  );
};

// ─────────────────────────────────────────────────────────────
// 14. SHATTER CRACK OVERLAY — screen-space fracture lines
// ─────────────────────────────────────────────────────────────
const ShatterCrackOverlay: React.FC<{ frame: number }> = ({ frame }) => {
  const lf = frame - SC.SHATTER_START;
  if (lf < 0 || lf > 80) return null;

  const progress = interpolate(lf, [0, 55], [0, 1], { extrapolateRight: "clamp" });
  const fadeOut  = interpolate(lf, [40, 80], [1, 0], { extrapolateRight: "clamp" });

  // 8 main cracks radiating from center to screen edges
  const CRACKS = Array.from({ length: 8 }, (_, i) => {
    const baseAngle = (i / 8) * Math.PI * 2 + 0.2;
    const segments  = 12;
    const totalLen  = 700 + sr(i * 5 + 1) * 400;
    const pts: string[] = [];
    let cx2 = CX, cy2 = CY - 60;
    for (let j = 0; j <= segments; j++) {
      const t      = j / segments;
      const dist   = t * totalLen * progress;
      const jitter = (sr(i * segments + j + frame * 0.01) - 0.5) * 55 * t;
      const perp   = baseAngle + Math.PI / 2;
      const nx     = CX + Math.cos(baseAngle) * dist + Math.cos(perp) * jitter;
      const ny     = (CY - 60) + Math.sin(baseAngle) * dist * 0.55 + Math.sin(perp) * jitter * 0.4;
      pts.push(`${j === 0 ? "M" : "L"} ${nx.toFixed(1)} ${ny.toFixed(1)}`);

      // Branch crack
      if (j === Math.floor(segments * 0.55) && sr(i * 7) > 0.45) {
        const bAngle = baseAngle + (sr(i * 7 + 1) - 0.5) * 1.4;
        const bLen   = 200 * progress * sr(i * 7 + 4);
        const bx     = nx + Math.cos(bAngle) * bLen;
        const by     = ny + Math.sin(bAngle) * bLen * 0.55;
        pts.push(`M ${nx.toFixed(1)} ${ny.toFixed(1)}`);
        pts.push(`L ${bx.toFixed(1)} ${by.toFixed(1)}`);
        pts.push(`M ${nx.toFixed(1)} ${ny.toFixed(1)}`);
      }
    }
    return {
      d: pts.join(" "),
      col: i % 3 === 0 ? C.red : i % 3 === 1 ? C.gold : C.white,
      w: 1.5 + sr(i * 5 + 3) * 2.5,
      op: (0.5 + sr(i * 5 + 7) * 0.4) * fadeOut,
    };
  });

  return (
    <g>
      {/* Dark vignette pulse */}
      <rect x={0} y={0} width={W} height={H}
        fill="#FF2200" opacity={0.06 * progress * fadeOut}/>
      {CRACKS.map((c, i) => (
        <path key={i} d={c.d} fill="none"
          stroke={c.col} strokeWidth={c.w}
          opacity={c.op} filter="url(#f-soft)"
          strokeLinecap="round"/>
      ))}
      {/* White hot center */}
      <circle cx={CX} cy={CY - 60} r={30 * progress}
        fill={C.white} opacity={0.7 * progress * fadeOut}
        filter="url(#f-massive)"/>
    </g>
  );
};

// ─────────────────────────────────────────────────────────────
// 15. DEPTH OF FIELD VIGNETTE — subtle blur at edges
// ─────────────────────────────────────────────────────────────
const DepthVignette: React.FC<{ frame: number }> = ({ frame }) => {
  // Radial vignette that pulses slightly
  const pulse = 0.55 + Math.sin(frame * 0.03) * 0.05;
  return (
    <>
      <radialGradient id="dof-vig" cx="50%" cy="52%" r="65%">
        <stop offset="0%"   stopColor="#000000" stopOpacity="0"/>
        <stop offset={`${pulse * 100}%`} stopColor="#000000" stopOpacity="0"/>
        <stop offset="100%" stopColor="#000000" stopOpacity="0.62"/>
      </radialGradient>
      <rect x={0} y={0} width={W} height={H} fill="url(#dof-vig)"/>
    </>
  );
};

// ─────────────────────────────────────────────────────────────
// 16. UPGRADED ROOT — AnimationSceneV2
//     Wires ALL new layers into the render stack
// ─────────────────────────────────────────────────────────────
export const AnimationSceneV2: React.FC<{ __startFrame?: number }> = ({ __startFrame = 0 }) => {
  const localFrame = useCurrentFrame();
  const frame = localFrame + __startFrame;
  const { dx, dy } = getShake(frame);

  return (
    <AbsoluteFill style={{ background: "#000005" }}>
      <svg
        width={W} height={H}
        viewBox={`${-dx} ${-dy} ${W} ${H}`}
        style={{ display: "block" }}
      >
        {/* ─── DEFS (original) ─── */}
        <Defs/>

        {/* ─── LAYER 0: Deep background ─── */}
        <CinematicBG frame={frame}/>

        {/* ─── LAYER 1: Floor grid (parallax depth) ─── */}
        <HolographicGrid frame={frame}/>

        {/* ─── LAYER 2: Ambient floating math symbols ─── */}
        <FloatingMathSymbols frame={frame}/>

        {/* ─── LAYER 3: God rays (behind spheres) ─── */}
        <GodRayOrchestrator frame={frame}/>

        {/* ─── LAYER 4: Scene content ─── */}
        <SceneIntro    frame={frame}/>
        <SceneBirth    frame={frame}/>

        {/* Heartbeat pulse rings */}
        <SphereHeartbeat frame={frame}/>

        <SceneShatter  frame={frame}/>

        {/* Screen-space crack overlay (on top of shatter particles) */}
        <ShatterCrackOverlay frame={frame}/>

        {/* DNA helix in drift */}
        <DNAHelix frame={frame}/>

        {/* SO(3) arc network */}
        <ArcNetwork frame={frame}/>

        <SceneDrift    frame={frame}/>
        <SceneAssemble frame={frame}/>

        {/* Particle nova at reveal */}
        <ParticleNova frame={frame}/>

        <SceneReveal   frame={frame}/>
        <SceneInfinity frame={frame}/>
        <SceneOutro    frame={frame}/>

        {/* ─── LAYER 5: Zoom burst (transition fx) ─── */}
        <ZoomBurst frame={frame}/>

        {/* ─── LAYER 6: Chromatic glitch ─── */}
        <ChromaticGlitch frame={frame}/>

        {/* ─── LAYER 7: Scene cut flash ─── */}
        <SceneTransitions frame={frame}/>

        {/* ─── LAYER 8: Depth of field vignette ─── */}
        <DepthVignette frame={frame}/>

        {/* ─── LAYER 9: HUD chrome ─── */}
        <HUD frame={frame}/>

        {/* ─── LAYER 10: Equation ticker tape ─── */}
        <MathTicker frame={frame}/>

        {/* ─── LAYER 11: Density counter ─── */}
        <CounterDigits frame={frame}/>

        {/* ─── LAYER 12: Hindi subtitles (always top) ─── */}
        <Subtitles frame={frame}/>

        {/* ─── LAYER 13: Cinematic letterbox bars (topmost) ─── */}
        <CinematicLetterbox frame={frame}/>
      </svg>
    </AbsoluteFill>
  );
};

/*
╔══════════════════════════════════════════════════════════════════╗
║  Root.tsx — register BOTH compositions for A/B comparison        ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  import { Composition } from "remotion";                         ║
║  import {                                                        ║
║    AnimationScene,                                               ║
║    AnimationSceneV2,                                             ║
║  } from "./BanachTarski";                                        ║
║                                                                  ║
║  export const RemotionRoot = () => (                             ║
║    <>                                                            ║
║      <Composition                                                ║
║        id="BanachTarski-V1"                                      ║
║        component={AnimationScene}                                ║
║        durationInFrames={3240}                                   ║
║        fps={60}                                                  ║
║        width={1080}                                              ║
║        height={1920}                                             ║
║        defaultProps={{}}                                         ║
║      />                                                          ║
║      <Composition                                                ║
║        id="BanachTarski-V2"                                      ║
║        component={AnimationSceneV2}                              ║
║        durationInFrames={3240}                                   ║
║        fps={60}                                                  ║
║        width={1080}                                              ║
║        height={1920}                                             ║
║        defaultProps={{}}                                         ║
║      />                                                          ║
║    </>                                                           ║
║  );                                                              ║
╚══════════════════════════════════════════════════════════════════╝

ANIMATION LAYER STACK — V2:
  [0]  CinematicBG         — nebula, starfield, shooting stars, atmosphere
  [1]  HolographicGrid     — 3D perspective grid during Birth + Reveal
  [2]  FloatingMathSymbols — ∞ ∂ ∑ ∫ π ∀ drifting in scene
  [3]  GodRayOrchestrator  — volumetric light shafts (gold / cyan / magenta / violet)
  [4]  SceneIntro          — Impact title smash + chromatic aberration
  [5]  SceneBirth          — sphere coalesce from spiraling particles
  [6]  SphereHeartbeat     — expanding ellipse pulse rings
  [7]  SceneShatter        — explosion + 1490 debris particles
  [8]  ShatterCrackOverlay — screen-space fracture lines + hot core
  [9]  DNAHelix            — double helix showing set structure
  [10] ArcNetwork          — SO(3) great circle arcs with traveling sparks
  [11] SceneDrift          — 5 sets orbiting with lightning mesh
  [12] SceneAssemble       — convergence with energy trails + pop-in springs
  [13] ParticleNova        — 600-particle supernova burst at Reveal
  [14] SceneReveal         — twin spheres + orbital particles + equation rain
  [15] SceneInfinity       — AC logic cards + spiral field
  [16] SceneOutro          — particle storm + quote + summary
  [17] ZoomBurst           — radial motion lines at transitions
  [18] ChromaticGlitch     — RGB split + horizontal tears + scanlines
  [19] SceneTransitions    — hard cut flash frames
  [20] DepthVignette       — pulsing radial depth-of-field darkness
  [21] HUD                 — header bar + phase chip + frame counter
  [22] MathTicker          — scrolling equation tape strip
  [23] CounterDigits       — exponential density counter panel
  [24] Subtitles           — Hindi narration with speaker personas
  [25] CinematicLetterbox  — 2.35:1 black bars (topmost)
*/
