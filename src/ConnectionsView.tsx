import { ItemView, WorkspaceLeaf, TFile } from 'obsidian';
import { Connection } from './connection_types';
import { Root, createRoot } from 'react-dom/client';
import { ConnectionsFooterImpl, ConnectionsFooterImplIFace } from './ConnectionsFooter';

export const VIEW_TYPE_CONNECTIONS = 'connections-view';


type OpenLinkFunction = (file: TFile) => void;

interface ConnectionsViewIFace {
    leaf: WorkspaceLeaf;
    connections?: Array<Connection>;
    openLinkFunc: OpenLinkFunction;
    activeFile?: TFile;
}

export class ConnectionsView extends ItemView {
    root: Root
    openLinkFunc: OpenLinkFunction;

    constructor(props: ConnectionsViewIFace) {
        super(props.leaf);
        console.log('ConnectionsView getting constructed...')
        this.openLinkFunc = props.openLinkFunc;
    }

    getViewType() {
        return VIEW_TYPE_CONNECTIONS;
    }

    getDisplayText() {
        return 'Connections View';
    }

    getIcon() {
        return 'lucide-handshake';
    }

    async onOpen() {
        const container = this.contentEl;
        container.empty();
        container.createEl('h4', { text: 'Connections' });
        this.root = createRoot(container.createEl('div'));
    }

    async onClose() {
        console.log('View unloading!');
        this.containerEl.empty();
        this.root.unmount();
    }

    renderConnections(connections: Array<Connection>, activeFile: TFile) {
        this.root.render(
            <ConnectionsFooterImpl 
                connections={connections}
                activeFile={activeFile}
                openFunc={this.openLinkFunc}/>
        )
    }
}