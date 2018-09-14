var GEOCLIENT_URL = 'https://maps.nyc.gov/geoclient/v1/search.json?app_key=E2857975AA57366BC&app_id=nyc-gov-nypd';

var PRECINCT_NAME_LOOKUP = {
	'14': 'Midtown South',
	'18': 'Midtown North',
	'22': 'Central Park'
};

var map, precinctSource, precinctLayer, sectorSource, precinctHouseSource, precinctHouseLayer, selectionSource, selectionLayer, showPrecinct = false;

ol.proj.proj4.register(nyc.proj4)

var qstr = document.location.search;
if (qstr){
	var interval = setInterval(function(){
		if (precinctSource && precinctSource.getFeatures().length){
			showPrecinct = qstr.split('=')[1];
			zoomToPrecinct(getPrecinct(showPrecinct));
			clearInterval(interval);
		}
	}, 200);	
}

function mapClicked(event){
	map.forEachFeatureAtPixel(event.pixel, function(feature, layer){
		console.warn(feature);
		
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
	var coords = location.coordinate,
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

	var locationMgr = new nyc.ol.LocationMgr({map: map, url: GEOCLIENT_URL});
	locationMgr.mapLocator.layer.setStyle(new ol.style.Style({
		image: new ol.style.Icon({
			scale: 48 / 512,
			imgSize: [1024, 1024],
			src: '../images/content/pages/icon.svg'
		})
	}));
	locationMgr.on('geocoded', located);

	sectorSource = new ol.source.Vector({
		url: 'sector.json',
		format: new ol.format.TopoJSON()
	});
	sectorLayer = new ol.layer.Vector({source: sectorSource, style: STYLE.sectorStyle});
	map.addLayer(sectorLayer);

	precinctSource = new ol.source.Vector({
			url: 'precinct.json', 
			format: new nyc.ol.format.Decorate({
				parentFormat: new ol.format.TopoJSON(),
				decorations: [{
					getName: function(){
						var pct = this.get('PRECINCT'), name = PRECINCT_NAME_LOOKUP[pct];
						return (name || getOrdinal(pct)) + ' Precinct';
					}
				}]
			})
	});
	precinctLayer = new ol.layer.Vector({source: precinctSource, style: STYLE.precinctStyle});
	map.addLayer(precinctLayer);

	selectionSource = new ol.source.Vector({});
	selectionLayer = new ol.layer.Vector({source: selectionSource, style: STYLE.selectionStyle});
	map.addLayer(selectionLayer);

	precinctHouseSource = new ol.source.Vector({
		url: 'precinct-house.json', 
		format: new nyc.ol.format.Decorate({
			parentFormat: new ol.format.GeoJSON({
				defaultDataProjection: 'EPSG:2263',
				defaultFeatureProjection: 'EPSG:3857'
			}),
			decorations: [{
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
		})
	});
	precinctHouseLayer = new ol.layer.Vector({source: precinctHouseSource, style: STYLE.precinctHouseStyle});
	map.addLayer(precinctHouseLayer);

	map.on('click', mapClicked);

	new nyc.ol.FeatureTip({
		map: map,
		tips: [{
			layer: precinctLayer,
			label: function(feature){
				return {html: feature.getName()};
			}
		},{
			layer: precinctHouseLayer,
			label: function(feature){
				return {
					css: 'precinct-house',
					html: '<b>' + feature.getName() + '</b><br>' + feature.getAddress()
				};
			}
		},{
			layer: selectionLayer,
			label: function(feature){
				if (feature.getAddress){
					return {
						css: 'precinct-house',
						html: '<b>' + feature.getName() + '</b><br>' + feature.getAddress()
					};
				}else if (feature.getName){
					return {html: feature.getName()};
				}
			}
		}]
	});
});
