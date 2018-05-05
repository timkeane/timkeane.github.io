var GEOCLIENT_URL = 'https://maps.nyc.gov/geoclient/v1/search.json?app_key=E2857975AA57366BC&app_id=nyc-gov-nypd';

var districtSectors = {};
var stationNames = {};

var map;
var controls;
var stationSource;
var stationLayer;
var lineSource;
var lineLayer;
var selection;
var activeStations;
var LocationMgr;
var popup;

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
	var interval = setInterval(function(){
		if (stationSource && stationSource.featuresloaded && lineSource.getFeatures().length) {
			var stationId = selection.station;
			if (stationId){
				var station = stationSource.getFeatureById(stationId);
				locationMgr.setLocation({
					coordinates: station.getGeometry().getCoordinates(),
					name: station.get('NAME')
				});
			}
			clearInterval(interval);
			sectorButtons();
			zoomToStations();
			controls.setFeatures({
				featureTypeName: 'subway',
				features: stationSource.getFeatures(),
				nameField: 'NAME'
			});
			$(controls.input).attr('placeholder', 'Search for a station or address...');
		}
	}, 200);
};

function sectorButtons(){
	var sectors = districtSectors[selection.district];
	$('#sectors').empty();
	if (!sectors.none){
		var sorted = [];
		for (var sector in sectors){
			sorted.push(sector);
		}
		sorted.sort();
		$.each(sorted, function(_, sector){
			var btn = $('<a class="ctl-btn" data-role="button">Sector </a>');
			btn.append(sector)
				.data('sector', sector)
				.click(function(){
					$('#sectors a').removeClass('active');
					$(this).addClass('active');
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

function showPopup(feature){
	popup.show({
		coordinates: feature.getGeometry().getCoordinates(),
		html: feature.html()
	})
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
	html: function(){
		var props = this.getProperties()
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
		var btn = $('<button class="sector" role="buton"></button>');
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

	controls = new nyc.ol.control.ZoomSearch(map);

	lineSource = new ol.source.Vector({
		url: 'subway-line.json',
		format: new ol.format.TopoJSON()
	});
	lineLayer = new ol.layer.Vector({source: lineSource, style: STYLE.line});
	map.addLayer(lineLayer);

	stationSource = new nyc.ol.source.Decorating(
	  {loader: new nyc.ol.source.CsvPointFeatureLoader({
	    url: 'subway-station.csv',
	    projection: 'EPSG:2263',
	    xCol: 'X',
	    yCol: 'Y',
	    fidCol: 'STATION_ID'
	  })},
	  [stationDecorator],
	  {projection: 'EPSG:3857'}
	);
	stationLayer = new ol.layer.Vector({source: stationSource, style: STYLE.station});
	map.addLayer(stationLayer);

	new nyc.ol.FeatureTip(map, [{
		layer: stationLayer,
		labelFunction: function(){
			return {
				css: 'subway',
				text: this.html()
			};
		}
	}]);

	popup = new nyc.ol.Popup(map);

	map.on('click', function(event){
		map.forEachFeatureAtPixel(event.pixel, function(feature, layer){
			if (layer === stationLayer){
				showPopup(feature);
			}
		});
	});

	locationMgr = new nyc.LocationMgr({
		controls: controls,
		locate: new nyc.ol.Locate(new nyc.Geoclient(GEOCLIENT_URL)),
		locator: new nyc.ol.Locator({
			map: map,
			style: new ol.style.Style({
				image: new ol.style.Icon({
					scale: 48 / 512,
					size: [1024, 1024],
					src: '../images/content/pages/icon.svg'
				})
			})
		})
	});

	locationMgr.on(nyc.Locate.EventType.GEOCODE, function(location){
		var id = location.data.STATION_ID;
		if (id){
			showPopup(stationSource.getFeatureById(id));
		}
	});
});
