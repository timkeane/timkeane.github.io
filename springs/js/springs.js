var states = {
  AL: 'Alabama',
  AK: 'Alaska',
  AS: 'American Samoa',
  AZ: 'Arizona',
  AR: 'Arkansas',
  CA: 'California',
  CO: 'Colorado',
  CT: 'Connecticut',
  DE: 'Delaware',
  DC: 'District of Columbia',
  FM: 'Federated States of Micronesia',
  FL: 'Florida',
  GA: 'Georgia',
  GU: 'Guam',
  HI: 'Hawaii',
  ID: 'Idaho',
  IL: 'Illinois',
  IN: 'Indiana',
  IA: 'Iowa',
  KS: 'Kansas',
  KY: 'Kentucky',
  LA: 'Louisiana',
  ME: 'Maine',
  MH: 'Marshall Islands',
  MD: 'Maryland',
  MA: 'Massachusetts',
  MI: 'Michigan',
  MN: 'Minnesota',
  MS: 'Mississippi',
  MO: 'Missouri',
  MT: 'Montana',
  NE: 'Nebraska',
  NV: 'Nevada',
  NH: 'New Hampshire',
  NJ: 'New Jersey',
  NM: 'New Mexico',
  NY: 'New York',
  NC: 'North Carolina',
  ND: 'North Dakota',
  MP: 'Northern Mariana Islands',
  OH: 'Ohio',
  OK: 'Oklahoma',
  OR: 'Oregon',
  PW: 'Palau',
  PA: 'Pennsylvania',
  PR: 'Puerto Rico',
  RI: 'Rhode Island',
  SC: 'South Carolina',
  SD: 'South Dakota',
  TN: 'Tennessee',
  TX: 'Texas',
  UT: 'Utah',
  VT: 'Vermont',
  VI: 'Virgin Islands',
  VA: 'Virginia',
  WA: 'Washington',
  WV: 'West Virginia',
  WI: 'Wisconsin',
  WY: 'Wyoming'
};

var colors = {
  'really-hot': '255,0,0', 
  hot: '255,165,0', 
  warm: '0,255,0', 
  'luke-warm': '0,0,255'
};

function style(feature) {
  var color = colors[feature.get('temperature')];
  return new ol.style.Style({
    image: new ol.style.Circle({
      radius: 10,
      fill: new ol.style.Fill({color: 'rgba(' + color  + ',.4)'}),
      stroke: new ol.style.Stroke({
        width: 2,
        color: 'rgb(' + color + ')'
      })
    })
  });
};

var decorations = {
  extendFeature: function() {
    var tmp = this.get('TF');
    this.set('temperature', 'luke-warm');
    if (tmp > 80) this.set('temperature', 'warm');   
    if (tmp > 90) this.set('temperature', 'hot');
    if (tmp > 104) this.set('temperature', 'really-hot');
    if (tmp === 'H') this.set('temperature', 'hot');
    if (tmp === 'W') this.set('temperature', 'warm');  
  },
  tip: function() {
    return $('<div></div>')
      .append(this.temp())
      .append(this.name());
  },
  html: function() {
    return $('<div></div>')
      .append(this.temp())
      .append(this.name())
      .append(this.location())
      .append(this.map())
      .append(this.info());
  },
  temp: function(tmp) {
    var div = $('<div class="temp"></div>')
      .addClass(this.get('temperature'));
    var tmp = this.get('TF');
    if (!isNaN(tmp)) {
      div.append(tmp + '&deg;F &bull; ' + this.get('TC') + '&deg;C');
    } else {
      div.append('<br>');
    }
    return div;
  },
  name: function() {
    return $('<div class="name"></div>')
      .append(this.get('NAME') || 'NO NAME');
  },
  location: function() {
    var area = this.get('AREA');
    return $('<div></div>')
      .append(area ? (nyc.capitalize(area) + ', ') : '')
      .append(this.get('STATE'));
  },
  map: function() {
    var href = 'https://www.google.com/maps/search/?api=1&query=' + 
      this.get('LAT') + ',' + this.get('LNG');
    var a = $('<a target="blank">Google map</a>')
      .attr('href', href);
    return $('<div></div>').append(a);
  },
  info: function() {
    var href = 'https://www.google.com/search?q="hot+spring"+' + 
      '"' + this.get('NAME') + '"+' +
      '"' + this.get('AREA') + '"+' +
      '"' + states[this.get('STATE')] + '"';
    var a = $('<a target="blank">Google search</a>')
      .attr('href', href);
    return $('<div></div>').append(a);
  }
};

var springSource = new nyc.ol.source.FilterAndSort({
  url: 'data/springs.csv',
  format: new nyc.ol.format.Decorate({
    decorations: [decorations],
    parentFormat: new nyc.ol.format.CsvPoint({
      x: 'LNG', y: 'LAT', projection: 'EPSG:4326'
    })
  })
});

springSource.autoLoad();

var springLayer = new ol.layer.Vector({
  source: springSource,
  style: style,
  zIndex: 100
});

var osmLayer = new ol.layer.Tile({
  source: new ol.source.OSM()
});

var topoLayer = new ol.layer.Tile({visible: false});

var parser = new ol.format.WMTSCapabilities();

fetch('https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/WMTS/1.0.0/WMTSCapabilities.xml').then(function(response){
  return response.text();
}).then(function(text){
  var result = parser.read(text);

  var topoOptions = ol.source.WMTS.optionsFromCapabilities(result, {
      layer: 'USGSTopo',
      matrixSet: 'EPSG:900913'
  });

  topoLayer.setSource(new ol.source.WMTS(topoOptions));
});

var map = new ol.Map({
  target: 'map',
  layers: [osmLayer, topoLayer, springLayer],
  view: new ol.View({
    center: [-12484642, 4506141],
    zoom: 8
  }),
  controls: ol.control.defaults({attribution: false})
});

new nyc.ol.MultiFeaturePopup({map: map, layers: [springLayer]});

new nyc.ol.Filters({
  target: '#filter',
  source: springSource,
  choiceOptions: [{
    title: 'Filter by temperature',
    choices: [
      {name: 'temperature', label: 'Really Hot', values: ['really-hot'], checked: true},
      {name: 'temperature', label: 'Hot', values: ['hot'], checked: true},
      {name: 'temperature', label: 'Warm', values: ['warm'], checked: true},
      {name: 'temperature', label: 'Luke Warm', values: ['luke-warm'], checked: true}
    ]
  }]
});

var basemapChoice = new nyc.Choice({
  target: '#layers',
  radio: true,
  choices: [
    {name: 'basemap', label: 'OpenStreetMap', values: [osmLayer], checked: true},
    {name: 'basemap', label: 'USGS Topo', values: [topoLayer]}
  ]
});

new nyc.Collapsible({
  target: '#basemap',
  title: 'Base map',
  content: '#layers'
});

basemapChoice.on('change', function() {
  osmLayer.setVisible(false);
  topoLayer.setVisible(false);
  basemapChoice.val()[0].values[0].setVisible(true);
});

new nyc.ol.FeatureTip({
  map: map,
  tips: [{
    layer: springLayer,
    label: function(feature) {
      return {
        html: feature.tip()
      }
    }
  }]
});

$('.ol-overlaycontainer-stopevent').append($('#info'));
$('.ol-overlaycontainer-stopevent').append($('#menu'));
$('#menu button').trigger('click');
