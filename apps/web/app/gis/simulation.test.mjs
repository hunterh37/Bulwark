import assert from 'node:assert/strict';
import { test } from 'node:test';
import { generateWaterNetwork, simulateWater, defaultControls, demandFactor } from './simulation.ts';
import { summarizeDistricts } from './districts.ts';

const network = generateWaterNetwork();
const normal = simulateWater(network, 480, defaultControls);

test('generation is reproducible, connected, and includes producers and consumers', () => {
  assert.deepEqual(generateWaterNetwork(), network);
  assert.notDeepEqual(generateWaterNetwork(150), network);
  assert.equal(network.assets.filter(a => a.kind === 'producer').length, 2);
  assert.equal(network.assets.filter(a => a.kind === 'consumer').length, 36);
  const reached = new Set(['P-1']);
  for (let pass = 0; pass < network.assets.length; pass++) {
    for (const pipe of network.segments) {
      if (reached.has(pipe.from) || reached.has(pipe.to)) { reached.add(pipe.from); reached.add(pipe.to); }
    }
  }
  assert.equal(reached.size, network.assets.length);
});

test('normal solution conserves water at each node and obeys pipe head loss', () => {
  assert.ok(normal.converged);
  assert.ok(Math.abs(normal.productionM3h - normal.deliveredM3h - normal.leakM3h) < .1);
  assert.ok(normal.serviceRatio > .99);
  const readings = new Map(normal.nodes.map(n => [n.assetId, n]));
  const flows = new Map(normal.pipes.map(p => [p.id, p.flowM3h]));
  for (const asset of network.assets.filter(a => a.kind !== 'producer')) {
    let balance = readings.get(asset.id).deliveredM3h;
    for (const pipe of network.segments) {
      if (pipe.from === asset.id) balance += flows.get(pipe.id);
      if (pipe.to === asset.id) balance -= flows.get(pipe.id);
    }
    assert.ok(Math.abs(balance) < .0051, `${asset.id}: imbalance ${balance}`);
  }
  for (const pipe of network.segments) {
    const q = flows.get(pipe.id);
    if (Math.abs(q) > .01 && Math.abs(q) < pipe.capacityM3h - .01) {
      const headLoss = readings.get(pipe.from).headM - readings.get(pipe.to).headM;
      assert.ok(Math.abs(headLoss - Math.sign(q) * pipe.resistance * Math.abs(q) ** 1.852) < 1e-6);
    }
  }
});

test('time-varying demand, outage, surge, leak, and closure produce causal network changes', () => {
  assert.ok(demandFactor(480) > demandFactor(180));
  const outage = simulateWater(network, 480, { ...defaultControls, scenario: 'outage' });
  assert.ok(outage.converged);
  assert.equal(outage.nodes.find(n => n.assetId === 'P-1').supplyM3h, 0);
  assert.equal(outage.nodes.find(n => n.assetId === 'P-1').status, 'offline');
  assert.ok(outage.productionM3h <= 155.01);
  assert.ok(outage.serviceRatio < normal.serviceRatio - .2);
  const surge = simulateWater(network, 480, { ...defaultControls, scenario: 'peak' });
  assert.ok(surge.converged);
  assert.ok(surge.demandM3h > normal.demandM3h * 1.4);
  assert.ok(surge.serviceRatio < normal.serviceRatio);
  const leak = simulateWater(network, 480, { ...defaultControls, scenario: 'leak' });
  assert.ok(leak.converged);
  assert.ok(leak.leakM3h > 50);
  assert.ok(Math.abs(leak.productionM3h - leak.deliveredM3h - leak.leakM3h) < .1);
  const closure = simulateWater(network, 480, { ...defaultControls, scenario: 'closure' });
  const closed = closure.pipes.filter(p => p.closed);
  assert.equal(closed.length, 1);
  assert.equal(closed[0].flowM3h, 0);
  assert.ok(closure.serviceRatio < normal.serviceRatio);
});

test('zero supply gives zero delivery, while high demand remains finite and capacity-limited', () => {
  const off = simulateWater(network, 480, { ...defaultControls, supplyScale: 0 });
  assert.equal(off.productionM3h, 0);
  assert.equal(off.deliveredM3h, 0);
  assert.equal(off.adequateHouseholds, 0);
  assert.equal(off.serviceRatio, 0);
  const high = simulateWater(network, 1140, { ...defaultControls, demandScale: 2.5, scenario: 'peak' });
  assert.ok(high.converged);
  assert.ok(high.productionM3h <= 330.01);
  assert.ok(high.nodes.every(n => Number.isFinite(n.headM) && n.headM >= 0 && n.deliveredM3h <= n.demandM3h));
  assert.ok(Math.abs(high.productionM3h - high.deliveredM3h - high.leakM3h) < .1);
});

test('H3 districts preserve consumer totals and recompute service after an outage', () => {
  const outage = simulateWater(network, 480, { ...defaultControls, scenario: 'outage' });
  for (const resolution of [7, 8]) {
    const cells = summarizeDistricts(network, outage, resolution);
    assert.ok(cells.length > 1);
    assert.equal(cells.reduce((sum, c) => sum + c.households, 0), outage.households);
    assert.equal(cells.reduce((sum, c) => sum + c.adequateHouseholds, 0), outage.adequateHouseholds);
    assert.ok(Math.abs(cells.reduce((sum, c) => sum + c.demandM3h, 0) - outage.demandM3h) < 1e-8);
    assert.ok(Math.abs(cells.reduce((sum, c) => sum + c.deliveredM3h, 0) - outage.deliveredM3h) < 1e-8);
    assert.ok(cells.every(c => c.boundary.length >= 6 && c.serviceRatio < 1));
    assert.equal(new Set(cells.flatMap(c => c.assetIds)).size, 36);
  }
});
