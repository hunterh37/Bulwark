'use client';
import { useMemo, useState } from 'react';
import NetworkMap, { statusColors } from './NetworkMap';
import { demoTopology, demoTelemetry } from './data';
import styles from './gis.module.css';
export default function GisWorkspace() {
    const [selectedId, setSelectedId] = useState('M-2');
    const [query, setQuery] = useState('');
    const [filter, setFilter] = useState('all');
    const [showSegments, setShowSegments] = useState(true);
    const [incident, setIncident] = useState(false);
    const telemetry = useMemo(() => demoTelemetry.map(t => incident && t.assetId === 'V-1' ? { ...t, status: 'alarm' as const, pressurePsi: 1028, flowBpd: 142600 } : t), [incident]);
    const assets = demoTopology.assets.filter(asset => {
        const status = telemetry.find(t => t.assetId === asset.id)?.status;
        return `${asset.name} ${asset.id}`.toLowerCase().includes(query.toLowerCase()) && (filter === 'all' || (filter === 'attention' ? status !== 'ok' : asset.kind === filter));
    });
    const selected = demoTopology.assets.find(a => a.id === selectedId)!;
    const reading = telemetry.find(t => t.assetId === selectedId)!;
    const segments = demoTopology.segments.filter(s => s.from === selectedId || s.to === selectedId);
    return <main className={styles.workspace}>
    <header className={styles.header}>
      <a href="/" className={styles.brand}><span className={styles.brandIcon}>B</span> BULWARK <span className={styles.product}>/ GIS</span></a>
      <div className={styles.headerRight}><span className={styles.demoBadge}>● DEMO DATA</span><a href="/portal">Customer portal ↗</a></div>
    </header>
    <section className={styles.heading}><div><p className={styles.eyebrow}>INFRASTRUCTURE INTELLIGENCE</p><h1>See the network. Find the risk.</h1><p className={styles.subtitle}>Explore the assets and connections behind your operations.</p></div><button className={styles.incidentButton} aria-pressed={incident} onClick={() => { setIncident(v => !v); if (!incident)
        setSelectedId('V-1'); }}>{incident ? '↺ Reset scenario' : '⚡ Simulate pressure alert'}</button></section>
    <section className={styles.metrics} aria-label="Network summary">
      <div><span>MONITORED ASSETS</span><strong>06 <small>across the corridor</small></strong></div>
      <div><span>PIPELINE LENGTH</span><strong>730 <small>km · illustrative route</small></strong></div>
      <div><span>NEEDS ATTENTION</span><strong style={{ color: '#f4c35e' }}>0{telemetry.filter(t => t.status !== 'ok').length} <small>assets flagged</small></strong></div>
      <div><span>DATA SOURCE</span><strong className={styles.sourceValue}>Local sample <small>no backend required</small></strong></div>
    </section>
    <section className={styles.workbench}>
      <aside className={styles.sidebar}><div className={styles.panelHeading}><h2>Network assets</h2><span>{assets.length} / 6</span></div>
        <label className={styles.search}><span>⌕</span><input aria-label="Search assets" placeholder="Search assets or locations…" value={query} onChange={e => setQuery(e.target.value)}/></label>
        <select className={styles.filter} aria-label="Filter assets" value={filter} onChange={e => setFilter(e.target.value)}><option value="all">All asset types</option><option value="attention">Needs attention</option><option value="pump_station">Pump stations</option><option value="meter">Meters</option><option value="valve">Valves</option><option value="tank">Terminals</option></select>
        <div className={styles.assetList}>{assets.map(asset => {
            const t = telemetry.find(t => t.assetId === asset.id)!;
            return <button key={asset.id} className={`${styles.assetRow} ${selectedId === asset.id ? styles.activeRow : ''}`} onClick={() => setSelectedId(asset.id)} aria-pressed={selectedId === asset.id}><span className={styles.assetGlyph}>{asset.kind === 'tank' ? '▣' : asset.kind === 'valve' ? '◇' : '◉'}</span><span><b>{asset.name}</b><small>{asset.id} · {asset.kind.replaceAll('_', ' ')}</small></span><i style={{ background: statusColors[t.status] }} aria-label={t.status}/></button>;
        })}{!assets.length && <p className={styles.empty}>No matching assets. Try another search or filter.</p>}</div>
        <div className={styles.layers}><p className={styles.eyebrow}>MAP LAYERS</p><label><input type="checkbox" checked={showSegments} onChange={e => setShowSegments(e.target.checked)}/> Pipeline connections</label><p>Illustrative assets and telemetry. No real infrastructure or live monitoring.</p></div>
      </aside>
      <div className={styles.mapColumn}><div className={styles.mapTitle}><span><b>Cushing → Houston</b><small>OIL PIPELINE · US CENTRAL</small></span><span className={styles.mapHint}>Drag to explore</span></div><NetworkMap topology={demoTopology} telemetry={telemetry} selectedAssetId={selectedId} onSelectAsset={a => setSelectedId(a.id)} visibleAssetIds={assets.map(a => a.id)} showSegments={showSegments}/><div className={styles.legend}>{Object.entries(statusColors).map(([status, color]) => <span key={status}><i style={{ background: color }}/>{status === 'ok' ? 'Healthy' : status}</span>)}</div></div>
      <aside className={styles.details} aria-label="Selected asset details" aria-live="polite"><p className={styles.eyebrow}>ASSET INSPECTOR</p><span className={styles.assetId}>{selected.id}</span><h2>{selected.name}</h2><span className={styles.statusPill} style={{ color: statusColors[reading.status], borderColor: statusColors[reading.status] }}>{reading.status === 'ok' ? '● Healthy' : `● ${reading.status}`}</span><p className={styles.detailDescription}>{selected.kind.replaceAll('_', ' ')} on the {demoTopology.name.toLowerCase()}.</p>
        <div className={styles.reading}><span>Pressure</span><strong>{reading.pressurePsi?.toLocaleString()} <small>psi</small></strong></div><div className={styles.reading}><span>Flow rate</span><strong>{reading.flowBpd?.toLocaleString()} <small>bbl/day</small></strong></div>
        {reading.status !== 'ok' && <div className={styles.alert}><b>{reading.status === 'alarm' ? 'High pressure detected' : 'Inspection recommended'}</b><p>{reading.status === 'alarm' ? 'Simulated valve restriction. Check upstream pressure and valve position.' : 'Sample warning: flow variance requires an operator review.'}</p><small>DEMO SCENARIO · NOT A LIVE ALERT</small></div>}
        <div className={styles.coordinates}><span>COORDINATES · WGS 84</span><code>{selected.lat.toFixed(4)}° N<br />{Math.abs(selected.lon).toFixed(4)}° W</code></div><div className={styles.connections}><p className={styles.eyebrow}>CONNECTED SEGMENTS</p>{segments.map(s => <div key={s.id}><b>{s.id}</b><span>{s.lengthKm} km · {s.diameterIn}″</span></div>)}</div>
      </aside>
    </section>
    <div className={styles.footnote}><span>PROTOTYPE / GIS WORKSPACE</span><span>Static fixtures · Browser-only interactions · No changes are persisted</span></div>
  </main>;
}
