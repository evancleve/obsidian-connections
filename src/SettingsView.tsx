import { ConnectionsSettings, UnmappedType, MappedType, MappedConnectionDirection } from './main';
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

import { Component } from 'react';

export interface SettingsIface {
  settings: ConnectionsSettings;
  deleteFunc: (connectionType: MappedType | UnmappedType) => void;
  addFunc: (connectionType: MappedType | UnmappedType) => Promise<boolean>;
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
  mappedTypes: Array<MappedType>
}

class MappedConnectionsTable extends Component<SettingsIface, MappedConnectionTableState> {
  deleteFunc: (connectionType: MappedType) => void;
  addFunc: (mappedType: MappedType) => Promise<boolean>;

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
          {this.state.mappedTypes.map((mappedType: MappedType) => (
            <TableRow
              key={mappedType.mapProperty}
              sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
            >
              <TableCell component="th" scope="row" >
                <span className="connections-table-content">{mappedType.mapConnectionType}</span>
              </TableCell>
              <TableCell><span className="connections-table-content">{mappedType.mapProperty}</span></TableCell>
              <TableCell align="left"><span className="connections-table-content">{mappedType.mapConnectionDirection}</span></TableCell>
              <TableCell align="right">
                <DeleteButton actionFunc={(arg: MappedType) => { this.deleteMappedType(arg) }} connectionType={mappedType} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  }

  deleteMappedType(mappedType: MappedType) {
    let idx = this.state.mappedTypes.indexOf(mappedType);
    if (idx != -1) {
      this.setState({ mappedTypes: this.state.mappedTypes.toSpliced(idx, 1) });
    }
    this.deleteFunc(mappedType);
  }

  async addMappedType(mappedType: MappedType): Promise<boolean> {
    let result = await this.addFunc(mappedType);
    if (result) {
      this.setState({})
    }
    return result;
  }
}

type MappedTypeFormState = {
  mapConnectionType: string,
  mapProperty: string,
  mapConnectionDirection: MappedConnectionDirection,
  mapPropertyError: string,
  mapConnectionTypeError: string
}

class AddMappedConnectionForm extends Component<AddButtonInterface, MappedTypeFormState> {
  actionFunc: (mt: MappedType) => Promise<boolean>;

  constructor(props: AddButtonInterface) {
    super(props);
    this.actionFunc = props.actionFunc;
    this.state = {
      mapConnectionType: '',
      mapProperty: '',
      mapConnectionDirection: MappedConnectionDirection.Left,
      mapPropertyError: '',
      mapConnectionTypeError: ''
    };
  }

  handlePropertyChange(evt: React.ChangeEvent<HTMLInputElement>) {
    this.setState({ mapProperty: evt.target.value });
  }

  handleTypeChange(evt: React.ChangeEvent<HTMLInputElement>) {
    this.setState({ mapConnectionType: evt.target.value });
  }

  handleDirectionChange(evt: React.ChangeEvent<HTMLInputElement>) {
    this.setState({ mapConnectionDirection: evt.target.value as MappedConnectionDirection });
  }

  async handleAddButtonClick() {
    //Clear errors that might have already been there.
    let foundError = false;
    this.setState({ mapPropertyError: '', mapConnectionTypeError: '' });
    if (this.state.mapConnectionType.length < 1) {
      this.setState({ mapConnectionTypeError: 'Connection type can\'t be blank!' });
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
      let result = await this.actionFunc({ mapProperty: this.state.mapProperty, mapConnectionType: this.state.mapConnectionType, mapConnectionDirection: this.state.mapConnectionDirection });
      if (result) {
        this.setState({ mapProperty: '', mapConnectionType: '', mapPropertyError: '', mapConnectionTypeError: '' });
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
            error={this.state.mapConnectionTypeError.length > 0}
            helperText={this.state.mapConnectionTypeError}
            size="small"
            value={this.state.mapConnectionType}
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
  unmappedTypes: Array<UnmappedType>
}

class UnmappedConnectionsTable extends Component<SettingsIface, UnmappedConnectionTableState> {
  deleteFunc: (unmappedConnectionType: UnmappedType) => void;
  addFunc: (unmappedConnectionType: UnmappedType) => Promise<boolean>;

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
          {this.state.unmappedTypes.map((unmappedConnectionType: UnmappedType) => (
            <TableRow
              key={unmappedConnectionType}
              sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
            >
              <TableCell component="th" scope="row" >
                <span style={{ marginLeft: '0.5em' }}>{unmappedConnectionType}</span>
              </TableCell>
              <TableCell align="right">
                <DeleteButton actionFunc={(arg: UnmappedType) => { this.deleteUnmappedType(arg) }} connectionType={unmappedConnectionType} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  }

  deleteUnmappedType(unmappedConnectionType: UnmappedType) {
    let idx = this.state.unmappedTypes.indexOf(unmappedConnectionType);
    if (idx != -1) {
      this.setState({ unmappedTypes: this.state.unmappedTypes.toSpliced(idx, 1) });
    }
    this.deleteFunc(unmappedConnectionType);
  }

  async addUnmappedType(unmappedConnectionType: UnmappedType) {
    let result = await this.addFunc(unmappedConnectionType);
    if (result) {
      this.setState({})
    }
    return result;
  }
}

type UnmappedTypeFormState = {
  unmappedType: UnmappedType,
  unmappedTypeError: string
}

class AddUnmappedConnectionForm extends Component<AddButtonInterface, UnmappedTypeFormState> {
  actionFunc: (ut: UnmappedType) => Promise<boolean>;

  constructor(props: AddButtonInterface) {
    super(props);
    this.actionFunc = props.actionFunc;
    this.state = { unmappedType: '', unmappedTypeError: '' }
  }

  handleTypeChange(evt: React.ChangeEvent<HTMLInputElement>) {
    this.setState({ unmappedType: evt.target.value })
  }

  async handleAddButtonClick() {
    let foundError = false;
    this.setState({ unmappedTypeError: '' })
    if (this.state.unmappedType.length < 1) {
      this.setState({ unmappedTypeError: 'Connection type can\'t be blank!' });
      foundError = true;
    }
    if (!foundError) {
      let result = await this.actionFunc(this.state.unmappedType);
      if (result) {
        this.setState({ unmappedType: '', unmappedTypeError: '' });
      } else {

        this.setState({ unmappedTypeError: 'Unable to create duplicate connection type' });
      }
    }
  }

  render() {
    return <>
      <TableRow>
        <TableCell>
          <TextField id="input-mapConnectionType"
            error={this.state.unmappedTypeError.length > 0}
            helperText={this.state.unmappedTypeError}
            placeholder="Connection Type"
            size="small"
            value={this.state.unmappedType}
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
  actionFunc: (connectionType: MappedType | UnmappedType) => Promise<boolean>;
}

const AddButton = (props: { actionFunc: () => void }) => {
  return <Button size="small" onClick={() => { props.actionFunc() }}><Add /></Button>
}

interface DeleteButtonIface {
  actionFunc: (connectionType: MappedType | UnmappedType) => void;
  connectionType: MappedType | UnmappedType;
}

const DeleteButton = (props: DeleteButtonIface) => {
  return <Button size="small" onClick={() => { props.actionFunc(props.connectionType) }}><Delete /></Button>
}