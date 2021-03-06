var JQUERY = "https://cdnjs.cloudflare.com/ajax/libs/jquery/2.2.4/jquery.js";
var PROJ4 = "https://cdnjs.cloudflare.com/ajax/libs/proj4js/2.3.15/proj4.js";
var OPENLAYERS = "https://cdnjs.cloudflare.com/ajax/libs/openlayers/4.6.5/ol.js";

function makeMap(){
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
    projection: 'EPSG:3857',
    center: [-8235252, 4969073],
    zoom: 10.5
  });

$('div.openLayers.flexItem').empty(0);

  var map = new ol.Map({
    target: $('div.openLayers.flexItem').get(0), view: view
  });

  console.info(map);
  window.ol_map = map;

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
};


(function(){
  function loadScript(url, callback){
    var script = document.createElement("script");
    script.type = "text/javascript";
    if (script.readyState){ //IE
      script.onreadystatechange = function(){
        if (script.readyState == "loaded" || script.readyState == "complete"){
          script.onreadystatechange = null;
          callback();
        }
      };
    }else{ //Others
      script.onload = callback;
    }
    script.src = url;
    document.getElementsByTagName("head")[0].appendChild(script);
  }

  loadScript(JQUERY, function(){
    loadScript(PROJ4, function(){
      loadScript(OPENLAYERS, makeMap);
    });
  });

})();
