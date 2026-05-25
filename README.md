# 🎬 Banach-Tarski Paradox — Voice-Synced Video

A Remotion project that visualizes the Banach-Tarski Paradox with voice-synced animations.

- **Resolution:** 1080×1920 (9:16 vertical)
- **Frame rate:** 60 fps
- **Duration:** ~120 seconds

## Phases

| Chunk | Phase | Time Range | Description |
|-------|-------|------------|-------------|
| 1 | Solid Sphere | 0:00 – 0:26.67 | Bounded solid object, gold sphere |
| 2 | Decomposition | 0:26.67 – 0:50 | Split into 5 non-measurable sets, color explosion |
| 3 | Reassembly | 0:50 – 1:20 | Paradoxical duplication, twin sphere formation |
| 4 | Infinity | 1:20 – 2:00 | Abstract infinity equivalence, ℵ₀ state |

## Render

### Local (Studio Preview)
```bash
npm install
npm start
```

### GitHub Actions (Full Render)
Go to **Actions → Render Banach-Tarski Video → Run workflow**

The workflow:
1. Renders all 4 chunks in parallel on separate runners
2. Concatenates them in order
3. Merges with the audio track
4. Creates a GitHub Release with the final video

## Audio
Place your audio file at `assets/audio.mp3` before running the workflow,
or provide a URL via the `audio_url` workflow input.
