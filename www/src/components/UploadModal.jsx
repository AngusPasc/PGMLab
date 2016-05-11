import React from 'react'

var Dropzone = require('react-dropzone')

export class UploadModal extends React.Component {
    constructor(props) {
        super(props)
        this.isInteger = this.isInteger.bind(this)
        this.handleSubmit = this.handleSubmit.bind(this)
    }
    isInteger(str) {
        return /^([1-9]\d*)$/.test(str)
    }
    handleSubmit(e) {
      console.log("handleSubmit");
        e.preventDefault()
    }
    readPathwayFile(e) {
        console.log("readPathwayFile");
        var reader = new FileReader()
        console.log("reader");
        var file = e.target.files[0]
        console.log("read pathway file");
        console.log(file);
        console.log(e.target);
        var self = this
        reader.onload = function(upload) {
            var contents = upload.target.result
            var lines = contents.split("\n")||[]
            lines.pop() // There is one additional empty element on the end because of newlines on the end of the last line
            var numberOfLines = lines.length

            if (numberOfLines < 2) {
                self.props.uploadListAddFailure(file.name, "Pathway", "File does not follow the correct format")
                return
            }

            if (numberOfLines > (100 + 2) ) {
                self.props.uploadListAddFailure(file.name, "Pathway", "Max number of interactions allowed is 100. Larger pathways can be done on command line")
                return
            }

            var numberOfInteractions = lines.length - 2
            if (!self.isInteger(lines[0])) {
                self.props.uploadListAddFailure(file.name, "Pathway", "First line needs to be an integer representing the number of interactions")
                return
            }
            else if (Number(lines[0]) !== numberOfInteractions ) {
                self.props.uploadListAddFailure(file.name, "Pathway", "Number of interactions does not match number at top of file")
                return
            }
            else if (lines[1] !== "") {
                console.log("second line", lines[1])
                self.props.uploadListAddFailure(file.name, "Pathway", "Second line needs to be empty")
                return
            }

            var nodes = {},
                nodesList = [],
                links = [],
                nodeCount = 0
            for (let i=2; i < numberOfLines; i++) {
                var lineParts = lines[i].split("\t")
                if (lineParts.length < 2) {
                     self.props.uploadListAddFailure(file.name, "Pathway",
                           "All lines must have format <nodeFrom>\\t<NodeToo> ; will use first two columns. Trouble line: ".concat(lines[i]))
                     return
                }
                var source = lineParts[0].trim()
                if (!nodes.hasOwnProperty(source)) {
                    nodes[source] = ++nodeCount
                    nodesList.push({"name":     source,
                                    "label":    source,
                                    "longname": source,
                                    "name":     source,
                                    "leaf":     null,
                                    "shape":    null,
                                    "shape3":   null,
                                    "type":     null })
                }

                var target = lineParts[0].trim()
                if(!nodes.hasOwnProperty(target)) {
                    nodes[target] = ++nodeCount
                    nodesList.push({"name":     target,
                                    "label":    target,
                                    "longname": target,
                                    "name":     target,
                                    "leaf":     null,
                                    "shape":    null,
                                    "shape3":   null,
                                    "type":     null })
               }

               links.push({ "source": source,
                            "target": target,
                            "logic":  0,
                            "value":  1})
            }

            var pairwiseInteractions = { "nodes": nodesList,
                                         "links": links}
            self.props.addNewPathway(file.name, pairwiseInteractions)
        }

        reader.readAsText(file);
        this.uploadNotification();
    }
    readObservationFile(e) {
        var reader = new FileReader()
        var file = e.target.files[0]

        var self = this
        reader.onload = function(upload) {
            var contents = upload.target.result
            var lines = contents.split("\n")||[]
            lines.pop() // There is one additional empty element on the end because of newlines on the end of the last line
            var numberOfLines = lines.length

            if (numberOfLines < 2) {
                self.props.uploadListAddFailure(file.name, "observations", "File does not follow correct formatting - empty")
                return
            }

            var observations = [];
            var numberOfObservations = lines[0]
            if (!self.isInteger(numberOfObservations)) {
                self.props.uploadListAddFailure(file.name, "observations", "First line needs to be the number of observations")
                return
            }

            var lineIndex = 0
            for (let observationIndex = 1; observationIndex <= numberOfObservations; observationIndex++) {
                lineIndex++
                var numberOfNodes      = lines[lineIndex]
                var numberOfNodesIndex = lineIndex
                var nodes              = []
                for(let nodeIndex = 1; nodeIndex <= numberOfNodes; nodeIndex++) {
                    lineIndex++
                    var lineParts = lines[lineIndex].split("\t")
                    var name = lineParts[0].trim()
                    var state = lineParts[1].trim()
                    var node = {"name":  name,
                                "state": state }
                    nodes.push(node)
                }
                observations.push(nodes)
            }
            self.props.addNewObservationSet(file.name, observations)
        }

        reader.readAsText(file)
    }
    readEstimatedParametersFile(e) {
        var reader = new FileReader()
        var file = e.target.files[0]

        var self = this
        reader.onload = function(upload) {
            var contents = upload.target.result
            var lines = contents.split("\n")||[]
            lines.pop() // There is one additional empty element on the end because of newlines on the end of the last line
            var numberOfLines = lines.length

            if (numberOfLines < 2) {
                self.props.uploadListAddFailure(file.name, "Estimated Parameters", "File does not follow the correct format")
                return
            }

            var cpts = [];
            var numberOfCpts = lines[0]
            if(!self.isInteger(numberOfCpts)) {
                self.props.uploadListAddFailure(file.name, "Estimated Parameters", "First line needs to be the number of nodes")
                return
            }

            var lineIndex = 1
            for (let i = 1; i <= numberOfCpts; i++) {
                lineIndex++
                var numberOfNodes = lines[lineIndex++]
                var nodeNames     = lines[lineIndex++].trim().split(" ")
                var statesOfNodes = lines[lineIndex++].trim().split(" ")
                var numberOfProbs = lines[lineIndex]
                var statesOfNodesIndex = lineIndex
                var probabilities = []
                for(let probIndex = 0; probIndex <= numberOfProbs; probIndex++) {
                    lineIndex++
                    var lineParts = lines[lineIndex].split(" ")
                    probabilities.push(lineParts[1])
                }
                var cpt = {"target":        nodeNames[0],
                           "parents":       nodeNames.slice(1),
                           "probablilites": probabilities }
                cpts.push(cpt)
            }
            self.props.addNewEstimatedParameterSet(file.name, cpts)
        }

        reader.readAsText(file)
    }
    readPosteriorProbabilityFile(e) {
        var reader = new FileReader()
        var file = e.target.files[0]

        var self = this
        reader.onload = function(upload) {
            var contents = upload.target.result
            var lines = contents.split("\n")||[]
            lines.pop() // There is one additional empty element on the end because of newlines on the end of the last line
            var numberOfLines = lines.length

            if (numberOfLines < 2) {
                self.props.uploadListAddFailure(file.name, "Posterior Probabilities", "File does not follow the correct format")
                return
            }

            var probabilities = []
            var probabilitySet = []
            var nodes = []
            var currentNode = -1
            for (let i = 0; i < lines.length; i++) {
                var line = lines[i]
                if (/^---/.test(line)) {
                    probabilitySet.push(nodes)
                    nodes = []
                    currentNode = -1
                }
                else {
                    var lineParts = line.split("\t")
                    var node = lineParts[0]
                    var probability = lineParts[1]
                    if (node !== currentNode) {
                        if (currentNode !== -1) {
                             probabilitySet.push({"node": node, "probability": probabilities})
                        }
                        probabilities = [probability]
                    }
                    else {
                        probabilities.push(probability)
                    }
                }
            }
            self.props.addNewPosteriorProbabilitySet(file.name, probabilitySet)
        }
        reader.readAsText(file)
    }
    uploadBtn(label,click,tooltip){
      return (
        <form encType="multipart/form-data" className="col s3">
          <div className="file-field input-field btn tooltipped" data-position="top" data-delay="50" data-tooltip={tooltip} style={{"width":"100%"}}>
              <span>{label}</span>
              <input type="file" onChange={click}/>
          </div>
        </form>
      );
    }
    uploadTable(uploads){
      return (
        uploads.reverse().map(
          (row,i)=>{
            let id=i+1;
            return (
              <tr key={i}>
                <td>{row.id}</td>
                <td>{row.datetime}</td>
                <td>{row.filetype}</td>
                <td><i className="small material-icons" >{(row.success)?"done":"not_interested"}</i></td>
                <td>{row.name}</td>
                <td>{row.comment}</td>
              </tr>
            );
          }
        )
      );
    }
    uploadNotification(){
      Materialize.toast("asd", 1000);
    }
    render() {
        let uploadList=this.uploadTable(this.props.uploadList);
        return (
                <div id="uploadModal1" className="modal">
                  <div className="modal-content">
                    <div className="section">
                      <h4>Upload Files</h4>
                      <div className="row">
                        {this.uploadBtn("Pathway",this.readPathwayFile.bind(this),"Upload a pairwise interaction file")}
                        {this.uploadBtn("Observation",this.readObservationFile.bind(this),"Upload an observation file")}
                        {this.uploadBtn("Estimated",this.readEstimatedParametersFile.bind(this),"Upload a pre-generated estimated parameters file")}
                        {this.uploadBtn("Posterior",this.readPosteriorProbabilityFile.bind(this),"Upload a pre-generated posterior probability file")}
                      </div>
                    </div>
                    <div className="section">
                      <h4>Uploaded Files</h4>
                      <table>
                        <thead>
                          <tr>
                            <th data-field="id">ID</th>
                            <th data-field="time">Datetime</th>
                            <th data-field="type">Type</th>
                            <th data-field="status">Status</th>
                            <th data-field="name">Name</th>
                            <th data-field="comment">Comments</th>
                          </tr>
                        </thead>
                        <tbody>{uploadList}</tbody>
                      </table>
                    </div>
                  </div>
                  <div className="modal-footer">
                      <a href="#!" className=" modal-action modal-close waves-effect waves-green btn-flat">Close</a>
                  </div>
                </div>
        );
    }
}
