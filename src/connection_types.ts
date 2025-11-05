import { TFile } from 'obsidian';

export function isAnObjectWithProperties(obj: unknown) {
    return (typeof obj === 'object') && (obj != null)
}

export type UnmappedConnectionType = { connectionType: string; };

export function isUnmappedConnectionType(obj: unknown): obj is MappedConnectionType {
    return isAnObjectWithProperties(obj) && ('connectionType' in obj) && (obj.connectionType != '') &&
        !('mapProperty' in obj) && !('mapConnectionDirection' in obj) && !('mapConnectionDirection' in obj)
}

export type MappedConnectionType = UnmappedConnectionType & {
    mapProperty: string;
    mapConnectionDirection: MappedConnectionDirection;
};

export function isMappedConnectionType(obj: unknown): obj is MappedConnectionType {
    return isAnObjectWithProperties(obj) && ('connectionType' in obj) && (obj.connectionType != '') &&
        ('mapProperty' in obj) && (obj.mapProperty != '') &&
        ('mapConnectionDirection' in obj) && (isMappedConnectionDirection(obj.mapConnectionDirection as MappedConnectionDirection))
}

export type ConnectionType = UnmappedConnectionType | MappedConnectionType;

export function isConnectionType(obj: unknown): obj is ConnectionType {
    return isUnmappedConnectionType(obj) || isMappedConnectionType(obj);
}

export enum MappedConnectionDirection {
    Left = "left",
    Right = "right"
};

export function isMappedConnectionDirection(val: MappedConnectionDirection): boolean {
    switch (val) {
        case MappedConnectionDirection.Left:
        case MappedConnectionDirection.Right:
            return true;
        default:
            return false;
    }
}

export type ConnectionBond = {
    source: TFile | string;
    target: TFile | string;
};

export const isConnectionBond = (obj: unknown): obj is ConnectionBond => {
    return isAnObjectWithProperties(obj) && ('source' in obj) && (obj.source instanceof TFile || typeof obj.source === 'string') &&
        ('target' in obj) && (obj.target instanceof TFile || typeof obj.target === 'string')
}

export type MappedConnection = MappedConnectionType & ConnectionBond;

export const isMappedConnection = (obj: unknown): obj is MappedConnection => {
    return isMappedConnectionType(obj) && isConnectionBond(obj)
}

export type UnmappedConnection = UnmappedConnectionType & ConnectionBond;

export const isUnmappedConnection = (obj: unknown): obj is MappedConnection => {
    return isUnmappedConnectionType(obj) && isConnectionBond(obj)
}

export type Connection = MappedConnection | UnmappedConnection;

export type ConnectionsSettings = {
    unmappedTypes: Array<UnmappedConnectionType>;
    mappedTypes: Array<MappedConnectionType>;
};

export type UnmappedConnectionRecord = {
    connectionType: string;
    link: string;
}

export const isUnmappedConnectionRecord = (obj: unknown): obj is UnmappedConnectionRecord => {
    return isAnObjectWithProperties(obj) && ('connectionType' in obj) && ('link' in obj) && (obj.connectionType != '')
}
