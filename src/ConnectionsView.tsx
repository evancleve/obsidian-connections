import { ItemView, TFile, WorkspaceLeaf } from 'obsidian';
import { Root, createRoot } from 'react-dom/client';
import { Connection, MappedConnectionDirection } from './connection_types';
import { Component } from 'react';
import Button from '@mui/material/Button';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import Delete from '@mui/icons-material/Delete';

export const VIEW_TYPE_CONNECTIONS = 'connections-view';

type OpenLinkFunction = (file: TFile) => void;
type DeleteConnectionFunction = (arg: Connection) => void;

interface ConnectionsViewContentIFace {
    connections: Array<Connection>;
    openFunc: OpenLinkFunction;
    deleteConnectionFunc: DeleteConnectionFunction;
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
    deleteConnectionFunc: DeleteConnectionFunction;
    activeFile?: TFile;
}

export class ConnectionsView extends ItemView {
    root: Root | null
    openLinkFunc: OpenLinkFunction;
    deleteConnectionFunc: DeleteConnectionFunction;

    constructor(props: ConnectionsViewIFace) {
        super(props.leaf);
        this.openLinkFunc = props.openLinkFunc;
        this.deleteConnectionFunc = props.deleteConnectionFunc;
    }

    getViewType() {
        return VIEW_TYPE_CONNECTIONS;
    }

    getDisplayText() {
        return 'Connections';
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
                openFunc={this.openLinkFunc}
                deleteConnectionFunc={this.deleteConnectionFunc} />
        )
    }
}

class ConnectionsViewContent extends Component<ConnectionsViewContentIFace> {
    render() {
        const kg = new KeyGenerator();
        const { connections, ...props } = this.props;
        return <>
            <Table size="small">
                <TableHead>
                    <TableRow>
                        <TableCell><span className="connections-settings-table-header">Connection</span></TableCell>
                        <TableCell><span className="connections-settings-table-header"></span></TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {connections.map((connection: Connection) => (
                        <TableRow
                            key={kg.generateKey()}
                            sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                            <TableCell>
                                <ConnectionLine
                                    connection={connection}
                                    {...props} />
                            </TableCell>
                            <TableCell align="right">
                                <DeleteButton actionFunc={props.deleteConnectionFunc} connection={connection} />
                            </TableCell>
                        </TableRow>

                    ))}
                </TableBody>
            </Table>
        </>
    }
}

class ConnectionLine extends Component<ConnectionLineIFace> {
    render() {
        const { connection, ...props } = this.props;
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

interface DeleteButtonIface {
    actionFunc: (arg: Connection) => void;
    connection: Connection;
}

const DeleteButton = (props: DeleteButtonIface) => {
    return <Button size="small" onClick={() => {
        props.actionFunc(props.connection);
    }}><Delete /></Button>
}