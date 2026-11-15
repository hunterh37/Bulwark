# Bulwark pitch cut, 30 s

File: `promo/renders/bulwark-pitch-30s.mp4` (1920x1080, 30 fps, 30.0 s, h264 + aac). Project: `promo/pitch30/`. The first cut and its 15 s version are unchanged.

## Changes from the first cut

| | First cut | Pitch cut |
|---|---|---|
| Images | 16 black-and-white archive stills, 1882 to 2003 | 8 colour photographs of present-day sites at dusk and night |
| Spine | 140 years of grid, 2003 blackout | Four sectors from the landing page, then the product, then the price |
| Music | Dark Shadows, 119.8 bpm, cinematic | Electro Dreams, house, 120 bpm, drop on the product name |
| Product share | 10.5 s of 30 | 12 s of 30, plus a 4 s price beat |
| End card | Tagline | Tagline and the "Create account" button |

## Shots

| Time | On screen |
|---|---|
| 0-2 | Pylons at sunset. "SOFTWARE RUNS THE GRID", one phrase per beat. |
| 2-6 | Power, Water, EV charging, Building automation. One photo and one protocol label per second. |
| 6-8 | City at night. "WHO CHECKS THE CODE?" |
| 8-10 | Volt panel on the drop. "BULWARK CHECKS THE CODE", then "SCADA · HMI · PLC tooling · integration code". |
| 10-12 | Panel lifts off the portal. GitHub tab, cursor clicks "Scan now" at 11.0. |
| 12-18 | Findings tab, one row per beat, grid tags, "RANKED BY GRID IMPACT". |
| 18-22 | Transformer photo. "Bulwark Edge for plant networks", the offline command types, "Source code never has to leave the plant." |
| 22-26 | Wind turbines. "Free", "$0", "3 repos. Cloud scans. All modules." |
| 26-30 | Volt flood, mark, wordmark, tagline, "Create account". |

## Music

"Electro Dreams" by Arulo, Mixkit id 190, Mixkit Stock Music Free License. Copy in `promo/source/music/`.
The track's drop at 64.035 s sits on 8.0 s of the film. Beats fall on the 0.5 s grid, bars on even seconds. Every cut is on a beat.
Chosen from 12 Mixkit house tracks by measurement: tempo 120.0, beat interval deviation 19 ms, an 8-bar breakdown followed by a 26 dB rise in bass energy. Not heard. Genre and feel are unverified by ear.
HeyGen is not signed in, so its music catalog was not searched. `npx hyperframes auth login` opens it.

## Photographs

Wikimedia Commons, Featured and Quality image categories. Originals in `promo/source/photos/`, records in `CREDITS.json` there.

| Shot | Author | Licence |
|---|---|---|
| Pylons at sunset | Ermell | CC BY-SA 4.0 |
| Rostock power station | Radomianin | CC BY-SA 4.0 |
| Digester tower, Dülmen | Dietmar Rabich | CC BY-SA 4.0 |
| Renault Zoe at a charger | JoachimKohler-HB | CC BY-SA 4.0 |
| Highlight Towers, Munich | Martin Falbisoner | CC BY-SA 4.0 |
| Seattle and I-5 | Dllu | CC BY-SA 4.0 |
| 750 kV transformer | Novoklimov | CC0 |
| Wind park at sunset | Smial | Free Art License |

Seven of the eight licences require author credit and a licence notice wherever the film is published. The film carries no credit frame. Six are share-alike. Read the licence terms before paid placement; this is a record of the licences and not legal advice.
The EV photo shows a Renault badge and a charger operator's emblem.

## Product claims

- Rule ids, severities and messages in the Findings table are copied from `packages/cloud/src/modules/grid-ot.ts`. The first cut showed `ot.modbus-bind-all` as critical; the source says high, and this cut follows the source.
- Sectors, tagline, Edge heading, Edge command, "Source code never has to leave the plant", price line and "Create account" are from `packages/cloud/public/index.html`.
- Illustrative: repo `springfield-water/scada-hmi`, file paths, line numbers, org name.
- The pairing of each protocol with a sector (DNP3 and IEC 61850 with Power, Modbus and OPC UA with Water, OCPP with EV charging, BACnet with Building automation) is not stated in the repo. Verify before publishing.
- `portal.html` has 56 uncommitted changed lines in the working tree. The portal layout in the film is carried over from the first cut and was not compared against that diff.

## Measured

- `npx hyperframes check`: 0 errors.
- Loudness -14.3 LUFS, true peak -2.3 dBTP. The render came out at -12.8 LUFS; the file's audio was lowered 1.4 dB with the video stream copied, and every `data-volume` in `index.html` was scaled by 0.85 to match.
- Viewed: 34 stills from the project and a 15-frame sheet of the rendered file. Not watched at full speed.

## Warnings kept

- `timeline_track_too_dense`: six photos and four sector titles on one track each.
- `line_unread` on two protocol labels: 0.96 s for three words. The sector word carries the read.
- `dead_stretch` 18.0-21.9 s: the Edge beat types its command and lands its last line at 20.0 s.

## Not built

- "One finding, start to fix" and "$0" storylines (`STORYLINES.md`).
- A 15 s version, 9:16, voiceover.
