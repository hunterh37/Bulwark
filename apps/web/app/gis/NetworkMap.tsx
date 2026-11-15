'use client';
import { useEffect, useRef, useState } from 'react';
import type { MapAsset, MapTelemetry, MapTopology, AssetStatus } from './data';
import styles from './gis.module.css';
export const statusColors: Record<AssetStatus, string> = { ok: '#4ee0b0', warning: '#f4c35e', alarm: '#ff6e78', offline: '#8c99ab', isolated: '#b39aff' };
const rank: Record<AssetStatus, number> = { ok: 0, warning: 1, isolated: 2, offline: 3, alarm: 4 };
export function project(lon: number, lat: number, zoom: number) {
    const size = 256 * 2 ** zoom;
    const clamped = Math.max(-85.0511, Math.min(85.0511, lat)) * Math.PI / 180;
    // Stabilize the tiny math differences between Node and browser engines for SSR.
    return { x: Number(((lon + 180) / 360 * size).toFixed(6)), y: Number(((1 - Math.log(Math.tan(clamped) + 1 / Math.cos(clamped)) / Math.PI) / 2 * size).toFixed(6)) };
}
function unproject(x: number, y: number, zoom: number) {
    const size = 256 * 2 ** zoom;
    return { lon: x / size * 360 - 180, lat: Math.atan(Math.sinh(Math.PI * (1 - 2 * y / size))) * 180 / Math.PI };
}
interface Props {
    topology: MapTopology;
    telemetry?: MapTelemetry[];
    selectedAssetId?: string;
    onSelectAsset?: (asset: MapAsset) => void;
    visibleAssetIds?: string[];
    showSegments?: boolean;
    tileUrl?: string;
}
/** Dependency-free slippy map. Pass existing ops Topology and Telemetry directly. */
export default function NetworkMap({ topology, telemetry = [], selectedAssetId, onSelectAsset, visibleAssetIds, showSegments = true, tileUrl = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png' }: Props) {
    const container = useRef<HTMLDivElement>(null);
    const drag = useRef<{
        x: number;
        y: number;
        center: {
            lon: number;
            lat: number;
        };
    } | null>(null);
    const [size, setSize] = useState({ width: 800, height: 640 });
    const [view, setView] = useState({ lon: -96.1, lat: 32.9, zoom: 6 });
    const [tileError, setTileError] = useState(false);
    useEffect(() => {
        if (!container.current)
            return;
        const observer = new ResizeObserver(([entry]) => setSize({ width: entry.contentRect.width, height: entry.contentRect.height }));
        observer.observe(container.current);
        return () => observer.disconnect();
    }, []);
    const center = project(view.lon, view.lat, view.zoom);
    const origin = { x: center.x - size.width / 2, y: center.y - size.height / 2 };
    const point = (lon: number, lat: number) => { const p = project(lon, lat, view.zoom); return { x: p.x - origin.x, y: p.y - origin.y }; };
    const statuses = new Map(telemetry.map(t => [t.assetId, t.status]));
    const tiles = [];
    const count = 2 ** view.zoom;
    for (let y = Math.max(0, Math.floor(origin.y / 256)); y <= Math.min(count - 1, Math.floor((origin.y + size.height) / 256)); y++) {
        for (let x = Math.max(0, Math.floor(origin.x / 256)); x <= Math.min(count - 1, Math.floor((origin.x + size.width) / 256)); x++) {
            tiles.push(<img key={`${view.zoom}/${x}/${y}`} alt="" draggable={false} className={styles.tile} width={256} height={256} src={tileUrl.replace('{z}', String(view.zoom)).replace('{x}', String(x)).replace('{y}', String(y))} onError={() => setTileError(true)} style={{ left: x * 256 - origin.x, top: y * 256 - origin.y }}/>);
        }
    }
    function fit() {
        if (!topology.assets.length)
            return;
        const lons = topology.assets.map(a => a.lon), lats = topology.assets.map(a => a.lat);
        const lon = (Math.min(...lons) + Math.max(...lons)) / 2;
        const north = Math.max(...lats), south = Math.min(...lats);
        let zoom = 9;
        for (; zoom > 3; zoom--) {
            const a = project(Math.min(...lons), north, zoom), b = project(Math.max(...lons), south, zoom);
            if (b.x - a.x < size.width - 120 && b.y - a.y < size.height - 120)
                break;
        }
        const a = project(lon, north, zoom), b = project(lon, south, zoom);
        setView({ ...unproject(a.x, (a.y + b.y) / 2, zoom), zoom });
    }
    useEffect(() => { fit(); }, [topology, size.width, size.height]); // Refit on new topology or viewport.
    return <div ref={container} className={styles.map} aria-label="Interactive pipeline map. Drag to pan; use buttons to zoom." onPointerDown={e => {
            if ((e.target as HTMLElement).closest('button, a'))
                return;
            e.currentTarget.setPointerCapture(e.pointerId);
            drag.current = { x: e.clientX, y: e.clientY, center: { lon: view.lon, lat: view.lat } };
        }} onPointerMove={e => {
            if (!drag.current)
                return;
            const pointer = drag.current;
            const start = project(pointer.center.lon, pointer.center.lat, view.zoom);
            const x = start.x - (e.clientX - pointer.x);
            const y = start.y - (e.clientY - pointer.y);
            setView(v => ({ ...v, ...unproject(x, y, v.zoom) }));
        }} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}>
    <div className={styles.tiles}>{tiles}</div>
    <svg className={styles.overlay} width={size.width} height={size.height} aria-hidden="true">
      {showSegments && topology.segments.map(segment => {
            const a = statuses.get(segment.from) ?? 'offline', b = statuses.get(segment.to) ?? 'offline';
            const color = statusColors[rank[a] >= rank[b] ? a : b];
            const points = segment.coords.map(([lon, lat]) => { const p = point(lon, lat); return `${p.x},${p.y}`; }).join(' ');
            return <g key={segment.id}><polyline points={points} fill="none" stroke="#09151f" strokeWidth="9" strokeLinejoin="round"/><polyline points={points} fill="none" stroke={color} strokeWidth="4" strokeLinejoin="round" strokeDasharray={a === 'offline' || b === 'offline' ? '8 6' : undefined}/></g>;
        })}
    </svg>
    {topology.assets.filter(a => !visibleAssetIds || visibleAssetIds.includes(a.id)).map(asset => {
            const p = point(asset.lon, asset.lat), status = statuses.get(asset.id) ?? 'offline';
            return <button key={asset.id} className={`${styles.marker} ${selectedAssetId === asset.id ? styles.selectedMarker : ''}`} style={{ left: p.x, top: p.y, '--marker-color': statusColors[status] } as React.CSSProperties} aria-label={`${asset.name}, ${status}`} aria-pressed={selectedAssetId === asset.id} onClick={() => onSelectAsset?.(asset)}><span>{asset.kind === 'tank' ? '▣' : asset.kind === 'valve' ? '◇' : '●'}</span><b>{asset.id}</b></button>;
        })}
    <div className={styles.mapBadge}>GEOGRAPHIC VIEW <span>OSM / WGS 84</span></div>
    <div className={styles.mapControls}>
      <button aria-label="Zoom in" disabled={view.zoom >= 12} onClick={() => setView(v => ({ ...v, zoom: v.zoom + 1 }))}>+</button>
      <button aria-label="Zoom out" disabled={view.zoom <= 3} onClick={() => setView(v => ({ ...v, zoom: v.zoom - 1 }))}>−</button>
      <button aria-label="Fit pipeline to map" onClick={fit}>⌖</button>
    </div>
    {tileError && <div className={styles.mapNotice}>Basemap unavailable. Pipeline overlay remains interactive.</div>}
    <div className={styles.attribution}>© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors</div>
  </div>;
}
