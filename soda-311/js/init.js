var CD_URL = 'https://services5.arcgis.com/GfwWNkhOj9bNBqoJ/arcgis/rest/services/nycd/FeatureServer/0/query?where=1=1&outFields=*&outSR=4326&f=geojson';
var OPEN_DATA_URL = 'https://data.cityofnewyork.us/resource/fhrw-4uyv.csv';
var WHERE_NOT_MAPPABLE = "x_coordinate_state_plane IS NOT NULL AND y_coordinate_state_plane IS NOT NULL  AND community_board NOT IN ('QNA', 'Unspecified MANHATTAN', 'Unspecified BRONX', 'Unspecified BROOKLYN', 'Unspecified QUEENS', 'Unspecified STATEN ISLAND', '0 Unspecified')";

Date.prototype.toShortISOString = function(){
	return this.toISOString().split('T')[0];
};

var mapRadio = new nyc.Radio({
	target: '#map-type',
	title: 'Map Type',
	choices: [
		{name: 'cd', value: 'cd', label: 'Community Districts', checked: true},
		{name: 'sr', value: 'sr', label: 'Service Request Locations'}
    ]
});

var legend = new nyc.Collapsible({target: '#legend', title: 'Legend', expanded: true}); 

var dateInput = new nyc.Collapsible({target: '#date-ranges', title: 'Created Date', expanded: true}); 

var sodaTextarea = new nyc.Collapsible({target: '#soda-url', title: 'NYC OpenData URL'}); 

var cdSoda = new nyc.soda.Query({
	url: OPEN_DATA_URL,
	select: 'count(unique_key) AS sr_count, community_board AS id',
	group: 'id',
	order: 'sr_count'
});

var srSoda = new nyc.soda.Query({
	url: OPEN_DATA_URL,
	select: "count(id) AS sr_count, x_coordinate_state_plane || ' ' || y_coordinate_state_plane AS id, x_coordinate_state_plane, y_coordinate_state_plane",
	group: 'id, x_coordinate_state_plane, y_coordinate_state_plane',
	order: 'sr_count',
	limit: 50000
});

var cdListSoda = new nyc.soda.Query({
	url: OPEN_DATA_URL,
	select: 'count(unique_key) AS sr_count, community_board, complaint_type',
	group: 'community_board, complaint_type',
	order: 'sr_count DESC'
});

var cdSrTypeDrilldown = new nyc.soda.Query({
	url: OPEN_DATA_URL,
	select: 'unique_key, agency_name, complaint_type, descriptor, created_date, closed_date, resolution_description, location_type, incident_address, street_name, cross_Street_1, cross_Street_2, intersection_street_1, intersection_street_2, city, incident_zip',
	order: 'created_date DESC'
});

var srListSoda = new nyc.soda.Query({
	url: OPEN_DATA_URL,
	select: 'unique_key, agency_name, complaint_type, descriptor, created_date, closed_date, resolution_description, location_type, incident_address, street_name, cross_Street_1, cross_Street_2, intersection_street_1, intersection_street_2, city, incident_zip',
	order: 'complaint_type, created_date DESC'
});

var map = new nyc.ol.Basemap({target: $('#map').get(0)});

var geocoder = new nyc.Geoclient('https://maps.nyc.gov/geoclient/v1/search.json?app_key=74DF5DB1D7320A9A2&app_id=nyc-lib-example');

new nyc.LocationMgr({
	controls: new nyc.ol.control.ZoomSearch(map),
	locate: new nyc.ol.Locate(geocoder),
	locator: new nyc.ol.Locator({map: map})
});

nyc.sr.app = new nyc.sr.App({
	map: map, 
	cdUrl: CD_URL,
	style: new nyc.sr.Style(),
	legend: legend,
	mapRadio: mapRadio,
	dateInput: dateInput,
	sodaTextarea: sodaTextarea,
	cdDecorations: nyc.cd.feature,
	whereNotMappable: WHERE_NOT_MAPPABLE,
	cdSoda: cdSoda,
	srSoda: srSoda,
	cdListSoda: cdListSoda,
	srListSoda: srListSoda,
	buckets: new nyc.sr.Buckets('#record-count span'),
	listDetail: new nyc.sr.ListDetail({
		target: '#list-detail',
		cdSrTypeDrilldown: cdSrTypeDrilldown
	})
});	

var lastYear = new Date();
lastYear.setDate(lastYear.getDate() - 365);

new nyc.soda.Query().execute({
	url: OPEN_DATA_URL,
	select: 'count(unique_key) AS sr_count, complaint_type',
	group: 'complaint_type',
	order: 'sr_count DESC',
	where: "created_date >= '" + lastYear.toShortISOString() + "'",
	callback: $.proxy(nyc.sr.app.gotSrTypes, nyc.sr.app)
});