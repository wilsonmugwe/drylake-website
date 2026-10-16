# Workstream 9: promotional video and digital flyers (October 2026)

Review copy for the owner. Nothing here is published or distributed yet.

## What is real and what is a plan

| Item | State |
|---|---|
| Video | **Specified only.** Script, storyboard, captions, transcript and production spec. No video, voice or music has been produced. |
| Flyers (6 x A4 print + 6 x 1080x1350 social) | **Real files.** HTML sources, PDFs and PNGs rendered with headless Chromium on 2026-10-16. |
| Claims register | Complete for every asset. |

## Files

- `copy-claims-register.md`: every claim on every asset, with its source.
- `video/script.md`: VO script with timings, on-screen text and word counts (main 50 s, cutdown 15 s).
- `video/storyboard.md`: 12 shots for the main cut, 4 for the cutdown, with licensing notes.
- `video/captions.vtt`, `video/captions-15s.vtt`: WebVTT, verbatim to the VO.
- `video/transcript.md`: publishable transcript.
- `video/production-spec.md`: formats, safe zones, encoding budget, poster frame, accessibility,
  audio, Remotion scene list, pre-release checklist.
- `flyers/html/<flyer>-a4.html`, `flyers/html/<flyer>-social.html`: self-contained sources.
- `flyers/pdf/<flyer>-a4.pdf`: print PDFs (A4, backgrounds on).
- `flyers/png/<flyer>-a4.png` (1588x2246, 2x) and `flyers/png/<flyer>-social.png` (1080x1350).
- `flyers/src/`: the copy (`content.mjs`), builder, texture generator, QR generator and renderer.

Flyers: `services-overview`, `website-development`, `business-automation`, `custom-software`,
`free-consultation`, `bronnie-collaboration`.

## Rebuild

Copy lives only in `flyers/src/content.mjs`. After editing it (run from `flyers/src/`):

```bash
node gen-qr.mjs <node_modules with qrcode.react + react-dom>   # only if a URL changed
node build.mjs
flock ~/qa-tmp/heavy.lock node render.mjs <node_modules with playwright>
```

The renderer fails if the Geist font does not load, and the builder fails on any em dash.

## Before anything is distributed

1. Owner approval of every flyer and the script.
2. **BRONNIE flyer: owner approval required, and `drylake.com.au/collaborate` must be live** (its QR
   points there).
3. Print: the flyers are full-bleed dark. A commercial printer needs 3 mm bleed added; office
   printers will leave a white margin. A light, low-ink print variant is not yet made.
4. Video: music and voice licences chosen and recorded in `production-spec.md`.
