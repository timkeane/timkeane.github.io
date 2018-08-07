var STYLE = {
	color: {
		1: '255,52,51',
		2: '255,52,51',
		3: '255,52,51',

		4: '0,157,51',
		5: '0,157,51',
		6: '0,157,51',

		7: '200,1,204',

		A: '14,104,154',
		C: '14,104,154',
		E: '14,104,154',

		B: '250,151,5',
		D: '250,151,5',
		F: '250,151,5',

		G: '152,205,1',

		J: '157,100,0',
		M: '157,100,0',
		Z: '157,100,0',

		L: '153,153,153',
		S: '153,153,153',

		N: '255,255,12',
		R: '255,255,12',
		Q: '255,255,12'
	},
	zoom: function(resolution){
		return nyc.ol.TILE_GRID.getZForResolution(resolution) - 8;
	},
	line: function(feature, resolution){
		var zoom = STYLE.zoom(resolution);
		var line = feature.get('RT_SYMBOL');
		var color = STYLE.color[line];
		color = feature.active ? ('rgb(' + color + ')') : ('rgba(' + color + ',.3)');
		width = [1, 1, 1, 1, 1, 2, 4, 6, 7, 8, 9, 10, 11, 12][zoom];
		return new ol.style.Style({
			stroke: new ol.style.Stroke({
				color: color,
				width: feature.active ? (width * 1.5) : width
			})
		});
	},
	text: function(feature, resolution){
		var active = feature.active;
		if (active){
			var zoom = STYLE.zoom(resolution);
			var size = [5, 7, 9, 11, 13, 15, 16][zoom - 4] || 16;
			var offsetX = [2, 2, 4, 4, 4, 6, 8, 10, 12, 16, 24][zoom - 4] * 2.5;
			var label = feature.label;
			var offsetY = label.split('\n').length * (offsetX / 2);
			var font = size + 'px sans-serif';
			window.font = font;
			return new ol.style.Style({
				text: new ol.style.Text({
					text: label,
					font: font,
					textAlign: 'left',
					textBaseline: 'top',
					offsetX: offsetX,
					offsetY: offsetY,
					fill: new ol.style.Fill({
						color: '#000'
					}),
					stroke: new ol.style.Stroke({
						width: size / 4,
						color: '#fff'
					})
				})
			})
		}
	},
	station: function(feature, resolution){
		var zoom = STYLE.zoom(resolution),
			radius = [2, 2, 4, 4, 4, 6, 8, 10, 12, 16, 24][zoom - 4];
		var marker = new ol.style.Style({
			image: new ol.style.Circle({
				radius: feature.active ? (radius * 1.5) : radius,
				stroke: new ol.style.Stroke({
					color: feature.active ? '#000' : 'rgba(0,0,0,.4)',
					width: radius > 2 ? 2 : 1
				}),
				fill: new ol.style.Fill({
					color: feature.active ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.3)'
				})
			})
		});
		var text = STYLE.text(feature, resolution);
		return text ? [marker, text] : marker;
	}
};
