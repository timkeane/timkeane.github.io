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
  this.setupControls();
  this.navSettings();
  this.navLayer();
  this.setTracking(false);
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
   * @desc Enable or disable tracking
   * @public
   * @override
   * @method
   * @param {boolean} tracking Whether or not to track position
   */
  setTracking: function(tracking){
    if (tracking){
      this.updateView = tk.NavAid.prototype.updateView;
      nyc.ol.Tracker.prototype.setTracking.call(this, false);
    }else{
      this.updateView = function(){};
    }
    $('.pause-btn')[tracking ? 'addClass' : 'removeClass']('pause');
    nyc.ol.Tracker.prototype.setTracking.call(this, true);
  },
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
    var target = $(this.map.getTarget());

    this.waypointBtn = $('<a class="waypoint ctl ctl-btn" data-role="button"></a>');
    target.append(this.waypointBtn).trigger('create');
    this.waypointBtn.click($.proxy(this.waypoint, this));

    this.navBtn = $('<a class="nav ctl ctl-btn" data-role="button"></a>');
    target.append(this.navBtn).trigger('create');
    this.navBtn.click($.proxy(this.toggleNav, this));

    target.append($(tk.NavAid.DASH_HTML)).trigger('create');

    $('body').append($(tk.NavAid.NAV_LIST_HTML)).trigger('create');
    this.navForm = $('#navigation');
    this.settingsForm = $('#navigation-settings');

    $('body').append($(tk.NavAid.NAV_WARN_HTML)).trigger('create');

    target.append($(tk.NavAid.PAUSE_HTML)).trigger('create');
    $('a.pause-btn').click($.proxy(this.playPause, this));

    $('#navigation-settings input').change($.proxy(this.navSettings, this));
    $('#navigation-settings button').click($.proxy(this.importExport, this));
  },
  /**
   * @private
   * @method
   * @param {JQueryEvent} event
   */
  playPause: function(event){
    var btn = $(event.target), tracking = !btn.hasClass('pause');
    this.setTracking(tracking);
    if (tracking){
      this.draw.deactivate(true);
    }
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
    var me = this;
    me.draw = new nyc.ol.Draw({
      map: me.map,
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
    me.draw.on(nyc.ol.FeatureEventType.ADD, me.nameFeature, me);
    me.draw.on(nyc.ol.FeatureEventType.CHANGE, me.changeFeature, me);
    me.draw.on(nyc.ol.FeatureEventType.REMOVE, me.removeFeature, me);
    me.draw.on(nyc.ol.Draw.EventType.ACTIVE_CHANGED, function(active){
        me.setTracking(!active);
    });
  },
  /**
   * @private
   * @method
   */
  updateDash: function(){
    var feature = this.navFeature;
    var speed = this.getSpeed() || 0;
    var heading = Math.round((this.getHeading() || 0) * 180 / Math.PI);
    var distance = this.distance(feature);
    var arrival = this.remainingTime(distance, speed);
    this.checkCourse(feature, speed, heading);
    speed = (speed * 3.6 * 0.621371).toFixed(2) + ' mph';
    $('#speed span').html(speed);
    $('#heading span').html(heading + '&deg;');
    $('#arrival span').html(arrival)[arrival ? 'show' : 'hide']();
  },
  distance: function(feature){
    if (feature){
      var geom = feature.getGeometry();
      var waypoint = geom.getLastCoordinate();
      var distance = geom.getLength();
      if (this.course){
        var position = this.track.getLastCoordinate()
        var course = this.course.getCoordinates();
        course.slice(this.inCoords(waypoint, course));
        distance += new ol.geom.LineString(course).getLength();
      }
      return distance;
    }
    return 0;
  },
  /**
   * @private
   * @method
   * @param {number} distance
   * @param {number} speed
   * @return {string}
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
  * @param {JQueryEvent} event
   */
  beginNavigation: function(event){
    this.navFeature = new ol.Feature({geometry: new ol.geom.LineString([])});
    this.source.addFeature(this.navFeature);
    var btn = $(event.target);
    var feature = btn.data('feature');
    var direction = btn.data('direction');
    this.setCourse(feature, direction);
    this.nextWaypoint(this.getPosition());
    this.navBtn.addClass('stop');
    this.navForm.slideToggle();
  },
  setCourse: function(feature, direction){
    var geom = feature.getGeometry();
    if (geom.getType() == 'LineString'){
      var coords = geom.clone().getCoordinates();
      if (direction == 'rev'){
        this.course = new ol.geom.LineString(coords.reverse());
      }
      this.course = new ol.geom.LineString(coords);
    }else{
      this.course = this.center(feature);
    }
  },
  nextWaypoint: function(position, destination){
    if (this.navFeature){
      var waypoint = this.course;
      if ('getClosestPoint' in waypoint){
        var course = this.course;
        var coords = course.getCoordinates();
        waypoint = course.getClosestPoint(position);
        if (!this.inCoords(waypoint, coords) > -1){
          for (var i = 0; i < coords.length - 1; i++){
            if (this.isOnSeg(coords[i], coords[i + 1], waypoint)){
              waypoint = coords[i + 1];
              break;
            }
          }
        }
      }
      this.navFeature.getGeometry().setCoordinates([position, waypoint]);
    }
  },
  inCoords: function(coord, coordinates){
    var hit = false, i = -1;
    $.each(coordinates, function(){
      hit = this[0] == coord[0] && this[1] == coord[1];
      i++;
      return !hit;
    });
    return hit ? i : -1;
  },
  isOnSeg: function(start, end, waypoint){
    var m = (start[1] - end[1]) / (start[0] - end[0]);
    var b = start[1] - (start[0] * m);
    return waypoint[1] == (m * waypoint[0]) + b;
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
            me.navFeature = null;
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
        me.addNavChoices(div, name, me.namedFeatures[name]);
      }
    });
    if (!div.html()){
      div.html('<p class="none">No stored locations</p>');
    }

    me.navForm.slideToggle();
  },
  addNavChoices: function(div, name, feature){
    var btns;
    if (feature.getGeometry().getType() == 'LineString'){
      var btns = $(
        '<a data-role="button" data-direction="fwd">' + name + ' (foward)</a>' +
        '<a data-role="button" data-direction="rev">' + name + ' (reverse)</a>'
      );
    }else{
      btns = $('<a data-role="button">' + name + '</a>');
    }
    btns.data('feature', feature);
    btns.click($.proxy(this.beginNavigation, this));
    div.append(btns).trigger('create');
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
   * @param {ol.Coordinate} coordinate
   * @return {string}
   */
  dms: function(coordinate){
    var coord = proj4(this.view.getProjection().getCode(), 'EPSG:4326', coordinate);
    return ol.coordinate.toStringHDMS(coord);
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
      var html = $('<div></div>');
      var geom = feature.getGeometry();
      var type = geom.getType();
      if (type == 'Point'){
        this.pointHtml(geom, html);
      }else if (type == 'LineString'){
        this.lineHtml(geom, html);
      }else{
        this.polygonHtml(feature, html);
      }
      this.nameHtml(name , html);
      return html;
    }
  },
  pointHtml: function(geom, html){
    var dms = this.dms(geom.getCoordinates());
    html.append('<div>' + dms + '</div>');
  },
  lineHtml: function(geom, html){
    var dms = this.dms(geom.getFirstCoordinate());
    html.append('<div><b>Start:</b></div>');
    html.append('<div>' + dms + '</div>');
    dms = this.dms(geom.getLastCoordinate());
    html.append('<div><b>End:</b></div>');
    html.append('<div>' + dms + '</div>');
  },
  polygonHtml: function(feature, html){
    var dms = this.dms(this.center(feature));
    html.append('<div><b>Center:</b></div>');
    html.append('<div>' + dms + '</div>');
  },
  nameHtml: function(name, html){
    var me = this;
    if (name.indexOf('navaid-track') == 0){
      var btn = $('<button>Name this track...</button>');
      btn.click(function(){
        me.nameFeature(feature, true);
      });
      html.append(btn);
    }else{
      html.append('<div><b>' + name + '</b></div>');
    }
  },
  /**
   * @private
   * @method
   * @param {ol.MapBrowserEvent} event
   */
  featureInfo: function(event){
    var map = this.map, pix = event.pixel;
    var feature = map.forEachFeatureAtPixel(pix, function(feature){
      return feature;
    });
    if (feature){
      var html = this.infoHtml(feature);
      if (html){
        this.popup.show({
          html: html,
          coordinates: map.getCoordinateFromPixel(pix)
        });
      }
    }
  },
  /**
   * @private
   * @method
   * @param {string|undefiend} stored
   */
  restoreNamedFeatures: function(stored){
    var features = [];
    if (stored){
      this.storage.setItem(this.namedStore, stored);
    }else{
      stored = this.storage.getItem(this.namedStore);
    }
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
    this.draw.clear();
    this.draw.addFeatures(features, true);
  },
  /**
   * @private
   * @method
   */
  updateCurrentTrack: function(){
    this.trackFeature.setGeometry(this.track);
    this.nextWaypoint(this.track.getLastCoordinate());
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
    this.draw.addFeatures([feature], true);
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
      this.namedFeatures[name] = null;
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
      this.draw.addFeatures([feature], true);
    }
    if (replace && active){
      this.draw.activate(type);
    }
  },
  importExport: function(event){
    var me = this, storage = me.storage, btn = $(event.target);
    if (btn.hasClass('empty')){
      var dia = new nyc.Dialog()
      dia.yesNo({
        message: 'Delete all location data?',
        callback: function(yesNo){
          if (yesNo){
            storage.removeItem(me.namedStore);
            me.draw.clear();
          }
        }
      });
      dia.container.find('.btn-no').focus();
    }else if (btn.hasClass('export')){
      storage.saveGeoJson('locations.json', storage.getItem(me.namedStore));
    }else{
      storage.readTextFile($.proxy(me.restoreNamedFeatures, me));
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
  '<input type="range" id="off-course-degrees" value="10" min="0" max="180">' +
  '<h1>Navigation locations</h1>' +
  '<button class="export" data-role="button">Export</button>' +
  '<button class="import" data-role="button">Import</button>' +
  '<button class="empty" data-role="button">Clear</button>' +
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
tk.NavAid.PAUSE_HTML = '<a class="pause-btn ctl ctl-btn" data-role="button" data-icon="none" data-iconpos="notext">Play/Pause</a>';

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
