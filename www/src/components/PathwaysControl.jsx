import React from 'react';

import {NodeList} from "./NodeList.jsx";
import {NodeItem} from "./NodeItem.jsx";
import {SelectField, MenuItem} from "material-ui";

export class PathwaysControl extends React.Component {
  constructor(props){
    super(props);
    this.state = {
      nodeFilterText: ""
    }
    this.handlePathwayChange = this.handlePathwayChange.bind(this);
  }
  handlePathwayChange(pathwayID){
    if (this.props.pathwayMap.get("Active").id !== pathwayID) {
      this.props.setActivePathway(this.props.pathwayMap.get("Selected").get(pathwayID));
    }
  }

  // RENDERING
  render(){
    let pathwayMap = this.props.pathwayMap;
    const pathwayItems = [...pathwayMap.get("Selected").values()].map(pathway =>
      <MenuItem key={pathway.id} value={pathway.id}
                primaryText={`${pathway.name}`} label={`${pathway.name}`} />
    );
    // console.log(this.props);
    const noPad={paddingBottom:"0px", paddingTop:"0px"};
    return (
      <div id="PathwaysControl" className="section" style={noPad}>
        <div className="card-panel">
          <div className="center-align">
            <div className="chip grey lighten-5">Inspect a pathway and its node states</div>
            <SelectField  value={pathwayMap.get("Active").id}
                          onChange={(evt,idx,val)=>{this.handlePathwayChange(val)}}
                          autoWidth={true}
                          style={{width:"100%"}}
                          children={pathwayItems} />
            <div className="collection-item" style={noPad}>
              <input type="text" ref="nodeFilterInput" placeholder="Type to filter nodes"
                value={this.state.nodeFilterText} onChange={evt=>{this.setState({nodeFilterText:evt.target.value})}} />
            </div>
          </div>
          <NodeList activeType="Pathway"
                    pairwiseInteractions={this.props.pairwiseInteractions}
                    observationMap={this.props.observationMap}
                    setNodeItemState={this.props.setNodeItemState}
                    nodeFilterText={this.state.nodeFilterText}/>
        </div>
      </div>
    );
  }
}
