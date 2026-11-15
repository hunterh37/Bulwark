import { cellToBoundary, latLngToCell } from 'h3-js';
import type { WaterNetwork, WaterSnapshot } from './simulation';
export interface DistrictSummary {
  id: string;
  boundary: [number, number][];
  households: number;
  demandM3h: number;
  deliveredM3h: number;
  serviceRatio: number;
  adequateHouseholds: number;
  assetIds: string[];
}
/** H3 is an aggregation layer, never the pipe topology or hydraulic solver. */
export function summarizeDistricts(network: WaterNetwork, snapshot: WaterSnapshot, resolution = 7): DistrictSummary[] {
  const readings = new Map(snapshot.nodes.map(n => [n.assetId, n]));
  const cells = new Map<string, DistrictSummary>();
  for (const asset of network.assets) {
    if (asset.kind !== 'consumer') continue;
    const id = latLngToCell(asset.lat, asset.lon, resolution);
    let cell = cells.get(id);
    if (!cell) {
      cell = { id, boundary: cellToBoundary(id).map(([lat, lon]) => [lon, lat]), households: 0, demandM3h: 0, deliveredM3h: 0, serviceRatio: 1, adequateHouseholds: 0, assetIds: [] };
      cells.set(id, cell);
    }
    const node = readings.get(asset.id)!;
    cell.households += asset.households;
    cell.demandM3h += node.demandM3h;
    cell.deliveredM3h += node.deliveredM3h;
    cell.adequateHouseholds += node.serviceRatio >= .9 ? asset.households : 0;
    cell.assetIds.push(asset.id);
  }
  return [...cells.values()].map(cell => ({ ...cell, serviceRatio: cell.demandM3h > 0 ? cell.deliveredM3h / cell.demandM3h : 1 }));
}
