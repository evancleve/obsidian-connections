import {
    Connection,
    UnmappedConnection,
    isUnmappedConnection,
    MappedConnection,
    isMappedConnection,
    MappedConnectionType,
    isMappedConnectionType,
    UnmappedConnectionType
} from './connection_types';
import ConnectionsPlugin from './main';
import { stripLink, textOrFileToLinktext } from './utils';
import { TFile } from 'obsidian';

export default class ConnectionManager {
    cp: ConnectionsPlugin

    constructor(cp: ConnectionsPlugin) {
        this.cp = cp;
    }

    async addConnection(connection: Connection) {
        if (isMappedConnection(connection)) {
            return await this.addMappedConnection(connection);
        } else if (isUnmappedConnection(connection)) {
            return await this.addUnmappedConnection(connection);
        }
        console.error('Can\'t find a type for this connection: ', connection);
    }

    async addUnmappedConnection(uc: UnmappedConnection) {
        // For unmapped connections, the source will always be a valid TFile by definition, 
        // but the typedef include strings as an option, so narrow this.
        if (uc.source instanceof TFile) {
            await this.cp.app.fileManager.processFrontMatter(uc.source, (frontmatter) => {
                if (!frontmatter['connections']) {
                    frontmatter['connections'] = [];
                }
                frontmatter['connections'].push({
                    'connectionType': uc.connectionType,
                    'link': `[[${textOrFileToLinktext(this.cp, uc.target)}]]`
                })
            });
            //TODO: add the reordering connection types, use copyWithin?
            //     // If the last connectionType we used isn't at the front of the list, move it there.
            //     const index = this.findUnmappedConnectionType(connectionType);
            //     if (index == 0) {
            //         return;
            //     } else if (index > 0) {
            //         this.cp.settings.unmappedTypes.splice(index, 1);
            //     }
            //     this.cp.settings.unmappedTypes.unshift({ connectionType: connectionType })
            //     await this.cp.saveData(this.cp.settings);
        }
    }

    async addMappedConnection(mc: MappedConnection) {
        if (typeof mc.source === "string") {
            let filename;
            if (mc.source.substring(mc.source.length - 3).toLowerCase().endsWith('.md')) {
                filename = mc.source
            } else {
                filename = mc.source + '.md';
            }
            mc.source = await this.cp.app.vault.create(filename, '');
        }
        if (mc.source instanceof TFile) {
            await this.cp.app.fileManager.processFrontMatter(mc.source, (frontmatter) => {
                if (!frontmatter[mc.mapProperty]) {
                    frontmatter[mc.mapProperty] = [];
                }
                //Since we're adding a new connection, we might to convert an existing property to a array.
                if (!Array.isArray(frontmatter[mc.mapProperty])) {
                    frontmatter[mc.mapProperty] = [frontmatter[mc.mapProperty]];
                }
                frontmatter[mc.mapProperty].push(`[[${textOrFileToLinktext(this.cp, mc.target)}]]`)
            });
        }
    }

    async addConnectionType(ct: MappedConnectionType | UnmappedConnectionType) {
        if (isMappedConnectionType(ct)) {
            return await this.addMappedConnectionType(ct);
        } else {
            return await this.addUnmappedConnectionType(ct);
        }
    }

    async deleteConnectionType(ct: MappedConnectionType | UnmappedConnectionType) {
        if (isMappedConnectionType(ct)) {
            return await this.deleteMappedConnectionType(ct);
        } else {
            return await this.deleteUnmappedConnectionType(ct);
        }
    }

    async deleteConnection(connection: Connection) {
        if (isMappedConnection(connection)) {
            return await this.deleteMappedConnection(connection);
        } else if (isUnmappedConnection(connection)) {
            return await this.deleteUnmappedConnection(connection);
        }
        console.error('Can\'t find a type for this connection: ', connection);
    }

    async deleteUnmappedConnection(uc: Connection) {
        if (uc.source instanceof TFile) {
            await this.cp.app.fileManager.processFrontMatter(uc.source, (frontmatter) => {
                if (frontmatter['connections']) {
                    let pos = 0;
                    for (const connection of frontmatter['connections']) {
                        const strippedLink = stripLink(connection['link']);
                        const resolvedLink = this.cp.app.metadataCache.getFirstLinkpathDest(strippedLink, '');
                        if (connection['connectionType'] == uc.connectionType && (uc.target == resolvedLink || uc.target == strippedLink)) {
                            frontmatter['connections'].splice(pos, 1);
                        }
                        pos++;
                    }
                }
                if (frontmatter['connections'].length == 0) {
                    delete frontmatter['connections'];
                }
            });
        }
    }

    async deleteMappedConnection(mc: MappedConnection) {
        if (mc.source instanceof TFile) {
            await this.cp.app.fileManager.processFrontMatter(mc.source, (frontmatter) => {
                if (frontmatter[mc.mapProperty]) {
                    if (Array.isArray(frontmatter[mc.mapProperty])) {
                        let pos = 0;
                        for (const connection of frontmatter[mc.mapProperty]) {
                            const strippedLink = stripLink(connection);
                            const resolvedLink = this.cp.app.metadataCache.getFirstLinkpathDest(strippedLink, '');
                            if (mc.target == resolvedLink || mc.target == strippedLink) {
                                frontmatter[mc.mapProperty].splice(pos, 1);
                            }
                            pos++;
                        }
                        if (frontmatter[mc.mapProperty].length == 0) {
                            delete frontmatter[mc.mapProperty];
                        }
                    } else {
                        delete frontmatter[mc.mapProperty];
                    }
                }
            });
        }
    }

    async addUnmappedConnectionType(umt: UnmappedConnectionType): Promise<boolean> {
        const index = this.findUnmappedConnectionType(umt.connectionType);
        if (index == -1) {
            this.cp.settings.unmappedTypes.push(umt);
            await this.cp.saveData(this.cp.settings);
            return true;
        }
        return false;
    }

    async deleteUnmappedConnectionType(umt: UnmappedConnectionType) {
        const index = this.findUnmappedConnectionType(umt.connectionType);
        if (index > -1) {
            this.cp.settings.unmappedTypes.splice(index, 1);
            await this.cp.saveData(this.cp.settings);
        }
    }

    async addMappedConnectionType(mt: MappedConnectionType): Promise<boolean> {
        const index = this.findMappedConnectionType(mt.mapProperty);
        if (index == -1) {
            this.cp.settings.mappedTypes.push({
                mapProperty: mt.mapProperty,
                connectionType: mt.connectionType,
                mapConnectionSubject: mt.mapConnectionSubject
            });
            await this.cp.saveData(this.cp.settings);
            return true;
        }
        return false;
    }

    async deleteMappedConnectionType(mt: MappedConnectionType) {
        const index = this.findMappedConnectionType(mt.mapProperty);
        if (index != -1) {
            this.cp.settings.mappedTypes.splice(index, 1);
            await this.cp.saveData(this.cp.settings);
        }
    }

    findMappedConnectionType(mapProperty: string) {
        for (let index = 0; index < this.cp.settings.mappedTypes.length; index++) {
            const mappedType = this.cp.settings.mappedTypes[index];
            if (mappedType.mapProperty == mapProperty) {
                return index;
            }
        }
        return -1;
    }

    findUnmappedConnectionType(connectionType: string) {
        for (let index = 0; index < this.cp.settings.unmappedTypes.length; index++) {
            const unmappedType = this.cp.settings.unmappedTypes[index];
            if (unmappedType.connectionType == connectionType) {
                return index;
            }
        }
        return -1;
    }
}