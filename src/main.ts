import { Connection, ConnectionsSettings, ConnectionType } from './connection_types';
import { OpenViewState, Plugin, TFile, WorkspaceLeaf } from 'obsidian';
import { ConnectionsModal } from './connection_modal';
import { ConnectionsSettingTab } from './settings_tab'
import ConnectionsManager from './connection_manager'
import ConnectionsLocator from './connections_locator';
import { ConnectionsView, VIEW_TYPE_CONNECTIONS } from './ConnectionsView';


export default class ConnectionsPlugin extends Plugin {

	settings: ConnectionsSettings;
	cm: ConnectionsManager;
	cl: ConnectionsLocator;
	cv: ConnectionsView;

	async onload(): Promise<void> {

		this.addSettingTab(new ConnectionsSettingTab(this));
		this.settings = await this.loadData();
		if (!this.settings) {
			this.settings = {unmappedTypes: [], mappedTypes:[]}
		}
		this.cm = new ConnectionsManager(this);
		this.cl = new ConnectionsLocator(this.settings, this.app.metadataCache);

		this.addCommand({
			id: 'add-connection',
			name: 'Add connection to another note',
			callback: () => {
				const currentFile = this.app.workspace.getActiveFile();
				if (currentFile) {
					new ConnectionsModal(this, currentFile, this.getAllConnectionTypes(), (result: Connection) => this.cm.addConnection(result)).open()
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
			(leaf) => this.cv = new ConnectionsView({ leaf: leaf, openLinkFunc: this.openLinkedNote.bind(this), deleteConnectionFunc: this.cm.deleteConnection.bind(this.cm) }));
		this.app.workspace.onLayoutReady(() => { this.activateView() });

		this.app.workspace.on('file-open', async file => {
			if (file) {
				this.refreshConnectionsView(file);
			}
		});

		this.app.workspace.on('active-leaf-change', async leaf => {
			if (leaf && leaf.view instanceof ConnectionsView) {
				const file = this.app.workspace.getActiveFile();
				if (file) this.refreshConnectionsView(file);
			}
		});

		this.app.metadataCache.on('changed', (file, data, cache) => {
			// Figure out how to only do this when the active file is the one in view.
			this.refreshConnectionsView(file);
		});
	}

	getAllConnectionTypes(): Array<ConnectionType> {
		return this.settings.unmappedTypes.concat(this.settings.mappedTypes) as Array<ConnectionType>
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
		const connections = await this.cl.getConnections(file);
		this.cv.renderConnections(connections, file);
	}

	openLinkedNote(linkedNote: TFile | string): void {
		//@ts-ignore - apparently an undocumented Obsidian feature, but a feature nonetheless!
		const mode = this.app.vault.getConfig("defaultViewMode");
		const leaf = this.app.workspace.getMostRecentLeaf();
		if (leaf) {
			if (linkedNote instanceof TFile) {
				leaf.openFile(
					linkedNote,
					{ active: true, mode } as OpenViewState
				);
			}
			this.app.workspace.openLinkText(linkedNote as string, '', undefined, { active: true, mode } as OpenViewState)
		}
	}

}