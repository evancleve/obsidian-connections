import { ConnectionsSettings, MappedType } from './main';
import * as Mui from '@mui/material';
import * as Icons from '@mui/icons-material';
import { Component } from 'react';

export interface SettingsIface {
    settings: ConnectionsSettings;
    deleteMappedFunc: (mappedType: MappedType) => void;
    addMappedFunc: (mappedType: MappedType) => void;
}

export class SettingsView extends Component<SettingsIface> {  
  constructor(props: SettingsIface) {
    super(props);
  }

  render() {
    return <>
      <MappedConnectionsTable {...this.props}/>
    </>
  }
}

class MappedConnectionsTable extends Component<SettingsIface, ConnectionsSettings> {
  deleteMappedFunc: (mappedType: MappedType) => void;
  addMappedFunc: (mappedType: MappedType) => void;

  constructor(props: SettingsIface) {
    super(props);
    this.deleteMappedFunc = props.deleteMappedFunc;
    this.addMappedFunc = props.addMappedFunc;
    this.state = {
      mappedTypes: props.settings.mappedTypes,
      unmappedTypes: props.settings.unmappedTypes
    };
  }

  render() {

    return <>
      <h3>Mapped Connection Types</h3>
      <Mui.Table>
        <Mui.TableHead>
          <Mui.TableRow>
            <Mui.TableCell>Property</Mui.TableCell>
            <Mui.TableCell>Connection Type</Mui.TableCell>
            <Mui.TableCell>Direction</Mui.TableCell>
            <Mui.TableCell>Controls</Mui.TableCell>
          </Mui.TableRow>
        </Mui.TableHead>
        <Mui.TableBody>
            <AddMappedConnectionType />
            {this.state.mappedTypes.map((mappedType: MappedType) => (
              <Mui.TableRow
                key={mappedType.mapProperty}
                sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
              >
                <Mui.TableCell component="th" scope="row" >
                  <span style={{marginLeft: '0.5em'}}>{mappedType.mapProperty}</span>
                </Mui.TableCell>
                <Mui.TableCell><span style={{marginLeft: '0.5em'}}>{mappedType.mapConnectionType}</span></Mui.TableCell>
                <Mui.TableCell align="center">{'true'}</Mui.TableCell>
                <Mui.TableCell align="right">
                  <DeleteButton actionFunc={(args) => {this.deleteMappedType(args)}} mappedType={mappedType}/>
                </Mui.TableCell>
              </Mui.TableRow>
            ))}
        </Mui.TableBody>
      </Mui.Table>
    </>
  }

  deleteMappedType(mappedType: MappedType) {
    let idx = this.state.mappedTypes.indexOf(mappedType);
    if (idx != -1) {
      this.setState({mappedTypes: this.state.mappedTypes.toSpliced(idx, 1)});
    }
    this.deleteMappedFunc(mappedType);
  }

  addMappedType(mappedType: MappedType) {
    console.log('Add got called with: ', mappedType);
  }
}

interface ExistingButtonIface {
  actionFunc: (mappedType: MappedType) => void;
  mappedType: MappedType;
}

interface NewButtonIface {
  actionFunc: (mappedType: MappedType) => void;
}

const DeleteButton = (props: ExistingButtonIface) => {
  return <Mui.Button size="small" onClick={() => {props.actionFunc(props.mappedType)}}><Icons.Delete /></Mui.Button>
}

const AddMappedConnectionType = () => {
  return <Mui.TableRow>
    <Mui.TableCell>
      <Mui.Input id="input-mapProperty" 
        placeholder="Property" 
        size="small" />
    </Mui.TableCell>
    <Mui.TableCell>
      <Mui.Input id="input-mapConnectionType" 
        placeholder="Connection Type" 
        size="small" />
    </Mui.TableCell>
    <Mui.TableCell>
      <Mui.Switch />
    </Mui.TableCell>
    <Mui.TableCell align="center">
    <Mui.Button color="primary" ><Icons.Add /></Mui.Button>
    </Mui.TableCell>
  </Mui.TableRow>
};
