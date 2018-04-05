var RESOLUTIONS = [
  434.027777777773,
  303.819444444441,
  222.222222222220,
  111.111111111110,
  55.555555555555,
  27.777777777778,
  13.888888888889,
  6.944444444444,
  3.472222222222,
  1.736111111111,
  0.868055555556,
  0.434027777778,
  0.217013888889,
  0.108506944444
];
var EXTENT = [700000.0,-4444.444444444671,1366666.666666667,440000.0];

proj4.defs(
  'EPSG:2263',
  '+proj=lcc +lat_1=41.03333333333333 +lat_2=40.66666666666666 +lat_0=40.16666666666666 +lon_0=-74 +x_0=300000.0000000001 +y_0=0 +ellps=GRS80 +datum=NAD83 +units=ft +to_meter=0.3048006096012192 +no_defs'
);

var grid = new ol.tilegrid.TileGrid({
  extent: EXTENT,
  resolutions: RESOLUTIONS,
  tileSize: [512, 512]
});

var view = new ol.View({
  center: [-8235252, 4969073],
  zoom: 10.5
});

var map = new ol.Map({target: 'map', view: view});

var source = new ol.source.TileWMS({
  tileGrid: grid,
  projection: 'EPSG:2263',
  serverType: 'geoserver',
  urls: [
    'http://maps.nyc.gov/geowebcache/service/wms/',
    'http://maps1.nyc.gov/geowebcache/service/wms/',
    'http://maps2.nyc.gov/geowebcache/service/wms/',
    'http://maps3.nyc.gov/geowebcache/service/wms/',
    'http://maps4.nyc.gov/geowebcache/service/wms/'
  ],
  params: {
    SERVICE: 'WMS',
    VERSION: '1.1.1',
    FORMAT: 'image/png',
    LAYERS: 'dtm',
    TRANSPARENT: false
  }
});

var layer = new ol.layer.Tile({source: source});

map.addLayer(layer);
