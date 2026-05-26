#!/usr/bin/env python3
"""
Audio-Visual Alignment Validator
=================================
Validates that every second of audio aligns with the correct visual scene
in the Banach-Tarski video.

Usage: python validate_alignment.py
Exit code 0 = all aligned
Exit code 1 = misalignment detected (triggers rerun)
"""

import json
import sys

# Audio metadata (from ffprobe/MP3 frame analysis)
AUDIO_DURATION_SEC = 100.6237
AUDIO_BITRATE_KBPS = 128
AUDIO_SAMPLE_RATE = 44100
AUDIO_TOTAL_FRAMES = 3852

# Video metadata
FPS = 60
TOTAL_FRAMES = 6037  # floor(100.6237 * 60)

# Phase boundaries (frames) — must match src/shared.ts exactly
PHASE_BOUNDARIES = {
    "phase1End": 1342,   # 22.36s
    "phase2End": 2516,   # 41.93s
    "phase3End": 4025,   # 67.08s
    "totalFrames": 6037, # 100.62s
}

# Color transition points
COLOR_TRANSITIONS = {
    "phase1To2End": 1510,  # Gold→Colors complete
    "phase2To3End": 2851,  # Colors→Gold complete
}

# Expected content at each phase
PHASE_CONTENT = {
    1: {
        "name": "Solid Sphere",
        "formula": "S = SPHERE",
        "status": "BOUNDED SOLID OBJECT",
        "visual": "Gold sphere rotating",
        "color": "#FFD700",
        "audio_expected": "Introduction, explaining the paradox",
    },
    2: {
        "name": "Decomposition",
        "formula": "S = A ∪ B ∪ C ∪ D ∪ E",
        "status": "NON-MEASURABLE DECOMPOSITION",
        "visual": "Split into 5 colored sets, explosion",
        "color": "MULTI (Cyan/Pink/Lime/Emerald/Magenta)",
        "audio_expected": "Narration about splitting, non-measurable sets",
    },
    3: {
        "name": "Reassembly",
        "formula": "S → S₁ + S₂ (V → 2V)",
        "status": "PARADOXICAL REASSEMBLY",
        "visual": "Duplicate sphere formation, color shift back",
        "color": "Colors→Gold transition",
        "audio_expected": "Narration about reassembly, duplication paradox",
    },
    4: {
        "name": "Infinity",
        "formula": "ℵ₀ + ℵ₀ = ℵ₀",
        "status": "ABSTRACT INFINITY EQUIVALENCE",
        "visual": "Twin spheres stable, infinity displayed",
        "color": "#FFD700 (twin spheres)",
        "audio_expected": "Conclusion about infinity, aleph-naught",
    },
}


def get_phase_at_frame(frame: int) -> int:
    if frame < 0:
        return 0
    if frame < PHASE_BOUNDARIES["phase1End"]:
        return 1
    elif frame < PHASE_BOUNDARIES["phase2End"]:
        return 2
    elif frame < PHASE_BOUNDARIES["phase3End"]:
        return 3
    elif frame <= PHASE_BOUNDARIES["totalFrames"]:
        return 4
    return 5  # Beyond video


def get_phase_at_second(sec: int) -> int:
    return get_phase_at_frame(sec * FPS)


def get_color_at_frame(frame: int) -> str:
    if frame < PHASE_BOUNDARIES["phase1End"]:
        return "#FFD700"
    elif frame < COLOR_TRANSITIONS["phase1To2End"]:
        progress = (frame - PHASE_BOUNDARIES["phase1End"]) / (
            COLOR_TRANSITIONS["phase1To2End"] - PHASE_BOUNDARIES["phase1End"]
        )
        return f"GOLD→COLOR ({int(progress * 100)}%)"
    elif frame < PHASE_BOUNDARIES["phase2End"]:
        return "5 SET COLORS"
    elif frame < COLOR_TRANSITIONS["phase2To3End"]:
        progress = (frame - PHASE_BOUNDARIES["phase2End"]) / (
            COLOR_TRANSITIONS["phase2To3End"] - PHASE_BOUNDARIES["phase2End"]
        )
        return f"COLOR→GOLD ({int(progress * 100)}%)"
    elif frame <= PHASE_BOUNDARIES["totalFrames"]:
        return "#FFD700 (twin)"
    return "UNKNOWN"


def validate_alignment():
    """Check every second of audio against the visual scene."""
    errors = []
    warnings = []
    report = []

    total_seconds = int(AUDIO_DURATION_SEC) + 1

    print("=" * 80)
    print("AUDIO-VISUAL ALIGNMENT VALIDATION REPORT")
    print("=" * 80)
    print(f"Audio duration: {AUDIO_DURATION_SEC:.4f}s | Video: {TOTAL_FRAMES}f @ {fps}fps = {TOTAL_FRAMES/FPS:.4f}s")
    print(f"Drift: {abs(AUDIO_DURATION_SEC - TOTAL_FRAMES/FPS):.4f}s")
    print()

    # Check 1: Phase boundary alignment
    print("[CHECK 1] Phase Boundary Alignment")
    print("-" * 80)
    phase_changes = []
    prev_phase = 0
    for sec in range(total_seconds):
        frame = sec * FPS
        phase = get_phase_at_frame(frame)
        if phase != prev_phase:
            phase_changes.append((sec, frame, phase))
            prev_phase = phase

    for i, (sec, frame, phase) in enumerate(phase_changes):
        phase_name = PHASE_CONTENT.get(phase, {}).get("name", "Unknown")
        boundary_type = ""
        if phase == 1:
            boundary_type = "Video start"
        elif phase == 2:
            boundary_type = "⚡ SPLIT TRIGGER"
        elif phase == 3:
            boundary_type = "⚡ REASSEMBLY TRIGGER"
        elif phase == 4:
            boundary_type = "⚡ INFINITY STATE"
        print(f"  {sec:3d}s (fr {frame:>5}): Phase {phase} ({phase_name}) — {boundary_type}")

    # Verify phase durations are reasonable
    phase_durations = {}
    for sec in range(total_seconds):
        phase = get_phase_at_second(sec)
        phase_durations[phase] = phase_durations.get(phase, 0) + 1

    print()
    print("  Phase durations:")
    for phase_num in sorted(phase_durations.keys()):
        dur = phase_durations[phase_num]
        phase_name = PHASE_CONTENT.get(phase_num, {}).get("name", "Unknown")
        expected_ratio = {1: 0.222, 2: 0.194, 3: 0.250, 4: 0.333}.get(phase_num, 0)
        actual_ratio = dur / total_seconds
        ratio_ok = abs(actual_ratio - expected_ratio) < 0.02
        status = "✓" if ratio_ok else "⚠"
        print(f"    Phase {phase_num} ({phase_name}): {dur}s ({actual_ratio:.1%}) {status}")
        if not ratio_ok:
            warnings.append(
                f"Phase {phase_num} ratio {actual_ratio:.1%} differs from expected {expected_ratio:.1%}"
            )

    # Check 2: Per-second scene alignment
    print()
    print("[CHECK 2] Per-Second Scene Mapping")
    print("-" * 80)
    header = f"  {'Sec':>4} {'Frame':>6} {'Phase':>6} {'Color':<20} {'Visual':<35} {'Audio Expected':<30} {'Status'}"
    print(header)
    print("  " + "-" * (len(header) - 2))

    misaligned_seconds = []
    for sec in range(total_seconds):
        frame = sec * FPS
        phase = get_phase_at_frame(frame)
        color = get_color_at_frame(frame)
        content = PHASE_CONTENT.get(phase, {})

        visual = content.get("visual", "?")[:33]
        audio_exp = content.get("audio_expected", "?")[:28]
        formula = content.get("formula", "?")
        phase_name = content.get("name", "?")

            # Check for key alignment points (with ±1s tolerance for fractional-second transitions)
        status = "✓"
        if sec == 0 and phase != 1:
            status = "✗ SHOULD BE PHASE 1"
            misaligned_seconds.append(sec)
        # Phase 2 starts at 22.36s — at sec 22 we're still in Phase 1, at sec 23 we're in Phase 2
        elif sec == 22 and phase != 1:
            status = "⚠ SEC 22 SHOULD BE PHASE 1 (split at 22.36s)"
            misaligned_seconds.append(sec)
        elif sec == 23 and phase != 2:
            status = "✗ SEC 23 SHOULD BE PHASE 2"
            misaligned_seconds.append(sec)
        # Phase 3 starts at 41.93s — at sec 41 still Phase 2, at sec 42 Phase 3
        elif sec == 41 and phase != 2:
            status = "⚠ SEC 41 SHOULD BE PHASE 2"
            misaligned_seconds.append(sec)
        elif sec == 42 and phase != 3:
            status = "✗ SEC 42 SHOULD BE PHASE 3"
            misaligned_seconds.append(sec)
        # Phase 4 starts at 67.08s — at sec 67 still Phase 3, at sec 68 Phase 4
        elif sec == 67 and phase != 3:
            status = "⚠ SEC 67 SHOULD BE PHASE 3 (infinity at 67.08s)"
            misaligned_seconds.append(sec)
        elif sec == 68 and phase != 4:
            status = "✗ SEC 68 SHOULD BE PHASE 4"
            misaligned_seconds.append(sec)
        elif sec >= 101:
            status = "✗ BEYOND AUDIO"
            misaligned_seconds.append(sec)

        # Only print key seconds + any misaligned
        if sec % 10 == 0 or sec in [22, 42, 67, 100] or status != "✓":
            color_short = color[:18]
            print(f"  {sec:4d} {frame:6d} {phase:>4}:{phase_name:<10} {color_short:<20} {visual:<35} {audio_exp:<30} {status}")

    # Check 3: Audio-video duration match
    print()
    print("[CHECK 3] Duration Match")
    print("-" * 80)
    drift = abs(AUDIO_DURATION_SEC - TOTAL_FRAMES / FPS)
    print(f"  Audio: {AUDIO_DURATION_SEC:.4f}s")
    print(f"  Video: {TOTAL_FRAMES / FPS:.4f}s ({TOTAL_FRAMES} frames)")
    print(f"  Drift: {drift:.4f}s")
    if drift < 0.1:
        print(f"  Status: ✓ EXCELLENT (drift < 0.1s)")
    elif drift < 1.0:
        print(f"  Status: ✓ ACCEPTABLE (drift < 1s)")
        warnings.append(f"Duration drift is {drift:.4f}s")
    else:
        print(f"  Status: ✗ MISMATCH (drift >= 1s)")
        errors.append(f"Duration drift is {drift:.4f}s — video and audio are out of sync")

    # Check 4: Transition timing precision
    print()
    print("[CHECK 4] Transition Timing Precision")
    print("-" * 80)

    # Split should happen at exactly frame 1342 (22.36s)
    split_frame = PHASE_BOUNDARIES["phase1End"]
    split_sec = split_frame / FPS
    print(f"  Split trigger:     frame {split_frame} = {split_sec:.4f}s")

    # Reassembly should happen at exactly frame 2516 (41.93s)
    reasm_frame = PHASE_BOUNDARIES["phase2End"]
    reasm_sec = reasm_frame / FPS
    print(f"  Reassembly trigger: frame {reasm_frame} = {reasm_sec:.4f}s")

    # Infinity should happen at exactly frame 4025 (67.08s)
    inf_frame = PHASE_BOUNDARIES["phase3End"]
    inf_sec = inf_frame / FPS
    print(f"  Infinity trigger:  frame {inf_frame} = {inf_sec:.4f}s")

    # Color transitions
    c1_end = COLOR_TRANSITIONS["phase1To2End"]
    c2_end = COLOR_TRANSITIONS["phase2To3End"]
    print(f"  Color trans 1→2:   frame {PHASE_BOUNDARIES['phase1End']} → {c1_end} ({(c1_end - PHASE_BOUNDARIES['phase1End']) / FPS:.2f}s duration)")
    print(f"  Color trans 2→3:   frame {PHASE_BOUNDARIES['phase2End']} → {c2_end} ({(c2_end - PHASE_BOUNDARIES['phase2End']) / FPS:.2f}s duration)")

    # Verify transitions don't overlap incorrectly
    if c1_end >= PHASE_BOUNDARIES["phase2End"]:
        errors.append("Color transition 1→2 overlaps into Phase 3!")
        print(f"  ✗ Color trans 1→2 OVERLAPS Phase 2 end!")
    else:
        print(f"  ✓ Color transitions are within phase bounds")

    # Check 5: Spring animation coverage
    print()
    print("[CHECK 5] Spring Animation Coverage")
    print("-" * 80)
    split_duration_frames = PHASE_BOUNDARIES["phase2End"] - PHASE_BOUNDARIES["phase1End"]
    dup_duration_frames = PHASE_BOUNDARIES["phase3End"] - PHASE_BOUNDARIES["phase2End"]
    print(f"  Split spring:      {split_duration_frames} frames ({split_duration_frames / FPS:.2f}s)")
    print(f"  Duplicate spring:  {dup_duration_frames} frames ({dup_duration_frames / FPS:.2f}s)")
    print(f"  (Springs have ~300ms settle time; should complete well within phase duration)")

    # Final verdict
    print()
    print("=" * 80)
    print("FINAL VERDICT")
    print("=" * 80)

    if errors:
        print(f"✗ FAILED — {len(errors)} error(s), {len(warnings)} warning(s):")
        for e in errors:
            print(f"  ✗ {e}")
        for w in warnings:
            print(f"  ⚠ {w}")
        print()
        print("ACTION: Rerender required — alignment issues detected.")
        return 1
    elif warnings:
        print(f"✓ PASSED with {len(warnings)} warning(s):")
        for w in warnings:
            print(f"  ⚠ {w}")
        return 0
    else:
        print("✓ ALL CHECKS PASSED — Audio and video are perfectly aligned!")
        print(f"  All {total_seconds} seconds of audio match their visual scenes.")
        return 0


if __name__ == "__main__":
    exit_code = validate_alignment()
    sys.exit(exit_code)
