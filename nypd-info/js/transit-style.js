var STYLE = {
	stationCache: {},
	lineCache: {},
	color: {
		1: '#ff3433',
		2: '#ff3433',
		3: '#ff3433',

		4: '#009d33',
		5: '#009d33',
		6: '#009d33',
		7: '#c801cc',

		A: '#0e689a',
		C: '#0e689a',
		E: '#0e689a',

		B: '#fa9705',
		D: '#fa9705',
		F: '#fa9705',

		G: '#98cd01',

		J: '#9d6400',
		M: '#9d6400',
		Z: '#9d6400',

		L: '#999999',
		S: '#999999',

		N: '#ffff0c',
		R: '#ffff0c',
		Q: '#ffff0c'
	},
	zoom: function(resolution){
		return nyc.ol.TILE_GRID.getZForResolution(resolution) - 8;
	},
	line: function(feature, resolution){
		var zoom = STYLE.zoom(resolution),
			line = feature.get('RT_SYMBOL'),
			width = [1, 1, 1, 1, 1, 2, 4, 6, 7, 8, 9, 10, 11, 12][zoom];
		STYLE.lineCache[zoom] = STYLE.lineCache[zoom] || {};
		if (!STYLE.lineCache[zoom][line]){
			STYLE.lineCache[zoom][line] = new ol.style.Style({
				stroke: new ol.style.Stroke({
					color: STYLE.color[line],
					width: width
				})
			});
		}
		return STYLE.lineCache[zoom][line];
	},
	selection: function(feature, resolution){
		var zoom = STYLE.zoom(resolution),
			radius = [6, 6, 10, 10, 10, 14, 18, 22, 26, 34, 50][zoom - 4],
			text;
		var circle = new ol.style.Style({
			image: new ol.style.Circle({
				radius: radius,
				fill: new ol.style.Fill({
					color: 'rgba(255,255,0,0.8)'
				})
			})
		});
		if (feature.selected || zoom > 5){
			var label = feature.get('NAME');
			var offsetY = 0;
			if (label.indexOf('/') > -1){
				label = label.replace(/\//g, '-\n');
				offsetY = 10;
			}
			text = new ol.style.Style({
				text: new ol.style.Text({
					text: label,
					font: 'bold 16px "Helvetica Neue", Helvetica, Arial, sans-serif',
					textAlign: 'left',
					textBaseline: 'top',
					offsetX: 10,
					offsetY: offsetY,
					fill: new ol.style.Fill({
						color: '#085095'
					}),
					stroke: new ol.style.Stroke({
						width: 5,
						color: feature.selected ? '#ffff00' : '#fff'
					})
				})
			});
			return [text, circle, STYLE.station(feature, resolution)];
		}
		return [circle, STYLE.station(feature, resolution)];
	},
	station: function(feature, resolution){
		var zoom = STYLE.zoom(resolution),
			radius = [2, 2, 4, 4, 4, 6, 8, 10, 12, 16, 24][zoom - 4];
		if (!STYLE.stationCache[zoom]){
			STYLE.stationCache[zoom] = new ol.style.Style({
				image: new ol.style.Circle({
					radius: radius,
					stroke: new ol.style.Stroke({
						color: '#000',
						width: radius > 2 ? 2 : 1
					}),
					fill: new ol.style.Fill({
						color: 'rgba(255,255,255,0.9)'
					})
				})
			});
		}
		return STYLE.stationCache[zoom];
	}
};
