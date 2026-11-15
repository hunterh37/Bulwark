# Bulwark demo, 30 s (1.1.0)

File: `renders/bulwark-demo-30s.mp4` (1920x1080, 30 fps, h264 + aac, 30.0 s). Source: `demo30/` (HyperFrames).

| Time | On screen | Source |
|---|---|---|
| 0.0-5.0 | Ten archive stills, "THE GRID RUNS ON CODE", "WHO CHECKS THE CODE?" | Public-domain stills, `demo30/assets/archive/CREDITS.json` |
| 5.0-8.5 | Three insecure lines with rule id, severity and CWE; "15 REPOS. 10,233 FILES." | Lines from Scada-LTS context.xml, OpenPLC_v3 dnp3.cpp and Scada-LTS OpcUaDataSourceVO.java at the commits in `packages/cloud/eval/field-repos.json`; the DNP3 line is shortened with an ellipsis; project names are not shown |
| 8.5-13.5 | Scan now click, findings table | Screen recording of the 1.1.0 portal on a local server, demo organization, repo hunterh37/bulwark-e2e-plant |
| 13.5-19.5 | Fix dialog with diff and rescan line, then the row shows "PR open" | Same recording; the click opened pull request #7 on the test repo, closed after |
| 19.5-22.0 | Edge runner command and output | Output copied from a run of bulwark-runner.mjs 1.1.0 on examples/vulnerable-plant; the test-context field is left out of the output line |
| 22.0-25.0 | Evidence report scroll, five chips | Recording of /v1/me/report |
| 25.0-30.0 | Mark, wordmark, tagline, URL | brand/logo-mark.svg, landing page h1 |

The recording page had a drawn cursor and 150% browser zoom. The clips are cut and scaled; no UI element is added or redrawn.
Music and SFX are the same files and licences as the cuts below. The music lift at 24.985 s lands on the end card.

Checked: `npx hyperframes check` 0 errors; 17 stills from the composition and 6 frames from the rendered file viewed.
Not done: full-speed viewing, listening, phone-width sheet, 9:16 version.
Warnings kept: `timeline_track_too_dense` on the hook (10 hard cuts by design), `nested_media_start_basis_ambiguous` on four clips (times are scene-local).

# Bulwark promo, 15 s and 30 s

Files: `renders/bulwark-promo-30s.mp4`, `renders/bulwark-promo-15s.mp4` (1920x1080, 30 fps, h264 + aac).
Source: `gen.py` writes `cut30/` and `cut15/` (HyperFrames projects). Edit the `CUTS` table, run `python3 gen.py`, then `npx hyperframes render` in each cut through buildq.

## Picked in the questions

Archival montage, "140 years of grid" spine, live product claims only, music + SFX with no voice, tagline-only end card, 16:9.

## Script

| 30 s | 15 s | On screen |
|---|---|---|
| 0.0-7.5 | 0.0-3.25 | Archive stills cut every 0.5 s (0.25 s in the 15 s cut), year numerals 1882, 1910, 1942, 1973. "WE BUILT THE GRID", then "THEN WE PUT IT ONLINE" (30 s only). |
| 7.5-12.5 | 3.25-6.0 | 2003 satellite pair, lights on then off. "50 MILLION PEOPLE LOSE POWER", then "A SOFTWARE BUG SILENCED THE ALARMS" (30 s only). |
| 12.5-14.5 | 6.0-7.75 | "WHO CHECKS THE CODE?" on the brand grid. |
| 14.5-17.0 | none | Portal GitHub tab, cursor clicks "Scan now", button reads "Scanning…". |
| 17.0-21.5 | 7.75-11.5 | Findings tab fills with five rows, grid tags land, "RANKED BY GRID IMPACT". |
| 21.5-25.0 | none | "Bulwark Edge for plant networks", the offline scan command types out, "Source code never has to leave the plant." |
| 25.0-30.0 | 11.5-15.0 | Volt flood, mark and BULWARK wordmark, "Security scanning for the software that runs the grid." |

## Sources of what is on screen

- Portal layout, tab names, table columns, buttons, colours: `packages/cloud/public/portal.html`, `assets/style.css`, `assets/portal.js`.
- Rule ids, detectors, severities, messages: `packages/cloud/src/modules/grid-ot.ts`, `secrets-core.ts`.
- Edge heading, command, "Source code never has to leave the plant", tagline: `packages/cloud/public/index.html`.
- Mark and lockup (ink on volt): `brand/logo-mark.svg`, `brand/design-language.html`.
- Illustrative, not from a real scan: repo `springfield-water/scada-hmi`, the file paths and line numbers, the org name (the signup form placeholder).

## Facts from outside the repo, verify before publishing

- "50 million people lose power" and "A software bug silenced the alarms": 2003 Northeast blackout, US-Canada Power System Outage Task Force final report (FirstEnergy alarm system failure).
- Year numerals appear only on stills whose date is in the archive record: Pearl Street 1882, switchboard ca. 1910, Wilson Dam 1942, Staten Island 1973, satellite pair 2003.

## Archive stills

16 public-domain images from Wikimedia Commons (NARA, Library of Congress, HAER, NOAA). Titles, licences and page URLs: `source/archive/CREDITS.json`. Originals in `source/archive/`; graded 1920x1080 crops in each cut's `assets/archive/`.

## Sound

Music: "Dark Shadows", Mixkit id 64 (Mixkit Music Free License, commercial use, no attribution). Copy in `source/music/`.
119.8 bpm, so beats sit on the 0.5 s cut grid. The track's lift at 24.985 s lands on the end card flood in both cuts (30 s: track from 0; 15 s: track from 13.5 s). The 12.5 s dip in the track falls on "WHO CHECKS THE CODE?" in the 30 s cut.
SFX from the bundled library under the bed: riser into a bass impact on the blackout cut, clicks on year changes, click on "Scan now", pops on findings rows, typing on the Edge command, whoosh and impact on the end card.
Measured, not heard: -13.4 and -13.5 LUFS after loudnorm, loudness jump at 25.0 s and 11.5 s confirmed in the rendered files. Track choice was made from tempo and loudness data.

## Checked

- `npx hyperframes check`: 0 errors in both cuts.
- Viewed: 16 frames of the 30 s cut, 11 of the 15 s cut, seams at 12.5, 14.5, 15.7 and 25.0 s, two frames from the rendered 30 s file.
- Not viewed at full speed. No phone-width sheet.

## Warnings kept

- `timeline_track_too_dense` on the montage: 16 hard-cut stills on one track is the design.
- `line_unread` on the DNP3 findings row in the 15 s cut (2.3 s for 10 words): table rows are evidence, the headline carries the read.

## Weakest shot

The "Scan now" beat (30 s, 14.5-17.0) is one row on an empty pane. A real portal recording with several repos would replace it.

## Not built

Montage then long demo, product only, kinetic type only; "The attack", "The engineer on shift" and "Protocols roll call" scripts; 9:16 versions; voiceover.
