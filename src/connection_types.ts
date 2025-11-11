import { TFile } from 'obsidian';

export function isAnObjectWithProperties(obj: unknown): obj is object {
    return (typeof obj === 'object') && (obj != null)
}

type AssignedConnectionTypeId = {
    connectionTypeId: string;
}

export type UnmappedConnectionTypeDef = {
    connectionText: string;
}

export type UnmappedConnectionType = AssignedConnectionTypeId & UnmappedConnectionTypeDef

export function isUnmappedConnectionType(obj: unknown): obj is MappedConnectionType {
    return isAnObjectWithProperties(obj) && ('connectionText' in obj) && (obj.connectionText != '') &&
        !('mapProperty' in obj) && !('mapConnectionSubject' in obj)
}

export type MappedConnectionTypeDef = UnmappedConnectionTypeDef & {
    mapProperty: string;
    mapConnectionSubject: MappedConnectionSubject;
};

export type MappedConnectionType = AssignedConnectionTypeId & MappedConnectionTypeDef

export function isMappedConnectionType(obj: unknown): obj is MappedConnectionType {
    return isAnObjectWithProperties(obj) && ('connectionText' in obj) && (obj.connectionText != '') &&
        ('mapProperty' in obj) && (obj.mapProperty != '') &&
        ('mapConnectionSubject' in obj) && (isMappedConnectionSubject(obj.mapConnectionSubject as MappedConnectionSubject))
}

export type ConnectionTypeDef = UnmappedConnectionTypeDef | MappedConnectionTypeDef;

export type ConnectionType = UnmappedConnectionType | MappedConnectionType;

export function isConnectionType(obj: unknown): obj is ConnectionType {
    return isUnmappedConnectionType(obj) || isMappedConnectionType(obj);
}

export enum MappedConnectionSubject {
    Source = "source",
    Target = "target"
};

export function isMappedConnectionSubject(val: MappedConnectionSubject): boolean {
    switch (val) {
        case MappedConnectionSubject.Source:
        case MappedConnectionSubject.Target:
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

// Unmapped connections might exist with or without a current entry in settings,
// so let's not require the ID to be present.
export type UnmappedConnection = UnmappedConnectionTypeDef & ConnectionBond;

export const isUnmappedConnection = (obj: unknown): obj is MappedConnection => {
    return isUnmappedConnectionType(obj) && isConnectionBond(obj)
}

export type Connection = MappedConnection | UnmappedConnection;

export type ConnectionsSettings = {
    unmappedTypes: Array<UnmappedConnectionType>;
    mappedTypes: Array<MappedConnectionType>;
    connectionOrder: Array<string>;
    nextConnectionTypeId: number;
    configVersion: number;
};

export type UnmappedConnectionEntry = {
    connectionText: string;
    target: string;
}

export const isUnmappedConnectionEntry = (obj: unknown): obj is UnmappedConnectionEntry => {
    return isAnObjectWithProperties(obj) && ('connectionText' in obj) && ('target' in obj) && (obj.connectionText != '')
}
