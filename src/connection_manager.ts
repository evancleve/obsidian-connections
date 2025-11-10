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
import { KeyGenerator, stripLink, textOrFileToLinktext } from './utils';
import { Notice, TFile } from 'obsidian';

export default class ConnectionManager {
    cp: ConnectionsPlugin
    kg: KeyGenerator;

    constructor(cp: ConnectionsPlugin) {
        this.cp = cp;
        this.kg = new KeyGenerator('connection-type', this.cp.settings);
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

    async addConnectionType(ct: MappedConnectionType | UnmappedConnectionType): Promise<MappedConnectionType | UnmappedConnectionType | null> {
        if (isMappedConnectionType(ct)) {
            return await this.addMappedConnectionType(ct);
        } else {
            return await this.addUnmappedConnectionType(ct);
        }
    }

    async addUnmappedConnectionType(umt: UnmappedConnectionType): Promise<UnmappedConnectionType | null> {
        const index = this.findUnmappedConnectionType(umt);
        if (index == -1) {
            const connectionTypeId = this.kg.generateKey()
            const newUnmappedType = {
                connectionText: umt.connectionText,
                connectionTypeId: connectionTypeId
            };
            this.cp.settings.unmappedTypes.push(newUnmappedType);
            this.cp.connectionTypesMap.set(connectionTypeId, newUnmappedType);
            //this.cp.settings.connectionOrder.unshift(connectionTypeId);
            await this.cp.saveData(this.cp.settings);
            return newUnmappedType;
        }
        return null;
    }

    async addMappedConnectionType(mt: MappedConnectionType): Promise<MappedConnectionType | null> {
        const index = this.findMappedConnectionType(mt);
        if (index == -1) {
            const connectionTypeId = this.kg.generateKey()
            const newMappedType = {
                mapProperty: mt.mapProperty,
                connectionText: mt.connectionText,
                mapConnectionSubject: mt.mapConnectionSubject,
                connectionTypeId: connectionTypeId
            };
            this.cp.settings.mappedTypes.push(newMappedType);
            this.cp.connectionTypesMap.set(connectionTypeId, newMappedType);
            //this.cp.settings.connectionOrder.unshift(connectionTypeId);
            await this.cp.saveData(this.cp.settings);
            return newMappedType;
        }
        return null;
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
        const index = this.findUnmappedConnectionType(umt);
        if (index > -1) {
            this.cp.settings.unmappedTypes.splice(index, 1);
            if (umt.connectionTypeId) this.cp.connectionTypesMap.delete(umt.connectionTypeId);
            await this.cp.saveData(this.cp.settings);
            success = true;
        }
        return success;
    }

    async deleteMappedConnectionType(mt: MappedConnectionType): Promise<boolean> {
        let success: boolean = false;
        const index = this.findMappedConnectionType(mt);
        if (index > -1) {
            this.cp.settings.mappedTypes.splice(index, 1);
            if (mt.connectionTypeId) this.cp.connectionTypesMap.delete(mt.connectionTypeId);
            await this.cp.saveData(this.cp.settings);
            success = true;
        }
        return success;
    }

    findUnmappedConnectionType(umt: UnmappedConnectionType): number {
        if (umt.connectionTypeId && this.cp.connectionTypesMap.has(umt.connectionTypeId)) {
            const index = this.cp.settings.unmappedTypes.indexOf(this.cp.connectionTypesMap.get(umt.connectionTypeId) as UnmappedConnectionType);
            return index;
        }
        return -1;
    }

    findMappedConnectionType(mt: MappedConnectionType): number {
        if (mt.connectionTypeId && this.cp.connectionTypesMap.has(mt.connectionTypeId)) {
            const index = this.cp.settings.mappedTypes.indexOf(this.cp.connectionTypesMap.get(mt.connectionTypeId) as MappedConnectionType);
            return index;
        }
        return -1;
    }
}