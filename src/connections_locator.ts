import {
    Connection,
    ConnectionsSettings,
    isUnmappedConnectionRecord,
} from './connection_types';
import { FrontmatterLinkCache, FrontMatterCache, MetadataCache, TFile } from 'obsidian';
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
        connections.push(...await this.getForwardConnectionsFromCache(file));
        connections.push(...await this.getBackwardConnectionsFromCache(file));
        return connections;
    }

    async getForwardConnectionsFromCache(source: TFile): Promise<Array<Connection>> {
        const forwardConnections: Array<Connection> = [];
        const frontlinks: Array<FrontmatterLinkCache> | undefined = this.metadataCache.getFileCache(source)?.frontmatterLinks;
        if (frontlinks) {
            forwardConnections.push(...this.getMappedConnectionsFromCache(frontlinks, source));
            forwardConnections.push(...await this.getUnmappedConnectionsFromCache(frontlinks, source));
        }
        return forwardConnections;
    }

    async getBackwardConnectionsFromCache(target: TFile) {
        const backwardConnections: Array<Connection> = [];
        //@ts-ignore - apparently an undocumented Obsidian feature, but a feature nonetheless!
        const backlinks = this.metadataCache.getBacklinksForFile(target);
        for (const linkingFilename of backlinks.keys()) {
            const source = this.getValidFileFromStringOrNull(linkingFilename);
            if (source) {
                const frontlinks: Array<FrontmatterLinkCache> | undefined = this.metadataCache.getFileCache(source)?.frontmatterLinks;
                if (frontlinks) {
                    backwardConnections.push(...this.getMappedConnectionsFromCache(frontlinks, source, target));
                    backwardConnections.push(...await this.getUnmappedConnectionsFromCache(frontlinks, source, target));
                }
            }
        }
        return backwardConnections
    }

    getMappedConnectionsFromCache(links: Array<FrontmatterLinkCache>, source: TFile, specificTarget: TFile | null = null): Array<Connection> {
        const mappedConnections: Array<Connection> = [];
        for (const mappedType of this.settings.mappedTypes) {
            for (const fl of links) {
                if (mappedType.mapProperty === fl.key || fl.key.startsWith(mappedType.mapProperty + '.')) {
                    const target = this.getValidFileFromStringOrNull(fl.link);
                    //Bail out if this isn't the target we're looking for.
                    if (target && specificTarget && target !== specificTarget) {
                        continue;
                    } else if (target) {
                        mappedConnections.push({ ...mappedType, source: source, target: target });
                    } else if (!specificTarget) {
                        // We can also add an uncreated file, but only if we aren't looking for a specific target.
                        mappedConnections.push({ ...mappedType, source: source, target: fl.link });
                    }
                }
            }
        }
        return mappedConnections;
    }

    async getUnmappedConnectionsFromCache(links: Array<FrontmatterLinkCache>, source: TFile, specificTarget: TFile | null = null): Promise<Array<Connection>> {
        const unmappedIndexes: Array<number> = [];
        const connectionsRegExp = RegExp('^connections\\.([\\d+])\\.link$');
        for (const fl of links) {
            const result = connectionsRegExp.exec(fl.key);
            if (result) {
                unmappedIndexes.push(parseInt(result[1]));
            }
        }
        return await this.getUnmappedConnectionsFromFrontmatter(source, unmappedIndexes, specificTarget);
    }

    async getUnmappedConnectionsFromFrontmatter(source: TFile, indexes: Array<number>, specificTarget: TFile | null = null): Promise<Array<Connection>> {
        const unmappedConnections: Array<Connection> = [];
        const metadata: FrontMatterCache | null = await this.getMetadata(source);
        if (metadata && 'connections' in metadata) {
            for (const idx of indexes) {
                if (!isUnmappedConnectionRecord(metadata.connections[idx])) {
                    continue;
                }
                const linkedFile = this.getValidFileFromStringOrNull(metadata.connections[idx].link);
                if (linkedFile) {
                    if (specificTarget && linkedFile !== specificTarget) {
                        continue;
                    }
                    unmappedConnections.push({
                        source: source,
                        connectionType: metadata.connections[idx].connectionType,
                        target: linkedFile
                    })
                }
            }
        }
        return unmappedConnections;
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