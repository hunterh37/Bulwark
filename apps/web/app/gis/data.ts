/** Demo-only infrastructure. Coordinates are illustrative, not actual facility locations. */
export type AssetStatus = 'ok' | 'warning' | 'alarm' | 'offline' | 'isolated';
export interface MapAsset {
    id: string;
    name: string;
    kind: string;
    lon: number;
    lat: number;
}
export interface MapSegment {
    id: string;
    from: string;
    to: string;
    coords: [
        number,
        number
    ][];
    lengthKm: number;
    diameterIn: number;
}
export interface MapTopology {
    name: string;
    assets: MapAsset[];
    segments: MapSegment[];
}
export interface MapTelemetry {
    assetId: string;
    status: AssetStatus;
    pressurePsi?: number;
    flowBpd?: number;
}
export const demoTopology: MapTopology = {
    name: 'Cushing–Houston corridor',
    assets: [
        { id: 'PS-1', name: 'Cushing pump station', kind: 'pump_station', lon: -96.77, lat: 35.98 },
        { id: 'M-1', name: 'Ada metering station', kind: 'meter', lon: -96.68, lat: 34.77 },
        { id: 'V-1', name: 'Red River block valve', kind: 'valve', lon: -96.55, lat: 33.82 },
        { id: 'PS-2', name: 'Dallas booster station', kind: 'pump_station', lon: -96.80, lat: 32.78 },
        { id: 'M-2', name: 'Corsicana metering station', kind: 'meter', lon: -96.47, lat: 32.10 },
        { id: 'T-1', name: 'Houston terminal', kind: 'tank', lon: -95.37, lat: 29.76 },
    ],
    segments: [
        { id: 'SEG-1', from: 'PS-1', to: 'M-1', coords: [[-96.77, 35.98], [-96.85, 35.4], [-96.68, 34.77]], lengthKm: 135, diameterIn: 30 },
        { id: 'SEG-2', from: 'M-1', to: 'V-1', coords: [[-96.68, 34.77], [-96.40, 34.2], [-96.55, 33.82]], lengthKm: 110, diameterIn: 30 },
        { id: 'SEG-3', from: 'V-1', to: 'PS-2', coords: [[-96.55, 33.82], [-96.65, 33.3], [-96.80, 32.78]], lengthKm: 120, diameterIn: 30 },
        { id: 'SEG-4', from: 'PS-2', to: 'M-2', coords: [[-96.80, 32.78], [-96.60, 32.4], [-96.47, 32.10]], lengthKm: 85, diameterIn: 30 },
        { id: 'SEG-5', from: 'M-2', to: 'T-1', coords: [[-96.47, 32.10], [-96.0, 31.2], [-95.7, 30.5], [-95.37, 29.76]], lengthKm: 280, diameterIn: 30 },
    ],
};
export const demoTelemetry: MapTelemetry[] = demoTopology.assets.map((asset, index) => ({
    assetId: asset.id, status: index === 4 ? 'warning' : 'ok', pressurePsi: 840 - index * 65, flowBpd: 184200 - index * 180,
}));
