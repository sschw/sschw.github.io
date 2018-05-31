// Inital Values
var category = "Language",
    language = "JavaScript",
    dropDown = d3.select("#dropdown"),
    toggle = d3.selectAll(".toggle"),
    active = d3.select(null),
    margin = {top: 0, right: 0, bottom: 0, left: 30},
    width = 823 - margin.left - margin.right,
    height = 790 - margin.top - margin.bottom,
    zoom = d3.zoom().scaleExtent([1, 8]).on("zoom", zoomed),
    projection = d3.geoMercator().scale(130).translate([width / 2, height / 1.8]),
    path = d3.geoPath().projection(projection);

//Init Dropdown
dropDown
    .selectAll("option")
    .data(['JavaScript', 'SQL', 'Java', 'C#', 'Python', 'PHP', 'C++', 'C', 'TypeScript', 'VBA'])
    .enter()
    .append("option")
    .attr("value", function(option) {
        return option;
    })
    .text(function(option) {
        return option;
    });

// Init Tooltips
var tip = d3.tip()
    .attr('class', 'd3-tip')
    .offset([-10, 0])
    .html(function(d) {
        // Return whole Tooltip if data is present
        if (d.all != 0)
            return "<strong>Country: </strong><span class='details'>" + d.properties.name +
                "<br></span>" + "<strong>" + language + ": </strong><span class='details'>" + d3.format(".2%")(d[language] / d.all) +
                "<br></span><strong>Education Index: </strong><span class='details'>" + d3.format(".2")(d.edu_index) + "</span>";
        // No data for this country
        return "<strong>Country: </strong><span class='details'>" + d.properties.name + "</span>";
    });

d3.select("body")
    .style("min-width", width + "px")
    .style("min-height", height + "px");

// Init Container for World Map
var worldmapSVG = d3.select(".plots")
    .append("svg")
    .attr("class", "worldmap")
    .attr("width", width)
    .attr("height", height)
    .on("click", stopped, true);

// Init Container for Scatter Plot
var scatterplotSVG = d3.select(".plots")
    .append("svg")
    .attr("class", "scatterplot")
    .attr("width", width)
    .attr("height", height)
    .append("g")
    .attr("transform", "translate(50, 10)");


// Init background - Required for zooming out.
var g = worldmapSVG.append("g");
var rect = worldmapSVG.select("g").append("rect")
    .attr("class", "background")
    .attr("fill", "lightblue")
    .attr("width", 830)
    .attr("height", 848)
    .on("click", reset);

// Init tooltip
worldmapSVG.call(tip).call(zoom);
scatterplotSVG.call(tip);

// Async data loading
queue()
    .defer(d3.json, "/data/world_countries.json")
    .defer(d3.csv, "/data/countries_2017.csv")
    .await(ready);

// Preparer and bind data
function ready(error, data, countries) {
    var languagesById = {};
    var fetch = {};

    // Data laoding functions
    fetch["Language"] = function(d, l) {
        return d[language] / d.all;
    };
    fetch["Education"] = function(d) {
        return d.edu_index;
    };

    // Put the second data source into a map with the id as key.
    countries.forEach(function(d) {
        languagesById[d.id] = d;
    });

    // Match the id's of the 2 sources and save the data in the first source.
    data.features.forEach(function(d) {
        if (languagesById[d.id] != null) {
            d["JavaScript"] = +languagesById[d.id]["JavaScript"];
            d["SQL"] = +languagesById[d.id]["SQL"];
            d["Java"] = +languagesById[d.id]["Java"];
            d["C#"] = +languagesById[d.id]["C#"];
            d["Python"] = +languagesById[d.id]["Python"];
            d["PHP"] = +languagesById[d.id]["PHP"];
            d["C++"] = +languagesById[d.id]["C++"];
            d["C"] = +languagesById[d.id]["C"];
            d["TypeScript"] = +languagesById[d.id]["TypeScript"];
            d["VBA"] = +languagesById[d.id]["VBA"];
            d.all = d["VBA"] + d["TypeScript"] + d["C"] + d["C++"] + d["PHP"] + d["Python"] + d["C#"] + d["Java"] + d["SQL"] + d["JavaScript"];
            d.edu_index = +languagesById[d.id]["edu_index"];
        } else {
            d.all = 0;
        }
    });

    // Prepare update function for the graph.
    function updateGraph() {
        var maxValue = d3.max(data.features, function(d) {
            return fetch[category](d, language);
        });

        var colorScale = d3.scaleLinear()
            .domain([0, maxValue * 0.5, maxValue])
            .range([category == "Language" ? "green" : "red", "yellow", category == "Language" ? "red" : "green"])

        tip.hide();

        worldmapSVG.selectAll("g").selectAll(".countries")
            .transition()
            .duration(750)
            .attr("fill", d => d.all == 0 ? 'grey' : colorScale(fetch[category](d, language)))

        // Rescale color legend
        colorLegendY
            .domain([maxValue, 0]);

        // Change color axis for education index
        colorLegendYAxis
            .scale(colorLegendY)
            .tickFormat(d3.format(category == "Language" ? ".0%" : ""))
            .ticks(5);

        worldmapSVG.select("defs").select("#gradient")
            .transition()
            .attr("x1", category == "Language" ? "0%" : "100%")
            .attr("x2", category == "Language" ? "100%" : "0%");

        worldmapSVG.select(".colorY")
            .transition()
            .call(colorLegendYAxis);


        scatterX.domain(d3.extent(data.features, function(d) {
            return fetch["Language"](d);
        })).nice();

        scatterplotSVG.select(".x")
            .call(scatterXAxis);

        scatterplotSVG.selectAll(".dot").transition()
            .attr("cx", function(d) {
                return scatterX(fetch["Language"](d));
            })
            .attr("cy", function(d) {
                return scatterY(fetch["Education"](d));
            })
    }

    // Init map with all countries
    var countries = g.selectAll("path")
        .data(data.features)
        .enter().append("path")
        .attr("d", path)
        .attr("class", "countries")
        .attr("id", function(d) {
            return d.id;
        })
        .on("click", clicked)
        .style("opacity", 0.8)
        .style("stroke", "white")
        .style('stroke-width', 0.3)
        .on('mouseover', function(d) {
            tip.show(d);
            d3.select(this)
                .style("opacity", 1)
                .style("stroke", "white")
                .style("stroke-width", 1);
        })
        .on('mouseout', function(d) {
            tip.hide(d);

            d3.select(this)
                .style("opacity", 0.8)
                .style("stroke", "white")
                .style("stroke-width", 0.3);
        });

    worldmapSVG.append("path")
        .datum(topojson.mesh(data.features, function(a, b) {
            return a.id !== b.id;
        }))
        .attr("d", path);

    // Init color legend
    var legend = worldmapSVG.append("defs")
        .append("svg:linearGradient")
        .attr("id", "gradient")
        .attr("x1", "0%")
        .attr("y1", "100%")
        .attr("x2", "100%")
        .attr("y2", "100%")
        .attr("spreadMethod", "pad");

    legend.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", "green")
        .attr("stop-opacity", 1);

    legend.append("stop")
        .attr("offset", "50%")
        .attr("stop-color", "yellow")
        .attr("stop-opacity", 1);

    legend.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", "red")
        .attr("stop-opacity", 1);

    var legendGroup = worldmapSVG.append("g")
        .attr("id", "colorLegend")
        .attr("transform", "translate(10,10)");

    legendGroup.append("rect")
        .attr("width", 300)
        .attr("height", 20)
        .style("fill", "url(#gradient)");

    var colorLegendY = d3.scaleLinear()
        .range([300, 0])
        .domain([1, 0]);

    var colorLegendYAxis = d3.axisBottom()
        .scale(colorLegendY)
        .ticks(5);

    legendGroup.append("g")
        .attr("class", "y axis colorY")
        .attr("transform", "translate(0,20)")
        .call(colorLegendYAxis);

    // Init Scatterplot
    var scatterX = d3.scaleLinear()
        .range([0, (width - 60)]);

    var scatterY = d3.scaleLinear()
        .range([(height - 60), 0]);

    var scatterXAxis = d3.axisBottom(scatterX)
        .tickFormat(d3.format(".0%"));

    var scatterYAxis = d3.axisLeft(scatterY);

    scatterX.domain(d3.extent(data.features, function(d) {
        return fetch["Language"](d);
    })).nice();
    scatterY.domain(d3.extent(data.features, function(d) {
        return fetch["Education"](d);
    })).nice();

    scatterplotSVG.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + (height - 60) + ")")
        .call(scatterXAxis)
        .append("text")
        .attr("class", "label")
        .attr("x", (width - 30))
        .attr("y", -6)
        .style("text-anchor", "end")
        .text("Programming Language");

    scatterplotSVG.append("g")
        .attr("class", "y axis")
        .call(scatterYAxis)
        .append("text")
        .attr("class", "label")
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("dy", ".71em")
        .style("text-anchor", "end")
        .text("Education Index")

    scatterplotSVG.selectAll(".dot")
        .data(data.features.filter(function(d) {
            return d.all != 0
        }))
        .enter().append("circle")
        .attr("id", function(d) {
            return d.id;
        })
        .attr("class", "dot")
        .attr("r", 3.5)
        .attr("cx", function(d) {
            return scatterX(fetch["Language"](d));
        })
        .attr("cy", function(d) {
            return scatterY(fetch["Education"](d));
        })
        .style("fill", "blue")
        .on("click", function(d) {
            worldmapSVG.select("#" + d.id).dispatch('click');
        })
        .on('mouseover', function(d) {
            tip.show(d);
        })
        .on('mouseout', function(d) {
            tip.hide();
        });

    //Label Y Axis
    scatterplotSVG.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 0 - 50)
        .attr("x", 0 - (height / 2))
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .text("Education Index");

    //Label X Axis
    scatterplotSVG.append("text")
        .attr("transform",
            "translate(" + (width / 2) + " ," +
            (height + margin.top - 20) + ")")
        .style("text-anchor", "middle")
        .text("Language Popularity");

    // Update data.
    updateGraph();

    //Add Events for User Inputs now that all is ready
    toggle.on('click', function(event) {
        category = category == "Language" ? "Education" : "Language";
        updateGraph();
        toggle.classed("active", !toggle.classed("active"));
    });
    dropDown.on("change", function() {
        language = d3.event.target.value;
        updateGraph();
    });
}

// Zoom action
function clicked(d) {
    if (active.node() === this) return reset();
    active.classed("active", false);

    if (active.data().length != 0)
        scatterplotSVG.select("#" + active.data()[0].id).transition().style("fill", "blue").attr("r", 3.5);

    active = d3.select(this).classed("active", true);

    var bounds = path.bounds(d),
        dx = bounds[1][0] - bounds[0][0],
        dy = bounds[1][1] - bounds[0][1],
        x = (bounds[0][0] + bounds[1][0]) / 2,
        y = (bounds[0][1] + bounds[1][1]) / 2,
        scale = Math.max(1, Math.min(8, 0.9 / Math.max(dx / width, dy / height))),
        translate = [width / 2 - scale * x, height / 2 - scale * y];

    scatterplotSVG.select("#" + active.data()[0].id).transition().style("fill", "magenta").attr("r", 8);

    worldmapSVG.transition()
        .duration(750)
        .call(zoom.transform, d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale));
}

// Reset zoom action
function reset() {
    active.classed("active", false);

    if (active.data().length != 0)
        scatterplotSVG.select("#" + active.data()[0].id).transition().style("fill", "blue").attr("r", 3.5);

    active = d3.select(null);

    worldmapSVG.transition()
        .duration(750)
        .call(zoom.transform, d3.zoomIdentity);
}

// Zoomed styling
function zoomed() {
    g.style("stroke-width", 1.5 / d3.event.transform.k + "px");
    g.attr("transform", d3.event.transform);
}

// Interrupt Action
function stopped() {
    if (d3.event.defaultPrevented) d3.event.stopPropagation();
}