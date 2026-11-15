# GIS prototype — isolated frontend feature

Open `/gis` in the existing Next.js app. No backend, database, environment variables,
new dependencies, global CSS changes, or homepage edits are required.

From the repository root (macOS, Linux, or Windows with Node 22 and pnpm 9):

```sh
pnpm install
pnpm --filter @bulwark/web dev --port 3001
```

Visit http://localhost:3001/gis, or select **GIS map** on the homepage. Port 3001 avoids another teammate's default server.
For a separate worktree, install dependencies there; don't share `node_modules` or `.next`.

## Demo

1. Inspect the Cushing–Houston corridor and select a marker or asset list entry.
2. Search by location or ID; filter by asset type or assets needing attention.
3. Toggle pipeline connections, drag the map, and use zoom / fit controls.
4. Simulate a pressure alert: V-1 becomes red, its connected segments change color,
   and the inspector shows the simulated readings. Reset restores the fixtures.

All facilities, segments, warnings, and telemetry are illustrative. Local state resets
on reload. There are no writes to other services. The map is geographic, using Web
Mercator projection of WGS 84 longitude/latitude coordinates.

## Dashboard integration

`NetworkMap.tsx` is a client component that can be imported from `/ops`:

```tsx
import NetworkMap from '../gis/NetworkMap';

<NetworkMap
  topology={topology}
  telemetry={latestTelemetry}
  selectedAssetId={selectedId}
  onSelectAsset={asset => setSelectedId(asset.id)}
/>
```

The local structural types accept the existing ops `Topology` and `Telemetry[]`;
no shared contract changes or runtime imports are needed. Supply one latest reading
per asset. Missing telemetry is displayed as offline. Optional `visibleAssetIds`,
`showSegments`, and `tileUrl` props control display. A custom tile provider must use
compatible XYZ Web Mercator tiles and its own correct attribution (update the map
attribution if switching providers). No H3 aggregation is implemented in this MVP.

OpenStreetMap basemap tiles require internet. Browser caching and visible attribution
follow https://operations.osmfoundation.org/policies/tiles/. Only visible tiles are
requested; there is no offline download or prefetch. If tiles fail, an explicit notice
appears and the pipeline overlay still works. The small custom map supports single-
pointer drag and zoom buttons; pinch zoom and wheel zoom are outside this prototype.

## Git handoff

This feature changes only `apps/web/app/gis/`. Keep teammate work in `/ops`, shared
contracts, root manifests, lockfiles, and global styles separate. Review/merge the
`feature/gis-prototype` branch or cherry-pick its feature commit. Adding navigation
from a shared page can be done by that page's owner with a link to `/gis`.

## Verification

Production Next.js build and TypeScript checking passed. Browser checks passed for
asset selection, search, filters, alert/reset, layer toggles, zoom/fit controls, tile
failure fallback, and mobile layout without horizontal overflow. A separate browser
check confirmed homepage navigation and real OpenStreetMap tiles loading. Browser
console checking confirmed no hydration errors after coordinate rounding was fixed.
