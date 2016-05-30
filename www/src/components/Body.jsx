import React from 'react'

import getMuiTheme from "material-ui/styles/getMuiTheme";
import MuiThemeProvider from "material-ui/styles/MuiThemeProvider";

import {ControlPanel} from './ControlPanel.jsx';
import {DisplayPanel} from './DisplayPanel.jsx';

var graphvis = require('../bin/graphvis.js');
var classNames = require("classnames");

export class Body extends React.Component {
    constructor(props){
      super(props)
      this.state = {"toggle": "Inference"}
      this.toggleRunType = this.toggleRunType.bind(this);
    }
    componentDidMount(){
      // Init example on first mount
      this.props.setActivePathway(this.props.activePathway);
    }
    toggleRunType(){
      this.setState({ "toggle": (this.state.toggle === "Inference")? "Learning": "Inference"})
    }
    render(){
      // console.log("body", this.props)
      return (
        <MuiThemeProvider muiTheme={getMuiTheme()}>
        <main className="row">
          <div className="col s4" style={{minWidth:"300px"}}>
            <ControlPanel pathways                        = {this.props.pathways}
                          pairwiseInteractions            = {this.props.pairwiseInteractions}
                          observationSets                 = {this.props.observationSets}

                          uploadList                      = {this.props.uploadList}
                          uploadListAddFailure            = {this.props.uploadListAddFailure}

                          observeNode                     = {this.props.observeNode}
                          removeObservedNode              = {this.props.removeObservedNode}
                          setNodeState                    = {this.props.setNodeState}

                          toggleRunType                   = {this.toggleRunType}
                          toggle                          = {this.state.toggle}
                          runInference                    = {this.props.runInference}

                          selectPathways = {this.props.selectPathways}
                          removeSelectedPathways = {this.props.removeSelectedPathways}
                          selectedPathways = {this.props.selectedPathways}
                          activePathway                   = {this.props.activePathway}
                          setActivePathway                = {this.props.setActivePathway}

                          selectObservationSet = {this.props.selectObservationSet}
                          selectedObservationSet = {this.props.selectedObservationSet}

                          selectObservations = {this.props.selectObservations}
                          removeSelectedObservations = {this.props.removeSelectedObservations}
                          selectedObservations = {this.props.selectedObservations}
                          setActiveObservation = {this.props.setActiveObservation}

                          addNewPathway                   = {this.props.addNewPathway}
                          addNewObservationSet            = {this.props.addNewObservationSet}
                          addNewEstimatedParameterSet     = {this.props.addNewEstimatedParameterSet}
                          addNewPosteriorProbabilitySet   = {this.props.addNewPosteriorProbabilitySet}

                          setNodeItemState = {this.props.setNodeItemState} />
          </div>
          <div className="col s8" style={{minWidth:"800px"}}>
            <DisplayPanel toggle = {this.state.toggle}
                          selectedObservationSet = {this.props.selectedObservationSet}
                          selectedObservations = {this.props.selectedObservations}
                          selectedPathways = {this.props.selectedPathways} />
          </div>
        </main>
        </MuiThemeProvider>
      )
    }
}