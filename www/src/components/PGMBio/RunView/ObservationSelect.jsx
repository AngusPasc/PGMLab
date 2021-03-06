import React from "react"

import Dialog from "material-ui/Dialog"
import FlatButton from "material-ui/FlatButton"
import {Table, TableBody, TableHeader, TableHeaderColumn, TableRow, TableRowColumn} from 'material-ui/Table'
import Checkbox from "material-ui/Checkbox"
import {List, ListItem} from "material-ui/List"
import Subheader from "material-ui/Subheader"
import Paper from "material-ui/Paper"

class ObservationSetTable extends React.Component {
  constructor(props){
    super(props)
    this.onRowSelection = this.onRowSelection.bind(this)
  }
  onRowSelection(selected){
    if (selected.length!=0) {
      const observationSet = this.props.observations.toList().get(selected[0])
      this.props.selectObservationSet(observationSet)
    }
  }
  render(){
    return (
      <Table multiSelectable={false} height={"330px"}
          onRowSelection={selected => this.onRowSelection(selected)}>
        <TableHeader displaySelectAll={false} adjustForCheckbox={false}>
          <TableRow>
            <TableHeaderColumn>
              <h6 className="center-align black-text">{"Observation Sets"}</h6>
            </TableHeaderColumn>
          </TableRow>
        </TableHeader>
        <TableBody deselectOnClickaway={false}>
          {
            this.props.observations
              .valueSeq()
              .map(obsSet =>
                <TableRow
                    key={obsSet.get("_id")}
                    selected={obsSet.get("_id") == this.props.dataspace.getIn(["observationSet","_id"])}>
                  <TableRowColumn>
                    {obsSet.get("filename")}
                  </TableRowColumn>
                </TableRow>
              )
          }
        </TableBody>
      </Table>
    )
  }
}

class ObservationRow extends React.Component {
  render(){
    return (
      <ListItem primaryText={`Observation ${this.props.obsIndex+1}`}
          leftCheckbox={
            <Checkbox
                checked={this.props.checked}
                onCheck={(evt,checked)=>this.props.onRowSelection(this.props.obsIndex,checked)}
            />
          }
      />
    )
  }
}

class ObservationTable extends React.Component {
  constructor(props){
    super(props)
    this.onRowSelection = this.onRowSelection.bind(this)
  }
  onRowSelection(obsIndex, checked){
    this.props.selectObservation(obsIndex, checked)
  }
  render(){
    return (
      <List>
        {
          this.props.dataspace.getIn(["observationSet", "data"])
            .keySeq()
            .map(obsIndex =>
              <ObservationRow key={obsIndex} obsIndex={obsIndex}
                  onRowSelection={this.onRowSelection}
                  checked={this.props.dataspace.getIn(["observationSet","selected",obsIndex])}/>
            )
        }
      </List>
    )
  }
}

export default class ObservationSelect extends React.Component {
  constructor(props){
    super(props)
    this.openModal = () => {this.props.toggleDataspaceModal(true, "OBS_SET")}
    this.closeModal = () => {this.props.toggleDataspaceModal(false, "OBS_SET")}
  }
  render(){
    const openBtn = (
      <a href="#" onClick={evt => this.openModal()}>{"Add Observations to dataspace"}</a>
    )
    const closeBtn = (
      <FlatButton label="Close" onTouchTap={evt => this.closeModal()}/>
    )
    return (
      <div>
        {openBtn}
        <Dialog
            title={"Select an observation set and data to include"} titleClassName={"center-align"}
            modal={true} open={this.props.observationSetModal.get("open")}
            actions={[closeBtn]}
        >
          <div className="row">
            <div  className="col s5">
            <Paper zDepth={0}>
              <ObservationSetTable
                  dataspace={this.props.dataspace}
                  selectObservationSet={this.props.selectObservationSet}
                  observations={this.props.observations}/>
            </Paper>
            </div>
            <div className="col s7" style={{maxHeight:"400px", overflowY:"scroll"}}>
              <ObservationTable
                  dataspace={this.props.dataspace}
                  selectObservation={this.props.selectObservation}/>
            </div>
          </div>
        </Dialog>
      </div>
    )
  }
}
