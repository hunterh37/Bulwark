'use client';

import { useEffect, useMemo, useState } from 'react';
import NetworkMap, { statusColors } from './NetworkMap';
import { generateWaterNetwork, simulateWater, defaultControls, type Scenario, type SimulationControls } from './simulation';
import { summarizeDistricts } from './districts';
import styles from './gis.module.css';

const scenarios: { id: Scenario; name: string; description: string }[] = [
  { id: 'normal', name: 'Normal operations', description: 'Both plants feed the looped distribution network.' },
  { id: 'peak', name: 'South district demand surge', description: 'Southern neighborhoods request 2.2× their usual demand.' },
  { id: 'outage', name: 'West plant outage', description: 'West supply stops. East plant supplies up to 155 m³/h; flow reroutes through the grid.' },
  { id: 'leak', name: 'Central main leak', description: 'A pressure-dependent leak at J-5 draws extra water and lowers network pressure.' },
  { id: 'closure', name: 'West supply pipe closed', description: 'The west plant outlet closes. Other pipes carry the remaining supply.' },
];
const number = (value: number, digits = 1) => value.toFixed(digits);
const clock = (minute: number) => `${String(Math.floor((minute % 1440) / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
interface HistoryPoint { demand: number; delivered: number; production: number }

export default function GisWorkspace() {
  const [seed, setSeed] = useState(149);
  const network = useMemo(() => generateWaterNetwork(seed), [seed]);
  const [minute, setMinute] = useState(360);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(10);
  const [controls, setControls] = useState<SimulationControls>(defaultControls);
  const [selectedId, setSelectedId] = useState('P-1');
  const [districtId, setDistrictId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [showSegments, setShowSegments] = useState(true);
  const [showDistricts, setShowDistricts] = useState(true);
  const [resolution, setResolution] = useState(7);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const snapshot = useMemo(() => simulateWater(network, minute, controls), [network, minute, controls]);
  const districts = useMemo(() => summarizeDistricts(network, snapshot, resolution), [network, snapshot, resolution]);
  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => setMinute(m => (m + speed) % 1440), 1000);
    return () => clearInterval(timer);
  }, [playing, speed]);
  useEffect(() => {
    setHistory(points => [...points.slice(-59), { demand: snapshot.demandM3h, delivered: snapshot.deliveredM3h, production: snapshot.productionM3h }]);
  }, [snapshot]);
  const readings = new Map(snapshot.nodes.map(n => [n.assetId, n]));
  const pipeReadings = new Map(snapshot.pipes.map(p => [p.id, p]));
  const assets = network.assets.filter(a => `${a.name} ${a.id}`.toLowerCase().includes(query.toLowerCase()) && (filter === 'all' || (filter === 'attention' ? readings.get(a.id)?.status !== 'ok' : a.kind === filter)));
  const selected = network.assets.find(a => a.id === selectedId) ?? network.assets[0];
  const reading = readings.get(selected.id)!;
  const district = districts.find(d => d.id === districtId);
  const connected = network.segments.filter(p => p.from === selected.id || p.to === selected.id);
  const activeScenario = scenarios.find(s => s.id === controls.scenario)!;
  const faultAssetIds = controls.scenario === 'outage' ? ['P-1'] : controls.scenario === 'leak' ? ['J-5'] : [];
  const faultPipeIds = controls.scenario === 'closure' ? network.segments.filter(p => p.from === 'P-1').map(p => p.id) : [];
  const problemAssetIds = [...new Set([...faultAssetIds, ...snapshot.nodes.filter(n => n.status !== 'ok').map(n => n.assetId)])];
  const hasProblem = controls.scenario !== 'normal' || problemAssetIds.length > 0 || !snapshot.converged;
  const selectedProblem = problemAssetIds.includes(selected.id) || connected.some(p => faultPipeIds.includes(p.id));
  const chartMax = Math.max(350, ...history.flatMap(p => [p.demand, p.delivered, p.production]));
  const chart = (key: keyof HistoryPoint) => history.map((p, i) => `${10 + i / Math.max(1, history.length - 1) * 580},${105 - p[key] / chartMax * 90}`).join(' ');
  function reset() {
    setMinute(360); setControls(defaultControls); setHistory([]); setSelectedId('P-1'); setDistrictId(null);
  }
  return <main className={styles.workspace}>
    <header className={styles.header}>
      <a href="/" className={styles.brand}><span className={styles.brandIcon}>B</span> BULWARK <span className={styles.product}>/ GIS</span></a>
      <div className={styles.headerRight}><span className={styles.demoBadge}>● SYNTHETIC SIMULATION</span><a href="/portal">Customer portal ↗</a></div>
    </header>
    <section className={styles.heading}>
      <div><p className={styles.eyebrow}>WATER NETWORK LAB</p><h1>A living network, from plant to tap.</h1><p className={styles.subtitle}>Generated infrastructure. Pressure-driven flow. District-level service.</p></div>
      <div className={styles.simActions}><button className={styles.incidentButton} onClick={() => setPlaying(p => !p)}>{playing ? 'Pause simulation' : 'Run simulation'}</button><button className={styles.secondaryButton} onClick={reset}>Reset</button><button className={styles.secondaryButton} onClick={() => { setSeed(s => s + 1); reset(); }}>Generate new network</button></div>
    </section>
    <section className={styles.simControls} aria-label="Simulation controls">
      <label>Scenario<select aria-label="Simulation scenario" value={controls.scenario} onChange={e => setControls(c => ({ ...c, scenario: e.target.value as Scenario }))}>{scenarios.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
      <label>Consumer demand <b>{number(controls.demandScale)}×</b><input aria-label="Consumer demand" type="range" min="0.5" max="2.5" step="0.1" value={controls.demandScale} onChange={e => setControls(c => ({ ...c, demandScale: Number(e.target.value) }))} /></label>
      <label>Pump head <b>{number(controls.supplyScale * 100, 0)}%</b><input aria-label="Pump head" type="range" min="0" max="1.3" step="0.05" value={controls.supplyScale} onChange={e => setControls(c => ({ ...c, supplyScale: Number(e.target.value) }))} /></label>
      <label>Simulated time <b data-testid="sim-clock">{clock(minute)}</b><input aria-label="Simulated time" type="range" min="0" max="1435" step="5" value={minute} onChange={e => setMinute(Number(e.target.value))} /></label>
      <label>Clock speed<select aria-label="Clock speed" value={speed} onChange={e => setSpeed(Number(e.target.value))}><option value="5">5 min / second</option><option value="10">10 min / second</option><option value="30">30 min / second</option></select></label>
    </section>
    <div className={`${styles.scenarioNote} ${hasProblem ? styles.problemBanner : ''}`} role="status"><b>{activeScenario.name}</b> — {activeScenario.description} <span>{network.assets.length} nodes · {network.segments.length} pipes · seed {seed}{hasProblem ? " · Problem locations and affected connections are highlighted red" : ""}</span></div>
    <section className={styles.metrics} aria-label="Network summary">
      <div><span>WATER PRODUCTION</span><strong data-testid="production">{number(snapshot.productionM3h)} <small>m³/h · two supply plants</small></strong></div>
      <div><span>CONSUMER DEMAND</span><strong data-testid="demand">{number(snapshot.demandM3h)} <small>m³/h · time-varying</small></strong></div>
      <div><span>DELIVERED / REQUESTED</span><strong data-testid="service" style={{ color: snapshot.serviceRatio >= .9 ? '#4ee0b0' : '#ff6e78' }}>{number(snapshot.serviceRatio * 100)}% <small>{number(snapshot.deliveredM3h)} m³/h delivered</small></strong></div>
      <div><span>HOUSEHOLDS ADEQUATELY SERVED</span><strong data-testid="households">{snapshot.adequateHouseholds} <small>of {snapshot.households} · ≥90% of demand</small></strong></div>
    </section>
    <section className={styles.workbench}>
      <aside className={styles.sidebar}>
        <div className={styles.panelHeading}><h2>Network assets</h2><span>{assets.length} / {network.assets.length}</span></div>
        <label className={styles.search}><span>⌕</span><input aria-label="Search assets" placeholder="Search plants, junctions, users…" value={query} onChange={e => setQuery(e.target.value)} /></label>
        <select className={styles.filter} aria-label="Filter assets" value={filter} onChange={e => setFilter(e.target.value)}><option value="all">All assets</option><option value="producer">Supply plants</option><option value="junction">Distribution junctions</option><option value="consumer">Consumer neighborhoods</option><option value="attention">Needs attention</option></select>
        <div className={`${styles.assetList} ${styles.simAssetList}`}>{assets.map(a => {
          const t = readings.get(a.id)!;
          return <button key={a.id} className={`${styles.assetRow} ${problemAssetIds.includes(a.id) ? styles.problemRow : ''} ${selectedId === a.id && !districtId ? styles.activeRow : ''}`} aria-pressed={selectedId === a.id && !districtId} onClick={() => { setSelectedId(a.id); setDistrictId(null); }}><span className={styles.assetGlyph}>{a.kind === 'producer' ? '▣' : a.kind === 'consumer' ? '●' : '◇'}</span><span><b>{a.name}</b><small>{a.id} · {a.kind === 'consumer' ? `${a.households} households` : a.kind}</small></span><i style={{ background: problemAssetIds.includes(a.id) ? '#ff6e78' : statusColors[t.status] }} aria-label={t.status} /></button>;
        })}{!assets.length && <p className={styles.empty}>No matching assets.</p>}</div>
        <div className={styles.layers}><p className={styles.eyebrow}>MAP LAYERS</p><label><input type="checkbox" checked={showSegments} onChange={e => setShowSegments(e.target.checked)} /> Pipes & flow direction</label><label><input type="checkbox" checked={showDistricts} onChange={e => setShowDistricts(e.target.checked)} /> H3 district summaries</label><label>H3 resolution <select aria-label="H3 resolution" value={resolution} onChange={e => { setResolution(Number(e.target.value)); setDistrictId(null); }}><option value="7">7 · districts</option><option value="8">8 · neighborhoods</option></select></label><p>Hexagon color shows delivered / requested water. Select a hexagon to inspect its totals.</p></div>
      </aside>
      <div className={styles.mapColumn}><div className={styles.mapTitle}><span><b>Greater Boston · generated network</b><small>WATER · LIVE SIMULATION · {clock(minute)}</small></span><span className={styles.mapHint}>▣ Producer · ◇ Junction · ● Users</span></div><NetworkMap topology={network} telemetry={snapshot.nodes} pipeReadings={snapshot.pipes} problemAssetIds={problemAssetIds} problemSegmentIds={faultPipeIds} selectedAssetId={districtId ? undefined : selectedId} onSelectAsset={a => { setSelectedId(a.id); setDistrictId(null); }} visibleAssetIds={assets.map(a => a.id)} showSegments={showSegments} districts={showDistricts ? districts : []} selectedDistrictId={districtId ?? undefined} onSelectDistrict={d => setDistrictId(d.id)} /><div className={styles.legend}><span><i style={{ background: '#4ee0b0' }} />≥90% demand served</span><span><i style={{ background: '#ff6e78' }} />Problem / district below 90%</span><span>Moving dashes = pipe flow</span></div></div>
      <aside className={`${styles.details} ${(district ? district.serviceRatio < .9 : selectedProblem) ? styles.problemDetails : ''}`} aria-label="Selected asset details">
        {district ? <>
          <p className={styles.eyebrow}>H3 DISTRICT SUMMARY</p><span className={styles.assetId}>{district.id}</span><h2>District service</h2><p className={styles.detailDescription}>{district.assetIds.length} consumer groups · resolution {resolution}</p>
          <div className={styles.reading}><span>Demand / delivered</span><strong>{number(district.demandM3h)} / {number(district.deliveredM3h)} <small>m³/h</small></strong></div>
          <div className={styles.reading}><span>{district.serviceRatio < .9 ? 'Problem · demand below target' : 'Demand served'}</span><strong>{number(district.serviceRatio * 100)}<small>%</small></strong></div>
          <div className={styles.reading}><span>Households receiving ≥90% of demand</span><strong>{district.adequateHouseholds} <small>/ {district.households}</small></strong></div>
          <p className={styles.detailDescription}>Totals aggregate consumer readings within this H3 cell. These hexagons are analysis districts, not utility boundaries.</p>
          <button className={styles.secondaryButton} onClick={() => setDistrictId(null)}>Back to asset</button>
        </> : <>
          <p className={styles.eyebrow}>ASSET INSPECTOR</p><span className={styles.assetId}>{selected.id} · {selected.kind.toUpperCase()}</span><h2>{selected.name}</h2><span className={styles.statusPill} style={{ color: selectedProblem ? '#ff6e78' : statusColors[reading.status], borderColor: selectedProblem ? '#ff6e78' : statusColors[reading.status] }}>{selectedProblem ? `● Problem · ${reading.status === 'ok' ? 'active incident' : reading.status}` : '● Healthy'}</span>
          <div className={styles.reading}><span>Pressure head</span><strong>{number(reading.headM)} <small>m water · {number(reading.headM * .0980665, 2)} bar</small></strong></div>
          {selected.kind === 'producer' ? <div className={styles.reading}><span>Plant output</span><strong>{number(reading.supplyM3h)} <small>m³/h</small></strong></div> : selected.kind === 'consumer' ? <><div className={styles.reading}><span>Requested / delivered</span><strong>{number(reading.demandM3h)} / {number(reading.deliveredM3h)} <small>m³/h</small></strong></div><div className={styles.reading}><span>Households / demand served</span><strong>{selected.households} <small>· {number(reading.serviceRatio * 100)}%</small></strong></div></> : <p className={styles.detailDescription}>Distribution junction: incoming water balances outgoing pipes and any simulated leak.</p>}
          {selected.id === 'J-5' && controls.scenario === 'leak' && <div className={styles.alert}><b>Active main leak</b><p>{number(snapshot.leakM3h)} m³/h lost at this junction.</p></div>}
          <div className={styles.connections}><p className={styles.eyebrow}>CONNECTED PIPE FLOWS</p>{connected.map(p => { const t = pipeReadings.get(p.id)!; return <div key={p.id} className={t.closed || t.status !== 'ok' || problemAssetIds.includes(p.from) || problemAssetIds.includes(p.to) ? styles.problemConnection : ''}><b>{p.id}</b><span>{t.closed ? 'CLOSED' : `${t.flowM3h >= 0 ? p.from : p.to} → ${t.flowM3h >= 0 ? p.to : p.from}`}<br />{number(Math.abs(t.flowM3h))} m³/h · {number(t.velocityMs, 2)} m/s<br />{p.diameterMm} mm · {number(p.lengthKm, 2)} km</span></div>; })}</div>
          <div className={styles.coordinates}><span>ILLUSTRATIVE LOCATION · WGS 84</span><code>{selected.lat.toFixed(4)}° N / {Math.abs(selected.lon).toFixed(4)}° W</code></div>
        </>}
      </aside>
    </section>
    <section className={styles.simBottom}>
      <div className={styles.trend}><div className={styles.panelHeading}><h2>Network flow over simulation time</h2><span>Last {history.length} samples · m³/h</span></div><svg viewBox="0 0 600 120" role="img" aria-label="Demand, production, and delivered flow history"><path d="M10 15V105H590" fill="none" stroke="#3c4c5c" /><polyline points={chart('demand')} fill="none" stroke="#f4c35e" strokeWidth="2" /><polyline points={chart('production')} fill="none" stroke="#b39aff" strokeWidth="2" /><polyline points={chart('delivered')} fill="none" stroke="#4ee0b0" strokeWidth="2" /></svg><div className={styles.legend}><span><i style={{ background: '#f4c35e' }} />Requested</span><span><i style={{ background: '#b39aff' }} />Produced</span><span><i style={{ background: '#4ee0b0' }} />Delivered</span></div></div>
      <div className={styles.modelNote}><p className={styles.eyebrow}>MODEL CHECK</p><h2>{snapshot.converged ? 'Flow balance converged' : 'Approximate result · solver limit reached'}</h2><p>Produced {number(snapshot.productionM3h, 2)} = delivered {number(snapshot.deliveredM3h, 2)} + leakage {number(snapshot.leakM3h, 2)} m³/h. {snapshot.converged ? 'Node balances are within solver tolerance.' : 'Results have not converged; treat these values as approximate.'}</p><p>Largest node imbalance: {number(snapshot.maxMassBalanceErrorM3h, 4)} m³/h. H3 totals cover {districts.reduce((sum, d) => sum + d.households, 0)} households in {districts.length} cells.</p><p>Quasi-steady, flat-terrain model using Hazen–Williams pipe resistance and pressure-dependent demand. Synthetic assets and assumptions; no live utility data, storage dynamics, or water-hammer model.</p></div>
    </section>
    <div className={styles.footnote}><span>FRONTEND WATER SIMULATOR / SEED {seed}</span><span>1 real second = {speed} simulated minutes · {playing ? 'Running' : 'Paused'} · No server or database</span></div>
  </main>;
}
