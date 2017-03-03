/**
 * @author Zelenin Alexandr <zeleniy.spb@gmail.com>
 * @public
 * @class
 * @param {Object} config
 */
function HierarchicalEdgeBundling(config) {
    /**
     * Chart config.
     * @private
     * @member {Object}
     */
    this._config = config;
    /**
     * Arc labels left padding.
     * @private
     * @member {Number}
     */
    this._arcLabelsPadding = this._config.arcLabelsPadding || 5;
    /**
     * Difference betweeb outer and inner radiues.
     * Defines arcs inner radius.
     * @private
     * @member {Number}
     */
    this._innerRadiusDiff = this._config.innerRadiusDiff || 120;
    /**
     * Arcs width.
     * @private
     * @member {Number}
     */
    this._arcWidth = this._config.arcWidth || 30;
    /**
     * Arcs color set.
     * @private
     * @member {String[]}
     */
    this._color = this._config.colorSet || d3.scale.category20().range();
    /**
     * Radial labels max string length.
     * @private
     * @member {Integer}
     */
    this._maxLabelLength = this._config.maxLabelLength;
    /**
     * Bundle layout.
     * @private
     * @member {Function}
     */
    this._bundle = d3.layout.bundle();
    /**
     * Cluster layout.
     * @private
     * @member {Function}
     */
    this._cluster = d3.layout.cluster();
    /**
     * Links tension scale.
     * @private
     * @member {Function}
     */
    this._tensionScale = d3.scale.linear()
        .range([0, 1]);
    /**
     * Links path generator.
     * @private
     * @member {Function}
     */
    this._lineGenerator = d3.svg.line.radial()
        .interpolate('bundle')
        .tension(this._config.tension || 0.85)
        .radius(function(d) {
            return d.y;
        }).angle(function(d) {
            return d.x / 180 * Math.PI;
        });
    /**
     * Arcs generator.
     * @private
     * @member {Function}
     */
    this._arc = d3.svg.arc();
    /**
     * Legend configuration.
     * @private
     * @member {Object}
     */
    this._legend = {
        rowsNumber: 0,
        size: 15,
        labelPadding: 5,
        fontSize: 12
    };
    /*
     * Stash reference to this object.
     */
    var self = this;
    /*
     * Define window resize event handler.
     */
    d3.select(window).on('resize.' + this._getUniqueId(), function() {
        self._resize();
        self._update();
    })
}


/**
 * Factory method.
 * @public
 * @static
 * @param {Object} config
 * @returns {HierarchicalEdgeBundling}
 */
HierarchicalEdgeBundling.getInstance = function(config) {

    return new HierarchicalEdgeBundling(config);
};


/**
 * Recalculate chart dimensions.
 * @private
 * @param {Object} [dimension] - dimension of parent container.
 */
HierarchicalEdgeBundling.prototype._resize = function(dimension) {

    dimension = dimension || this._container.node().getBoundingClientRect();

    this._width = dimension.width;
    this._height = dimension.height || this._width;

    this._diameter = Math.min(this._width, this._height);
    this._outerRadius = this._diameter / 2,
    this._innerRadius = this._outerRadius - this._innerRadiusDiff;

    this._cluster
        .size([360, this._innerRadius]);

    this._arc
        .innerRadius(this._innerRadius)
        .outerRadius(this._outerRadius);
};


/**
 * Get arcs inner radius.
 * @private
 * @returns {Number}
 */
HierarchicalEdgeBundling.prototype._getArcInnerRadius = function() {

    return this._innerRadius + 5;
};


/**
 * Get arcs outer radius.
 * @private
 * @returns {Number}
 */
HierarchicalEdgeBundling.prototype._getArcOuterRadius = function() {

    return this._innerRadius + this._arcWidth + 5;
};


/**
 * Update chart view.
 * @private
 */
HierarchicalEdgeBundling.prototype._update = function() {

    var self = this;

    var strX = 0;
    var strLength = 0;
    this._legend.rowsNumber = 0;

    self._legendCanvas.selectAll('g.legend-item')
        .each(function(d, i) {

            var container = d3.select(this);

            var rect = container.select('rect')
                .attr('x', function() {
                    return strX;
                }).attr('y', function() {
                    return self._legend.rowsNumber * self._legend.size + 2 * self._legend.rowsNumber;
                });

            strLength += self._legend.size;
            strX = strX + self._legend.labelPadding + self._legend.size;

            var text = container.select('text')
                .attr('x', function() {
                    return strX;
                }).attr('y', function() {
                    return self._legend.rowsNumber * self._legend.size + self._legend.fontSize + 2 * self._legend.rowsNumber;
                });

            strLength += self._legend.labelPadding + self._maxStrLength;
            strX = strX + self._maxStrLength;

            if (strLength > self._diameter) {

                self._legend.rowsNumber ++;

                strX = 0;
                strLength = 0;

                rect.attr('x', function() {
                        return strX;
                    }).attr('y', function() {
                        return self._legend.rowsNumber * self._legend.size + 2 * self._legend.rowsNumber;
                    });

                strLength += 2 + self._legend.size;
                strX = strX + self._legend.labelPadding + self._legend.size;

                text.attr('x', function() {
                        return strX;
                    }).attr('y', function() {
                        return self._legend.rowsNumber * self._legend.size + self._legend.fontSize + 2 * self._legend.rowsNumber;
                    });

                strLength += self._legend.labelPadding + self._maxStrLength;
                strX = strX + self._maxStrLength;
            }
        });

    this._svg
        .attr('width', this._diameter)
        .attr('height', this._diameter);

    this._canvas
        .attr('transform', 'translate(' + this._outerRadius + ', ' + this._outerRadius + ')');

    this._legendContainer
        .attr('width', this._diameter)
        .attr('height', self._legend.rowsNumber * 17);

    var legendWidth = this._legendCanvas.node().getBoundingClientRect().width;
    this._legendCanvas
        .attr('transform', 'translate(' + ((this._diameter - legendWidth) / 2) + ', 0)');

    var nodesData = this._cluster.nodes(this._getNodes(this._data));
    var linksData = this._getLinks(nodesData);

    this._links
        .data(this._bundle(linksData))
        .attr('d', this._lineGenerator)
        .each(function(d) {
            d.source = d[0], d.target = d[d.length - 1];
        });

    this._nodes
        .data(nodesData.filter(function(n) {
            return ! n.children;
        })).attr('dx', function(d) {
            return d.x < 180 ? self._arcWidth + 'px' : '-' + self._arcWidth + 'px';
        }).attr('transform', function(d) {
            return 'rotate(' + (d.x - 90) + ') translate(' + (d.y + 8) + ',0)' + (d.x < 180 ? '' : ' rotate(180)');
        });

    this._arcs
        .attr('d', function(d, i) {
            return self._arc
                .innerRadius(self._getArcInnerRadius())
                .outerRadius(self._getArcOuterRadius())
                .startAngle(d.startAngle)
                .endAngle(d.endAngle)();
        });

    this._arcsLables
        .style('visibility', function(d) {

            var angle = self._toDegrees(d.endAngle - d.startAngle);
            var arcLength = Math.PI * self._innerRadius / 180 * angle;
            var text = self._canvas.append('text')
                .style('visibility', 'hidden')
                .text(d.key);
            var width = text.node()
                .getBoundingClientRect()
                .width + self._arcLabelsPadding * 2;
            text.remove();
            
            return arcLength > width ? 'visible' : 'hidden';
        });

    var x1 = self._outerRadius / 2;
    var x2 = self._outerRadius - 20;

    self._controls.select('text')
        .attr('x', x1)
        .attr('y', - self._outerRadius + 15);
    self._controls.select('line')
        .attr('x1', x1)
        .attr('y1', - self._outerRadius + 25)
        .attr('x2', x2)
        .attr('y2', - self._outerRadius + 25);
    self._controls.select('circle')
        .attr('cx', x1 + self._lineGenerator.tension() * (x2 - x1))
        .attr('cy', - self._outerRadius + 25);
};


/**
 * Find arc start angle.
 * @private
 * @see http://stackoverflow.com/a/13624617/1191125
 * @param {Object[]} children
 * @returns {Number}
 */
HierarchicalEdgeBundling.prototype._findStartAngle = function(children) {

    var min = children[0].x;

    children.forEach(function(d) {
       if (d.x < min)
           min = d.x;
    });

    return min;
}


/**
 * Find arc end angle.
 * @private
 * @see http://stackoverflow.com/a/13624617/1191125
 * @param {Object[]} children
 * @returns {Number}
 */
HierarchicalEdgeBundling.prototype._findEndAngle = function(children) {

    var max = children[0].x;

    children.forEach(function(d) {
       if (d.x > max)
           max = d.x;
    });

    return max;
}


/**
 * Render chart.
 * @public
 * @param {String} selector
 */
HierarchicalEdgeBundling.prototype.renderTo = function(selector) {

    var self = this;

    this._container = d3.select(selector);

    var chartContainer = this._container.append('div')
        .attr('class', 'hierarchical-edge-bundling-chart');
    this._legendContainer = this._container.append('div')
        .attr('class', 'hierarchical-edge-bundling-legend')
        .append('svg')
        .attr('class', 'hierarchical-edge-bundling-legend')
        .attr('height', 10);
    this._legendCanvas = this._legendContainer.append('g')
        .attr('class', 'legend-canvas');

    var dimension = this._container.node().getBoundingClientRect();

    this._svg = chartContainer.append('svg')
        .attr('class', 'hierarchical-edge-bundling-chart');
    this._canvas = this._svg
        .append('g')
        .attr('class', 'canvas');

    this._resize(dimension);

    d3.csv(this._config.url, function(error, data) {

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
                return ! n.children;
            })).enter()
            .append('text')
            .attr('class', 'node')
            .attr('transform', function(d) {
                return 'rotate(' + (d.x - 90) + ') translate(' + (d.y + 8) + ', 0) ' + (d.x < 180 ? '' : 'rotate(180)');
            }).style('text-anchor', function(d) {
                return d.x < 180 ? 'start' : 'end';
            }).text(function(d) {
                if (self._maxLabelLength && d.key.length > self._maxLabelLength) {
                    return d.key.substr(0, self._maxLabelLength) + '…';
                } else {
                    return d.key;
                }
            }).on('mouseover', function(d) {
                return self._mouseOverEventHandler(d);
            }).on('mouseout', function(d) {
                return self._mouseEnterEventHandler(d);
            });

        var groupsData = nodesData.filter(function(d) {
            return d.depth === 1;
        });

        groupsData.map(function(d, i, a) {
            d.startAngle = self._toRadians(self._findStartAngle(d.children));
            d.endAngle   = self._toRadians(self._findEndAngle(d.children));

            if (i === 0) {
                d.startAngle += self._toRadians(0.5);
            } else if (i === groupsData.length - 1) {
                d.endAngle -= self._toRadians(0.5);
            }

            if (d.startAngle < Math.PI) {
                d.startAngle -= self._toRadians(2);
            }

            if (d.endAngle > Math.PI) {
                d.endAngle += self._toRadians(2);
            }

            return d;
        })

        self._groups = self._canvas.append('g')
            .attr('class', 'arc-canvas')
            .selectAll('g')
            .data(groupsData)
            .enter()
            .append('g');

        self._arcs = self._groups.append('path')
            .attr('id', function(d, i) {
                return 'arc-' + i;
            }).style('fill', function(d, i) {
                return self._color[i];
            });

        self._arcsText = self._groups.append('text')
            .attr('class', 'arc-label')
            .attr('dx', self._arcLabelsPadding)
            .style('font-size', self._arcWidth / 2);
        self._arcsLables = self._arcsText.append('textPath')
            .attr('xlink:href', function(d, i) {
                return '#arc-' + i;
            }).text(function(d) {
                return d.key;
            });
        self._arcsText
            .attr('dy', function(d, i) {
                return self._arcWidth / 2 + self._arcWidth * 0.2;
            });
        /*
         * Render legend.
         */
        var strX = 0;
        var strLength = 0;
        self._maxStrLength = groupsData.reduce(function(length, d) {
            var text = self._svg.append('text').text(d.key);
            length = Math.max(length, text.node().getBoundingClientRect().width);
            text.remove();
            return length;
        }, 0)

        self._legendCanvas.selectAll('g.legend-item')
            .data(groupsData)
            .enter()
            .append('g')
            .attr('class', 'legend-item')
            .each(function(d, i) {

                var container = d3.select(this);

                var rect = container.append('rect')
                    .attr('width', 15)
                    .attr('height', 15)
                    .attr('x', function() {
                        return strX;
                    }).attr('y', function() {
                        return self._legend.rowsNumber * 15 + 2 * self._legend.rowsNumber;
                    }).style('fill', function() {
                        return self._color[i];
                    });

                strLength += 15;
                strX = strX + self._legend.labelPadding + 15;

                var text = container.append('text')
                    .style('font-size', self._legend.fontSize + 'px')
                    .attr('x', function() {
                        return strX;
                    }).attr('y', function() {
                        return self._legend.rowsNumber * 15 + self._legend.fontSize + 2 * self._legend.rowsNumber;
                    }).text(function() {
                        return d.key;
                    });

                strLength += self._legend.labelPadding + self._maxStrLength;
                strX = strX + self._maxStrLength;

                if (strLength > self._diameter) {

                    self._legend.rowsNumber ++;

                    strX = 0;
                    strLength = 0;

                    rect.attr('x', function() {
                            return strX;
                        }).attr('y', function() {
                            return self._legend.rowsNumber * 15 + 2 * self._legend.rowsNumber;
                        });

                    strLength += 2 + 15;
                    strX = strX + self._legend.labelPadding + 15;

                    text.attr('x', function() {
                            return strX;
                        }).attr('y', function() {
                            return self._legend.rowsNumber * 15 + self._legend.fontSize + 2 * self._legend.rowsNumber;
                        });

                    strLength += self._legend.labelPadding + self._maxStrLength;
                    strX = strX + self._maxStrLength;
                }
            });

        self._legendContainer.attr('height', self._legend.rowsNumber * 17 - 2);
        /*
         * Render tension controls.
         */
        self._controls = self._canvas.append('g')
            .attr('class', 'tension-controls');

        self._controls.append('text')
            .text('tension:');
        self._controls.append('line');
        self._controls.append('circle')
            .attr('r', 8)
            .call(d3.behavior.drag()
                .on('drag', function() {

                    var x1 = self._outerRadius / 2;
                    var x2 = self._outerRadius - 20;

                    self._tensionScale.domain([x1, x2]);

                    var circle = d3.select(this);
                    var x = Number(circle.attr('cx')) + d3.event.dx;
                    circle.attr('cx', Math.max(x1, Math.min(x2, x)));

                    var tension = Math.max(0, Math.min(1, self._tensionScale(x)));
                    self._lineGenerator.tension(tension);
                    self._update();
                }));

        self._update();
    });
};


/**
 * Convert radians to degrees.
 * @private
 * @param {Number} radians
 * @returns {Number}
 */
HierarchicalEdgeBundling.prototype._toDegrees = function(radians) {

    return radians * 180 / Math.PI;
};


/**
 * Convert radians to degrees.
 * @private
 * @param {Number} radians
 * @returns {Number}
 */
HierarchicalEdgeBundling.prototype._toRadians = function(degrees) {

  return degrees * Math.PI / 180;
};


/**
 * Node mouse over event handler.
 * @private
 * @param {Object} d
 */
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


/**
 * Node mouse out event handler.
 * @private
 * @param {Object} d
 */
HierarchicalEdgeBundling.prototype._mouseEnterEventHandler = function() {

  this._links
      .classed('link-target', false)
      .classed('link-source', false);

  this._nodes
      .classed('node-target', false)
      .classed('node-source', false);
};


/**
 * Get nodes list.
 * @private
 * @param {Object[]} nodes
 * @retuns {Object[]}
 */
HierarchicalEdgeBundling.prototype._getNodes = function(nodes) {

    var root = {};
    var map  = {};

    root.children = _.uniqBy(nodes, function(d) {
            return d['Page Type']
        }).map(function(d) {
            return map[d['Page Type']] = {
                key: d['Page Type'],
                parent: root,
                children: []
            }
        });

    this._nodesMap  = {};
    nodes.forEach(function(d, i) {
        var parent = map[d['Page Type']];

        d.parent = parent;
        d.children = [];
        d.key = d['Page Name'];

        this._nodesMap[d['Page ID']] = d;

        parent.children.push(d);
    }, this);

    return root;
};


/**
 * Get links list.
 * @private
 * @param {Object[]} nodes
 * @retuns {Object[][]}
 */
HierarchicalEdgeBundling.prototype._getLinks = function(nodes) {

    var links = [];

    nodes.filter(function(d) {
        return d.depth === 2;
    }).forEach(function(d, i) {
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