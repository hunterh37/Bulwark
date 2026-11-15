import type { AssetStatus, MapAsset, MapSegment, MapTelemetry, MapTopology } from './data';

export type Scenario = 'normal' | 'peak' | 'outage' | 'leak' | 'closure';
export interface WaterAsset extends MapAsset {
  kind: 'producer' | 'junction' | 'consumer';
  households: number;
  baseDemandM3h: number;
  supplyHeadM?: number;
}
export interface WaterPipe extends MapSegment {
  diameterMm: number;
  resistance: number;
  capacityM3h: number;
  oneWay?: boolean;
}
export interface WaterNetwork extends MapTopology { assets: WaterAsset[]; segments: WaterPipe[]; seed: number }
export interface SimulationControls { demandScale: number; supplyScale: number; scenario: Scenario }
export interface WaterReading extends MapTelemetry {
  headM: number;
  demandM3h: number;
  deliveredM3h: number;
  supplyM3h: number;
  serviceRatio: number;
  households: number;
}
export interface PipeReading { id: string; flowM3h: number; velocityMs: number; status: AssetStatus; closed: boolean }
export interface WaterSnapshot {
  minute: number;
  nodes: WaterReading[];
  pipes: PipeReading[];
  demandM3h: number;
  deliveredM3h: number;
  productionM3h: number;
  leakM3h: number;
  serviceRatio: number;
  households: number;
  adequateHouseholds: number;
  maxMassBalanceErrorM3h: number;
  converged: boolean;
  iterations: number;
}
export const defaultControls: SimulationControls = { demandScale: 1, supplyScale: 1, scenario: 'normal' };

function random(seed: number) {
  let value = seed >>> 0;
  return () => { value = (Math.imul(value, 1664525) + 1013904223) >>> 0; return value / 4294967296; };
}
function distanceKm(a: MapAsset, b: MapAsset) {
  return Math.hypot((a.lon - b.lon) * 82.3, (a.lat - b.lat) * 111.2);
}
/** Deterministic synthetic geography: locations represent no actual utility assets. */
export function generateWaterNetwork(seed = 149): WaterNetwork {
  const rand = random(seed);
  const assets: WaterAsset[] = [
    { id: 'P-1', name: 'West treatment plant', kind: 'producer', lat: 42.374, lon: -71.167, households: 0, baseDemandM3h: 0, supplyHeadM: 58 },
    { id: 'P-2', name: 'East supply plant', kind: 'producer', lat: 42.379, lon: -71.048, households: 0, baseDemandM3h: 0, supplyHeadM: 56 },
  ];
  const segments: WaterPipe[] = [];
  function connect(from: WaterAsset, to: WaterAsset, diameterMm: number, capacityM3h = 1000) {
    const lengthKm = distanceKm(from, to) * 1.12;
    // Hazen–Williams head loss h = R |Q|^1.852; Q is represented in m³/h.
    const resistance = 10.67 * lengthKm * 1000 / (130 ** 1.852 * (diameterMm / 1000) ** 4.87 * 3600 ** 1.852);
    segments.push({ id: `PIPE-${segments.length + 1}`, from: from.id, to: to.id, coords: [[from.lon, from.lat], [to.lon, to.lat]], lengthKm, diameterIn: diameterMm / 25.4, diameterMm, resistance, capacityM3h, oneWay: from.kind === 'producer' });
  }
  const junctions: WaterAsset[] = [];
  for (let row = 0; row < 3; row++) for (let col = 0; col < 3; col++) {
    const index = row * 3 + col;
    const junction: WaterAsset = { id: `J-${index + 1}`, name: `${['North', 'Central', 'South'][row]} ${['west', 'center', 'east'][col]} junction`, kind: 'junction', lon: -71.135 + col * .035, lat: 42.366 - row * .028, households: 0, baseDemandM3h: 0 };
    assets.push(junction); junctions.push(junction);
    for (let group = 0; group < 4; group++) {
      const households = 100 + Math.floor(rand() * 190);
      const angle = group * Math.PI / 2 + .3 + rand() * .3;
      const consumer: WaterAsset = { id: `C-${index * 4 + group + 1}`, name: `${junction.name.replace(' junction', '')} neighborhood ${group + 1}`, kind: 'consumer', lon: junction.lon + Math.cos(angle) * (.009 + rand() * .003), lat: junction.lat + Math.sin(angle) * (.006 + rand() * .002), households, baseDemandM3h: households * (.023 + rand() * .007) };
      assets.push(consumer); connect(junction, consumer, 85 + Math.round(rand() * 2) * 10, 65);
    }
  }
  for (let row = 0; row < 3; row++) for (let col = 0; col < 3; col++) {
    const i = row * 3 + col;
    if (col < 2) connect(junctions[i], junctions[i + 1], 200);
    if (row < 2) connect(junctions[i], junctions[i + 3], 200);
  }
  connect(assets[0], junctions[0], 250, 175);
  connect(assets[1], junctions[2], 250, 155);
  return { name: 'Boston synthetic water network', assets, segments, seed };
}
export function demandFactor(minute: number) {
  const hour = ((minute % 1440) + 1440) % 1440 / 60;
  return .56 + .68 * Math.exp(-(((hour - 8) / 2.1) ** 2)) + .78 * Math.exp(-(((hour - 19) / 2.5) ** 2));
}

/** Quasi-steady pressure-dependent hydraulic solve; no backend or random telemetry. */
export function simulateWater(network: WaterNetwork, minute: number, controls: SimulationControls): WaterSnapshot {
  const index = new Map(network.assets.map((a, i) => [a.id, i]));
  const n = network.assets.length;
  const demand = network.assets.map(a => a.baseDemandM3h * demandFactor(minute) * controls.demandScale * (controls.scenario === 'peak' && a.lat < 42.34 ? 2.2 : 1));
  const sources = network.assets.map(a => a.kind === 'producer' ? (a.id === 'P-1' && controls.scenario === 'outage' ? 0 : (a.supplyHeadM ?? 0) * controls.supplyScale) : 0);
  const pipes = network.segments.map(p => ({ p, from: index.get(p.from)!, to: index.get(p.to)!, closed: controls.scenario === 'closure' && p.from === 'P-1' }));
  const neighbors: number[][] = Array.from({ length: n }, () => []);
  pipes.forEach((p, i) => { if (!p.closed) { neighbors[p.from].push(i); neighbors[p.to].push(i); } });
  const connected = new Set<number>();
  const queue = sources.flatMap((head, i) => head > 0 ? [i] : []);
  for (const i of queue) connected.add(i);
  for (let q = 0; q < queue.length; q++) {
    const i = queue[q];
    for (const e of neighbors[i]) {
      const edge = pipes[e], j = edge.from === i ? edge.to : edge.from;
      // Supply outlets have check valves, so an offline source cannot connect components.
      if (network.assets[j].kind === 'producer' && sources[j] === 0) continue;
      if (!connected.has(j)) { connected.add(j); queue.push(j); }
    }
  }
  const maxHead = Math.max(...sources, 0);
  const heads = network.assets.map((a, i) => a.kind === 'producer' ? sources[i] : connected.has(i) ? maxHead * .75 : 0);
  const leakIndex = index.get('J-5')!;
  const delivered = (i: number, head: number) => demand[i] * Math.min(1, Math.sqrt(Math.max(0, head) / 28));
  const leakage = (i: number, head: number) => controls.scenario === 'leak' && i === leakIndex ? 13 * Math.sqrt(Math.max(0, head)) : 0;
  function flow(e: number, fromHead: number, toHead: number) {
    const edge = pipes[e];
    if (edge.closed) return 0;
    const delta = fromHead - toHead;
    const q = Math.sign(delta) * Math.min(edge.p.capacityM3h, (Math.abs(delta) / edge.p.resistance) ** (1 / 1.852));
    return edge.p.oneWay ? Math.max(0, q) : q;
  }
  function residual(i: number, head: number) {
    let balance = delivered(i, head) + leakage(i, head);
    for (const e of neighbors[i]) {
      const edge = pipes[e];
      balance += edge.from === i ? flow(e, head, heads[edge.to]) : -flow(e, heads[edge.from], head);
    }
    return balance;
  }
  let iterations = 0, error = Infinity;
  const solved = network.assets.flatMap((a, i) => a.kind !== 'producer' && connected.has(i) ? [i] : []);
  for (; iterations < 3200; iterations++) {
    for (const i of solved) {
      let low = 0, high = maxHead;
      for (let k = 0; k < 32; k++) {
        const middle = (low + high) / 2;
        if (residual(i, middle) > 0) high = middle; else low = middle;
      }
      heads[i] = Math.max(0, Math.min(maxHead, heads[i] + 1.55 * ((low + high) / 2 - heads[i])));
    }
    error = Math.max(0, ...solved.map(i => Math.abs(residual(i, heads[i]))));
    if (error < .005) break;
  }
  const edgeFlows = pipes.map((edge, e) => flow(e, heads[edge.from], heads[edge.to]));
  const nodes: WaterReading[] = network.assets.map((a, i) => {
    const demandM3h = demand[i], deliveredM3h = delivered(i, heads[i]);
    const serviceRatio = demandM3h > 0 ? deliveredM3h / demandM3h : 1;
    const supplyM3h = a.kind === 'producer' ? neighbors[i].reduce((sum, e) => sum + (pipes[e].from === i ? edgeFlows[e] : -edgeFlows[e]), 0) : 0;
    const status: AssetStatus = a.kind === 'producer' ? (sources[i] === 0 ? 'offline' : 'ok') : heads[i] < 1 || serviceRatio < .5 ? 'alarm' : heads[i] < 20 || serviceRatio < .9 ? 'warning' : 'ok';
    return { assetId: a.id, headM: heads[i], pressurePsi: heads[i] * 1.42233, demandM3h, deliveredM3h, supplyM3h, serviceRatio, households: a.households, status };
  });
  const totalDemand = demand.reduce((sum, value) => sum + value, 0);
  const totalDelivered = nodes.reduce((sum, node) => sum + node.deliveredM3h, 0);
  const leakM3h = heads.reduce((sum, head, i) => sum + leakage(i, head), 0);
  return {
    minute, nodes,
    pipes: pipes.map((edge, e) => ({ id: edge.p.id, flowM3h: edgeFlows[e], velocityMs: Math.abs(edgeFlows[e]) / 3600 / (Math.PI * (edge.p.diameterMm / 2000) ** 2), closed: edge.closed, status: edge.closed ? 'isolated' : Math.abs(edgeFlows[e]) > edge.p.capacityM3h * .95 ? 'warning' : 'ok' })),
    demandM3h: totalDemand, deliveredM3h: totalDelivered, productionM3h: nodes.reduce((sum, node) => sum + node.supplyM3h, 0), leakM3h,
    serviceRatio: totalDemand > 0 ? totalDelivered / totalDemand : 1,
    households: nodes.reduce((sum, node) => sum + node.households, 0),
    adequateHouseholds: nodes.reduce((sum, node) => sum + (node.serviceRatio >= .9 ? node.households : 0), 0),
    maxMassBalanceErrorM3h: error, converged: error < .005, iterations: Math.min(iterations + 1, 3200),
  };
}
