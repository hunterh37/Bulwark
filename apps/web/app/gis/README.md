# GIS water-network simulator

`/gis` runs a complete, browser-local synthetic water distribution simulation. No
uploaded data, backend, database, API keys, or `.env` are needed. Open the **GIS map**
link on the homepage.

## Run

Use Node 22 and pnpm 9 on macOS, Linux, or Windows:

```sh
pnpm install
pnpm --filter @bulwark/web dev --port 3001
```

Open http://localhost:3001/gis. A separate port, worktree, `node_modules`, and `.next`
keep other teammates' servers independent. Changes stay in the GIS feature except
for the web package's H3 dependency and simulation test command.

## What is generated

A reproducible seed generates a connected network around Boston with two supply
plants, nine distribution junctions, 36 consumer neighborhoods, and 50 pipes. Each
consumer represents a generated number of households and has a base water demand.
The grid includes loops, so water can reroute when supply changes. Consumer locations,
household counts, demand, and branch diameters vary with the seed. These locations
and network connections are synthetic, not an actual Boston utility map.

## Simulation algorithm

Each tick advances 5, 10, or 30 simulated minutes. Morning and evening demand peaks
change neighborhood withdrawals. The solver recomputes pressures and signed pipe
flows from the graph, rather than adding independent noise to displayed values.

- Hazen–Williams pipe resistance uses length, diameter, and a fixed roughness C=130.
  `headLoss = resistance * sign(flow) * abs(flow)^1.852`.
- Producer heads are 58 and 56 m, scaled by the pump-head control. Check-valved plant
  outlets limit production to 175 and 155 m³/h respectively.
- Consumer delivery is demand multiplied by `min(1, sqrt(head / 28 m))`. Lower
  pressure therefore reduces actual delivered water and service accessibility.
- A relaxed nodal bisection solver enforces flow continuity. It stops at a maximum
  nodal residual below 0.005 m³/h or 3,200 iterations. The interface reports
  convergence and imbalance; capacity saturation and closed pipes are explicit.
- A leak at J-5 withdraws `13 * sqrt(head)` m³/h. Production balances consumer
  delivery plus leakage within the reported numerical tolerance.
- Water amounts are flow rates (m³/h), pressures are metres of water head / bar,
  and pipe velocity is m/s. Household accessibility means receiving at least 90%
  of current requested demand.

This is a flat-terrain quasi-steady hydraulic prototype. It does not simulate tank
storage, pump curves, elevation, water hammer, water quality, or calibrated real-world
operating conditions. It is not an EPANET integration or an electricity model.

References for the hydraulic relationships:
[EPANET network model](https://usepa.github.io/EPANET2.2/3_network_model.html) and
[pressure-dependent demand](https://usepa.github.io/EPANET2.2/12_analysis_algorithms.html).
The generated parameters and numerical solver are this prototype's own assumptions.

## H3 district aggregation

H3 is a separate geographic summary layer, not the network generator or flow solver.
Consumer coordinates are indexed into real H3 cells at resolution 7 or 8 using
`h3-js`. Each occupied cell sums:

- Households and consumer groups;
- Requested and delivered water (m³/h);
- Delivered/requested ratio;
- Households receiving at least 90% of requested demand.

Cells are green at ≥90% delivered, amber at 50–90%, and red below 50%. Select a cell
for its totals. These are analytical cells rather than administrative or utility
boundaries. Only cells containing generated consumers are shown.
[H3 indexing reference](https://h3geo.org/docs/api/indexing/).

## Demo

1. Pause and set simulated time to 08:00 to compare scenarios consistently.
2. Select a supply plant, junction, or consumer. Moving dashes show signed pipe flow;
   connected pipe readings include direction, flow, diameter, length, and velocity.
3. Trigger **West plant outage**. East supply stays within its capacity; pressures
   and household service fall, and pipe flows reroute.
4. Try **South district demand surge**, **Central main leak**, or **West supply pipe
   closed**. Change demand and pump head to observe the resulting balance.
5. Select an H3 hexagon to see district totals changing with the same simulation.
6. Run the clock to see demand vary through a day. Pause freezes time; reset returns
   controls and time to defaults. Generate new network increments the reproducible seed.

The basemap uses online OpenStreetMap tiles with visible attribution and normal
browser caching. Only visible tiles load. A tile failure notice leaves the generated
network usable. No offline basemap download is implemented.
[Tile policy](https://operations.osmfoundation.org/policies/tiles/).

## Files and integration

- `simulation.ts`: deterministic network generation, hydraulic solver, scenario controls.
- `districts.ts`: H3 aggregation derived from the current node readings.
- `NetworkMap.tsx`: geographic map; accepts structural topology/telemetry plus optional
  `pipeReadings`, `districts`, `selectedDistrictId`, and selection callbacks.
- `GisWorkspace.tsx`: simulation clock, controls, inspector, and flow-history chart.
- `data.ts`: map interfaces retained for reuse by the ops dashboard.

`generateWaterNetwork(seed)` returns topology. `simulateWater(network, minute,
controls)` returns node/pipe readings and network totals. `summarizeDistricts(network,
snapshot, resolution)` returns H3 polygons and summaries. All are local functions;
the ops dashboard can reuse them without a server or a shared contract change.

## Verification

```sh
pnpm --filter @bulwark/web test
pnpm --filter @bulwark/web build
```

Model tests check deterministic connected generation, per-node flow conservation,
head-loss equations, source capacity, outages/surges/leaks/closures, zero supply, and
H3 aggregation totals. The test runner uses Node 22's TypeScript stripping support.
Browser QA covers clock/pause/reset, scenario effects, node and H3 selection, supply
controls, filtering, district resolution, regeneration, and mobile layout.
