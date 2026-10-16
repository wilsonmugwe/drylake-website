# Production spec: Drylake introduction video

**Status:** specification only. No video, voice track or music has been produced. Nothing in this
folder should be described as a finished video.

## Deliverables to produce

| Cut | Aspect | Resolution | Length | Captions file | Use |
|---|---|---|---|---|---|
| Main | 16:9 | 1920x1080 | 50 s | `captions.vtt` | Website, YouTube, LinkedIn, email link |
| Main vertical | 9:16 | 1080x1920 | 50 s | `captions.vtt` | Instagram, Facebook Reels, LinkedIn mobile |
| Cutdown | 16:9 | 1920x1080 | 15 s | `captions-15s.vtt` | Pre-roll, LinkedIn feed |
| Cutdown vertical | 9:16 | 1080x1920 | 15 s | `captions-15s.vtt` | Stories, Reels |

25 fps (AU PAL-region convention; 30 fps also acceptable, pick one and keep it across all cuts).

## Safe zones

- **16:9:** title-safe inset 5% each side (96 px left/right, 54 px top/bottom). Captions in the lower
  third, never over the CTA card text.
- **9:16:** keep all text between 250 px from the top and 420 px from the bottom (platform UI for
  username, caption and buttons covers those bands on Reels and Stories), 64 px side inset. CTA card
  sits in the middle third.
- No text smaller than 42 px on 1080-wide frames, so it stays readable muted on a phone.

## Encoding and file-size budget (web)

| Target | Codec | Settings | Budget |
|---|---|---|---|
| Web primary | H.264 High, MP4, `yuv420p`, `+faststart` | CRF 23, max 4 Mbit/s 1080p, AAC 128 kbit/s stereo | 50 s main under 12 MB; 15 s under 4 MB |
| Web modern | AV1 (libaom or SVT-AV1), WebM or MP4 | CRF 34, preset 6 | about 40% smaller than H.264; serve first with H.264 fallback |
| Social upload | H.264 High, MP4 | CRF 18, 10 to 16 Mbit/s | platform re-encodes; upload the high-quality master |
| Master | ProRes 422 HQ or lossless | n/a | archive only, not in the repo |

Rendered video files do **not** belong in this git repo. Host them on the video platform or a CDN and
record the URLs here when they exist.

## Poster frame

Shot 12 (end card) at 00:48.0: wordmark, drylake.com.au and 0433 448 000 on ink ground. Export as
1920x1080 and 1080x1920 WebP (quality 80) plus a JPEG fallback. Shot 6 at 00:21.0 (the lit ochre
plate) is the alternative if a less text-heavy poster is wanted.

## Playback and accessibility

- **No autoplay with sound, ever.** The site currently has no `<video>` element and no autoplay
  (checked `app/` and `components/` on 2026-10-16), so the default is **click to play**. If a later
  page adds an ambient hero loop, it must be `muted`, `playsinline`, respect
  `prefers-reduced-motion` (show the poster instead), and have a visible pause control.
- **Captions on by default:** `<track kind="captions" srclang="en-AU" label="English" default>`. On
  social platforms, upload the `.vtt` (or burn in open captions for Stories, where upload is not
  supported).
- **Accessible name and description:**
  - `aria-label`: "Drylake introduction video, 50 seconds"
  - Description (for `aria-describedby` or the text beside the player): "Animated introduction. A lake
    dries and reveals a cracked lakebed; the cracks stand for disconnected systems, repetitive tasks,
    outdated tools and temporary workarounds. Drylake strips them back and builds connected
    websites, software and automation. Ends with an invitation to book a free 30-minute
    consultation at drylake.com.au, with any work quoted before it begins."
  - Link the full `transcript.md` text beside the player.
- No flashing above 3 flashes per second (WCAG 2.3.1). Crack glows ease in over at least 300 ms.

## Audio

- Loudness **-14 LUFS integrated**, true peak -1 dBTP, for web and social.
- VO sits 6 to 9 dB above music; music ducks under every VO line.
- **Music: licensed source to be chosen.** Candidates to evaluate (none chosen, none licensed):
  a subscription library with a clear commercial social and web licence, or a commissioned track.
  Record the track title, composer, library, licence ID and permitted channels here before release.
- **Voice: source to be chosen.** A licensed voice artist or a TTS voice whose licence covers
  commercial advertising. Record the licence here. Do not clone any real person's voice.

## Remotion-ready scene list

The portfolio already builds video in Remotion (MotionsAI, Vibe Media), and the site's lakebed
geometry is plain TypeScript (`components/visuals/lakebed-geometry.ts`), so the shots map cleanly to
Remotion `<Sequence>`s. At 25 fps:

| Scene component | from (frame) | durationInFrames | Props |
|---|---|---|---|
| `<WaterSurface/>` | 0 | 80 | none |
| `<WaterRecede/>` | 80 | 70 | `seed` |
| `<CracksPropagate/>` | 150 | 113 | `seed`, `crackCount` |
| `<CrackIcons/>` | 263 | 37 | `icons: ["sheet","inbox","note"]` |
| `<StruckLabels/>` | 300 | 150 | `labels: [4 strings from script line 3]` |
| `<ThreeBeats/>` | 450 | 137 | `lines: ["Strip it back.","Find the cracks.","Build back better."]` |
| `<InterfaceFrames/>` | 587 | 113 | `labels: [3 strings]` |
| `<ConnectedFlow/>` | 700 | 113 | `labels: ["Automation","Practical AI"]` |
| `<CtaCard/>` | 813 | 250 | `title`, `url`, `condition` (condition from frame 925) |
| `<MarkResolve/>` | 1063 | 112 | `tagline` |
| `<EndCard/>` | 1175 | 75 | `phone`, `abn`, `place` |

Total 1250 frames = 50 s. Compositions: `DrylakeIntro16x9` (1920x1080) and `DrylakeIntro9x16`
(1080x1920) share scenes with a `layout` prop; `DrylakeCut15` reuses `CracksPropagate`, `ThreeBeats`,
`CtaCard`, `EndCard` (375 frames). Captions via `@remotion/captions` from the `.vtt` files, so the
burnt-in text and the sidecar track cannot drift. All copy should be imported from one constants
module mirroring `script.md`, not typed into components.

## Pre-release checklist

- [ ] Owner approval of `script.md` and `storyboard.md`
- [ ] Music licence recorded above
- [ ] Voice licence recorded above
- [ ] Captions re-timed against the real VO track
- [ ] Every frame checked for em dashes, prices, client names and people
- [ ] `../copy-claims-register.md` re-checked against the final edit
