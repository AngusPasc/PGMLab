import vis from "vis"; //Stylesheet refered to in pgmbio.html

// Globals
var network, datasetnodes, datasetedges;

const config = {
  // For vis.network
  networkOptions: {
    height: "575px",
    width: "100%",
    clickToUse: true,
    interaction: {
      hideEdgesOnDrag: true,
      keyboard: false,
      multiselect: true,
      navigationButtons: true,
      tooltipDelay: 50
    },
    layout: {
      improvedLayout: true,
      hierarchical: {
        enabled:true,
        levelSeparation: 175,
        nodeSpacing: 125,
        treeSpacing: 225,
        blockShifting: true,
        edgeMinimization: true,
        direction: "UD",
        sortMethod: "directed"
      }
    },
    nodes: {
      borderWidth: 3
    },
    physics: {
      enabled: true,
      maxVelocity: 50,
      minVelocity: 1,
      stabilization: {
        enabled: true,
        iterations: 5000,
        fit: true
      },
      timestep: 1,
      adaptiveTimestep: true
    }
  },
  labelLengthLimit: 15,
  stateColors: { //Materialize colors
    '-': "#2B7CE9", //default
    '1': "#D50000", //red accent-4
    '2': "#424242", //grey darken-3
    '3': "#43A047" //green darken-1
  }
}


// Converts pairwiseInteractions to nodes and edges for graphvis
//  Styles nodes according to if they are observed or not
const getNodesEdges = (pairwiseInteractions, observedStates=new Map())=>{
  const edges = pairwiseInteractions.links.map(link=>{
    return {
      from: link.source,
      to: link.target,
      arrows: "to"
    };
  });
  const nodes = pairwiseInteractions.nodes.map(node=>{
    // Set node styling and properties
    const id = node.name;
    const label = (node.longname !== null ? (node.longname.length<config.labelLengthLimit):false) ? node.longname:node.name;
    const border = observedStates.has(id) ? config.stateColors[observedStates.get(id)]:"#2B7CE9";
    const color = {
      border,
      background: "#D2E5FF",
      highlight: {border: "#2B7CE9", background: "#D2E5FF"},
      hover: {border: "#2B7CE9", background: "#D2E5FF"}
    };
    return {
      id, label,
      color,
      title: `
        ID: ${id}<br>
        Name: ${label}<br>
        Reactome Class: ${node.type!==null ? node.type:"unknown"}`,
      shape: "dot"
    };
  });
  return [nodes, edges];
};

// // For setting new activePathway
// const render = (pairwiseInteractions, observedStates) => {
//   // console.log("graphvis.render");
//   const [nodes, edges] = getNodesEdges(pairwiseInteractions, observedStates);
//   datasetnodes = new vis.DataSet(nodes);
//   datasetedges = new vis.DataSet(edges);
//   network.setData({nodes: datasetnodes, edges: datasetedges});
// };
// exports.render = render;

// // Initialize graphvis after <App> component mounts, called once
// exports.initialize = (pairwiseInteractions, observedStates) => {
//   // console.log("graphvis.initialize");
//   datasetnodes = new vis.DataSet();
//   datasetedges = new vis.DataSet();
//   network = new vis.Network(document.getElementById("canvas"),{
//     nodes: datasetnodes,
//     edges: datasetedges
//   }, config.networkOptions);
//   render(pairwiseInteractions, observedStates);
// };


exports.setSingleNodeState = (observedNode) => {
  const datasetnodesMap = new Map(datasetnodes.get().map(graphNode => [graphNode.id, graphNode]));
  if (datasetnodesMap.has(observedNode.name)) {
    const graphNode = datasetnodesMap.get(observedNode.name);
    graphNode.color.border = config.stateColors[observedNode.state];
    datasetnodes.update(graphNode);
  };
};
exports.setNodesState = (observedNodes) => {
  const datasetnodesMap = new Map(datasetnodes.get().map(graphNode => [graphNode.id, graphNode]));
  const updatenodesMap = new Map(observedNodes.map(node => [node.name, node.state]));
  // Nodes in datasetnodes but not observed set to unobserved
  const unchanged = [...datasetnodesMap.values()]
    .filter(graphNode => !updatenodesMap.has(graphNode.id))
    .reduce((unchanged, graphNode) => {
      graphNode.color.border = "#2B7CE9";
      return [...unchanged, graphNode];
    },[]);
  // Nodes in observedNode are set to their state color
  const toChange = observedNodes.reduce((toChange, node) => {
    if (datasetnodesMap.has(node.name)) {
      const graphNode = datasetnodesMap.get(node.name);
      graphNode.color.border = config.stateColors[node.state];
      return [...toChange, graphNode];
    } else { return toChange };
  }, []);
  datasetnodes.update([...unchanged, ...toChange]);
};

exports.applyPosteriorProbabilities = (posteriorProbabilities) => {
  console.log("applyPosteriorProbabilities");
  const toUpdate = Object.keys(posteriorProbabilities)
    .map(key => { return {name:key, stateProbs:posteriorProbabilities[key]}})
    .map(node => {
      const dominantState = node.stateProbs
        .map(prob => new Number(prob))
        .reduce((dominant, stateProb, index)=>{
          return (dominant.stateProb < stateProb) ? {index,stateProb} : dominant;
        }, {index: 0, stateProb: 0}).index;
      const dominantColor = (dominantState===0) ? 'red' : (dominantState===1) ? "blue" : "green";
      return {
        id: node.name,
        color: {background: dominantColor}
      }
    });
  datasetnodes.update(toUpdate);
};

// exports.addPosteriorProbabilities = (posteriorProbabilities) => {
//   console.log("posterior", posteriorProbabilities);
//   for (let ppid in posteriorProbabilities) {
//     console.log(ppid);
//       const stateProbs = posteriorProbabilities[ppid];
//
//       // why is it not rgb?
//       let [r, b, g] = stateProbs.map(probability=>Math.ceil(probability*255));
//       let dominantState;
//       // This makes it so that we just pick to dominant state and have the color based on that state. Where state 1 is grey (all colors equal)
//       if ((r > g) &&(r > b)) {
//            g = 0;
//            b = 0;
//            dominantState = 1;
//       }
//       else if ((g> r) && (g> b)) {
//            r = 0;
//            b = 0;
//            dominantState = 3;
//       }
//       else {
//            b = 255 - b;
//            g = b;
//            r =  b;
//            dominantState = 2;
//       };
//
//       let node = datasetnodes.get(ppid);
//       let title = node["title"].split("<br>Probabilities:<br>")[0];
//       title += "<br>Probabilities:<br>" +
//                "Dominant State: " + dominantState + "<br>" +
//                "State 1 (down regulated): " + stateProbs[0] + "<br>" +
//                "State 2 (no change):      " + stateProbs[1] + "<br>" +
//                "State 3 (up regulated):   " + stateProbs[2] + "<br>" +
//                " r " + r + " g "+ g + " b " + g;
//
//       const bgColor =  "rgba(" + r + "," + g + "," + b + ",.5)";
//
//       datasetnodes.update({
//         id: ppid,
//         color: {background: bgColor},
//         title: title
//       });
//   }
// };

exports.focusNodes = (nodeIDs) => {network.selectNodes(nodeIDs, true);};
exports.unfocusAll = () => {network.unselectAll();};
exports.isFocused = (node) => {
  //Check if node is in network by its ID (node.name)
  return network !== undefined ? network.getSelectedNodes().includes(node.name) : false;
};
