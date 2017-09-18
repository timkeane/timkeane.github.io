/**
 * @public
 * @namespace
 */
var tk = window.tk || {};

/**
 * @desc A class for tracking position from device Geolocation on NOAA charts
 * @public
 * @class
 * @extends {nyc.ol.Tracker}
 * @constructor
 * @param {nyc.ol.Tracker.Options} options Constructor options
 */
tk.NavAid = function(options){
  options.showEveryTrackPositon = false;
  nyc.ol.Tracker.call(this, options);
  this.firstRun = false;
  this.startingZoomLevel = options.startingZoomLevel || 14;
  this.popup = new nyc.ol.Popup(this.map);
  this.namedStore = 'navaid-presistent';
  this.on(nyc.ol.Tracker.EventType.UPDATED, this.updateCurrentTrack, this);
  this.baseLayer();
  this.initDraw();
  this.restoreNamedFeatures();
  this.initCurrentTrack();
  this.setTracking(true);
  this.setupControls();
  this.navLayer();
  this.map.on('click', this.featureInfo, this);
};

tk.NavAid.prototype = {
  /**
   * @private
   * @member {nyc.ol.Draw}
   */
  draw: null,
  /**
   * @private
   * @member {string}
   */
  namedStore: null,
  /**
   * @private
   * @member {boolean}
   */
  firstRun: false,
  /**
   * @private
   * @member {nyc.ol.Popup}
   */
  popup: null,
  /**
   * @private
   * @member {Jquery}
   */
  waypointBtn: null,
  /**
   * @private
   * @member {Jquery}
   */
  navBtn: null,
  /**
   * @private
   * @member {ol.source.Vector}
   */
  source: null,
  /**
   * @desc Do not restore on load
   * @public
   * @override
   * @method
   */
  restore: function(){},
  /**
   * @desc Orient the view to the current position only when popup is hidden
   * @public
   * @override
   * @method
   * @param {ol.Coordinate|ol.Feature} position The current position
   */
  updateView: function(position){
    if (!$('.popup').is(':visible')){
      nyc.ol.Tracker.prototype.updateView.call(this, position);
    }
  },
  /**
   * @private
   * @method
   */
  baseLayer: function(){
    this.map.addLayer(
      new ol.layer.Tile({
        source: new ol.source.XYZ({
          url: 'http://tileservice.charts.noaa.gov/tiles/50000_1/{z}/{x}/{y}.png'
        })
      })
    );
  },
  /**
   * @private
   * @method
   */
  navLayer: function(){
    this.source = new ol.source.Vector();
    this.map.addLayer(
      new ol.layer.Vector({
        source: this.source,
        style: [
          new ol.style.Style({
            stroke: new ol.style.Stroke({
              color: 'yellow',
              width: 4
            })
          }),
          new ol.style.Style({
            stroke: new ol.style.Stroke({
              color: 'red',
              width: 2
            })
          })
        ]
      })
    );
  },
  /**
   * @private
   * @method
   */
  setupControls: function(){
    this.waypointBtn = $('<a class="waypoint ctl ctl-btn" data-role="button"></a>');
    $('body').append(this.waypointBtn).trigger('create');
    this.waypointBtn.click($.proxy(this.waypoint, this));

    this.navBtn = $('<a class="nav ctl ctl-btn" data-role="button"></a>');
    $('body').append(this.navBtn).trigger('create');
    this.navBtn.click($.proxy(this.toggleNav, this));

    $('body').append($(tk.NavAid.DASH_HTML)).trigger('create');
  },
  /**
   * @private
   * @method
   */
  initCurrentTrack: function(){
    var trackIdx = this.storage.getItem('navaid-track-index') || 0;
    trackIdx = (trackIdx * 1) + 1;
    this.storage.setItem('navaid-track-index', trackIdx);
    this.trackFeature = new ol.Feature();
    this.storeNamed('navaid-track-' + trackIdx, this.trackFeature);
  },
  /**
   * @private
   * @method
   */
  initDraw: function(){
    this.draw = new nyc.ol.Draw({
      map: this.map,
      restore: false,
      showEveryTrackPositon: false,
      style: [
  			new ol.style.Style({
  				fill: new ol.style.Fill({
  					color: 'rgba(255,255,255,.2)'
  				}),
  				zIndex: 0
  			}),
  			new ol.style.Style({
  				stroke: new ol.style.Stroke({
  					color: 'red',
  					width: 3
  				}),
  				zIndex: 200
  			}),
  			new ol.style.Style({
  				image: new ol.style.Circle({
  					radius: 4,
  					fill: new ol.style.Fill({
  						color: 'red'
  					}),
            stroke: new ol.style.Stroke({
              color: '#fff',
              width: 2
            })
  				}),
  				zIndex: 300
  			})
  		]
    });
    this.draw.on(nyc.ol.FeatureEventType.ADD, this.nameFeature, this);
  },
  /**
   * @private
   * @method
   */
  updateDash: function(){
    var feature = this.navFeature;
    var speed = this.getSpeed() || 0;
    var bearing = ((this.getHeading() || 0) * 180 / Math.PI) + '&deg;';
    var distance = feature ? feature.getGeometry().getLength() : 0;
    var arrival = feature ? this.remainingTime(distance, speed) : '';
    speed = (speed * 3.6 * 0.621371).toFixed(2) + ' mph';
    $('#speed span').html(speed);
    $('#heading span').html(bearing);
    $('#arrival span').html(arrival)[arrival ? 'show' : 'hide']();
  },
  /**
   * @private
   * @method
   * @param {number} distance
   * @param {number} speed
   */
  remainingTime: function(distance, speed){
    if (distance && speed){
      var seconds = distance / speed;
      var hr = Math.floor(seconds / 3600);
    	var min = Math.floor((seconds - (hr * 3600))/60);
    	var sec = Math.floor(seconds - (hr * 3600) - (min * 60));
    	if (hr < 10){
        hr = '0' + hr;
      }
    	if (min < 10){
        min = '0' + min;
      }
    	if (sec < 10){
        sec = '0' + sec;
      }
    	return hr + ':' + min + ':' + sec;
    }
    return '';
  },
  /**
   * @private
   * @method
   */
  navigate: function(){
    var origin = this.getPosition();
    var geom = this.navFeature.getGeometry();
    var destination = geom.getLastCoordinate();
    geom.setCoordinates([origin, destination]);
  },
  beginNavigation: function(event){
    var feature = $(event.target).data('feature');
    var origin = this.getPosition();
    var destination = this.center(feature);
    this.navFeature = new ol.Feature({
      geometry: new ol.geom.LineString([origin, destination]),
    });
    this.navBtn.addClass('stop');
    this.navList.slideToggle();
    this.source.addFeature(this.navFeature);
    this.on(nyc.ol.Tracker.UPDATED, this.navigate, this);
  },
  /**
   * @private
   * @method
   */
  toggleNav: function(){
    var me = this, btn = me.navBtn;
    if (btn.hasClass('stop')){
      new nyc.Dialog().yesNo({
        message: 'Stop navigation?',
        callback: function(yesNo){
          if (yesNo){
            me.source.clear();
            me.un(nyc.ol.Tracker.UPDATED, me.navigate, me);
            btn.removeClass('stop');
          }
        }
      });
    }else{
      me.showNavList();
    }
  },
  /**
   * @private
   * @method
   */
  showNavList: function(){
    var me = this;
    if (!me.navList){
      me.navList = $(tk.NavAid.NAV_LIST_HTML);
      $('body').append(me.navList).trigger('create');
    }

    var names = [];
    for (var name in me.namedFeatures){
      names.push(name);
    };
    names.sort();

    var div = this.navList.find('.nav-features').empty();
    $.each(names, function(_, name){
      if (name.indexOf('navaid-track') == -1){
        var feature = me.namedFeatures[name];
        var a = $('<a data-role="button">' + name + '</a>');
        a.data('feature', feature);
        a.click($.proxy(me.beginNavigation, me));
        div.append(a).trigger('create');
      }
    });

    me.navList.slideToggle();
  },
  /**
   * @private
   * @method
   * @param {ol.Feature} feature
   * @return {ol.Coordinate}
   */
  center: function(feature){
    var extent = feature.getGeometry().getExtent();
    return ol.extent.getCenter(extent);
  },
  /**
   * @private
   * @method
   * @param {ol.Feature} feature
   * @return {string}
   */
  dms: function(feature){
    var center = this.center(feature);
    center = proj4(this.view.getProjection().getCode(), 'EPSG:4326', center);
    return ol.coordinate.toStringHDMS(center);
  },
  /**
   * @private
   * @method
   * @param {ol.Feature} feature
   * @return {JQuery|undefined}
   */
  infoHtml: function(feature){
    var name = feature.get('name');
    if (name){
      var me = this, html = $('<div></div>');
      html.append('<div>' + me.dms(feature) + '</div>')
      if (name.indexOf('navaid-track') == 0){
        var btn = $('<button>Name this track...</button>');
        btn.click(function(){
          me.nameFeature(feature, true);
        });
        html.append(btn);
      }else{
        html.append('<div><b>' + name + '</b></div>')
      }
      return html;
    }
  },
  /**
   * @private
   * @method
   * @param {ol.MapBrowserEvent} event
   */
  featureInfo: function(event){
    var feature = this.map.forEachFeatureAtPixel(event.pixel, function(feature){
      return feature;
    });
    if (feature){
      var html = this.infoHtml(feature);
      if (html){
        this.popup.show({
          html: html,
          coordinates: this.center(feature)
        });
      }
    }
  },
  /**
   * @private
   * @method
   */
  restoreNamedFeatures: function(){
    var features = [], stored = this.storage.getItem(this.namedStore);
    this.namedGeoJson = stored ? JSON.parse(stored) : {};
    this.namedFeatures = {};
    for (var name in this.namedGeoJson){
      var feature = this.geoJson.readFeature(this.namedGeoJson[name], {
        dataProjection: 'EPSG:4326',
        featureProjection: this.view.getProjection()
      });
      this.namedFeatures[name] = feature;
      features.push(feature);
    }
    this.draw.addFeatures(features);
  },
  /**
   * @private
   * @method
   */
  updateCurrentTrack: function(){
    this.trackFeature.setGeometry(this.track);
    this.updateDash();
  },
  /**
   * @private
   * @method
   */
  waypoint: function(){
    var feature = new ol.Feature({
      geometry: new ol.geom.Point(this.getPosition())
    });
    this.nameFeature(feature);
  },
  /**
   * @private
   * @method
   * @param {ol.Feature} feature
   * @param {boolean} replace
   */
  nameFeature: function(feature, replace){
    var me = this;
    new nyc.Dialog().input({
      placeholder: 'Enter a name...',
      callback: function(name){
        if (!(name in me.namedFeatures)){
          me.storeNamed(name, feature, replace);
        }else{
          new nyc.Dialog().ok({
              message: '<b>' + name + '</b> is already assigned',
              callback: function(){
                me.nameFeature(feature, replace);
              }
          });
        }
      }
    });
  },
  /**
   * @private
   * @method
   * @param {string} name
   * @param {ol.Feature} feature
   * @param {boolean} replace
   */
  storeNamed: function(name, feature, replace){
    if (replace){
      var replacement = new ol.Feature(feature.getProperties());
      this.draw.removeFeature(feature);
      feature = repalcement;
      delete me.namedFeatures[feature.get('name')];
    }
    feature.set('name', name);
    feature.setId(name);
    this.namedFeatures[name] = feature;
    this.namedGeoJson[name] = this.geoJson.writeFeature(feature, {
      featureProjection: this.view.getProjection()
    });
    this.storage.setItem(this.namedStore, JSON.stringify(this.namedGeoJson));
    if (!this.draw.source.getFeatureById(name)){
      this.draw.addFeatures([feature]);
    }
  }
};

nyc.inherits(tk.NavAid, nyc.ol.Tracker);

/**
 * @private
 * @const
 * @type {string}
 */
tk.NavAid.NAV_LIST_HTML = '<div class="nav-list ui-page-theme-a">' +
  '<a class="cancel" data-role="button" onclick="$(this).parent().slideToggle();">Cancel</a>' +
  '<form class="ui-filterable">' +
    '<input id="named-feature" data-type="search">' +
  '</form>' +
  '<div class="nav-features" data-role="controlgroup" data-filter="true" data-input="#named-feature"></div>' +
'</div>';

/**
 * @private
 * @const
 * @type {string}
 */
tk.NavAid.DASH_HTML = '<div class="nav-dash">' +
  '<div id="speed"><span></span></div>' +
  '<div id="heading"><span></span></div>' +
  '<div id="arrival"><span></span></div>' +
'</div>';
