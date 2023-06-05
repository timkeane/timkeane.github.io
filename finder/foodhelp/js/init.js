nyc.ol.style.LOCATION_ICON_SVG  = 'img/me.svg';
nyc.ol.style.LOCATION_ICON_PNG  = 'img/me.png';

$(document).ready(function() {

	new nyc.Share('#map');

	var lang = new nyc.lang.Translate({target: '#translate', languages: nyc.foodhelp.TRANSLATION_LANGS, messages: nyc.foodhelp.messages});

	var map = new nyc.ol.Basemap({target: $('#map').get(0)});

	var locationSource = new nyc.ol.source.FilteringAndSorting({
		loader: new nyc.ol.source.CsvPointFeatureLoader({
			url: 'data/location.csv',
			projection: 'EPSG:4326',
			xCol: 'LONGITUDE',
			yCol: 'LATITUDE'
		}),
		}, [nyc.foodhelp.fieldAccess, nyc.foodhelp.renderer],{
			nativeProjection: 'EPSG:4326',
			projection: 'EPSG:3857'
	});

	/* See README.md for getting your GeoClient App Id and App Key */
	var geocoder = new nyc.Geoclient('//maps.nyc.gov/geoclient/v1/search.json?app_key=74DF5DB1D7320A9A2&app_id=nyc-lib-example');

		var locator = new nyc.foodhelp.Locator({map: map}, locationSource);

		var locationMgr = new nyc.LocationMgr({
			controls: new nyc.ol.control.ZoomSearch(map),
			locate: new nyc.ol.Locate(geocoder),
			locator: locator
		});

		$('.z-srch input').attr('data-msg-key', 'search_addr').attr('data-msg-attr', 'placeholder');

		nyc.foodhelp.app = new nyc.foodhelp.App(map, locationSource, locator, new nyc.foodhelp.Style(), locationMgr, lang, new nyc.ol.Popup(map));

});
