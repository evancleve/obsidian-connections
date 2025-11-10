import { ItemView, TFile, WorkspaceLeaf } from 'obsidian';
import { Root, createRoot } from 'react-dom/client';
import { Connection, MappedConnectionSubject } from './connection_types';
import { KeyGenerator, obsidianTheme } from './utils';
import { Component } from 'react';
import Button from '@mui/material/Button';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import Delete from '@mui/icons-material/Delete';
import { ThemeProvider } from '@mui/material/styles';

export const VIEW_TYPE_CONNECTIONS = 'connections-view';

type OpenLinkFunction = (file: TFile | string) => void;
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
    linkFile: TFile | string;
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

    async onOpen(): Promise<void> {
        const container = this.contentEl;
        container.empty();
        container.createEl('h4', { text: 'Connections' });
        this.root = createRoot(container.createEl('div'));
        await Promise.resolve();
    }

    async onClose(): Promise<void> {
        if (this.root) {
            this.root.unmount();
            this.root = null;
        }
        await Promise.resolve();
    }

    renderConnections(connections: Array<Connection>, activeFile: TFile) {
        if (!this.root) return;
        this.root.render(
            <ThemeProvider theme={obsidianTheme}>
                <ConnectionsViewContent
                    connections={connections}
                    activeFile={activeFile}
                    openFunc={this.openLinkFunc}
                    deleteConnectionFunc={this.deleteConnectionFunc} />
            </ThemeProvider>
        )
    }
}

class ConnectionsViewContent extends Component<ConnectionsViewContentIFace> {
    render() {
        const kg = new KeyGenerator('connection-view');
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
        let subjectItem, objectItem: TFile | string;
        if ('mapConnectionSubject' in connection && connection.mapConnectionSubject === MappedConnectionSubject.Target) {
            subjectItem = connection.target;
            objectItem = connection.source;
        } else {
            subjectItem = connection.source;
            objectItem = connection.target;
        }
        return <>
            <div>
                <span><ObsidianLink linkFile={subjectItem} {...props} /></span>
                <span> {this.props.connection.connectionText} </span>
                <span><ObsidianLink linkFile={objectItem} {...props} /></span>
            </div>
        </>
    }
}

class ObsidianLink extends Component<ObsidianLinkIFace> {
    render() {
        if (this.props.linkFile instanceof TFile) {
            if (this.props.linkFile === this.props.activeFile) {
                return <span className="same-document">{this.props.linkFile.basename}</span>
            } else {
                return <a
                    href={this.props.linkFile.path}
                    className='internal-link'
                    onClick={() => { this.props.openFunc(this.props.linkFile) }}
                >{this.props.linkFile.basename}</a>
            }
        } else {
            return <a
                href={this.props.linkFile}
                className='connections-unresolved is-unresolved internal-link'
                onClick={() => { this.props.openFunc(this.props.linkFile) }}
            >{this.props.linkFile}</a>
        }
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