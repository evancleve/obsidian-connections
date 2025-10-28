import { ConnectionsSettings, UnmappedType, MappedType } from './main';
import * as Mui from '@mui/material';
import * as Icons from '@mui/icons-material';
import { Component } from 'react';

export interface SettingsIface {
  settings: ConnectionsSettings;
  deleteFunc: (connectionType: MappedType | UnmappedType) => void;
  addFunc: (connectionType: MappedType | UnmappedType) => void;
}

export class SettingsView extends Component<SettingsIface> {
  constructor(props: SettingsIface) {
    super(props);
  }

  render() {
    return <>
      <Mui.Box component="section">
        <MappedConnectionsTable {...this.props} />
      </Mui.Box>
      <hr className="section-divider" />
      <Mui.Box component="section" className="unmapped-connections-table">
        <UnmappedConnectionsTable {...this.props} />
      </Mui.Box>
    </>
  }
}

type MappedConnectionTableState = {
  mappedTypes: Array<MappedType>
}

class MappedConnectionsTable extends Component<SettingsIface, MappedConnectionTableState> {
  deleteFunc: (connectionType: MappedType) => void;
  addFunc: (mappedType: MappedType) => void;

  constructor(props: SettingsIface) {
    super(props);
    this.deleteFunc = props.deleteFunc;
    this.addFunc = props.addFunc;
    this.state = {
      mappedTypes: props.settings.mappedTypes
    };
  }

  render() {

    return <>
      <h3>Mapped Connection Types</h3>
      <Mui.Table size="small">
        <Mui.TableHead>
          <Mui.TableRow>
            <Mui.TableCell>Connection Type</Mui.TableCell>
            <Mui.TableCell>Property</Mui.TableCell>
            <Mui.TableCell>Direction</Mui.TableCell>
            <Mui.TableCell>Controls</Mui.TableCell>
          </Mui.TableRow>
        </Mui.TableHead>
        <Mui.TableBody>
          <AddMappedConnectionForm actionFunc={this.addMappedType.bind(this)} />
          {this.state.mappedTypes.map((mappedType: MappedType) => (
            <Mui.TableRow
              key={mappedType.mapProperty}
              sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
            >
              <Mui.TableCell component="th" scope="row" >
                <span className="connections-table-content">{mappedType.mapConnectionType}</span>
              </Mui.TableCell>
              <Mui.TableCell><span className="connections-table-content">{mappedType.mapProperty}</span></Mui.TableCell>
              <Mui.TableCell align="center">{'true'}</Mui.TableCell>
              <Mui.TableCell align="right">
                <DeleteButton actionFunc={(arg: MappedType) => { this.deleteMappedType(arg) }} connectionType={mappedType} />
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
      this.setState({ mappedTypes: this.state.mappedTypes.toSpliced(idx, 1) });
    }
    this.deleteFunc(mappedType);
  }

  addMappedType(mappedType: MappedType) {
    this.setState({ mappedTypes: this.state.mappedTypes.concat(mappedType) })
    this.addFunc(mappedType);
  }
}

class AddMappedConnectionForm extends Component<AddButtonInterface, MappedType> {
  actionFunc: (mt: MappedType) => void;

  constructor(props: AddButtonInterface) {
    super(props);
    this.actionFunc = props.actionFunc;
    this.state = { mapConnectionType: '', mapProperty: '' };
  }

  handlePropertyChange(evt: React.ChangeEvent<HTMLInputElement>) {
    this.setState({ mapProperty: evt.target.value })
  }

  handleTypeChange(evt: React.ChangeEvent<HTMLInputElement>) {
    this.setState({ mapConnectionType: evt.target.value })
  }

  handleAddButtonClick() {
    // TODO: add validation and clearing of inputs after add
    this.actionFunc({ mapProperty: this.state.mapProperty, mapConnectionType: this.state.mapConnectionType });
  }

  render() {
    return <>
      <Mui.TableRow>
        <Mui.TableCell>
          <Mui.Input id="input-mapConnectionType"
            placeholder="Connection Type"
            size="small"
            onChange={this.handleTypeChange.bind(this)} />
        </Mui.TableCell>
        <Mui.TableCell>
          <Mui.Input id="input-mapProperty"
            placeholder="Property"
            size="small"
            onChange={this.handlePropertyChange.bind(this)} />
        </Mui.TableCell>
        <Mui.TableCell>
          <Mui.Switch />
        </Mui.TableCell>
        <Mui.TableCell align="right">
          <AddButton actionFunc={() => { this.handleAddButtonClick() }} />
        </Mui.TableCell>
      </Mui.TableRow>
    </>
  }
}

type UnmappedConnectionTableState = {
  unmappedTypes: Array<UnmappedType>
}

class UnmappedConnectionsTable extends Component<SettingsIface, UnmappedConnectionTableState> {
  deleteFunc: (unmappedConnectionType: UnmappedType) => void;
  addFunc: (unmappedConnectionType: UnmappedType) => void;

  constructor(props: SettingsIface) {
    super(props);
    this.deleteFunc = props.deleteFunc;
    this.addFunc = props.addFunc;
    this.state = { unmappedTypes: props.settings.unmappedTypes };
  }

  render() {

    return <>
      <h3>Unmapped Connection Types</h3>
      <Mui.Table size="small">
        <Mui.TableHead>
          <Mui.TableRow>
            <Mui.TableCell>Connection Type</Mui.TableCell>
            <Mui.TableCell>Controls</Mui.TableCell>
          </Mui.TableRow>
        </Mui.TableHead>
        <Mui.TableBody>
          <AddUnmappedConnectionForm actionFunc={this.addUnmappedType.bind(this)} />
          {this.state.unmappedTypes.map((unmappedConnectionType: UnmappedType) => (
            <Mui.TableRow
              key={unmappedConnectionType}
              sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
            >
              <Mui.TableCell component="th" scope="row" >
                <span style={{ marginLeft: '0.5em' }}>{unmappedConnectionType}</span>
              </Mui.TableCell>
              <Mui.TableCell align="right">
                <DeleteButton actionFunc={(arg: UnmappedType) => { this.deleteUnmappedType(arg) }} connectionType={unmappedConnectionType} />
              </Mui.TableCell>
            </Mui.TableRow>
          ))}
        </Mui.TableBody>
      </Mui.Table>
    </>
  }

  deleteUnmappedType(unmappedConnectionType: UnmappedType) {
    console.log('1 ', this.state);
    let idx = this.state.unmappedTypes.indexOf(unmappedConnectionType);
    if (idx != -1) {
      this.setState({ unmappedTypes: this.state.unmappedTypes.toSpliced(idx, 1) });
    }
    console.log('2 ', this.state);
    this.deleteFunc(unmappedConnectionType);
    console.log('3 ', this.state);
  }

  addUnmappedType(unmappedConnectionType: UnmappedType) {
    this.setState({ unmappedTypes: this.state.unmappedTypes.concat(unmappedConnectionType) })
    this.addFunc(unmappedConnectionType);
  }
}

type UnmappedTypeState = {
  unmappedType: UnmappedType
}

class AddUnmappedConnectionForm extends Component<AddButtonInterface, UnmappedTypeState> {
  actionFunc: (ut: UnmappedType) => void;

  constructor(props: AddButtonInterface) {
    super(props);
    this.actionFunc = props.actionFunc;
    this.state = { unmappedType: '' }
  }

  handleTypeChange(evt: React.ChangeEvent<HTMLInputElement>) {
    this.setState({ unmappedType: evt.target.value })
  }

  handleAddButtonClick() {
    // TODO: add validation and clearing of inputs after add
    this.actionFunc(this.state.unmappedType);
  }

  render() {
    return <>
      <Mui.TableRow>
        <Mui.TableCell>
          <Mui.Input id="input-mapConnectionType"
            placeholder="Connection Type"
            size="small"
            onChange={this.handleTypeChange.bind(this)} />
        </Mui.TableCell>
        <Mui.TableCell align="right">
          <AddButton actionFunc={() => { this.handleAddButtonClick() }} />
        </Mui.TableCell>
      </Mui.TableRow>
    </>
  }
}

interface AddButtonInterface {
  actionFunc: (connectionType: MappedType | UnmappedType) => void;
}

const AddButton = (props: { actionFunc: () => void }) => {
  return <Mui.Button size="small" onClick={() => { props.actionFunc() }}><Icons.Add /></Mui.Button>
}

interface DeleteButtonIface {
  actionFunc: (connectionType: MappedType | UnmappedType) => void;
  connectionType: MappedType | UnmappedType;
}

const DeleteButton = (props: DeleteButtonIface) => {
  return <Mui.Button size="small" onClick={() => { props.actionFunc(props.connectionType) }}><Icons.Delete /></Mui.Button>
}