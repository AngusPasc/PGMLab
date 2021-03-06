var width = 880;
var height = 667;

var zoom, vis;

//Toggle stores whether the highlighting is on
var toggle = 0;
//Create an array logging what is connected to what 
var linkedByIndex = {};

function initialize() {
    zoom =  d3.behavior.zoom().scaleExtent([-8, 8]).on("zoom", zoomed);

    //remove svg image for switching from one graph to the next
    var chart = document.getElementById("chart");
    chart.innerHTML = '';

    var outer = d3.select("#chart")
      .append("div")
       .classed("svg-container", true) //container class to make it responsive
      .append("svg:svg")
        .attr("style", "border:solid; border-radius:15px;")
        .attr("pointer-events", "all")
        .attr("preserveAspectRatio", "xMinYMin meet")
        .attr("viewBox", "0 0 1500 1500")
        .classed("svg-content-responsive", true);
    
    vis = outer
      .append('svg:g')
        .call(zoom)
      .append('svg:g');
}
exports.initialize = initialize;

function render (pi) {
    
    var color = d3.scale.category20();

    vis.append("rect")
        .attr("width", width)
        .attr("height", height)
        .attr("fill", 'white');
    
    //Set up the force layout
    var force = d3.layout.force()
        .charge(-2000)
        .linkDistance(200)
        .size([width, height])
        .gravity(0.5);

    //Set up tooltip 
    var tip = d3.tip()
        .attr('class', 'd3-tip')
        .offset([-10, 0])
        .html(function (d) {  return d.longname + "</span>"});
    vis.call(tip);
   
    //Adds capability to pin nodes, double click to release
    var node_drag = d3.behavior.drag()
            .on("dragstart",dragstart)
            .on("drag",dragmove)
            .on("dragend",dragend);
        function dragstart(d, i) {
            d3.event.sourceEvent.stopPropagation()
            force.stop() //stops the force auto positioning before you start dragging
        }
        function dragmove(d, i) {
            d.px += d3.event.dx;
            d.py += d3.event.dy;
            d.x += d3.event.dx;
            d.y += d3.event.dy;
        }
        function dragend(d, i) {
            d.fixed = true; //set the node to fixed so the force doesn't include the node in its auto positioning stuff
            force.resume();
        }
        function releasenode(d) {
            d.fixed = false; //set the node to fixed so the force doesn't include the node in its auto positioning stuff
            //force.resume();
        }
    
    //Creates the graph data structure out of the json data
    force.nodes(pi.nodes)
        .links(pi.links)
        .start();
    
    var data = [
        { id: 'AND_arrow', name: 'arrow', path: 'M 0,-5 L 10,0 L 0,5', viewBox: '0 -5 10 10', stroke: '#756bb1', fill: '#756bb1' },
        { id: 'OR_arrow', name: 'arrow', path: 'M 0,-5 L 10,0 L 0,5', viewBox: '0 -5 10 10', stroke: '#FF69B4', fill: '#FF69B4' },
        { id: 'AND_stub',  name: 'stub', path: 'M -1,-12 L 1,-12 L 1,12 L -1,12 L -1,-12', viewBox: '-1 -10 2 24', stroke: '#756bb1', fill: '#756bb1' },
        { id: 'OR_stub',  name: 'stub', path: 'M -1,-12 L 1,-12 L 1,12 L -1,12 L -1,-12', viewBox: '-1 -10 2 24', stroke: '#FF69B4' , fill: '#FF69B4'  }];
    
    //Create all the line svgs but without locations yet
    var link = vis.selectAll(".link")
        .data(pi.links)
        .enter().append("line")
        .attr("class", "link")
        .attr("marker-end", function(d) {return (d.value == 1 )? 
                             (d.logic == 1)? "url(#OR_arrow)" : 
                                             "url(#AND_arrow)": 
                             (d.logic == 1)? "url(#OR_stub)" : 
                                             "url(#AND_stub)" })
        .style("stroke-width", 1)
        .style("stroke", function(d) {if (d.logic == 0 ){return "#756bb1";} else{return "#FF69B4";};}); //PURPLE = AND, PINK = OR


    //Do the same with the shapes for the nodes 
     var node = vis.selectAll(".node")
               .data(pi.nodes)
               .enter().append("g")
               .attr("class", "node")
               .on('click', function (d) { connectedNodes(d) } ) //Added code for highlighting nodes
               .on('dblclick',releasenode) //Added code for releasing nodes
               .call(node_drag); //Added code for pinning nodes
    
    //size variable enables making the node size larger
    var size = d3.scale.pow().exponent(1)
      .domain([1,100])
      .range([8,24]);
    
    /*
    nominal_base_node_size should remain at this number, it 
    seems to be a part of the controls that determine where
    the text is in relation to the node
    */
    var nominal_base_node_size = 8
    
    node.append("path")
         .attr("d", d3.svg.symbol()
            //changing the last decimal number in the .size function below changes the node size 
            .size(function(d) { return Math.PI*Math.pow(size(d.size)||nominal_base_node_size,2.25) })
            .type(function(d) { return d.shape }))
            .attr("class", function(d) { return d.name }) 
            .style("opacity", 1)
            .style("fill",function(d) { return d.root=="true" ? "#000000" : d.leaf=="true" ? "#2B4F81" : "#0099CC" })
            .on('mouseover', tip.show)
            .on('mouseout', tip.hide);
    
    var text_center = false;
    
    var text = vis.selectAll(".text")
        .data(pi.nodes)
        .enter().append("text")
        .attr("dy", ".35em");
    
        if (text_center)
         text.text(function(d) { return d.name; })
        .style("text-anchor", "middle");
        else 
        text.attr("dx", function(d) {return (size(d.size)||nominal_base_node_size);})
               .text(function(d) { return '\u2002'+d.name; });
    
    for (i = 0; i < pi.nodes.length; i++) {
        linkedByIndex[i + "," + i] = 1;
    };
    pi.links.forEach(function (d) {
        linkedByIndex[d.source.index + "," + d.target.index] = 1;
    });
  
    //Search capability
    var optArray = [];
    for (var i = 0; i < pi.nodes.length - 1; i++) {
        optArray.push(pi.nodes[i].name);
    }
    optArray = optArray.sort();
    (function () {
        $("#search").autocomplete({
            source: optArray
        });
    });
    
    force.on("tick", function() {
        node.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });
        text.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });  
        
        link.attr("x1", function(d) { return d.source.x; })
          .attr("y1", function(d) { return d.source.y; })
          .attr("x2", function(d) { return d.target.x; })
          .attr("y2", function(d) { return d.target.y; });
        	
        node.attr("cx", function(d) { return d.x; })
          .attr("cy", function(d) { return d.y; });
    });
    
    vis.append("defs").selectAll("marker")
      .data(data)
      .enter().append("svg:marker")
        .attr("id", function(d) { return d.id; })
        .attr("viewBox", function(d) {return d.viewBox;}) 
        .attr('markerUnits', 'strokeWidth')
        .attr("refX", 28)
        .attr("refY", 0)
        .attr("markerWidth", 10)
        .attr("markerHeight", 18)
        .attr("orient", "auto")
      .append("svg:path")
        .attr("d", function(d) { return d.path;})
        .style("stroke", function(d) {return d.stroke})
        .style("fill", function(d) {return d.fill})
        .style("opacity", "0.9");
}

exports.render = render;
 
   //This function looks up whether a pair are neighbours
    function neighboring(a,b) {
        console.log(linkedByIndex);
        return linkedByIndex[a.index + "," + b.index];
    }

    function connectedNodes(d) {
        if (toggle == 0) {
        	//Reduce the opacity of all but the neighbouring nodes
        	node.style("opacity", function (o) {
                return neighboring(d, o) | neighboring(o, d) ? 1 : 0.1});
        	link.style("opacity", function (o) {
                return d.index==o.source.index | d.index==o.target.index ? 1 : 0.1});
        	//Reduce the op
        	toggle = 1;
        }
        else {
        	//Put them back to opacity = 1
        	node.style("opacity", 1);
        	link.style("opacity", 1);
        	toggle = 0;
        }
    }
 

function mousedown() {
  return;
}

function zoomed() {
    vis.attr("transform", "translate(" + zoom.translate() + ")" + "scale(" + zoom.scale() + ")" );
}

function interpolateZoom (translate, scale) {
    return d3.transition().duration(350).tween("zoom", function () {
        var iTranslate = d3.interpolate(zoom.translate(), translate),
            iScale = d3.interpolate(zoom.scale(), scale);
        return function (t) {
            zoom
                .scale(iScale(t))
                .translate(iTranslate(t));
            zoomed(zoom);
        };
    });
}

function zoom_click(direction) {
    var factor = 0.2,
        target_zoom = 1,
        center = [width / 2, height / 2],
        extent = zoom.scaleExtent(),
        translate = zoom.translate(),
        translate0 = [],
        l = [],
        view = {x: translate[0], y: translate[1], k: zoom.scale()};

    target_zoom = zoom.scale() * (1 + factor * direction);

    if (target_zoom < extent[0] || target_zoom > extent[1]) { return false; }

    translate0 = [(center[0] - view.x) / view.k, (center[1] - view.y) / view.k];
    view.k = target_zoom;
    l = [translate0[0] * view.k + view.x, translate0[1] * view.k + view.y];

    view.x += center[0] - l[0];
    view.y += center[1] - l[1];

    interpolateZoom([view.x, view.y], view.k);
}

exports.zoomClick = zoom_click;

function vis_by_type(type) {
    switch (type) {
        case "circle": 
            return keyc;
        case "square": 
            return keys;
        case "triangle-up": 
            return keyt;
        case "diamond":
            return keyr;
        case "cross":
            return keyx;
        case "triangle-down":
            return keyd;
        default:
            return true;
    }
}

function searchNode() {
    var selectedVal = document.getElementById('search').value;
    var node = vis.selectAll(".node");

    if (selectedVal == "none") {
        node.style("stroke", "white").style("stroke-width", "1");
    } 
    else {
        var selected = node.filter(function (d, i) {
            return d.name != selectedVal });
        selected.style("opacity", "0");
        var link = vis.selectAll(".link")
        link.style("opacity","0");
        d3.selectAll(".node, .link").transition()
            .duration(5000)
            .style("opacity", 1);
    }
}

exports.searchNode = searchNode;

function inferenceToggle(pp) {
    var ramp=d3.scale.linear().domain([0,100]).range(["yellow","red"]);
    var paths = vis.selectAll("path");
    pp.data[0].forEach(function(p) {    	
        var selected = paths.filter(function (d, i){ return d.name == p.name });
        var node_color = ramp(p["probs"][0]*100);
        selected.style("fill", node_color); });
}

exports.inferenceToggle = inferenceToggle;
