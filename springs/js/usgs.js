function usgsTopo(topoLayer) {
  var parser = new ol.format.WMTSCapabilities();

  fetch('https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/WMTS/1.0.0/WMTSCapabilities.xml').then(function(response){
    return response.text();
  }).then(function(text){
    var result = parser.read(text);
  
    var topoOptions = ol.source.WMTS.optionsFromCapabilities(result, {
        layer: 'USGSTopo',
        matrixSet: 'EPSG:900913'
    });
  
    topoLayer.setVisible(false);
    topoLayer.setSource(new ol.source.WMTS(topoOptions));
  });
};
