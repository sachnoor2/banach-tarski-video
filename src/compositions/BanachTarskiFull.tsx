import React from "react";
import { Composition } from "remotion";
import { BanachTarskiChunk } from "./BanachTarskiChunk";
import {
  VIDEO_WIDTH,
  VIDEO_HEIGHT,
  FPS,
  PHASE_BOUNDARIES,
} from "../shared";

/** Full composition for studio preview */
export const BanachTarskiFull: React.FC = () => (
  <BanachTarskiChunk globalStartFrame={0} />
);

/** Chunk 1: Phase 1 - Solid sphere (0 - 22.36s) = 1342 frames */
export const ChunkPhase1: React.FC = () => (
  <BanachTarskiChunk globalStartFrame={0} />
);

/** Chunk 2: Phase 2 - Split (22.36s - 41.93s) = 1174 frames */
export const ChunkPhase2: React.FC = () => (
  <BanachTarskiChunk globalStartFrame={PHASE_BOUNDARIES.phase1End} />
);

/** Chunk 3: Phase 3 - Reassembly (41.93s - 67.08s) = 1509 frames */
export const ChunkPhase3: React.FC = () => (
  <BanachTarskiChunk globalStartFrame={PHASE_BOUNDARIES.phase2End} />
);

/** Chunk 4: Phase 4 - Infinity (67.08s - 100.62s) = 2012 frames */
export const ChunkPhase4: React.FC = () => (
  <BanachTarskiChunk globalStartFrame={PHASE_BOUNDARIES.phase3End} />
);

/** Root: register all compositions */
export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="BanachTarskiFull"
        component={BanachTarskiFull}
        durationInFrames={PHASE_BOUNDARIES.totalFrames}
        fps={FPS}
        width={VIDEO_WIDTH}
        height={VIDEO_HEIGHT}
      />
      <Composition
        id="Chunk-Phase1"
        component={ChunkPhase1}
        durationInFrames={PHASE_BOUNDARIES.phase1End}
        fps={FPS}
        width={VIDEO_WIDTH}
        height={VIDEO_HEIGHT}
      />
      <Composition
        id="Chunk-Phase2"
        component={ChunkPhase2}
        durationInFrames={PHASE_BOUNDARIES.phase2End - PHASE_BOUNDARIES.phase1End}
        fps={FPS}
        width={VIDEO_WIDTH}
        height={VIDEO_HEIGHT}
      />
      <Composition
        id="Chunk-Phase3"
        component={ChunkPhase3}
        durationInFrames={PHASE_BOUNDARIES.phase3End - PHASE_BOUNDARIES.phase2End}
        fps={FPS}
        width={VIDEO_WIDTH}
        height={VIDEO_HEIGHT}
      />
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
