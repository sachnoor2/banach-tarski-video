import React from "react";
import { Composition } from "remotion";
import {
  BanachTarskiFull,
  ChunkPhase1,
  ChunkPhase2,
  ChunkPhase3,
  ChunkPhase4,
} from "./compositions/BanachTarskiFull";
import {
  VIDEO_WIDTH,
  VIDEO_HEIGHT,
  FPS,
  PHASE_BOUNDARIES,
} from "./shared";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* Full video composition - 120 seconds at 60fps - for studio preview */}
      <Composition
        id="BanachTarskiFull"
        component={BanachTarskiFull}
        durationInFrames={PHASE_BOUNDARIES.totalFrames}
        fps={FPS}
        width={VIDEO_WIDTH}
        height={VIDEO_HEIGHT}
      />

      {/* Chunk 1: Phase 1 - Solid sphere (0:00 - 0:26.67) = 1600 frames */}
      <Composition
        id="Chunk-Phase1"
        component={ChunkPhase1}
        durationInFrames={PHASE_BOUNDARIES.phase1End}
        fps={FPS}
        width={VIDEO_WIDTH}
        height={VIDEO_HEIGHT}
      />

      {/* Chunk 2: Phase 2 - Split/Decomposition (0:26.67 - 0:50) = 1400 frames */}
      <Composition
        id="Chunk-Phase2"
        component={ChunkPhase2}
        durationInFrames={PHASE_BOUNDARIES.phase2End - PHASE_BOUNDARIES.phase1End}
        fps={FPS}
        width={VIDEO_WIDTH}
        height={VIDEO_HEIGHT}
      />

      {/* Chunk 3: Phase 3 - Reassembly/Duplication (0:50 - 1:20) = 1800 frames */}
      <Composition
        id="Chunk-Phase3"
        component={ChunkPhase3}
        durationInFrames={PHASE_BOUNDARIES.phase3End - PHASE_BOUNDARIES.phase2End}
        fps={FPS}
        width={VIDEO_WIDTH}
        height={VIDEO_HEIGHT}
      />

      {/* Chunk 4: Phase 4 - Infinity state (1:20 - 2:00) = 2400 frames */}
      <Composition
        id="Chunk-Phase4"
        component={ChunkPhase4}
        durationInFrames={PHASE_BOUNDARIES.totalFrames - PHASE_BOUNDARIES.phase3End}
        fps={FPS}
        width={VIDEO_WIDTH}
        height={VIDEO_HEIGHT}
      />
    </>
  );
};
