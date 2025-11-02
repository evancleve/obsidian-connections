import { ItemView, WorkspaceLeaf, TFile } from 'obsidian';
import { Root, createRoot } from 'react-dom/client';
import { Connection, MappedConnectionDirection } from './connection_types';
import { Component } from 'react';

export const VIEW_TYPE_CONNECTIONS = 'connections-view';

type OpenLinkFunction = (file: TFile) => void;

interface ConnectionsViewContentIFace {
    connections: Array<Connection>;
    openFunc: OpenLinkFunction;
    activeFile: TFile;
}

interface ConnectionLineIFace {
    connection: Connection;
    openFunc: OpenLinkFunction;
    activeFile: TFile;
}

interface ObsidianLinkIFace {
    linkFile: TFile;
    openFunc: OpenLinkFunction;
    activeFile: TFile;
}

interface ConnectionsViewIFace {
    leaf: WorkspaceLeaf;
    connections?: Array<Connection>;
    openLinkFunc: OpenLinkFunction;
    activeFile?: TFile;
}

export class ConnectionsView extends ItemView {
    root: Root | null
    openLinkFunc: OpenLinkFunction;

    constructor(props: ConnectionsViewIFace) {
        super(props.leaf);
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
        if (this.root) {
            this.root.unmount();
            this.root = null;
        }
    }

    renderConnections(connections: Array<Connection>, activeFile: TFile) {
        if (!this.root) return;
        this.root.render(
            <ConnectionsViewContent
                connections={connections}
                activeFile={activeFile}
                openFunc={this.openLinkFunc} />
        )
    }
}

class ConnectionsViewContent extends Component<ConnectionsViewContentIFace> {
    render() {
        let kg = new KeyGenerator();
        let { connections, ...props } = this.props;
        return <>
        <ul>
            {
                connections.map((connection: Connection) => (
                    <li key={kg.generateKey()}>
                    <ConnectionLine
                        connection={connection}
                        {...props} />
                    </li>
                ))
            }
        </ul>
        </>
    }
}

class ConnectionLine extends Component<ConnectionLineIFace> {
    render() {
        let { connection, ...props } = this.props;
        let leftItem, rightItem: TFile;
        if ('mapConnectionDirection' in connection && connection.mapConnectionDirection === MappedConnectionDirection.Right) {
            leftItem = connection.target;
            rightItem = connection.source;
        } else {
            leftItem = connection.source;
            rightItem = connection.target;
        }
        return <>
            <div>
                <span><ObsidianLink linkFile={leftItem} {...props} /></span>
                <span> {this.props.connection.connectionType} </span>
                <span><ObsidianLink linkFile={rightItem} {...props} /></span>
            </div>
        </>
    }
}

class ObsidianLink extends Component<ObsidianLinkIFace> {
    render() {
        if (this.props.linkFile === this.props.activeFile) {
            return <span className="same-document">{this.props.linkFile.basename}</span>
        } else {
            return <a
                href={this.props.linkFile.path}
                className='internal-link'
                onClick={() => { this.props.openFunc(this.props.linkFile) }}
            >{this.props.linkFile.basename}</a>
        }
    }
}

class KeyGenerator {
    i: number;

    constructor() {
        this.i = 0;
    }

    generateKey() {
        return `connection-${(this.i)++}`;
    }
}
