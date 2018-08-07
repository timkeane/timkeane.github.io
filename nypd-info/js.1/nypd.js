var GEOCLIENT_URL = 'https://maps.nyc.gov/geoclient/v1/search.json?app_key=E2857975AA57366BC&app_id=nyc-gov-nypd';

var PRECINCT_NAME_LOOKUP = {
	'14': 'Midtown South',
	'18': 'Midtown North',
	'22': 'Central Park'
};

var map, precinctSource, precinctLayer, sectorSource, precinctHouseSource, precinctHouseLayer, selectionSource, selectionLayer, showPrecinct = false;

var qstr = document.location.search;
if (qstr){
	showPrecinct = qstr.split('=')[1];
	var interval = setInterval(function(){
		if (precinctSource.getFeatures().length) {
			zoomToPrecinct(getPrecinct(showPrecinct));
			clearInterval(interval);
		}
	}, 200);
};

function mapClicked(event){
	map.forEachFeatureAtPixel(event.pixel, function(feature, layer){
		var pct = feature.get('PRECINCT');
		if (pct){
			window.parent.clickedPrecinct(pct);
		}
	});
};

function getFeature(pct, source){
	var feature;
	$.each(source.getFeatures(), function(_, f){
		if (f.get('PRECINCT') == pct){
			feature = f;
		}
	});
	return feature;
};

function getPrecinct(pct){
	return getFeature(pct, precinctSource);
};

function getPrecinctHouse(pct){
	return getFeature(pct, precinctHouseSource);
};

function located(location){
	var coords = location.coordinates,
		precinctFeature = precinctSource.getFeaturesAtCoordinate(coords)[0],
		sectorFeature = sectorSource.getFeaturesAtCoordinate(coords)[0];
	if (precinctFeature){
		zoomToPrecinct(precinctFeature, sectorFeature);
	}else{
		console.warn('Where are you?');
	}
};

function zoomToPrecinct(precinctFeature, sectorFeature){
	selectionSource.clear();
	var view = map.getView(),
		geom = precinctFeature.getGeometry(),
		pct = precinctFeature.get('PRECINCT')
		houseFeature = getPrecinctHouse(pct);
	selectionSource.addFeature(precinctFeature);
	if (sectorFeature){
		selectionSource.addFeature(sectorFeature);
	}
	if (houseFeature){
		selectionSource.addFeature(houseFeature);
	}
	view.fit(geom.getExtent(), {size: map.getSize(), duration: 500});
	if (window.parent && window.parent.gotPrecinctHouse){
		var props = houseFeature ? houseFeature.getProperties() : {PRECINCT: pct};
		if (sectorFeature){
			props.SECTOR = sectorFeature.get('SECTOR');
		}
		window.parent.gotPrecinctHouse(props);
	}
};


function getOrdinal(n){
   var s = ['th', 'st', 'nd', 'rd'], v = n % 100;
   return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

$(document).ready(function(){

	map = new nyc.ol.Basemap({target: $('#map').get(0)});

	var geocoder = new nyc.Geoclient(GEOCLIENT_URL);

	var locationMgr = new nyc.LocationMgr({
		controls: new nyc.ol.control.ZoomSearch(map),
		locate: new nyc.ol.Locate(geocoder),
		locator: new nyc.ol.Locator({map: map})
	});
	locationMgr.on(nyc.Locate.EventType.GEOCODE, located);

	sectorSource = new ol.source.Vector({
		url: 'sector.json',
		format: new ol.format.TopoJSON
	});
	sectorLayer = new ol.layer.Vector({source: sectorSource, style: STYLE.sectorStyle});
	map.addLayer(sectorLayer);

	precinctSource = new nyc.ol.source.Decorating(
		{url: 'precinct.json', format: new ol.format.TopoJSON},
		[{
			getName: function(){
				var pct = this.get('PRECINCT'), name = PRECINCT_NAME_LOOKUP[pct];
				return (name || getOrdinal(pct)) + ' Precinct';
			}
		}]
	);
	precinctLayer = new ol.layer.Vector({source: precinctSource, style: STYLE.precinctStyle});
	map.addLayer(precinctLayer);

	selectionSource = new ol.source.Vector({});
	selectionLayer = new ol.layer.Vector({source: selectionSource, style: STYLE.selectionStyle});
	map.addLayer(selectionLayer);

	precinctHouseSource = new nyc.ol.source.Decorating(
		{url: 'precinct-house.json', format: new ol.format.GeoJSON},
		[{
			getName: function(){
				var pct = this.get('PRECINCT'), name = PRECINCT_NAME_LOOKUP[pct];
				return (name || getOrdinal(pct)) + ' Precinct House';
			},
			getAddress: function(){
				var num = this.get('NUM'),
					suf = this.get('SUF') || '',
					st = this.get('STREET'),
					boro = this.get('BORO'),
					zip = this.get('ZIP');
				return num + ' ' + suf + ' ' + st + '<br>' + boro + ', NY ' + zip;
			}
		}]
	);
	precinctHouseLayer = new ol.layer.Vector({source: precinctHouseSource, style: STYLE.precinctHouseStyle});
	map.addLayer(precinctHouseLayer);

	map.on('click', mapClicked);

	new nyc.ol.FeatureTip(map, [{
		layer: precinctLayer,
		labelFunction: function(){
			return {text: this.getName()};
		}
	},{
		layer: precinctHouseLayer,
		labelFunction: function(){
			return {
				cssClass: 'precinct-house',
				text: '<b>' + this.getName() + '</b><br>' + this.getAddress()
			};
		}
	},{
		layer: selectionLayer,
		labelFunction: function(){
			if (this.getAddress){
				return {
					cssClass: 'precinct-house',
					text: '<b>' + this.getName() + '</b><br>' + this.getAddress()
				};
			}
		}
	}]);

});
