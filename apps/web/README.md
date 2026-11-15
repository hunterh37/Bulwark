# Bulwark frontend

## Open the GIS water simulator

From a clean checkout of the repository, use Node 22 and pnpm 9:

```sh
git switch main
git pull --ff-only
pnpm install
pnpm --filter @bulwark/web dev --port 3001
```

Visit **http://localhost:3001/gis**, or open the frontend homepage and select
**GIS map**. `localhost` refers to the machine running the frontend; each teammate
can run their own copy. No GIS backend, database, `.env`, API key, or uploaded data
is required. A new run generates the network and starts the simulation.

For changes under review, check out the corresponding feature branch instead of
`main`. Keep personal work on a separate branch/worktree before switching branches.

The current Render blueprint deploys `packages/cloud`, which serves its own static
landing page and portal. It does **not** deploy this Next.js app. The existing public
cloud URL therefore does not currently provide `/gis`; a hosted GIS link requires a
separate frontend deployment. The **GIS map** entry is in this frontend's homepage.

## Demo and integration

Pause at 08:00 and choose **West plant outage**. Problem assets and affected pipes
are red; districts receiving under 90% of requested water are red too. Choose
**Central main leak** to highlight J-5 and its connected pipes. Reset restores
normal operation and clears incident highlights when readings are healthy.

See [the GIS guide](app/gis/README.md) for simulation assumptions, H3 aggregation,
tests, controls, and reusable model/map functions.
