import { TFile } from 'obsidian';

export type UnmappedConnectionType = { connectionType: string; };

export function isUnmappedConnectionType(obj: any): obj is MappedConnectionType {
    return ('connectionType' in obj) && (obj.connectionType != '') &&
        !('mapProperty' in obj) && !('mapConnectionDirection' in obj) && !('mapConnectionDirection' in obj)
}

export type MappedConnectionType = UnmappedConnectionType & {
    mapProperty: string;
    mapConnectionDirection: MappedConnectionDirection;
};

export function isMappedConnectionType(obj: any): obj is MappedConnectionType {
    return ('connectionType' in obj) && (obj.connectionType != '') &&
        ('mapProperty' in obj) && (obj.mapProperty != '') &&
        ('mapConnectionDirection' in obj) && (isMappedConnectionDirection(obj.mapConnectionDirection))
}

export type ConnectionType = UnmappedConnection | MappedConnectionType;

export function isConnectionType(obj: any): obj is ConnectionType {
    return isUnmappedConnectionType(obj) || isMappedConnectionType(obj);
}

export enum MappedConnectionDirection {
    Left = "left",
    Right = "right"
};

export function isMappedConnectionDirection(val: string): boolean {
    switch (val) {
        case MappedConnectionDirection.Left:
        case MappedConnectionDirection.Right:
            return true;
        default:
            return false;
    }
}

export type ConnectionBond = {
    source: TFile;
    target: TFile;
};

export const isConnectionBond = (obj: any): obj is ConnectionBond => {
    return ('source' in obj) && (obj.source instanceof TFile) &&
        ('target' in obj) && (obj.target instanceof TFile)
}

export type MappedConnection = MappedConnectionType & ConnectionBond;

export const isMappedConnection = (obj: any): obj is MappedConnection => {
    return isMappedConnectionType(obj) && isConnectionBond(obj)
}

export type UnmappedConnection = UnmappedConnectionType & ConnectionBond;

export const isUnmappedConnection = (obj: any): obj is MappedConnection => {
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

export const isUnmappedConnectionRecord = (obj: any): obj is UnmappedConnectionRecord => {
    return ('connectionType' in obj) && ('link' in obj) && (obj.connectionType != '')
}

export type ConfirmedHalfConnection = {
    connectionType: string;
    target: TFile;
    mapProperty?: string;
    mapConnectionDirection?: MappedConnectionDirection;
}
