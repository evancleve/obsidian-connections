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
    nextResolve: TFile | undefined = undefined;
    connectionTypesMap: Map<string, ConnectionType>;

    async onload(): Promise<void> {

        this.addSettingTab(new ConnectionsSettingTab(this));
        this.settings = await this.loadData();
        if (!this.settings) {
            this.settings = {
                unmappedTypes: [],
                mappedTypes: [],
                //connectionOrder: [],
                nextConnectionTypeId: 0,
                configVersion: 1,
            }
        }
        this.connectionTypesMap = new Map();
        for (let ct of [...this.settings.mappedTypes, ...this.settings.unmappedTypes]) {
            if (ct.connectionTypeId) this.connectionTypesMap.set(ct.connectionTypeId, ct);
        }
        this.cm = new ConnectionsManager(this);
        this.cl = new ConnectionsLocator(this.settings, this.app.metadataCache);

        this.addCommand({
            id: 'add-connection',
            name: 'Add connection to another note',
            callback: () => {
                const currentFile = this.app.workspace.getActiveFile();
                if (currentFile) {
                    new ConnectionsModal(this,
                        currentFile,
                        this.getAllConnectionTypes(),
                        async (result: Connection) => await this.cm.addConnection(result))
                        .open()
                }
            },
        });

        this.addCommand({
            id: 'add-pane',
            name: 'Add the pane to the right sidebar',
            callback: async () => { await this.activateView() },
        });

        this.registerView(
            VIEW_TYPE_CONNECTIONS,
            (leaf) => new ConnectionsView({
                leaf: leaf,
                openLinkFunc: this.openLinkedNote.bind(this),
                deleteConnectionFunc: this.cm.deleteConnection.bind(this.cm)
            }));

        this.app.workspace.on('file-open', file => {
            if (file) {
                this.refreshConnectionsView(file);
            }
        });

        this.app.workspace.on('active-leaf-change', leaf => {
            if (leaf && leaf.view instanceof ConnectionsView) {
                const file = this.app.workspace.getActiveFile();
                if (file) this.refreshConnectionsView(file);
            }
        });

        // When mapped connections get deleted from the target's view, we don't trigger a
        // refresh via resolve or file-open, so we need a custom event.
        // @ts-ignore
        this.app.workspace.on('connection-delete', (data: { source: TFile, target: TFile | string }) => {
            const activeFile = this.app.workspace.getActiveFile();
            if (activeFile === data.target) this.nextResolve = data.source;
        });

        this.app.workspace.onLayoutReady(async () => { await this.activateView() });
        this.app.workspace.onLayoutReady(() => {
            this.app.metadataCache.on('resolve', (resolvedFile) => {
                const activeFile = this.app.workspace.getActiveFile();
                if (!activeFile) return;
                if (activeFile === resolvedFile) {
                    this.refreshConnectionsView(activeFile);
                    return;
                }

                if (this.nextResolve && resolvedFile === this.nextResolve) {
                    this.refreshConnectionsView(activeFile);
                    this.nextResolve = undefined;
                    return;
                }

                const resolvedMetadata = this.app.metadataCache.getFileCache(resolvedFile);
                if (resolvedMetadata && resolvedMetadata.frontmatterLinks) {
                    const activeFileLinkText = this.app.metadataCache.fileToLinktext(activeFile, '');
                    for (const fmLink of resolvedMetadata.frontmatterLinks) {
                        if (fmLink.link === activeFileLinkText) {
                            this.refreshConnectionsView(activeFile);
                        }
                    }
                }
            });
        });
    }

    getAllConnectionTypes(): Array<ConnectionType> {
        return this.settings.unmappedTypes.concat(this.settings.mappedTypes) as Array<ConnectionType>
    }

    // TODO: Implement any necessary unloading.
    // async onunload(): Promise<void> {
    // }

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

    refreshConnectionsView(file: TFile) {
        this.app.workspace.getLeavesOfType(VIEW_TYPE_CONNECTIONS).forEach((leaf) => {
            if (leaf.view instanceof ConnectionsView) {
                const connections = this.cl.getConnections(file);
                leaf.view.renderConnections(connections, file);
            }
        });
    }

    async openLinkedNote(linkedNote: TFile | string): Promise<void> {
        //@ts-ignore - apparently an undocumented Obsidian feature, but a feature nonetheless!
        const mode = this.app.vault.getConfig("defaultViewMode");
        const leaf = this.app.workspace.getMostRecentLeaf();
        if (leaf) {
            if (linkedNote instanceof TFile) {
                await leaf.openFile(
                    linkedNote,
                    { active: true, mode } as OpenViewState
                );
                return;
            }
            await this.app.workspace.openLinkText(linkedNote, '', undefined, { active: true, mode } as OpenViewState)
        }
    }
}