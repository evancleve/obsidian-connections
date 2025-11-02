import {
	ConnectionsSettings,
	UnmappedConnectionType,
	MappedConnectionDirection
} from './connection_types';
import { Plugin, TFile, OpenViewState, WorkspaceLeaf } from 'obsidian';
import { ConnectionsModal } from './connection_modal';
import { ConnectionsSettingTab } from './settings_tab'
import { ConnectionsLocator, stripLink } from './connections_locator';
import { ConnectionsView, VIEW_TYPE_CONNECTIONS } from './ConnectionsView';

export class ConnectionData {
	fromFile: TFile;
	toFile: TFile;
	connectionType: string;

	constructor(ff: TFile, tf: TFile, ct: string) {
		this.fromFile = ff;
		this.toFile = tf;
		this.connectionType = ct;
	}
}

export default class ConnectionsPlugin extends Plugin {

	settings: ConnectionsSettings;
	cl: ConnectionsLocator;
	cv: ConnectionsView;

	async onload(): Promise<void> {

		this.addSettingTab(new ConnectionsSettingTab(this));
		this.settings = await this.loadData();
		this.cl = new ConnectionsLocator(this.settings, this.app.metadataCache);

		this.addCommand({
			id: 'add-connection',
			name: 'Add connection to another note',
			callback: () => {
				const currentFile = this.app.workspace.getActiveFile();
				if (currentFile) {
					new ConnectionsModal(this, currentFile, this.settings.unmappedTypes, (result: ConnectionData) => this.addConnection(result)).open()
				}
			},
		});

		this.addCommand({
			id: 'add-connections-pane',
			name: 'Add the Connections pane to the right sidebar',
			callback: () => { this.activateView() },
		});

		this.registerView(
			VIEW_TYPE_CONNECTIONS,
			(leaf) => this.cv = new ConnectionsView({ leaf: leaf, openLinkFunc: this.openLinkedNote.bind(this) }));
		this.app.workspace.onLayoutReady(() => { this.activateView() });

		this.app.workspace.on('file-open', async file => {
			if (file) {
				this.refreshConnectionsView(file);
			}
		});

		this.app.metadataCache.on('changed', (file, data, cache) => {
			this.refreshConnectionsView(file);
		});
	}

	async onunload(): Promise<void> {
		//unload stuff here
	}

	async activateView() {
		let leaf: WorkspaceLeaf | null = null;
		const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_CONNECTIONS);
		if (leaves.length > 0) {
			// A leaf with our view already exists, use that
			leaf = leaves[0];
		} else {
			// Our view could not be found in the workspace, create a new leaf
			// in the right sidebar for it
			leaf = this.app.workspace.getRightLeaf(false) as WorkspaceLeaf;
			await leaf.setViewState({ type: VIEW_TYPE_CONNECTIONS, active: false });
		}
	}

	async refreshConnectionsView(file: TFile) {
		if (!this.cv) {
			return;
		}
		let connections = await this.cl.getConnections(file);
		this.cv.renderConnections(connections, file);
	}

	/**
	 * Adds a connection between files
	 * @param {ConnectionData} cData - A  object describing the connection.
	 */
	async addConnection(cData: ConnectionData) {
		const { fromFile, toFile, connectionType } = cData;
		if (fromFile) {
			await this.app.fileManager.processFrontMatter(fromFile, (frontmatter) => {
				if (!frontmatter['connections']) {
					frontmatter['connections'] = [];
				}
				frontmatter['connections'].push({
					'connectionType': connectionType,
					'link': `[[${this.app.metadataCache.fileToLinktext(toFile, '')}]]`
				})
			});
		}

		// If the last connectionType we used isn't at the front of the list, move it there.
		const index = this.findUnmappedConnectionType(connectionType);
		if (index == 0) {
			return;
		} else if (index > 0) {
			this.settings.unmappedTypes.splice(index, 1);
		}
		this.settings.unmappedTypes.unshift({ connectionType: connectionType })
		await this.saveData(this.settings);
	}

	/**
	 * Adds a connection type to the list of unmapped connection types
	 * @param {string} connectionType - The connection type to add.
	 */
	async addConnectionType(umt: UnmappedConnectionType): Promise<boolean> {
		const index = this.findUnmappedConnectionType(umt.connectionType);
		if (index == -1) {
			this.settings.unmappedTypes.push(umt);
			await this.saveData(this.settings);
			return true;
		}
		return false;
	}

	/**
	 * Removes a connection type from the list of unmapped connection types
	 * @param {string} connectionType - The connection type to remove.
	 */
	async removeConnectionType(umt: UnmappedConnectionType) {
		const index = this.findUnmappedConnectionType(umt.connectionType);
		if (index > -1) {
			this.settings.unmappedTypes.splice(index, 1);
			await this.saveData(this.settings);
		}
	}

	async addMappedConnectionType(mapProperty: string, connectionType: string, mapConnectionDirection: MappedConnectionDirection): Promise<boolean> {
		let index = this.findMappedConnectionType(mapProperty);
		if (index == -1) {
			this.settings.mappedTypes.push({ mapProperty: mapProperty, connectionType: connectionType, mapConnectionDirection: mapConnectionDirection });
			await this.saveData(this.settings);
			return true;
		}
		return false;
	}

	async removeMappedConnectionType(mapProperty: string) {
		let index = this.findMappedConnectionType(mapProperty);
		if (index != -1) {
			this.settings.mappedTypes.splice(index, 1);
			await this.saveData(this.settings);
		}
	}

	findMappedConnectionType(mapProperty: string) {
		for (let index = 0; index < this.settings.mappedTypes.length; index++) {
			let mappedType = this.settings.mappedTypes[index];
			if (mappedType.mapProperty == mapProperty) {
				return index;
			}
		}
		return -1;
	}

	findUnmappedConnectionType(connectionType: string) {
		for (let index = 0; index < this.settings.unmappedTypes.length; index++) {
			let unmappedType = this.settings.unmappedTypes[index];
			if (unmappedType.connectionType == connectionType) {
				return index;
			}
		}
		return -1;
	}

	/**
	 * Removes a connection between files
	 * @param {ConnectionData} cData - A  object describing the connection.
	 */
	async removeConnection(cData: ConnectionData) {
		const { fromFile, toFile, connectionType } = cData;
		await this.app.fileManager.processFrontMatter(fromFile, frontmatter => {
			if (frontmatter['connections']) {
				let pos = 0;
				for (let connection of frontmatter['connections']) {
					let resolvedLink = this.app.metadataCache.getFirstLinkpathDest(stripLink(connection['link']), '');
					if (connection['connectionType'] == connectionType && toFile == resolvedLink) {
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

	openLinkedNote(linkedNote: TFile): void {
		//@ts-ignore - apparently an undocumented Obsidian feature, but a feature nonetheless!
		const mode = this.app.vault.getConfig("defaultViewMode");
		const leaf = this.app.workspace.getMostRecentLeaf();
		if (leaf) {
			leaf.openFile(
				linkedNote,
				{ active: true, mode } as OpenViewState
			);
		}
	}

}