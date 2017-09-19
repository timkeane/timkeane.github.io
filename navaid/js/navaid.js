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
  this.startingZoomLevel = options.startingZoomLevel || 14;
  this.popup = new nyc.ol.Popup(this.map);
  this.on(nyc.ol.Tracker.EventType.UPDATED, this.updateCurrentTrack, this);
  this.baseLayer();
  this.initDraw();
  this.restoreNamedFeatures();
  this.initCurrentTrack();
  this.setTracking(true);
  this.setupControls();
  this.navSettings();
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
  namedStore: 'navaid-presistent',
  /**
   * @private
   * @member {string}
   */
  iconStore: 'navaid-warn-icon',
  /**
   * @private
   * @member {string}
   */
  alarmStore: 'navaid-warn-alarm',
  /**
   * @private
   * @member {string}
   */
  degreesStore: 'navaid-warn-degrees',
  /**
   * @private
   * @member {boolean}
   */
  firstLaunch: false,
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
   * @member {Jquery}
   */
  navForm: null,
  /**
   * @private
   * @member {Jquery}
   */
  settingsForm: null,
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
          url: 'https://tileservice.charts.noaa.gov/tiles/50000_1/{z}/{x}/{y}.png'
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

    $('body').append($(tk.NavAid.NAV_LIST_HTML)).trigger('create');
    this.navForm = $('#navigation');
    this.settingsForm = $('#navigation-settings');

    $('body').append($(tk.NavAid.NAV_WARN_HTML)).trigger('create');

    $('#navigation-settings input').change($.proxy(this.navSettings, this));
  },
  /**
   * @private
   * @method
   */
  initCurrentTrack: function(){
    var trackIdx = this.storage.getItem('navaid-track-index') || 0;
    trackIdx = (trackIdx * 1) + 1;
    this.firstLaunch = trackIdx == 1;
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
  					radius: 8,
  					fill: new ol.style.Fill({
  						color: 'red'
  					}),
            stroke: new ol.style.Stroke({
              color: '#fff',
              width: 2.5
            })
  				}),
  				zIndex: 300
  			})
  		]
    });
    this.draw.on(nyc.ol.FeatureEventType.ADD, this.nameFeature, this);
    this.draw.on(nyc.ol.FeatureEventType.CHANGE, this.changeFeature, this);
    this.draw.on(nyc.ol.FeatureEventType.REMOVE, this.removeFeature, this);
  },
  /**
   * @private
   * @method
   */
  updateDash: function(){
    var feature = this.navFeature;
    var speed = this.getSpeed() || 0;
    var heading = Math.round((this.getHeading() || 0) * 180 / Math.PI) + '&deg;';
    var distance = feature ? feature.getGeometry().getLength() : 0;
    var arrival = this.remainingTime(distance, speed);
    this.checkCourse(feature, speed, heading);
    speed = (speed * 3.6 * 0.621371).toFixed(2) + ' mph';
    $('#speed span').html(speed);
    $('#heading span').html(heading);
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
   * @param {ol.geom.LineString} line
   * @return {number}
   */
  heading: function(line) {
    var start = line.getFirstCoordinate();
    var end = line.getLastCoordinate();
  	var dx = end[0] - start[0];
  	var dy = end[1] - start[1];
  	var rad = Math.acos(dy / Math.sqrt(dx * dx + dy * dy)) ;
    var deg = 360 / (2 * Math.PI) * rad;
    if (dx < 0){
        return 360 - deg;
    }else{
        return deg;
    }
  },
  /**
   * @private
   * @method
   * @param {ol.Feature} feature
   * @param {number} speed
   * @param {number} heading
   */
  checkCourse: function(feature, speed, heading){
    if (feature && speed){
      var course = this.heading(feature.getGeometry());
      if (Math.abs(course - heading) > this.offCourse){
        this.warnOn();
      }else{
        this.warnOff();
      }
    }else{
      this.warnOff();
    }
  },
  /**
   * @private
   * @method
   */
  warnOff: function(){
    $('#warning').hide();
    clearInterval(this.warnInterval);
    delete this.warnInterval;
  },
  /**
   * @private
   * @method
   */
  warnOn: function(){
    if (this.warnIcon){
      $('#warning').show();
      if (!this.warnInterval){
        this.warnInterval = setInterval(function(){
          $('#warning img').fadeToggle(199);
        }, 400);
      }
    }
    if (this.warnAlarm){
      $('#warning audio').get(0).play();
    }
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
  /**
   * @private
   * @method
  * @param {JQueryEvent} event
   */
  beginNavigation: function(event){
    var feature = $(event.target).data('feature');
    var origin = this.getPosition();
    var destination = this.center(feature);
    this.navFeature = new ol.Feature({
      geometry: new ol.geom.LineString([origin, destination]),
    });
    this.navBtn.addClass('stop');
    this.navForm.slideToggle();
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
            me.warnOff();
            btn.removeClass('stop');
          }
        }
      });
    }else{
      me.showNavigation();
    }
  },
  /**
   * @private
   * @method
   */
  showNavigation: function(){
    var me = this;
    if (!me.navForm){
      me.navForm = $(tk.NavAid.NAV_LIST_HTML);
      $('body').append(me.navForm).trigger('create');
    }

    var names = [];
    for (var name in me.namedFeatures){
      names.push(name);
    };
    names.sort();

    var div = this.navForm.find('.nav-features').empty();
    $.each(names, function(_, name){
      if (name.indexOf('navaid-track') == -1){
        var feature = me.namedFeatures[name];
        var a = $('<a data-role="button">' + name + '</a>');
        a.data('feature', feature);
        a.click($.proxy(me.beginNavigation, me));
        div.append(a).trigger('create');
      }
    });

    me.navForm.slideToggle();
  },
  /**
   * @private
   * @method
   * @param {JQueryEvent} event
   */
  navSettings: function(event){
    if (event){
      this.warnIcon = $('#off-course-icon').is(':checked');
      this.warnAlarm = $('#off-course-alarm').is(':checked');
      this.offCourse = $('#off-course-degrees').val() * 1;
      this.storage.setItem(this.iconStore, this.warnIcon);
      this.storage.setItem(this.alarmStore, this.warnAlarm);
      this.storage.setItem(this.degreesStore, this.offCourse);
    }else if(this.firstLaunch){
      this.warnIcon = true;
      this.warnAlarm = true;
      this.offCourse = 10;
      this.storage.setItem(this.iconStore, true);
      this.storage.setItem(this.alarmStore, true);
      this.storage.setItem(this.degreesStore, 10);
      $('#off-course-icon').prop('checked', this.warnIcon);
      $('#off-course-alarm').prop('checked', this.warnAlarm);
      $('#off-course-degrees').val(this.offCourse);
    }else{
      this.warnIcon = this.storage.getItem(this.iconStore) == 'true';
      this.warnAlarm = this.storage.getItem(this.alarmStore) == 'true';
      this.offCourse = this.storage.getItem(this.degreesStore) * 1;
      $('#off-course-icon').prop('checked', this.warnIcon);
      $('#off-course-alarm').prop('checked', this.warnAlarm);
      $('#off-course-degrees').val(this.offCourse);
    }
    $('#off-course-icon, #off-course-alarm').flipswitch().flipswitch('refresh');
    $('#off-course-degrees').slider().slider('refresh');
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
    return ol.coordinate.toStringHDMS(center).replace(/N/, 'N<br>').replace(/S/, 'S<br>');
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
        if (!name){
          me.draw.removeFeature(feature);
        }else if (!(name in me.namedFeatures)){
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
   * @param {ol.Feature} feature
   */
  changeFeature: function(feature){
    var name = feature.get('name');
    if (name){
      this.storeNamed(name, feature, true);
    }
  },
  /**
   * @private
   * @method
   * @param {ol.Feature} feature
   */
  removeFeature: function(feature){
    var name = feature.get('name');
    delete this.namedFeatures[name];
    delete this.namedGeoJson[name];
    this.storage.setItem(this.namedStore, JSON.stringify(this.namedGeoJson));
  },
  /**
   * @private
   * @method
   * @param {string} name
   * @param {ol.Feature} feature
   * @param {boolean} replace
   */
  storeNamed: function(name, feature, replace){
    var type = this.draw.type;
    var active = this.draw.active();
    if (replace){
      var replacement = new ol.Feature(feature.getProperties());
      if (active){
        this.draw.deactivate();
      }
      this.draw.removeFeature(feature);
      feature = replacement;
      delete this.namedFeatures[name];
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
    if (replace && active){
      this.draw.activate(type);
    }
  }
};

nyc.inherits(tk.NavAid, nyc.ol.Tracker);

/**
 * @private
 * @const
 * @type {string}
 */
tk.NavAid.NAV_LIST_HTML = '<div id="navigation" class="ui-page-theme-a">' +
  '<a class="cancel" onclick="$(this).parent().slideToggle();"></a>' +
  '<a class="settings" onclick="$(\'#navigation-settings\').slideDown();"></a>' +
  '<form class="ui-filterable">' +
    '<input id="named-feature" data-type="search" placeholder="Navigate to...">' +
  '</form>' +
  '<div class="nav-features" data-role="controlgroup" data-filter="true" data-input="#named-feature"></div>' +
'</div>' +
'<div id="navigation-settings" class="ui-page-theme-a">' +
  '<h1>Navigation settings</h1>' +
  '<a class="cancel" onclick="$(\'#navigation-settings\').slideUp();"></a>' +
  '<label for="off-course-icon">Off course warning icon:</label>' +
  '<input id="off-course-icon" type="checkbox" data-role="flipswitch">' +
  '<label for="off-course-alarm">Off course warning alarm:</label>' +
  '<input id="off-course-alarm" type="checkbox" data-role="flipswitch">' +
  '<label for="off-course-degrees">Degrees:</label>' +
  '<input type="range" id="off-course-degrees" min="0" max="180">' +
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

/**
 * @private
 * @const
 * @type {string}
 */
tk.NavAid.NAV_WARN_HTML = '<div id="warning">' +
'<img class="yellow" src="img/warn-yellow.svg">' +
'<img class="red off" src="img/warn-red.svg">' +
  '<audio src="wav/warn.wav"></audio>' +
'</div>';
