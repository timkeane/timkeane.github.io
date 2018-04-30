var GEOCLIENT_URL = 'https://maps.nyc.gov/geoclient/v1/search.json?app_key=E2857975AA57366BC&app_id=nyc-gov-nypd';

var map, controls, stationSource, stationLayer, lineSource, lineLayer, selectionSource, selectionLayer, bySector;

var qstr = document.location.search;
if (qstr){
	var args = qstr.substring(1).split('&');
	bySector = {};
	$.each(args, function(){
		var pair = this.split('=');
		if (pair.length == 2){
			bySector[pair[0]] = pair[1];
		}
	});
	var interval = setInterval(function(){
		if (stationSource && stationSource.getFeatures().length) {
			clearInterval(interval);
			zoomToSector(getStations(bySector));
			controls.setFeatures({
				featureTypeName: 'subway',
				features: stationSource.getFeatures(),
				nameField: 'NAME'
			});
			$(controls.input).attr('placeholder', 'Search for a station or address...');
			}
	}, 200);
};

function getStations(bySector){
	var station = bySector.station ? stationSource.getFeatureById(bySector.station) : '';
	var sector = bySector.sector || (station ? station.get('SECTOR') : '');
	var district = bySector.district || (station ? station.get('DISTRICT') : '');
	var features = [];
	var extent = ol.extent.createEmpty();
	$.each(stationSource.getFeatures(), function(){
		var props = this.getProperties()
		if (props.DISTRICT == district && (!sector || props.SECTOR == sector)){
			features.push(this);
			extent = ol.extent.extend(extent, this.getGeometry().getExtent())
		}
	});
	if (station){
		station.selected = true;
		if (!features.length){
			features.push(station);
		}
	}
	return {features: features, extent: extent}
};

function zoomToSector(stations){
	if (stations.features.length){
		var view = map.getView();
		selectionSource.clear();
		selectionSource.addFeatures(stations.features);
		if (stations.features.length > 1){
			view.fit(stations.extent, {size: map.getSize(), duration: 500});
		}else{
			view.animate({
				center: stations.features[0].getGeometry().getCoordinates(),
				zoom: 16
			});
		}
	}
};

var stationDecorator = {
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

	controls = new nyc.ol.control.ZoomSearch(map);

	lineSource = new ol.source.Vector({
		url: 'subway-line.json',
		format: new ol.format.TopoJSON
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

	selectionSource = new ol.source.Vector({});
	selectionLayer = new ol.layer.Vector({source: selectionSource, style: STYLE.selection});
	map.addLayer(selectionLayer);

	new nyc.ol.FeatureTip(map, [{
		layer: stationLayer,
		labelFunction: function(){
			return {
				css: 'subway',
				text: this.html()
			};
		}
	}]);

	var popup = new nyc.ol.Popup(map);
	function showPopup(feature){
		popup.show({
			coordinates: feature.getGeometry().getCoordinates(),
			html: feature.html()
		})
	};

	map.on('click', function(event){
		map.forEachFeatureAtPixel(event.pixel, function(feature, layer){
			if (layer === stationLayer){
				showPopup(feature);
			}
		});
	});

	var geocoder = new nyc.Geoclient(GEOCLIENT_URL);
	var locationMgr = new nyc.LocationMgr({
		controls: controls,
		locate: new nyc.ol.Locate(geocoder),
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
