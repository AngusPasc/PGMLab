// GraphPanel: right side of window displaying graph
import React from 'react';

var graphvis = require("../bin/graphvis.js");

export class GraphPanel extends React.Component {
  constructor(props){
    super(props);
  }
  render(){
    return (
      <div className="card-panel" style={{margin:"0px"}}>
        <div id="canvas"></div>
      </div>
    )
  }

};
