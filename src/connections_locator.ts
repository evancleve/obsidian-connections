import {
    Connection,
    ConnectionsSettings,
    isUnmappedConnectionEntry,
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

    getConnections(file: TFile): Array<Connection> {
        const connections: Array<Connection> = [];
        connections.push(...this.getForwardConnectionsFromCache(file));
        connections.push(...this.getBackwardConnectionsFromCache(file));
        return connections;
    }

    getForwardConnectionsFromCache(source: TFile): Array<Connection> {
        const forwardConnections: Array<Connection> = [];
        const frontlinks: Array<FrontmatterLinkCache> | undefined = this.metadataCache.getFileCache(source)?.frontmatterLinks;
        if (frontlinks) {
            forwardConnections.push(...this.getMappedConnectionsFromCache(frontlinks, source));
            forwardConnections.push(...this.getUnmappedConnectionsFromCache(frontlinks, source));
        }
        return forwardConnections;
    }

    getBackwardConnectionsFromCache(target: TFile): Array<Connection> {
        const backwardConnections: Array<Connection> = [];
        //@ts-ignore - apparently an undocumented Obsidian feature, but a feature nonetheless!
        const backlinks = this.metadataCache.getBacklinksForFile(target);
        for (const linkingFilename of backlinks.keys()) {
            const source = this.getValidFileFromStringOrNull(linkingFilename);
            if (source) {
                const frontlinks: Array<FrontmatterLinkCache> | undefined = this.metadataCache.getFileCache(source)?.frontmatterLinks;
                if (frontlinks) {
                    backwardConnections.push(...this.getMappedConnectionsFromCache(frontlinks, source, target));
                    backwardConnections.push(...this.getUnmappedConnectionsFromCache(frontlinks, source, target));
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

    getUnmappedConnectionsFromCache(links: Array<FrontmatterLinkCache>, source: TFile, specificTarget: TFile | null = null): Array<Connection> {
        const unmappedIndexes: Array<number> = [];
        const connectionsRegExp = RegExp('^connections\\.([\\d+])\\.target$');
        for (const fl of links) {
            const result = connectionsRegExp.exec(fl.key);
            if (result) {
                unmappedIndexes.push(parseInt(result[1]));
            }
        }
        return this.getUnmappedConnectionsFromFrontmatter(source, unmappedIndexes, specificTarget);
    }

    getUnmappedConnectionsFromFrontmatter(source: TFile, indexes: Array<number>, specificTarget: TFile | null = null): Array<Connection> {
        const unmappedConnections: Array<Connection> = [];
        const metadata: FrontMatterCache | null = this.getMetadata(source);
        if (metadata && 'connections' in metadata) {
            for (const idx of indexes) {
                if (!isUnmappedConnectionEntry(metadata.connections[idx])) {
                    continue;
                }
                let linkedFile: TFile | string | null;
                linkedFile = this.getValidFileFromStringOrNull(metadata.connections[idx].target);
                if (specificTarget && linkedFile !== specificTarget) {
                    continue;
                }
                if (!linkedFile) {
                    linkedFile = stripLink(metadata.connections[idx].target);
                }
                unmappedConnections.push({
                    source: source,
                    connectionText: metadata.connections[idx].connectionText,
                    target: linkedFile
                })
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
    getMetadata(file: TFile): FrontMatterCache | null {
        const fileCache = this.metadataCache.getFileCache(file);
        return fileCache?.frontmatter || null;
    }
}