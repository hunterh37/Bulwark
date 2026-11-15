/** Structural map interfaces; simulation.ts generates the water network and readings. */
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
