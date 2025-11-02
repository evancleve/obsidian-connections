import {TFile} from 'obsidian';
import { Connection, MappedConnectionDirection } from './connection_types';
import { Component } from 'react';
import { Root, createRoot } from 'react-dom/client';

type OpenFunction = (file: TFile) => void;

export interface ConnectionsFooterIFace extends ConnectionsFooterImplIFace{
    containerEl: HTMLElement;
}

export interface ConnectionsFooterImplIFace {
    connections: Array<Connection>;
    openFunc: OpenFunction;
    activeFile: TFile;
}

interface ConnectionLineIFace {
    connection: Connection;
    openFunc: OpenFunction;
    activeFile: TFile;
}

interface ObsidianLinkIFace {
    linkFile: TFile;
    openFunc: OpenFunction;
    activeFile: TFile;
}

export class ConnectionsFooter {
    root: Root;
    constructor(props: ConnectionsFooterIFace) {
        let {containerEl, ...otherprops} = props;
        this.root = createRoot(props.containerEl);
        this.root.render(
            <ConnectionsFooterImpl {...otherprops}/>
        );
    }

    refresh(props: ConnectionsFooterImplIFace) {
        this.root.render(<ConnectionsFooterImpl {...props}/>);
    }
}

export class ConnectionsFooterImpl extends Component<ConnectionsFooterImplIFace> {
    render() {
        let kg = new KeyGenerator();
        let {connections, ...props} = this.props;
        return <>
        {
        connections.map((connection: Connection) => (
            <ConnectionLine 
                key={kg.generateKey()} 
                connection={connection} 
                {...props}/>
        ))
        }
        </>
  }
}

class ConnectionLine extends Component<ConnectionLineIFace>{
    render() {
        let {connection, ...props} = this.props;
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
                <span><ObsidianLink linkFile={leftItem} {...props}/></span>
                <span> {this.props.connection.connectionType} </span>
                <span><ObsidianLink linkFile={rightItem} {...props}/></span>
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
                onClick={() => {this.props.openFunc(this.props.linkFile)}}
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
