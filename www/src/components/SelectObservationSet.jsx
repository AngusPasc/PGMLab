import React from 'react'

export class SelectObservationSet extends React.Component {
  constructor (props) {
    super(props);

    this.state = {
      setFilterText: "",
      obsFilterText: ""
    };

    this.setFilterUpdate = this.setFilterUpdate.bind(this);
    this.obsFilterUpdate = this.obsFilterUpdate.bind(this);
    this.handleSetSelect = this.handleSetSelect.bind(this);
    this.handleObsSelect = this.handleObsSelect.bind(this);
    this.handleObsCheckAll = this.handleObsCheckAll.bind(this);
    this.handleObsUncheckAll = this.handleObsUncheckAll.bind(this);
    
    this.observationSetList = this.observationSetList.bind(this);
    this.observationsList = this.observationsList.bind(this);
  }
  componentDidMount(){
    $(".tooltipped").tooltip({delay: 25});
  }

  setFilterUpdate(){
    this.setState({setFilterText: this.refs["setFilterInput"].value});
  }
  obsFilterUpdate(){
    this.setState({obsFilterText: this.refs["obsFilterInput"].value});
  }
  handleSetSelect(observationSetID){
    this.props.selectObservationSet(observationSetID);
  }
  handleObsSelect(observationIndex){
    const currentlySelected = this.props.selectedObservations.get("Indices");
    switch (currentlySelected.includes(observationIndex)) {
      case true:
        this.props.removeSelectedObservations([observationIndex]);
        break;
      case false:
        this.props.selectObservations([observationIndex]);
        break;
    };
  }
  handleObsCheckAll(){
    const toSelect = this.props.selectedObservationSet.observations.map((obs,i)=>{return i});
    this.props.selectObservations(toSelect);
  }
  handleObsUncheckAll(){
    const selected = this.props.selectedObservations.get("Indices");
    this.props.removeSelectedObservations(selected);
  }

  // RENDERING //
  observationSetList(){
    let self = this;
    const textInput = isNaN(self.state.setFilterText) ? self.state.setFilterText.toLowerCase() : self.state.setFilterText;
    const currentSelectedSetID = self.props.selectedObservationSet.id;
    let observationSets = [... self.props.observationSets.values()].map((observationSet)=>{
      const textFilter = observationSet.name.toLowerCase().indexOf(textInput) && (observationSet.id.indexOf(textInput) == -1);
      const selected = currentSelectedSetID === observationSet.id;
      return (
        (textFilter) ? undefined :
        <li key={observationSet.id} className="collection-item black-text"
          onClick={()=>{this.handleSetSelect(observationSet.id)}}>
          <input ref={observationSet.id} id={observationSet.id} type="radio" checked={selected} readOnly={true}/>
          <label htmlFor={observationSet.id} className="black-text">{observationSet.name}</label>
        </li>
      );
    });
    return (
      <div>
        <h5>Observation Sets</h5>
        <div className="divider"></div>
        <form>
          <input type="text" ref="setFilterInput" placeholder="Type to filter"
            value={this.state.setFilterText} onChange={this.setFilterUpdate}/>
          <ul className="collection teal lighten-2 left-align">
            {observationSets}
          </ul>
        </form>
      </div>
    );
  }
  observationsList(){
    let self = this;
    const selectedObservationSet = this.props.selectedObservationSet;
    const textInput = isNaN(self.state.obsFilterText) ? self.state.obsFilterText.toLowerCase() : self.state.obsFilterText;
    const selectedObservations = this.props.selectedObservations.get("Indices");
    let observations = selectedObservationSet.observations.map((observation,index)=>{
      // observations dont have names yet, are labelled by index
      const textFilter = index.toString().indexOf(textInput) == -1;
      const selected = selectedObservations.includes(index);
      return (
        (textFilter) ? undefined :
          <li key={index} className="collection-item black-text"
            onClick={(evt)=>{evt.preventDefault();this.handleObsSelect(index)}}>
            <input ref={index} id={index} type="checkbox" className="filled-in" checked={selected} readOnly={true}/>
            <label htmlFor={index} className="black-text">{index}</label>
          </li>
      );
    });
    const observationCount = selectedObservationSet.observations.length.toString().concat(" Observations");
    const selectedCount = selectedObservations.length.toString().concat(" Selected");
    return (
      <div>
        <h5>{selectedObservationSet.name}</h5>
        <div className="divider"></div>
        {
          (selectedObservationSet.observations.length===0) ? <h5>No Observations!</h5> :
          <form>
            <input type="text" ref="obsFilterInput" placeholder="Type to filter"
              value={this.state.obsFilterText} onChange={this.obsFilterUpdate}/>
            <div className="row valign-wrapper">
              <div className="col s8">{observationCount}<br/>{selectedCount}</div>
              <div className="col s2">
                <a className="btn-floating waves-effect right" onClick={this.handleObsCheckAll}>
                  <i className="material-icons">check_box</i>
                </a>
              </div>
              <div className="col s2">
                <a className="btn-floating waves-effect right" onClick={this.handleObsUncheckAll}>
                  <i className="material-icons">check_box_outline_blank</i>
                </a>
              </div>
            </div>

            <ul className="collection teal lighten-2 left-align">
              {observations}
            </ul>
          </form>
        }
      </div>
    );
  }
  render(){
    const scrollable={maxHeight:"100%", height:"100%", overflow:"scroll"};
    return (
      <div>
        <div id="selectObservationSetModal" className="modal modal-fixed-footer">
          <div className="modal-content" style={{overflow:"visible"}}>
            <div className="row" style={{height:"100%"}}>
              <div className="col s6" style={scrollable}>
                {this.observationSetList()}
              </div>
              <div className="col s6" style={scrollable}>
                {this.observationsList()}
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <a href="#!" className="modal-action modal-close btn-flat">Close</a>
          </div>
        </div>
        <a  className="btn modal-trigger tooltipped" href="#selectObservationSetModal"
            data-position="top" data-tooltip="Select observation data to work with">
            Observations
        </a>
      </div>
    );
  }
}