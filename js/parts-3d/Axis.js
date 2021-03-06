/**
 * (c) 2010-2016 Torstein Honsi
 *
 * License: www.highcharts.com/license
 */
'use strict';
import H from '../parts/Globals.js';
import '../parts/Utilities.js';
import '../parts/Axis.js';
import '../parts/Chart.js';
import '../parts/Tick.js';
var ZAxis,

	Axis = H.Axis,
	Chart = H.Chart,
	each = H.each,
	extend = H.extend,
	merge = H.merge,
	perspective = H.perspective,
	pick = H.pick,
	splat = H.splat,
	Tick = H.Tick,
	wrap = H.wrap;
/***
	EXTENSION TO THE AXIS
***/
wrap(Axis.prototype, 'setOptions', function (proceed, userOptions) {
	var options;
	proceed.call(this, userOptions);
	if (this.chart.is3d() && this.coll !== 'colorAxis') {
		options = this.options;
		options.tickWidth = pick(options.tickWidth, 0);
		options.gridLineWidth = pick(options.gridLineWidth, 1);
	}
});

wrap(Axis.prototype, 'render', function (proceed) {
	proceed.apply(this, [].slice.call(arguments, 1));

	// Do not do this if the chart is not 3D
	if (!this.chart.is3d() || this.coll === 'colorAxis') {
		return;
	}

	var chart = this.chart,
		renderer = chart.renderer,
		options3d = chart.options.chart.options3d,
		frame = options3d.frame,
		fbottom = frame.bottom,
		fback = frame.back,
		fside = frame.side,
		depth = options3d.depth,
		height = this.height,
		width = this.width,
		left = this.left,
		top = this.top;

	if (this.isZAxis) {
		return;
	}
	if (this.horiz) {
		var bottomShape = {
			x: left,
			y: top + (chart.xAxis[0].opposite ? -fbottom.size : height),
			z: 0,
			width: width,
			height: fbottom.size,
			depth: depth,
			insidePlotArea: false
		};
		if (!this.bottomFrame) {
			this.bottomFrame = renderer.cuboid(bottomShape).attr({
				'class': 'highcharts-3d-frame highcharts-3d-frame-bottom',
				'zIndex': (chart.yAxis[0].reversed && options3d.alpha > 0 ? 4 : -1)
			}).add();

			/*= if (build.classic) { =*/
			this.bottomFrame.attr({
				fill: fbottom.color || 'none',
				stroke: fbottom.color || 'none'
			});
			/*= } =*/
		} else {
			this.bottomFrame.animate(bottomShape);
		}
	} else {
		// BACK
		var backShape = {
			x: left + (chart.yAxis[0].opposite ? 0 : -fside.size),
			y: top + (chart.xAxis[0].opposite ? -fbottom.size : 0),
			z: depth,
			width: width + fside.size,
			height: height + fbottom.size,
			depth: fback.size,
			insidePlotArea: false
		};
		if (!this.backFrame) {
			this.backFrame = renderer.cuboid(backShape).attr({
				'class': 'highcharts-3d-frame highcharts-3d-frame-back',
				zIndex: -3
			}).add();

			/*= if (build.classic) { =*/
			this.backFrame.attr({
				fill: fback.color || 'none',
				stroke: fback.color || 'none'
			});
			/*= } =*/
		} else {
			this.backFrame.animate(backShape);
		}
		var sideShape = {
			x: left + (chart.yAxis[0].opposite ? width : -fside.size),
			y: top + (chart.xAxis[0].opposite ? -fbottom.size : 0),
			z: 0,
			width: fside.size,
			height: height + fbottom.size,
			depth: depth,
			insidePlotArea: false
		};
		if (!this.sideFrame) {
			this.sideFrame = renderer.cuboid(sideShape).attr({
				'class': 'highcharts-3d-frame highcharts-3d-frame-side',
				zIndex: -2
			}).add();

			/*= if (build.classic) { =*/
			this.sideFrame.attr({
				fill: fside.color || 'none',
				stroke: fside.color || 'none'
			});
			/*= } =*/

		} else {
			this.sideFrame.animate(sideShape);
		}
	}
});

wrap(Axis.prototype, 'getPlotLinePath', function (proceed) {
	var path = proceed.apply(this, [].slice.call(arguments, 1));

	// Do not do this if the chart is not 3D
	if (!this.chart.is3d() || this.coll === 'colorAxis') {
		return path;
	}

	if (path === null) {
		return path;
	}

	var chart = this.chart,
		options3d = chart.options.chart.options3d,
		d = this.isZAxis ? chart.plotWidth : options3d.depth,
		opposite = this.opposite;
	if (this.horiz) {
		opposite = !opposite;
	}
	var pArr = [
		this.swapZ({ x: path[1], y: path[2], z: (opposite ? d : 0) }),
		this.swapZ({ x: path[1], y: path[2], z: d }),
		this.swapZ({ x: path[4], y: path[5], z: d }),
		this.swapZ({ x: path[4], y: path[5], z: (opposite ? 0 : d) })
	];

	pArr = perspective(pArr, this.chart, false);
	path = this.chart.renderer.toLinePath(pArr, false);

	return path;
});

// Do not draw axislines in 3D
wrap(Axis.prototype, 'getLinePath', function (proceed) {
	return this.chart.is3d() ? [] : proceed.apply(this, [].slice.call(arguments, 1));
});

wrap(Axis.prototype, 'getPlotBandPath', function (proceed) {
	// Do not do this if the chart is not 3D
	if (!this.chart.is3d() || this.coll === 'colorAxis') {
		return proceed.apply(this, [].slice.call(arguments, 1));
	}

	var args = arguments,
		from = args[1],
		to = args[2],
		toPath = this.getPlotLinePath(to),
		path = this.getPlotLinePath(from);

	if (path && toPath) {
		path.push(
			'L',
			toPath[10],	// These two do not exist in the regular getPlotLine
			toPath[11],  // ---- # 3005
			'L',
			toPath[7],
			toPath[8],
			'L',
			toPath[4],
			toPath[5],
			'L',
			toPath[1],
			toPath[2]
		);
	} else { // outside the axis area
		path = null;
	}

	return path;
});

/***
	EXTENSION TO THE TICKS
***/

wrap(Tick.prototype, 'getMarkPath', function (proceed) {
	var path = proceed.apply(this, [].slice.call(arguments, 1));	

	// Do not do this if the chart is not 3D
	if (!this.axis.chart.is3d() || this.coll === 'colorAxis') {
		return path;
	}

	var pArr = [
		this.axis.swapZ({ x: path[1], y: path[2], z: 0 }),
		this.axis.swapZ({ x: path[4], y: path[5], z: 0 })
	];

	pArr = perspective(pArr, this.axis.chart, false);
	path = [
		'M', pArr[0].x, pArr[0].y,
		'L', pArr[1].x, pArr[1].y
	];
	return path;
});

wrap(Tick.prototype, 'getLabelPosition', function (proceed) {
	var pos = proceed.apply(this, [].slice.call(arguments, 1));

	// Do not do this if the chart is not 3D
	if (this.axis.chart.is3d() && this.coll !== 'colorAxis') {
		pos = perspective([this.axis.swapZ({ x: pos.x, y: pos.y, z: 0 })], this.axis.chart, false)[0];
	}
	return pos;
});

H.wrap(Axis.prototype, 'getTitlePosition', function (proceed) {
	var is3d = this.chart.is3d() && this.coll !== 'colorAxis',
		pos,
		axisTitleMargin;

	// Pull out the axis title margin, that is not subject to the perspective
	if (is3d) {
		axisTitleMargin = this.axisTitleMargin;
		this.axisTitleMargin = 0;
	}

	pos = proceed.apply(this, [].slice.call(arguments, 1));

	if (is3d) {
		pos = perspective([this.swapZ({ x: pos.x, y: pos.y, z: 0 })], this.chart, false)[0];

		// Re-apply the axis title margin outside the perspective
		pos[this.horiz ? 'y' : 'x'] += (this.horiz ? 1 : -1) * // horizontal axis reverses the margin ...
			(this.opposite ? -1 : 1) * // ... so does opposite axes
			axisTitleMargin;
		this.axisTitleMargin = axisTitleMargin;
	}
	return pos;
});

wrap(Axis.prototype, 'drawCrosshair', function (proceed) {
	var args = arguments;
	if (this.chart.is3d()) {
		if (args[2]) {
			args[2] = {
				plotX: args[2].plotXold || args[2].plotX,
				plotY: args[2].plotYold || args[2].plotY
			};
		}
	}
	proceed.apply(this, [].slice.call(args, 1));
});

wrap(Axis.prototype, 'destroy', function (proceed) {
	each(['backFrame', 'bottomFrame', 'sideFrame'], function (prop) {
		if (this[prop]) {
			this[prop] = this[prop].destroy();
		}
	}, this);
	proceed.apply(this, [].slice.call(arguments, 1));
});

/***
    Z-AXIS
***/

Axis.prototype.swapZ = function (p, insidePlotArea) {
	if (this.isZAxis) {
		var plotLeft = insidePlotArea ? 0 : this.chart.plotLeft;
		var chart = this.chart;
		return {
			x: plotLeft + (chart.yAxis[0].opposite ? p.z : chart.xAxis[0].width - p.z),
			y: p.y,
			z: p.x - plotLeft
		};
	}
	return p;
};

ZAxis = H.ZAxis = function () {
	this.isZAxis = true;
	this.init.apply(this, arguments);
};
extend(ZAxis.prototype, Axis.prototype);
extend(ZAxis.prototype, {
	setOptions: function (userOptions) {
		userOptions = merge({
			offset: 0,
			lineWidth: 0
		}, userOptions);
		Axis.prototype.setOptions.call(this, userOptions);
		this.coll = 'zAxis';
	},
	setAxisSize: function () {
		Axis.prototype.setAxisSize.call(this);
		this.width = this.len = this.chart.options.chart.options3d.depth;
		this.right = this.chart.chartWidth - this.width - this.left;
	},
	getSeriesExtremes: function () {
		var axis = this,
			chart = axis.chart;

		axis.hasVisibleSeries = false;

		// Reset properties in case we're redrawing (#3353)
		axis.dataMin = axis.dataMax = axis.ignoreMinPadding = axis.ignoreMaxPadding = null;

		if (axis.buildStacks) {
			axis.buildStacks();
		}

		// loop through this axis' series
		each(axis.series, function (series) {

			if (series.visible || !chart.options.chart.ignoreHiddenSeries) {

				var seriesOptions = series.options,
					zData,
					threshold = seriesOptions.threshold;

				axis.hasVisibleSeries = true;

				// Validate threshold in logarithmic axes
				if (axis.isLog && threshold <= 0) {
					threshold = null;
				}

				zData = series.zData;
				if (zData.length) {
					axis.dataMin = Math.min(pick(axis.dataMin, zData[0]), Math.min.apply(null, zData));
					axis.dataMax = Math.max(pick(axis.dataMax, zData[0]), Math.max.apply(null, zData));
				}
			}
		});
	}
});


/**
* Extend the chart getAxes method to also get the color axis
*/
wrap(Chart.prototype, 'getAxes', function (proceed) {
	var chart = this,
		options = this.options,
		zAxisOptions = options.zAxis = splat(options.zAxis || {});

	proceed.call(this);

	if (!chart.is3d()) {
		return;
	}
	this.zAxis = [];
	each(zAxisOptions, function (axisOptions, i) {
		axisOptions.index = i;
		axisOptions.isX = true; //Z-Axis is shown horizontally, so it's kind of a X-Axis
		var zAxis = new ZAxis(chart, axisOptions);
		zAxis.setScale();
	});
});
