import React from "react";
import { Composition } from "remotion";
import { BanachTarskiChunk } from "./BanachTarskiChunk";
import {
  VIDEO_WIDTH,
  VIDEO_HEIGHT,
  FPS,
  PHASE_BOUNDARIES,
} from "../shared";

/**
 * Full 120-second composition for studio preview.
 */
export const BanachTarskiFull: React.FC = () => {
  return <BanachTarskiChunk globalStartFrame={0} />;
};

/**
 * Individual chunk compositions for parallel rendering in CI.
 * Each chunk renders a segment of the timeline.
 * The globalStartFrame prop ensures animations are correct.
 */
export const ChunkPhase1: React.FC = () => (
  <BanachTarskiChunk globalStartFrame={0} />
);

export const ChunkPhase2: React.FC = () => (
  <BanachTarskiChunk globalStartFrame={PHASE_BOUNDARIES.phase1End} />
);

export const ChunkPhase3: React.FC = () => (
  <BanachTarskiChunk globalStartFrame={PHASE_BOUNDARIES.phase2End} />
);

export const ChunkPhase4: React.FC = () => (
  <BanachTarskiChunk globalStartFrame={PHASE_BOUNDARIES.phase3End} />
);
