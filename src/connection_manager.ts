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
import { Notice, TFile } from 'obsidian';

export default class ConnectionManager {
    cp: ConnectionsPlugin

    constructor(cp: ConnectionsPlugin) {
        this.cp = cp;
    }

    async addConnection(connection: Connection): Promise<boolean> {
        if (isMappedConnection(connection)) {
            return await this.addMappedConnection(connection);
        } else if (isUnmappedConnection(connection)) {
            return await this.addUnmappedConnection(connection);
        }
        console.error('Can\'t find a type for this connection: ', connection);
        void new Notice('Can\'t find a type for this connection!');
        return false;
    }

    async addUnmappedConnection(uc: UnmappedConnection): Promise<boolean> {
        let success: boolean = false;
        // For unmapped connections, the source will always be a valid TFile by definition, 
        // but the typedef include strings as an option, so narrow this.
        if (uc.source instanceof TFile) {
            await this.cp.app.fileManager.processFrontMatter(uc.source, (frontmatter) => {
                if (!frontmatter['connections']) {
                    frontmatter['connections'] = [];
                }
                frontmatter['connections'].push({
                    'connectionText': uc.connectionText,
                    'link': `[[${textOrFileToLinktext(this.cp, uc.target)}]]`
                })
            });
            success = true;
        }
        return success;
    }

    async addMappedConnection(mc: MappedConnection): Promise<boolean> {
        let success: boolean = false;
        if (typeof mc.source === "string") {
            let filename;
            if (mc.source.substring(mc.source.length - 3).toLowerCase().endsWith('.md')) {
                filename = mc.source
            } else {
                filename = mc.source + '.md';
            }
            mc.source = await this.cp.app.vault.create(filename, '');
            // TODO: What if this fails?
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
            success = true;
        }
        return success;
    }

    async deleteConnection(connection: Connection): Promise<boolean> {
        let success: boolean = false;
        if (isMappedConnection(connection)) {
            success = await this.deleteMappedConnection(connection);
            this.cp.app.workspace.trigger('connection-delete', { source: connection.source, target: connection.target });
            return success;
        } else if (isUnmappedConnection(connection)) {
            success = await this.deleteUnmappedConnection(connection);
            this.cp.app.workspace.trigger('connection-delete', { source: connection.source, target: connection.target });
            return success;
        }
        console.error('Can\'t find a type for this connection: ', connection);
        void new Notice('Can\'t find a type for this connection!');
        return success;
    }

    async deleteUnmappedConnection(uc: Connection): Promise<boolean> {
        let success: boolean = false;
        if (uc.source instanceof TFile) {
            await this.cp.app.fileManager.processFrontMatter(uc.source, (frontmatter) => {
                if (frontmatter['connections']) {
                    let pos = 0;
                    for (const connection of frontmatter['connections']) {
                        const strippedLink = stripLink(connection['link']);
                        const resolvedLink = this.cp.app.metadataCache.getFirstLinkpathDest(strippedLink, '');
                        if (connection['connectionText'] == uc.connectionText && (uc.target == resolvedLink || uc.target == strippedLink)) {
                            frontmatter['connections'].splice(pos, 1);
                            success = true;
                        }
                        pos++;
                    }
                }
                if (frontmatter['connections'].length == 0) {
                    delete frontmatter['connections'];
                }
            });
        }
        return success;
    }

    async deleteMappedConnection(mc: MappedConnection): Promise<boolean> {
        let success: boolean = false;
        let foundProperty: boolean = false;
        let foundObject: boolean = false;
        if (mc.source instanceof TFile) {
            await this.cp.app.fileManager.processFrontMatter(mc.source, (frontmatter) => {
                if (frontmatter[mc.mapProperty]) {
                    foundProperty = true;
                    if (Array.isArray(frontmatter[mc.mapProperty])) {
                        let pos = 0;
                        for (const connection of frontmatter[mc.mapProperty]) {
                            if (typeof (connection) === 'object') {
                                foundObject = true;
                                break;
                            }
                            const strippedLink = stripLink(connection);
                            const resolvedLink = this.cp.app.metadataCache.getFirstLinkpathDest(strippedLink, '');
                            if (mc.target == resolvedLink || mc.target == strippedLink) {
                                frontmatter[mc.mapProperty].splice(pos, 1);
                                success = true;
                            }
                            pos++;
                        }
                        if (frontmatter[mc.mapProperty].length == 0) {
                            delete frontmatter[mc.mapProperty];
                        }
                    } else {
                        if (typeof (frontmatter[mc.mapProperty]) === 'object') {
                            foundObject = true;
                        } else {
                            delete frontmatter[mc.mapProperty];
                            success = true;
                        }
                    }
                }
            });
        }
        if (!foundProperty) {
            console.error('Can\'t find the connection\'s mapped property in this note!', mc);
            void new Notice('Can\'t find the connection\'s mapped property in this note!');
        }
        if (foundObject) {
            console.error('Can\'t delete this connection, as it is embedded in an object.', mc);
            void new Notice('Can\'t delete this connection, as it is embedded in an object.');
        }
        return success;
    }

    async addConnectionType(ct: MappedConnectionType | UnmappedConnectionType): Promise<boolean> {
        if (isMappedConnectionType(ct)) {
            return await this.addMappedConnectionType(ct);
        } else {
            return await this.addUnmappedConnectionType(ct);
        }
    }

    async addUnmappedConnectionType(umt: UnmappedConnectionType): Promise<boolean> {
        const index = this.findUnmappedConnectionType(umt.connectionText);
        if (index == -1) {
            this.cp.settings.unmappedTypes.push(umt);
            await this.cp.saveData(this.cp.settings);
            return true;
        }
        return false;
    }

    async addMappedConnectionType(mt: MappedConnectionType): Promise<boolean> {
        let success: boolean = false;
        const index = this.findMappedConnectionType(mt.mapProperty);
        if (index == -1) {
            this.cp.settings.mappedTypes.push({
                mapProperty: mt.mapProperty,
                connectionText: mt.connectionText,
                mapConnectionSubject: mt.mapConnectionSubject
            });
            await this.cp.saveData(this.cp.settings);
            success = true;
        }
        return success;
    }

    async deleteConnectionType(ct: MappedConnectionType | UnmappedConnectionType): Promise<boolean> {
        if (isMappedConnectionType(ct)) {
            return await this.deleteMappedConnectionType(ct);
        } else {
            return await this.deleteUnmappedConnectionType(ct);
        }
    }

    async deleteUnmappedConnectionType(umt: UnmappedConnectionType): Promise<boolean> {
        let success: boolean = false;
        const index = this.findUnmappedConnectionType(umt.connectionText);
        if (index > -1) {
            this.cp.settings.unmappedTypes.splice(index, 1);
            await this.cp.saveData(this.cp.settings);
            success = true;
        }
        return success;
    }

    async deleteMappedConnectionType(mt: MappedConnectionType): Promise<boolean> {
        let success: boolean = false;
        const index = this.findMappedConnectionType(mt.mapProperty);
        if (index != -1) {
            this.cp.settings.mappedTypes.splice(index, 1);
            await this.cp.saveData(this.cp.settings);
            success = true;
        }
        return success;
    }

    findUnmappedConnectionType(connectionText: string): number {
        for (let index = 0; index < this.cp.settings.unmappedTypes.length; index++) {
            const unmappedType = this.cp.settings.unmappedTypes[index];
            if (unmappedType.connectionText == connectionText) {
                return index;
            }
        }
        return -1;
    }

    findMappedConnectionType(mapProperty: string): number {
        for (let index = 0; index < this.cp.settings.mappedTypes.length; index++) {
            const mappedType = this.cp.settings.mappedTypes[index];
            if (mappedType.mapProperty == mapProperty) {
                return index;
            }
        }
        return -1;
    }
}