width = 667;
height = 667;

//for zoom button
var zoom = d3.behavior.zoom().scaleExtent([-8, 8]).on("zoom", zoomed);
//var zoom = d3.behavior.zoom().on("zoom", rescale);

//Set up the colour scale
var color = d3.scale.category20();

// init svg
var outer = d3.select("#chart")
  .append("svg:svg")
    .attr("style", "border:solid; border-radius:15px;")
    .attr("width", width)
    .attr("height", height)
    .attr("pointer-events", "all");

var vis = outer
  .append('svg:g')
    //.call(d3.behavior.zoom().on("zoom", rescale))
    .call(zoom)
  .append('svg:g');
    //.on("mousedown", mousedown);

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
    .html(function (d) {
    return  d.longname + "</span>";
})
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

//Read the data from the mis element 
//var mis = document.getElementById('mis').innerHTML;
//graph = JSON.parse(mis);

//Creates the graph data structure out of the json data
force.nodes(graph.nodes)
    .links(graph.links)
    .start();

/*
var data = [
{ id: 'arrow', name: 'arrow', path: 'M 0,-5 L 10,0 L 0,5', viewBox: '0 -5 10 10', stroke: '#31a354', fill: '#31a354' },
{ id: 'stub',  name: 'stub', path: 'M -1,-12 L 1,-12 L 1,12 L -1,12 L -1,-12', viewBox: '-1 -10 2 24', stroke: '#b30000', fill: '#b30000' }
]
*/

var data = [
{ id: 'AND_arrow', name: 'arrow', path: 'M 0,-5 L 10,0 L 0,5', viewBox: '0 -5 10 10', stroke: '#756bb1', fill: '#756bb1' },
{ id: 'OR_arrow', name: 'arrow', path: 'M 0,-5 L 10,0 L 0,5', viewBox: '0 -5 10 10', stroke: '#FF69B4', fill: '#FF69B4' },
{ id: 'AND_stub',  name: 'stub', path: 'M -1,-12 L 1,-12 L 1,12 L -1,12 L -1,-12', viewBox: '-1 -10 2 24', stroke: '#756bb1', fill: '#756bb1' },
{ id: 'OR_stub',  name: 'stub', path: 'M -1,-12 L 1,-12 L 1,12 L -1,12 L -1,-12', viewBox: '-1 -10 2 24', stroke: '#FF69B4' , fill: '#FF69B4'  }
]

//Create all the line svgs but without locations yet
var link = vis.selectAll(".link")
    .data(graph.links)
    .enter().append("line")
    .attr("class", "link")
    //.attr("marker-end",  function(d) {return (d.value == 1)? "url(#arrow)" : "url(#stub)";}) // Modified line 
    .attr("marker-end", function(d) {return (d.value == 1 )? 
                         (d.logic == 1)? "url(#OR_arrow)" : 
                                         "url(#AND_arrow)": 
                         (d.logic == 1)? "url(#OR_stub)" : 
                                         "url(#AND_stub)" })
    .style("stroke-width", 1)//function(d) {return Math.sqrt(d.value);})
    //.style("stroke", function(d) {if (d.value == 1 ){return "#31a354";} else{return "#b30000";};});
    .style("stroke", function(d) {if (d.logic == 0 ){return "#756bb1";} else{return "#FF69B4";};}); //PURPLE = AND, PINK = OR
 
//Do the same with the shapes for the nodes 
 var node = vis.selectAll(".node")
           .data(graph.nodes)
           .enter().append("g")
           .attr("class", "node")
           .on('click', connectedNodes) //Added code for highlighting nodes
           .on('dblclick',releasenode) //Added code for releasing nodes
           .call(node_drag); //Added code for pinning nodes


 node.append("polygon")
    //.attr("transform", function(d) { return "translate(" + d + ")"; }) //for zoom
     .attr("class", function(d) { return d.name}) 
     .style("opacity", 1)
     .style("fill","#0099CC")

    .on('mouseover', tip.show) //Added for tooltip
    .on('mouseout', tip.hide); //Added for tooltip
  
node.append("text")
      .attr("dx", 10)
      .attr("dy", ".35em")
      .text(function(d) { return d.name });
      //.style("stroke", "gray");

//Toggle stores whether the highlighting is on
var toggle = 0;
//Create an array logging what is connected to what 
var linkedByIndex = {};
for (i = 0; i < graph.nodes.length; i++) {
	linkedByIndex[i + "," + i] = 1;
};
graph.links.forEach(function (d) {
	linkedByIndex[d.source.index + "," + d.target.index] = 1;
});

//This function looks up whether a pair are neighbours
function neighboring(a,b) {
	return linkedByIndex[a.index + "," + b.index];
}
function connectedNodes() {
	if (toggle == 0) {
		//Reduce the opacity of all but the neighbouring nodes
		d = d3.select(this).node().__data__;
		node.style("opacity", function (o) {
			return neighboring(d, o) | neighboring(o, d) ? 1 : 0.1;
		});
		link.style("opacity", function (o) {
			return d.index==o.source.index | d.index==o.target.index ? 1 : 0.1;
		});
		//Reduce the op
		toggle = 1;
	} else {
		//Put them back to opacity = 1
		node.style("opacity", 1);
		link.style("opacity", 1);
		toggle = 0;
	}
}

//Search capability
var optArray = [];
for (var i = 0; i < graph.nodes.length - 1; i++) {
    optArray.push(graph.nodes[i].name);
}
optArray = optArray.sort();
(function () {
    $("#search").autocomplete({
        source: optArray
    });
});

//Inference Button
var ramp=d3.scale.linear().domain([0,100]).range(["yellow","red"]);
function inferenceToggle() {
    var polygons = vis.selectAll("polygon");
    pp[0].forEach(function(p) {		
        var selected = polygons.filter(function (d, i){ return d.name == p.name });
        var node_color = ramp(p["probs"][0]*100);
        selected.style("fill", node_color); });
}

//Search for Nodes
function searchNode() {
    //find the node
    var selectedVal = document.getElementById('search').value;
    var node = vis.selectAll(".node");
    if (selectedVal == "none") {
        node.style("stroke", "white").style("stroke-width", "1");
    } else {
        var selected = node.filter(function (d, i) {
            return d.name != selectedVal;
        });
        selected.style("opacity", "0");
        var link = vis.selectAll(".link")
	link.style("opacity","0");
	d3.selectAll(".node, .link").transition()
		.duration(5000)
		.style("opacity", 1);
   }
}

//Now we are giving the SVGs co-ordinates - the force layout is generating the co-ordinates which this code is using to update the attributes of the SVG elements
force.on("tick", function () {
    var xdiamondpadding = 24;
    var ydiamondpadding = 12;
    var xrectpadding = 18;
    var yrectpadding = 9;
    
    link.attr("x1", function (d) {
          return d.source.x;
    })
        .attr("y1", function (d) {
	  return d.source.y;
    })
        .attr("x2", function (d) {
          return d.target.x;
    })
        .attr("y2", function (d) {
	  return d.target.y;
    });
    
    vis.selectAll("polygon").attr("points", function(d) {
         if (d.type == "logic") {
            var poly = [ {"x": d.x+xdiamondpadding, "y": d.y},
                         {"x": d.x, "y": d.y+ydiamondpadding},
            		 {"x": d.x-xdiamondpadding, "y": d.y},
            		 {"x": d.x, "y": d.y-ydiamondpadding} ];
            	return poly.map(function(point) {
            	       return [point.x, point.y].join(",")
                }).join(" ");
         } else {
            var poly = [ {"x": d.x+xrectpadding, "y": d.y+yrectpadding},
                         {"x": d.x-xrectpadding, "y": d.y+yrectpadding},
                         {"x": d.x-xrectpadding, "y": d.y-yrectpadding},
                         {"x": d.x+xrectpadding, "y": d.y-yrectpadding} ];
                return poly.map(function(point) {
                       return [point.x, point.y].join(",")
                }).join(" ");
         }
   }); 

    vis.selectAll("text").attr("x", function (d) { return d.x+11; })
                         .attr("y", function (d) { return d.y-11; });

});


vis.append("defs").selectAll("marker")
  .data(data)
  .enter().append("svg:marker")
    .attr("id", function(d) { return d.id; })
    .attr("viewBox", function(d) {return d.viewBox;}) 
    .attr('markerUnits', 'strokeWidth')
    .attr("refX", 28)
    .attr("refY", 0)
    .attr("markerWidth", 11)
    .attr("markerHeight", 18)
    .attr("orient", "auto")
  .append("svg:path")
    .attr("d", function(d) { return d.path;})
    .style("stroke", function(d) {return d.stroke})
    .style("fill", function(d) {return d.fill})
    .style("opacity", "0.9");

function mousedown() {
  return;
}

/*
// rescale g
function rescale() {
  trans=d3.event.translate;
  scale=d3.event.scale;

  vis.attr("transform",
      "translate(" + trans + ")"
      + " scale(" + scale + ")");
}
*/

//for zoom button
function zoomed() {
    vis.attr("transform",
        "translate(" + zoom.translate() + ")" +
        "scale(" + zoom.scale() + ")"
    );
}

function interpolateZoom (translate, scale) {
    var self = this;
    return d3.transition().duration(350).tween("zoom", function () {
        var iTranslate = d3.interpolate(zoom.translate(), translate),
            iScale = d3.interpolate(zoom.scale(), scale);
        return function (t) {
            zoom
                .scale(iScale(t))
                .translate(iTranslate(t));
            zoomed();
        };
    });
}

function zoomClick() {
    var clicked = d3.event.target,
        direction = 1,
        factor = 0.2,
        target_zoom = 1,
        center = [width / 2, height / 2],
        extent = zoom.scaleExtent(),
        translate = zoom.translate(),
        translate0 = [],
        l = [],
        view = {x: translate[0], y: translate[1], k: zoom.scale()};

    d3.event.preventDefault();
    direction = (this.id === 'zoom_in') ? 1 : -1;
    target_zoom = zoom.scale() * (1 + factor * direction);

    if (target_zoom < extent[0] || target_zoom > extent[1]) { return false; }

    translate0 = [(center[0] - view.x) / view.k, (center[1] - view.y) / view.k];
    view.k = target_zoom;
    l = [translate0[0] * view.k + view.x, translate0[1] * view.k + view.y];

    view.x += center[0] - l[0];
    view.y += center[1] - l[1];

    interpolateZoom([view.x, view.y], view.k);
}

d3.selectAll('button').on('click', zoomClick);
