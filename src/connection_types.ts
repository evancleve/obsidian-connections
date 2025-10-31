import {TFile} from 'obsidian';

export type UnmappedConnectionType = {connectionType: string;};

export type MappedConnectionType = UnmappedConnectionType & {
    mapProperty: string;
    mapConnectionDirection: MappedConnectionDirection;
};

export enum MappedConnectionDirection {
    Left = "left",
    Right = "right"
};

export type ConnectionBond = {
	source: TFile;
	target: TFile;
};

export type MappedConnection = MappedConnectionType & ConnectionBond;

export type UnmappedConnection = UnmappedConnectionType & ConnectionBond;

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
