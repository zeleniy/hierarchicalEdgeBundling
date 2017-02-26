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

    var self = this;
    d3.select(window).on('resize.' + this._getUniqueId(), function() {
        self._resize();
        self._update();
    })
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

    var nodesData = this._cluster.nodes(this._getNodes(this._data));
    var linksData = this._getLinks(nodesData);

    this._links
        .data(this._bundle(linksData))
        .attr('d', this._lineGenerator);

    this._nodes
        .data(nodesData.filter(function(n) {
            return ! n.children;
        })).attr('transform', function(d) {
            return 'rotate(' + (d.x - 90) + ')translate(' + (d.y + 8) + ',0)' + (d.x < 180 ? '' : 'rotate(180)');
        });
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

    d3.csv('data/data.csv', function(error, data) {

        self._data = data;

        var nodesData = self._cluster.nodes(self._getNodes(data));
        var linksData = self._getLinks(nodesData);

        self._links = self._canvas.append('g')
            .attr('class', 'links-canvas')
            .selectAll('path.link')
            .data(self._bundle(linksData))
            .enter()
            .append('path')
            .each(function(d) {
                d.source = d[0], d.target = d[d.length - 1];
            }).attr('class', 'link');

        self._nodes = self._canvas.append('g')
            .attr('class', 'labels-canvas')
            .selectAll('text.node')
            .data(nodesData.filter(function(n) {
                return !n.children;
            })).enter()
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

        self._update();
    });
};


HierarchicalEdgeBundling.prototype._mouseOverEventHandler = function(d) {

    this._nodes.each(function(n) {
        n.target = n.source = false;
    });

    this._links.classed('link-target', function(l) {
            if (l.target === d) return l.source.source = true; 
        }).classed('link-source', function(l) {
            if (l.source === d) return l.target.target = true;
        }).filter(function(l) {
            return l.target === d || l.source === d;
        }).each(function() {
            this.parentNode.appendChild(this);
        });

  this._nodes.classed('node-target', function(n) {
          return n.target;
      }).classed('node-source', function(n) {
          return n.source;
      });
};


HierarchicalEdgeBundling.prototype._mouseEnterEventHandler = function() {

  this._links
      .classed('link-target', false)
      .classed('link-source', false);

  this._nodes
      .classed('node-target', false)
      .classed('node-source', false);
};


HierarchicalEdgeBundling.prototype._getNodes = function(nodes) {

    var root = {};
    var map  = {};

    root.children = _.uniqBy(nodes, function(d) {
            return d['Page.Type']
        }).map(function(d) {
            return map[d['Page.Type']] = {
                key: d['Page.Type'],
                parent: root,
                children: []
            }
        });

    this._nodesMap  = {};
    nodes.forEach(function(d, i) {
        var parent = map[d['Page.Type']];

        d.parent = parent;
        d.children = [];
        d.key = d['Page.Name'];

        this._nodesMap[d['Page.ID']] = d;

        parent.children.push(d);
    }, this);

    return root;
};


HierarchicalEdgeBundling.prototype._getLinks = function(nodes) {

    var links = [];

    var leafs = nodes.filter(function(d) {
        return d.depth === 2;
    });

    leafs.forEach(function(d, i) {
        for (var key in d) {
            if (key.substr(0, 4) == 'Link' && d[key] && d[key]) {
                links.push({
                    source: d,
                    target: this._nodesMap[Number(d[key])]
                });
            }
        }
    }, this);

    return links;
};


/**
 * Generate chart unique id.
 * @see http://stackoverflow.com/a/2117523/1191125
 * @pivate
 * @param {String} pattern
 * @returns {String}
 */
HierarchicalEdgeBundling.prototype._getUniqueId = function() {

    return 'xxxxxxxxxxxxxxxx'.replace(/x/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r&0x3|0x8);
        return v.toString(16);
    });
};