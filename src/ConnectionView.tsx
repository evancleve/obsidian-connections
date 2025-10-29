
import { Component } from 'react';
import { Root, createRoot } from 'react-dom/client';

export interface ConnectionsViewIFace {
}


export class ConnectionView extends Component<ConnectionsViewIFace> {
  
    root: Root;

    constructor(props: ConnectionsViewIFace) {
        super(props);

    }

    render() {
        return <>
        <h1>Hello!</h1>
        </>
  }
}