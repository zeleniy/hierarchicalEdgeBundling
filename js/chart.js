function HierarchicalEdgeBundling() {

    this._bundle = d3.layout.bundle();

    this._cluster = d3.layout.cluster()
        .sort(null)
        .value(function(d) {
            return d.size;
        });

    this._lineGenerator = d3.svg.line.radial()
        .interpolate('bundle')
        .tension(.85)
        .radius(function(d) {
            return d.y;
        }).angle(function(d) {
            return d.x / 180 * Math.PI;
        });

}


HierarchicalEdgeBundling.getInstance = function() {

    return new HierarchicalEdgeBundling();
};


HierarchicalEdgeBundling.prototype._resize = function(dimension) {

    dimension = dimension || this._container.node().getBoundingClientRect();

    this._width = dimension.width;
    this._height = dimension.height || this._width;

    this._diameter = Math.min(this._width, this._height);
    this._outerRadius = this._diameter / 2,
    this._innerRadius = this._outerRadius - 120;

    this._cluster.size([360, this._innerRadius]);
};


HierarchicalEdgeBundling.prototype._update = function(selector) {

    this._svg
        .attr('width', this._diameter)
        .attr('height', this._diameter);

    this._canvas
        .attr('transform', 'translate(' + this._outerRadius + ', ' + this._outerRadius + ')');

};


HierarchicalEdgeBundling.prototype.renderTo = function(selector) {

    var self = this;

    this._container = d3.select(selector);
    var dimension = this._container.node().getBoundingClientRect();

    this._svg = d3.select(selector)
        .append('svg');
    this._canvas = this._svg
        .append('g')
        .attr('class', 'canvas');

    this._resize(dimension);

    this._update();

    d3.json('data/readme-flare-imports.json', function(error, classes) {

        var hierarchy = self._getNodes(classes);
        //console.log(JSON.stringify(hierarchy))
        var nodesData = self._cluster.nodes(hierarchy);
        var linksData = self._getLinks(nodesData);

        self._links = self._canvas.append('g')
            .attr('class', 'links-canvas')
            .selectAll('._links')
            .data(self._bundle(linksData))
            .enter()
            .append('path')
            .each(function(d) {
                d.source = d[0], d.target = d[d.length - 1];
            }).attr('class', 'link')
            .attr('d', self._lineGenerator);

        self._nodes = self._canvas.append('g')
            .attr('class', 'labels-canvas')
            .selectAll('.node')
            .data(nodesData.filter(function(n) { return !n.children; }))
            .enter()
            .append('text')
            .attr('class', 'node')
            .attr('dy', '.31em')
            .attr('transform', function(d) {
                return 'rotate(' + (d.x - 90) + ')translate(' + (d.y + 8) + ',0)' + (d.x < 180 ? '' : 'rotate(180)');
            }).style('text-anchor', function(d) {
                return d.x < 180 ? 'start' : 'end';
            }).text(function(d) {
                return d.key;
            }).on('mouseover', function(d) {
                return self._mouseOverEventHandler(d);
            }).on('mouseout', function(d) {
                return self._mouseEnterEventHandler(d);
            });
    });
};


HierarchicalEdgeBundling.prototype._mouseOverEventHandler = function(d) {

//    this._nodes.each(function(n) {
//        n.target = n.source = false;
//    });
//
//    this._links.classed('link-target', function(l) {
//            if (l.target === d) return l.source.source = true; 
//        }).classed('link-source', function(l) {
//            if (l.source === d) return l.target.target = true;
//        }).filter(function(l) {
//            return l.target === d || l.source === d;
//        }).each(function() {
//            this.parentNode.appendChild(this);
//        });
//
//  this._nodes.classed('node-target', function(n) {
//          return n.target;
//      }).classed('node-source', function(n) {
//          return n.source;
//      });
};


HierarchicalEdgeBundling.prototype._mouseEnterEventHandler = function(classes) {

//  this._links
//      .classed('link-target', false)
//      .classed('link-source', false);
//
//  this._nodes
//      .classed('node-target', false)
//      .classed('node-source', false);
};


HierarchicalEdgeBundling.prototype._getNodes = function(classes) {

    var map = {};

    function find(name, data) {

        var node = map[name], i;

        if (! node) {
            node = map[name] = data || {name: name, children: []};
            if (name.length) {
                node.parent = find(name.substring(0, i = name.lastIndexOf('.')));
                node.parent.children.push(node);
                node.key = name.substring(i + 1);
            }
        }

        return node;
    }

    classes.forEach(function(d) {
        find(d.name, d);
    });

    return map[''];
};


HierarchicalEdgeBundling.prototype._getLinks = function(nodes) {

      var map = {},
      imports = [];

  // Compute a map from name to node.
  nodes.forEach(function(d) {
    map[d.name] = d;
  });

  // For each import, construct a link from the source to target node.
  nodes.forEach(function(d) {
    if (d.imports) d.imports.forEach(function(i) {
      imports.push({source: map[d.name], target: map[i]});
    });
  });

  return imports;

};