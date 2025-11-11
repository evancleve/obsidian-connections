import {
    Connection,
    UnmappedConnection,
    isUnmappedConnection,
    MappedConnection,
    isMappedConnection,
    MappedConnectionType,
    MappedConnectionTypeDef,
    isMappedConnectionType,
    UnmappedConnectionType,
    UnmappedConnectionTypeDef
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
        let success: boolean = false;
        if (isMappedConnection(connection)) {
            success = await this.addMappedConnection(connection);
        } else if (isUnmappedConnection(connection)) {
            success = await this.addUnmappedConnection(connection);
        }
        if (success) {
            const idx = this.cp.settings.connectionOrder.indexOf(connection.connectionTypeId)
            this.cp.settings.connectionOrder.splice(idx, 1);
            this.cp.settings.connectionOrder.unshift(connection.connectionTypeId);
            await this.cp.saveData(this.cp.settings);
        } else {
            console.error('Can\'t find a type for this connection: ', connection);
            void new Notice('Can\'t find a type for this connection!');
        }
        return success;
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
                    'target': `[[${textOrFileToLinktext(this.cp, uc.target)}]]`
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
                        const strippedLink = stripLink(connection['target']);
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

    async addConnectionType(ctd: MappedConnectionTypeDef | UnmappedConnectionTypeDef): Promise<MappedConnectionType | UnmappedConnectionType | null> {
        let nct: MappedConnectionType | UnmappedConnectionType | null;
        if (isMappedConnectionType(ctd)) {
            nct = await this.addMappedConnectionType(ctd);
        } else {
            nct = await this.addUnmappedConnectionType(ctd);
        }
        if (nct) {
            this.cp.connectionTypesMap.set(nct.connectionTypeId, nct);
            this.cp.settings.connectionOrder.unshift(nct.connectionTypeId);
            await this.cp.saveData(this.cp.settings);
        }
        return nct;
    }

    async addUnmappedConnectionType(umctd: UnmappedConnectionTypeDef): Promise<UnmappedConnectionType | null> {
        const index = this.findUnmappedConnectionType(umctd, false);
        if (index == -1) {
            const connectionTypeId = this.kg.generateKey()
            const newUnmappedType = {
                connectionText: umctd.connectionText,
                connectionTypeId: connectionTypeId
            };
            this.cp.settings.unmappedTypes.push(newUnmappedType);
            return newUnmappedType;
        }
        return null;
    }

    async addMappedConnectionType(mctd: MappedConnectionTypeDef): Promise<MappedConnectionType | null> {
        const index = this.findMappedConnectionType(mctd, false);
        if (index == -1) {
            const connectionTypeId = this.kg.generateKey()
            const newMappedType = {
                mapProperty: mctd.mapProperty,
                connectionText: mctd.connectionText,
                mapConnectionSubject: mctd.mapConnectionSubject,
                connectionTypeId: connectionTypeId
            };
            this.cp.settings.mappedTypes.push(newMappedType);
            return newMappedType;
        }
        return null;
    }

    async deleteConnectionType(ct: MappedConnectionType | UnmappedConnectionType): Promise<boolean> {
        let status: boolean = false;
        if (isMappedConnectionType(ct)) {
            status = await this.deleteMappedConnectionType(ct);
        } else {
            status = await this.deleteUnmappedConnectionType(ct);
        }
        if (ct.connectionTypeId) {
            const idx = this.cp.settings.connectionOrder.indexOf(ct.connectionTypeId)
            this.cp.settings.connectionOrder.splice(idx, 1);
        }
        await this.cp.saveData(this.cp.settings);
        return status;
    }

    async deleteUnmappedConnectionType(umct: UnmappedConnectionType): Promise<boolean> {
        let success: boolean = false;
        const index = this.findUnmappedConnectionType(umct);
        if (index > -1) {
            this.cp.settings.unmappedTypes.splice(index, 1);
            if (umct.connectionTypeId) this.cp.connectionTypesMap.delete(umct.connectionTypeId);
            success = true;
        }
        return success;
    }

    async deleteMappedConnectionType(mct: MappedConnectionType): Promise<boolean> {
        let success: boolean = false;
        const index = this.findMappedConnectionType(mct);
        if (index > -1) {
            this.cp.settings.mappedTypes.splice(index, 1);
            if (mct.connectionTypeId) this.cp.connectionTypesMap.delete(mct.connectionTypeId);
            success = true;
        }
        return success;
    }

    findUnmappedConnectionType(umct: UnmappedConnectionType | UnmappedConnectionTypeDef, exact: boolean = true): number {
        if (exact && 'connectionTypeId' in umct && umct.connectionTypeId && this.cp.connectionTypesMap.has(umct.connectionTypeId)) {
            const index = this.cp.settings.unmappedTypes.indexOf(this.cp.connectionTypesMap.get(umct.connectionTypeId) as UnmappedConnectionType);
            return index;
        }
        if (!exact) {
            return this.cp.settings.unmappedTypes.findIndex((elem) => umct.connectionText === elem.connectionText);
        }
        return -1;
    }

    findMappedConnectionType(mct: MappedConnectionType | MappedConnectionTypeDef, exact: boolean = true): number {
        if (exact && 'connectionTypeId' in mct && mct.connectionTypeId && this.cp.connectionTypesMap.has(mct.connectionTypeId)) {
            const index = this.cp.settings.mappedTypes.indexOf(this.cp.connectionTypesMap.get(mct.connectionTypeId) as MappedConnectionType);
            return index;
        }
        if (!exact) {
            return this.cp.settings.mappedTypes.findIndex((elem) => mct.mapProperty === elem.mapProperty);
        }
        return -1;
    }
}