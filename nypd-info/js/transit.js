var GEOCLIENT_URL = 'https://maps.nyc.gov/geoclient/v1/search.json?app_key=E2857975AA57366BC&app_id=nyc-gov-nypd';

var districtSectors = {};
var stationNames = {};

var map;
var stationSource;
var stationLayer;
var lineSource;
var lineLayer;
var selection;
var activeStations;
var LocationMgr;
var zoomSearch;
var popup;

ol.proj.proj4.register(nyc.proj4)

function ready(features){
	var stationId = selection.station;
		if (stationId){
			var station = stationSource.getFeatureById(stationId);
			selection.district = selection.district || station.get('DISTRICT')
			selection.sector = selection.sector || station.get('SECTOR')
			locationMgr.setLocation({
				coordinate: station.getGeometry().getCoordinates(),
				name: station.get('NAME')
			});
		}
		sectorButtons();
		zoomToStations();
		zoomSearch.setFeatures({
			layerName: 'subway',
			features: features,
			nameField: 'NAME'
		});
		$(zoomSearch.input).attr('placeholder', 'Search for a station or address...');

	};

var qstr = document.location.search;
if (qstr){
	var args = qstr.substring(1).split('&');
	selection = {};
	$.each(args, function(){
		var pair = this.split('=');
		if (pair.length == 2){
			selection[pair[0]] = pair[1];
		}
	});
};

function sectorButtons(){
	var sectors = districtSectors[selection.district] || {};
	$('#sectors').empty();
	if (sectors.none){
		$('#sectors').hide();
	}else{
		var sorted = [];
		$('#sectors').show()
			.attr('region', 'Select a sector for District ' + selection.district);
		for (var sector in sectors){
			sorted.push(sector);
		}
		sorted.sort();
		$.each(sorted, function(_, sector){
			var btn = $('<a class="btn rad-all" role="button" href="#">Sector </a>');
			btn.append(sector)
				.data('sector', sector)
				.click(function(){
					$('#sectors a').removeClass('focused');
					$(this).addClass('focused');
		      selection.sector = $(this).data('sector');
		      zoomToStations();
		    });
			$('#sectors').append(btn).trigger('create');
		});
	}
};

function zoomToStations(){
	getActiveStations();
	var features = activeStations.features;
	if (features.length){
		var view = map.getView();
		if (features.length > 1){
			view.fit(activeStations.extent, {
				size: map.getSize(), duration: 500,
				constrainResolution: false
			});
		}else{
			view.animate({
				center: features[0].getGeometry().getCoordinates(),
				zoom: 16
			});
		}
	}
};

function getActiveStations(){
	var extent = ol.extent.createEmpty()
	var features = [];

	$.each(stationSource.getFeatures(), function(_, station){
		station.active = false;
		var districtMatch = station.get('DISTRICT') == selection.district;
		var sectorMatch = station.get('SECTOR') == selection.sector || !selection.sector;
		station.selected = station.getId() == selection.station;
		if (districtMatch && sectorMatch){
			station.active = true;
			features.push(station);
			extent = ol.extent.extend(extent, station.getGeometry().getExtent());
		}
	});
	var width = ol.extent.getWidth(extent);
	extent = ol.extent.buffer(extent, width / 10);
	activeStations = {extent: extent, features: features};
	getActiveLines();
};

function getActiveLines(){
	$.each(lineSource.getFeatures(), function(_, line){
		line.active = false;
		$.each(activeStations.features, function(_, station){
			var coord = station.getGeometry().getCoordinates();
			var stationExt = [coord[0] - 200, coord[1] - 200, coord[0] + 200, coord[1] + 200];
			if (!line.active){
				line.active = line.getGeometry().intersectsExtent(stationExt);
			}
		});
	});
};

var stationDecorator = {
	extendFeature: function(){
		var district = this.get('DISTRICT');
		var sector = this.get('SECTOR');
		districtSectors[district] = districtSectors[district] || {};
		districtSectors[district][sector || 'none'] = true;

		var name = this.get('NAME');
		this.label = '';
		if (!stationNames[name]){
			stationNames[name] = true;
			var wrapped = '';
			var label = name.replace('/\//', ' ');
			if (label.length > 12) {
				label = label.replace(' /', '|');
				$.each(label.split(' '), function(_, word){
					var lines = wrapped.split('\n')
					if (lines.length && (lines[lines.length - 1] + word).length > 12) {
						wrapped += ('\n' + word + ' ');
					}else{
						wrapped += (word + ' ');
					}
				});
				wrapped = wrapped.replace('|', '/');
			}
			this.label = wrapped ? wrapped.trim() : label;
		}
	},
	getName: function(){
		return this.get('NAME');
	},
	html: function(){
		var props = this.getProperties();
		var html = $('<div></div>');
		var div = $('<div class="sta-name"></div>');
		div.append(props.NAME);
		html.append(div);
		var lines = props.LINE.split(',');
		$.each(lines, function(){
			var div = $('<div class="sta-icon"></div>');
			div.html(this).addClass('sta-' + this);
			html.append(div);
		});
		var sector = props.SECTOR.trim()
		var btn = $('<button class="btn rad-all" role="buton"></button>');
		btn.append('District ' + props.DISTRICT);
		if (sector){
			btn.append(' Sector ' + sector);
		}
		btn.click(function(){
			window.parent.clickedStation(props);
		});
		return html.append(btn).trigger('create');
	}
};

$(document).ready(function(){
	map = new nyc.ol.Basemap({target: $('#map').get(0)});
	map.labels.base.setOpacity(.5);

	lineSource = new ol.source.Vector({
		url: 'subway-line.json',
		format: new ol.format.TopoJSON()
	});
	lineLayer = new ol.layer.Vector({source: lineSource, style: STYLE.line});
	map.addLayer(lineLayer);

	stationSource = new nyc.ol.source.AutoLoad({
		url: 'subway-station.csv',
		format: new nyc.ol.format.Decorate({
			decorations:  [stationDecorator],
			parentFormat: new nyc.ol.format.CsvPoint({
				x: 'X',
				y: 'Y',
				id: 'STATION_ID',
				dataProjection: 'EPSG:2263'
			})
		})
	});
	stationSource.autoLoad().then(ready);

	stationLayer = new ol.layer.Vector({source: stationSource, style: STYLE.station});
	map.addLayer(stationLayer);

	new nyc.ol.FeatureTip({
		map: map,
		tips: [{
			layer: stationLayer,
			label: function(feature) {
				return {css: 'subway', html: feature.getName()}
			}
		}]
	});

	popup = new nyc.ol.FeaturePopup({map: map, layers: [stationLayer]});

	locationMgr = new nyc.ol.LocationMgr({map: map, url: GEOCLIENT_URL});
	zoomSearch = locationMgr.zoomSearch
	locationMgr.mapLocator.layer.setStyle(new ol.style.Style({
		image: new ol.style.Icon({
			scale: 48 / 512,
			imgSize: [1024, 1024],
			src: '../images/content/pages/icon.svg'
		})
	}));

	locationMgr.on('geocoded', function(location){
		var id = location.data.STATION_ID;
		if (id){
			popup.showFeature(stationSource.getFeatureById(id));
		}
	});
});
