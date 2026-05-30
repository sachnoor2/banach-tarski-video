import React from "react";
import { Composition } from "remotion";
import { AnimationSceneV2 } from "./BanachTarski";

const FPS = 60;
const W = 1080;
const H = 1920;
const TOTAL = 6037;

// Phase boundaries matching scaled BanachTarski.tsx SC constants
const P1 = 410;    // INTRO_END / BIRTH_START
const P2 = 1081;   // BIRTH_END / SHATTER_START
const P3 = 1714;   // SHATTER_END / DRIFT_START
const P4 = 2385;   // DRIFT_END / ASSEMBLE_START
const P5 = 3168;   // ASSEMBLE_END / REVEAL_START
const P6 = 3913;   // REVEAL_END / INFINITY_START
const P7 = 4845;   // INFINITY_END / OUTRO_START

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* Full composition for studio preview */}
      <Composition
        id="BanachTarskiFull"
        component={AnimationSceneV2}
        durationInFrames={TOTAL}
        fps={FPS}
        width={W}
        height={H}
        defaultProps={{ __startFrame: 0 }}
      />

      {/* Chunk 1: Intro + Birth (0:00 - 0:18.02) */}
      <Composition
        id="Chunk-1"
        component={AnimationSceneV2}
        durationInFrames={P2}
        fps={FPS}
        width={W}
        height={H}
        defaultProps={{ __startFrame: 0 }}
      />

      {/* Chunk 2: Shatter (0:18.02 - 0:28.57) */}
      <Composition
        id="Chunk-2"
        component={AnimationSceneV2}
        durationInFrames={P3 - P2}
        fps={FPS}
        width={W}
        height={H}
        defaultProps={{ __startFrame: P2 }}
      />

      {/* Chunk 3: Drift (0:28.57 - 0:39.75) */}
      <Composition
        id="Chunk-3"
        component={AnimationSceneV2}
        durationInFrames={P4 - P3}
        fps={FPS}
        width={W}
        height={H}
        defaultProps={{ __startFrame: P3 }}
      />

      {/* Chunk 4: Assemble (0:39.75 - 0:52.80) */}
      <Composition
        id="Chunk-4"
        component={AnimationSceneV2}
        durationInFrames={P5 - P4}
        fps={FPS}
        width={W}
        height={H}
        defaultProps={{ __startFrame: P4 }}
      />

      {/* Chunk 5: Reveal (0:52.80 - 1:05.22) */}
      <Composition
        id="Chunk-5"
        component={AnimationSceneV2}
        durationInFrames={P6 - P5}
        fps={FPS}
        width={W}
        height={H}
        defaultProps={{ __startFrame: P5 }}
      />

      {/* Chunk 6: Infinity (1:05.22 - 1:14.08) */}
      <Composition
        id="Chunk-6"
        component={AnimationSceneV2}
        durationInFrames={P7 - P6}
        fps={FPS}
        width={W}
        height={H}
        defaultProps={{ __startFrame: P6 }}
      />

      {/* Chunk 7: Outro (1:14.08 - 1:40.62) */}
      <Composition
        id="Chunk-7"
        component={AnimationSceneV2}
        durationInFrames={TOTAL - P7}
        fps={FPS}
        width={W}
        height={H}
        defaultProps={{ __startFrame: P7 }}
      />
    </>
  );
};
