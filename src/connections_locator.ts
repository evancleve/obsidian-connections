import {
    ConfirmedHalfConnection,
    Connection,
    ConnectionsSettings,
    isUnmappedConnectionRecord,
    MappedConnectionDirection
} from './connection_types';
import { FrontMatterCache, MetadataCache, TFile } from 'obsidian';
import { stripLink } from './utils';

export default class ConnectionsLocator {
    settings: ConnectionsSettings;
    metadataCache: MetadataCache;

    constructor(settings: ConnectionsSettings, metadataCache: MetadataCache) {
        this.settings = settings;
        this.metadataCache = metadataCache;
    }

    async getConnections(file: TFile) {
        const connections: Array<Connection> = [];
        connections.push(...await this.getConnectionsAsSource(file));
        connections.push(...await this.getConnectionsAsTarget(file));
        return connections;
    }

    async getConnectionsAsSource(file: TFile): Promise<Array<Connection>> {
        const metadata = await this.getMetadata(file);
        const sourceConnections: Array<Connection> = [];
        if (metadata) {
            // Get the connnections and add the source before returning them as full-fledged Connection variants.
            sourceConnections.push(...
                this.getUnmappedConnectionsAsSource(metadata).map((x) => { return { ...x, source: file } })
            );
            sourceConnections.push(...
                this.getMappedConnectionsAsSource(metadata).map((x) => { return { ...x, source: file } })
            )
        }
        return sourceConnections;
    }

    getUnmappedConnectionsAsSource(metadata: Record<string, string>): Array<ConfirmedHalfConnection> {
        const foundUnmappedConnections: Array<ConfirmedHalfConnection> = [];
        const possibleUnmappedConnections = metadata['connections']
        if (possibleUnmappedConnections) {
            for (const possibleConnection of possibleUnmappedConnections) {
                if (!isUnmappedConnectionRecord(possibleConnection)) {
                    continue;
                }
                const linkedFile = this.getValidFileFromStringOrNull(possibleConnection.link);
                if (linkedFile) {
                    foundUnmappedConnections.push({
                        connectionType: possibleConnection.connectionType,
                        target: linkedFile
                    })
                }
            }
        }
        return foundUnmappedConnections;
    }

    getMappedConnectionsAsSource(metadata: Record<string, string>): Array<ConfirmedHalfConnection> {
        const foundMappedConnections: Array<ConfirmedHalfConnection> = [];
        for (const mappedType of this.settings.mappedTypes) {
            if (mappedType.mapProperty in metadata) {
                //Convert a non-array property to an array for the upcoming loop.
                let entries;
                if (Array.isArray(metadata[mappedType.mapProperty])) {
                    entries = metadata[mappedType.mapProperty]
                } else {
                    entries = [metadata[mappedType.mapProperty]]
                }
                for (const entry of entries) {
                    const linkedFile = this.getValidFileFromStringOrNull(entry);
                    if (linkedFile) {
                        foundMappedConnections.push({
                            connectionType: mappedType.connectionType,
                            target: linkedFile,
                            mapConnectionDirection: mappedType.mapConnectionDirection,
                            mapProperty: mappedType.mapProperty
                        })
                    }
                }
            }
        }
        return foundMappedConnections;
    }

    async getConnectionsAsTarget(targetFile: TFile): Promise<Array<Connection>> {
        const foundConnections: Array<Connection> = [];
        //@ts-ignore - apparently an undocumented Obsidian feature, but a feature nonetheless!
        const backlinks = this.metadataCache.getBacklinksForFile(targetFile);
        for (const linkingFileName of backlinks.keys()) {
            const sourceFile = this.getValidFileFromStringOrNull(linkingFileName)
            if (!sourceFile) {
                continue;
            }
            const possibleLinks = backlinks.get(linkingFileName)
            foundConnections.push(...this.getMappedConnectionsAsTargetFromFile(sourceFile, targetFile, possibleLinks));
            foundConnections.push(...await this.getUnmappedConnectionsAsTargetFromFile(sourceFile, targetFile, possibleLinks));
        }
        return foundConnections;
    }

    getMappedConnectionsAsTargetFromFile(sourceFile: TFile, targetFile: TFile, possibleLinks: Array<{ key: string }>): Array<Connection> {
        const foundMappedConnections: Array<Connection> = [];
        for (const possibleLink of possibleLinks) {
            //Screwing around with maps, filters, and ternary expressions. Probably at the expense of readability!
            const foundMappedTypes = this.settings.mappedTypes.map((mt) => RegExp(`^${mt.mapProperty}\\.?`).test(possibleLink.key) ? mt : null).filter((val) => val != null);
            for (const fmt of foundMappedTypes) {
                if (fmt && fmt.connectionType as string && fmt.mapProperty as string && fmt.mapConnectionDirection as MappedConnectionDirection) {
                    foundMappedConnections.push({
                        source: sourceFile,
                        target: targetFile,
                        connectionType: fmt.connectionType,
                        mapProperty: fmt.mapProperty,
                        mapConnectionDirection: fmt.mapConnectionDirection
                    });
                }
            }
        }
        return foundMappedConnections;
    }

    async getUnmappedConnectionsAsTargetFromFile(sourceFile: TFile, targetFile: TFile, possibleLinks: Array<{ key: string }>): Promise<Array<Connection>> {
        const foundUnmappedConnections: Array<Connection> = [];
        const connectionsRegExp = RegExp('connections\\.(\\d+)');
        let fileMetadata: FrontMatterCache | null = null;
        let connectionsRegExpResults;
        for (const possibleLink of possibleLinks) {
            if ((connectionsRegExpResults = connectionsRegExp.exec(possibleLink.key)) != null) {
                const idx = parseInt(connectionsRegExpResults[1]);
                if (!fileMetadata) {
                    fileMetadata = await this.getMetadata(sourceFile) as FrontMatterCache;
                }
                foundUnmappedConnections.push({ source: sourceFile, target: targetFile, connectionType: fileMetadata.connections[idx].connectionType })
            }
        }
        return foundUnmappedConnections;

    }

    getValidFileFromStringOrNull(name: string): TFile | null {
        const linkedFile = this.metadataCache.getFirstLinkpathDest(
            stripLink(name),
            ''
        );
        if (linkedFile instanceof TFile) {
            return linkedFile
        }
        return null;
    }

    /**
     * Retrieve metadata for a given TFile.
     * @param {TFile} file - The selected file
     * @returns {CachedMetadata}
     */
    async getMetadata(file: TFile): Promise<FrontMatterCache | null> {
        const fileCache = this.metadataCache.getFileCache(file);
        return fileCache?.frontmatter || null;
    }
}