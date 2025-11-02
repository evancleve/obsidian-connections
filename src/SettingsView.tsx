import { ConnectionsSettings, MappedConnectionType, MappedConnectionDirection, UnmappedConnectionType } from './connection_types';
import { Component } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TextField from '@mui/material/TextField';
import Add from '@mui/icons-material/Add';
import Delete from '@mui/icons-material/Delete';


export interface SettingsIface {
  settings: ConnectionsSettings;
  deleteFunc: (connectionType: MappedConnectionType | UnmappedConnectionType) => void;
  addFunc: (connectionType: MappedConnectionType | UnmappedConnectionType) => Promise<boolean>;
}

export class SettingsView extends Component<SettingsIface> {
  constructor(props: SettingsIface) {
    super(props);
  }

  render() {
    return <>
      <Box component="section">
        <MappedConnectionsTable {...this.props} />
      </Box>
      <hr className="section-divider" />
      <Box component="section" className="unmapped-connections-table">
        <UnmappedConnectionsTable {...this.props} />
      </Box>
    </>
  }
}

type MappedConnectionTableState = {
  mappedTypes: Array<MappedConnectionType>
}

class MappedConnectionsTable extends Component<SettingsIface, MappedConnectionTableState> {
  deleteFunc: (mappedType: MappedConnectionType) => void;
  addFunc: (mappedType: MappedConnectionType) => Promise<boolean>;

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
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell><span className="connections-settings-table-header">Connection Type</span></TableCell>
            <TableCell><span className="connections-settings-table-header">Frontmatter Property</span></TableCell>
            <TableCell><span className="connections-settings-table-header">Direction</span></TableCell>
            <TableCell><span className="connections-settings-table-header">Controls</span></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          <AddMappedConnectionForm actionFunc={this.addMappedType.bind(this)} />
          {this.state.mappedTypes.map((mappedType: MappedConnectionType) => (
            <TableRow
              key={mappedType.mapProperty}
              sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
            >
              <TableCell component="th" scope="row" >
                <span className="connections-table-content">{mappedType.connectionType}</span>
              </TableCell>
              <TableCell><span className="connections-table-content">{mappedType.mapProperty}</span></TableCell>
              <TableCell align="left"><span className="connections-table-content">{mappedType.mapConnectionDirection}</span></TableCell>
              <TableCell align="right">
                <DeleteButton actionFunc={(arg: MappedConnectionType) => { this.deleteMappedType(arg) }} connectionType={mappedType} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  }

  deleteMappedType(mappedType: MappedConnectionType) {
    let idx = this.state.mappedTypes.indexOf(mappedType);
    if (idx != -1) {
      let newMappedTypes = this.state.mappedTypes.map((x) => x);
      newMappedTypes.splice(idx, 1);
      this.setState({ mappedTypes: newMappedTypes });
    }
    this.deleteFunc(mappedType);
  }

  async addMappedType(mappedType: MappedConnectionType): Promise<boolean> {
    let result = await this.addFunc(mappedType);
    if (result) {
      this.setState({})
    }
    return result;
  }
}

type MappedTypeFormState = MappedConnectionType & {
  mapPropertyError: string,
  connectionTypeError: string
}

class AddMappedConnectionForm extends Component<AddButtonInterface, MappedTypeFormState> {
  actionFunc: (mt: MappedConnectionType) => Promise<boolean>;

  constructor(props: AddButtonInterface) {
    super(props);
    this.actionFunc = props.actionFunc;
    this.state = {
      connectionType: '',
      mapProperty: '',
      mapConnectionDirection: MappedConnectionDirection.Left,
      mapPropertyError: '',
      connectionTypeError: ''
    };
  }

  handlePropertyChange(evt: React.ChangeEvent<HTMLInputElement>) {
    this.setState({ mapProperty: evt.target.value });
  }

  handleTypeChange(evt: React.ChangeEvent<HTMLInputElement>) {
    this.setState({ connectionType: evt.target.value });
  }

  handleDirectionChange(evt: React.ChangeEvent<HTMLInputElement>) {
    this.setState({ mapConnectionDirection: evt.target.value as MappedConnectionDirection });
  }

  async handleAddButtonClick() {
    //Clear errors that might have already been there.
    let foundError = false;
    this.setState({ mapPropertyError: '', connectionTypeError: '' });
    if (this.state.connectionType.length < 1) {
      this.setState({ connectionTypeError: 'Connection type can\'t be blank!' });
      foundError = true;
    }
    if (this.state.mapProperty.length < 1) {
      this.setState({ mapPropertyError: 'Property name can\'t be blank!' });
      foundError = true;
    }
    if (this.state.mapProperty.includes(':')) {
      this.setState({ mapPropertyError: 'Property name can\'t contain a colon!' });
      foundError = true;
    }

    //No easy validation errors found. Let's try to add it.
    if (!foundError) {
      let result = await this.actionFunc({ mapProperty: this.state.mapProperty, connectionType: this.state.connectionType, mapConnectionDirection: this.state.mapConnectionDirection });
      if (result) {
        this.setState({ mapProperty: '', connectionType: '', mapPropertyError: '', connectionTypeError: '' });
      } else {
        this.setState({ mapPropertyError: 'Unable to create duplicate mapping property!' });
      }
    }
  }

  render() {
    return <>
      <TableRow>
        <TableCell>
          <TextField id="input-mapConnectionType"
            placeholder="Connection Type"
            error={this.state.connectionTypeError.length > 0}
            helperText={this.state.connectionTypeError}
            size="small"
            value={this.state.connectionType}
            onChange={this.handleTypeChange.bind(this)} />
        </TableCell>
        <TableCell>
          <TextField id="input-mapProperty"
            error={this.state.mapPropertyError.length > 0}
            helperText={this.state.mapPropertyError}
            placeholder="Property"
            size="small"
            value={this.state.mapProperty}
            onChange={this.handlePropertyChange.bind(this)} />
        </TableCell>
        <TableCell>
          <Select
            id="input-mapDirection"
            size="small"
            autoWidth={true}
            value={this.state.mapConnectionDirection}
            onChange={this.handleDirectionChange.bind(this)}>
            <MenuItem value={MappedConnectionDirection.Left}>{MappedConnectionDirection.Left}</MenuItem>
            <MenuItem value={MappedConnectionDirection.Right}>{MappedConnectionDirection.Right}</MenuItem>
          </Select>
        </TableCell>
        <TableCell align="right">
          <AddButton actionFunc={() => { this.handleAddButtonClick() }} />
        </TableCell>
      </TableRow>
    </>
  }
}

type UnmappedConnectionTableState = {
  unmappedTypes: Array<UnmappedConnectionType>
}

class UnmappedConnectionsTable extends Component<SettingsIface, UnmappedConnectionTableState> {
  deleteFunc: (unmappedConnectionType: UnmappedConnectionType) => void;
  addFunc: (unmappedConnectionType: UnmappedConnectionType) => Promise<boolean>;

  constructor(props: SettingsIface) {
    super(props);
    this.deleteFunc = props.deleteFunc;
    this.addFunc = props.addFunc;
    this.state = { unmappedTypes: props.settings.unmappedTypes };
  }

  render() {

    return <>
      <h3>Unmapped Connection Types</h3>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell><span className="connections-settings-table-header">Connection Type</span></TableCell>
            <TableCell><span className="connections-settings-table-header">Controls</span></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          <AddUnmappedConnectionForm actionFunc={this.addUnmappedType.bind(this)} />
          {this.state.unmappedTypes.map((unmappedConnectionType: UnmappedConnectionType) => (
            <TableRow
              key={unmappedConnectionType.connectionType}
              sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
            >
              <TableCell component="th" scope="row" >
                <span style={{ marginLeft: '0.5em' }}>{unmappedConnectionType.connectionType}</span>
              </TableCell>
              <TableCell align="right">
                <DeleteButton actionFunc={(arg: UnmappedConnectionType) => { this.deleteUnmappedType(arg) }} connectionType={unmappedConnectionType} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  }

  deleteUnmappedType(unmappedConnectionType: UnmappedConnectionType) {
    let idx = this.state.unmappedTypes.indexOf(unmappedConnectionType);
    if (idx != -1) {
      let newUnmappedTypes = this.state.unmappedTypes.map((x) => x);
      newUnmappedTypes.splice(idx, 1);
      this.setState({ unmappedTypes: newUnmappedTypes });
    }
    this.deleteFunc(unmappedConnectionType);
  }

  async addUnmappedType(unmappedConnectionType: UnmappedConnectionType) {
    let result = await this.addFunc(unmappedConnectionType);
    if (result) {
      this.setState({})
    }
    return result;
  }
}

type UnmappedTypeFormState = UnmappedConnectionType & {
  unmappedTypeError: string
}

class AddUnmappedConnectionForm extends Component<AddButtonInterface, UnmappedTypeFormState> {
  actionFunc: (ut: UnmappedConnectionType) => Promise<boolean>;

  constructor(props: AddButtonInterface) {
    super(props);
    this.actionFunc = props.actionFunc;
    this.state = { connectionType: '', unmappedTypeError: '' }
  }

  handleTypeChange(evt: React.ChangeEvent<HTMLInputElement>) {
    this.setState({ connectionType: evt.target.value })
  }

  async handleAddButtonClick() {
    let foundError = false;
    this.setState({ unmappedTypeError: '' })
    if (this.state.connectionType.length < 1) {
      this.setState({ unmappedTypeError: 'Connection type can\'t be blank!' });
      foundError = true;
    }
    if (!foundError) {
      let result = await this.actionFunc({ connectionType: this.state.connectionType });
      if (result) {
        this.setState({ connectionType: '', unmappedTypeError: '' });
      } else {

        this.setState({ unmappedTypeError: 'Unable to create duplicate connection type' });
      }
    }
  }

  render() {
    return <>
      <TableRow>
        <TableCell>
          <TextField id="input-unmapConnectionType"
            error={this.state.unmappedTypeError.length > 0}
            helperText={this.state.unmappedTypeError}
            placeholder="Connection Type"
            size="small"
            value={this.state.connectionType}
            onChange={this.handleTypeChange.bind(this)} />
        </TableCell>
        <TableCell align="right">
          <AddButton actionFunc={() => { this.handleAddButtonClick() }} />
        </TableCell>
      </TableRow>
    </>
  }
}

interface AddButtonInterface {
  actionFunc: (connectionType: MappedConnectionType | UnmappedConnectionType) => Promise<boolean>;
}

const AddButton = (props: { actionFunc: () => void }) => {
  return <Button size="small" onClick={() => { props.actionFunc() }}><Add /></Button>
}

interface DeleteButtonIface {
  actionFunc: (connectionType: MappedConnectionType | UnmappedConnectionType) => void;
  connectionType: MappedConnectionType | UnmappedConnectionType;
}

const DeleteButton = (props: DeleteButtonIface) => {
  return <Button size="small" onClick={() => { props.actionFunc(props.connectionType) }}><Delete /></Button>
}