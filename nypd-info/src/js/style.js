var PRECINCT_COLOR = 'rgba(0,0,255,0.5)';
var PRECINCT_SELECTION_COLOR = 'rgba(0,0,255,1)';
var SECTOR_COLOR = 'rgba(0,0,255,0.2)';
var SECTOR_SELECTION_COLOR = 'rgba(0,0,255,0.1)';

var STYLE = {
	precinctHouseStyleCache: null,
	pointSelectionStyleCache: null,
	polygonStyleCache: {},
	polygonSelectionStyleCache: {},
	getZoom: function(resolution){
		return nyc.ol.TILE_GRID.getZForResolution(resolution);
	},
	polygonStyle: function(feature, zoom, color){
		STYLE.polygonStyleCache[zoom] = STYLE.polygonStyleCache[zoom] || {};
		if (!STYLE.polygonStyleCache[zoom][color]){
			var width = [1, 1, 1, 2, 2, 2, 3, 3, 3, 3, 3][zoom];
			STYLE.polygonStyleCache[zoom][color] = [new ol.style.Style({
				stroke: new ol.style.Stroke({
					color: color,
					width: width
				})
			})];
		}
		return STYLE.polygonStyleCache[zoom][color];
	},
	precinctStyle: function(feature, resolution){
		return STYLE.polygonStyle(feature, STYLE.getZoom(resolution), PRECINCT_COLOR);
	},
	sectorStyle: function(feature, resolution){
		var zoom = STYLE.getZoom(resolution);
		if (zoom < 11){
			return [];
		}
		return STYLE.polygonStyle(feature, zoom, SECTOR_COLOR);
	},
	precinctHouseStyle: function(feature, resolution){
		var zoom = STYLE.getZoom(resolution);
		if (!STYLE.precinctHouseStyleCache){
			STYLE.precinctHouseStyleCache = [new ol.style.Style({
				image: new ol.style.Icon({
					scale: 24 / 512,
					imgSize: [512, 512],
					src: '../images/content/pages/nypd.svg'
				})
			})];
		}
		return zoom > 15 ? STYLE.precinctHouseStyleCache : [];
	},
	selectionStyle: function(feature, resolution){
		if (feature.getGeometry().getType() == 'Point'){
			return STYLE.pointSelectionStyle(feature, resolution);
		}
		return STYLE.polygonSelectionStyle(feature, resolution);
	},
	pointSelectionStyle: function(feature, resolution){
		if (feature.getGeometry().getType() == 'Point'){
			if (!STYLE.pointSelectionStyleCache){
				STYLE.pointSelectionStyleCache =  [new ol.style.Style({
					image: new ol.style.Icon({
						scale: 32 / 512,
						imgSize: [512, 512],
						src: '../images/content/pages/nypd-selected.svg'
					})
				})];
			}
			return STYLE.pointSelectionStyleCache;
		}
	},
	polygonSelectionStyle: function(feature, resolution){
		var zoom = STYLE.getZoom(resolution),
			type = feature.getName ? 'precinct' : 'sector';
		STYLE.polygonSelectionStyleCache[zoom] = STYLE.polygonSelectionStyleCache[zoom] || {};

		if (!STYLE.polygonSelectionStyleCache[zoom][type]){
			if (type == 'precinct'){
				var width = [1, 1, 1, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3][zoom - 8];
				STYLE.polygonSelectionStyleCache[zoom][type] = [new ol.style.Style({
					stroke: new ol.style.Stroke({
						color: PRECINCT_SELECTION_COLOR,
						width: 7
					})
				}),
				new ol.style.Style({
					stroke: new ol.style.Stroke({
						color: '#fff',
						width: width
					})
				})];
			}else{
				STYLE.polygonSelectionStyleCache[zoom][type] = [new ol.style.Style({
					fill: new ol.style.Fill({
						color: SECTOR_SELECTION_COLOR
					})
				})];
			}
		}
		return STYLE.polygonSelectionStyleCache[zoom][type];
	}
};