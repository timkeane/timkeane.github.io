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
  nyc.ol.Tracker.call(this, options);
  this.startingZoomLevel = options.startingZoomLevel || 15;
  this.popup = new nyc.ol.Popup(this.map);
  this.on(nyc.ol.Tracker.EventType.UPDATED, this.updateCurrentTrack, this);
  this.source = new ol.source.Vector();
  this.dia = new nyc.Dialog();
  this.baseLayer();
  this.initDraw();
  this.restoreFeatures();
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
  featuresStore: 'navaid-presistent',
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
   * @member {nyc.Dialog}
   */
  dia: null,
  /**
   * @private
   * @member {JQuery}
   */
  waypointBtn: null,
  /**
   * @private
   * @member {JQuery}
   */
  navBtn: null,
  /**
   * @private
   * @member {JQuery}
   */
  navForm: null,
  /**
   * @private
   * @member {JQuery}
   */
  settingsForm: null,
  /**
   * @private
   * @member {ol.source.Vector}
   */
  source: null,
  /**
   * @private
   * @member {ol.Feature}
   */
  trackFeature: null,
  /**
   * @private
   * @member {ol.source.Vector}
   */
  navSource: null,
  /**
   * @private
   * @member {ol.Feature}
   */
   navFeature: null,
  /**
   * @private
   * @member {Element}
   */
  audio: null,
  /**
   * @private
   * @member {Array<number>}
   */
  speeds: null,
  /**
   * @private
   * @member {ol.geom.LineString}
   */
  course: null,
  /**
   * @private
   * @member {number}
   */
  offCourse: null,
  /**
   * @private
   * @member {number}
   */
  warnInterval: null,
  /**
   * @private
   * @member {boolean}
   */
  warnAlarm: null,
  /**
   * @private
   * @member {JQuery}
   */
  warnIcon: null,
  /**
   * @desc Enable or disable tracking
   * @public
   * @override
   * @method
   * @param {boolean} tracking Whether or not to track position
   */
  setTracking: function(tracking){
    this.skipViewUpdate = !tracking;
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
    this.navSource = new ol.source.Vector();
    this.map.addLayer(
      new ol.layer.Vector({
        source: this.navSource,
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

    $('.draw-btn-mnu .square, .draw-btn-mnu .box, .draw-btn-mnu .gps, .draw-btn-mnu .save, .draw-btn-mnu .delete').remove();
    this.waypointBtn = $(tk.NavAid.WAYPOINT_HTML);
    target.append(this.waypointBtn).trigger('create');
    this.waypointBtn.click($.proxy(this.waypoint, this));

    this.navBtn = $(tk.NavAid.NAV_BUTTON_HTML);
    target.append(this.navBtn).trigger('create');
    this.navBtn.click($.proxy(this.toggleNav, this));

    this.hackAudio(this.navBtn);

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
  hackAudio: function(btn){
    var audio = btn.find('audio');
    audio.on('play', function(){
      audio.css({width: 0, height: 0, 'margin-left': '-200px'});
      btn.trigger('click');
    });
    this.audio = audio.get(0);
  },
  /**
   * @private
   * @method
   * @param {JQueryEvent} event
   */
  playPause: function(event){
    var me = this, btn = $(event.target), tracking = !btn.hasClass('pause');
    if (tracking){
      me.view.animate({zoom: me.startingZoomLevel});
      me.draw.deactivate(true);
    }
    setTimeout(function(){
      me.setTracking(tracking);
    }, 500);
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

    var name = 'navaid-track-' + trackIdx;
    this.trackFeature = new ol.Feature();
    this.trackFeature.setId(name);
    this.updateStorage();
  },
  /**
   * @private
   * @method
   * @param {ol.source.Vector} source
   */
  initDraw: function(){
    var me = this;
    me.draw = new nyc.ol.Draw({
      map: me.map,
      source: me.source,
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
    me.draw.on(nyc.ol.FeatureEventType.REMOVE, me.updateStorage, me);
    me.draw.on(nyc.ol.FeatureEventType.CHANGE, me.updateStorage, me);
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
  avgSpeed: function(){
    var speed = this.getSpeed() || 0, speeds = this.speeds;
    if (this.speeds.length == 10){
      speeds.unshift(speed);
      speeds.pop();
    }else{
      speeds.unshift(speed);
    }
    var speedSum = 0;
    $.each(speeds, function(){
      speedSum += this;
    });
    return speedSum / speeds.length;
  },
  distance: function(navFeature){
    if (navFeature){
      var geom = navFeature.getGeometry();
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
   * @param {boolean} asRadians
   * @return {number}
   */
  heading: function(line) {
    var start = line.getFirstCoordinate();
    var end = line.getLastCoordinate();
  	var dx = end[0] - start[0];
  	var dy = end[1] - start[1];
  	var rad = Math.acos(dy / Math.sqrt(dx * dx + dy * dy));
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
      var courseHeading = this.heading(feature.getGeometry());
      if (Math.abs(courseHeading - heading) > this.offCourse){
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
    this.audio.muted = true;
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
      this.audio.muted = false;
    }
  },
  /**
   * @private
   * @method
  * @param {JQueryEvent} event
   */
  beginNavigation: function(event){
    this.navFeature = new ol.Feature({geometry: new ol.geom.LineString([])});
    this.speeds = [];
    this.navSource.addFeature(this.navFeature);
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
      this.course = new ol.geom.Point(this.center(feature));
    }
  },
  nextWaypoint: function(position){
    var waypoint = this.course;
    if (this.navFeature && waypoint){
      if ('getClosestPoint' in waypoint){
        var course = this.course;
        var coords = course.getCoordinates();
        waypoint = course.getClosestPoint(position);
        if (this.inCoords(waypoint, coords) == -1){
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
      me.dia.yesNo({
        message: 'Stop navigation?',
        callback: function(yesNo){
          if (yesNo){
            me.navSource.clear();
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

    var features = me.source.getFeatures();
    features.sort(function(a, b){
			if (a.getId() < b.getId()) return -1;
			if (a.getId() > b.getId()) return 1;
			return 0;
		});

    var div = this.navForm.find('.nav-features').empty();
    $.each(features, function(){
      var name = this.getId();
      if (name.indexOf('navaid-track') == -1){
        me.addNavChoices(div, name, this);
      }
    });
    if (!div.html()){
      div.html('<p class="none">No stored locations</p>');
    }

    me.navForm.slideToggle();
  },
  addNavChoices: function(container, name, feature){
    var div = $('<div></div>'), btns;
    if (feature.getGeometry().getType() == 'LineString'){
      var btns = $(
        '<a class="begin" data-role="button" data-direction="fwd">' +
          name + ' (foward)</a><a class="trash"></a>' +
        '<a class="begin" data-role="button" data-direction="rev">' +
          name + ' (reverse)</a><a class="trash"></a>'
      );
      btns.get(0).id = 'nav-choice-' + name + '-fwd';
      btns.get(2).id = 'nav-choice-' + name + '-rev';
    }else{
      btns = $(
        '<a class="begin" data-role="button">' + name +
        '</a><a class="trash"></a>'
      );
      btns.get(0).id = 'nav-choice-' + name;
    }
    btns.data('feature', feature);
    btns.not('.trash').click($.proxy(this.beginNavigation, this));
    btns.not('.begin').click($.proxy(this.trash, this));
    container.append(div.append(btns)).trigger('create');
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
      this.offCourse = 20;
      this.storage.setItem(this.iconStore, true);
      this.storage.setItem(this.alarmStore, true);
      this.storage.setItem(this.degreesStore, 20);
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
    var name = feature.getId();
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
        me.nameFeature(feature);
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
  restoreFeatures: function(stored){
    var importing = stored;
    try{
      if (!importing){
        stored = this.storage.getItem(this.featuresStore);
      }
      if (stored){
        var geoJson = JSON.parse(stored);
        var features = this.geoJson.readFeatures(geoJson, {
          dataProjection: 'EPSG:4326',
          featureProjection: this.view.getProjection()
        });
        this.source.clear();
        this.source.addFeatures(features);
      }
      if (importing){
        this.storage.setItem(this.featuresStore, stored);
      }
    }catch(ex){
      this.dia.ok({
        message: '<b>' + ex.name + ':</b><br>' + ex.message
      });
      console.error(ex);
    }
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
    this.source.addFeature(new ol.Feature({
      geometry: new ol.geom.Point(this.getPosition())
    }));
  },
  /**
   * @private
   * @method
   * @param {ol.Feature} feature
   */
  nameFeature: function(feature){
    var me = this;
    me.dia.input({
      placeholder: 'Enter a name...',
      callback: function(name){
        if (!name){
          me.source.removeFeature(feature);
          me.updateStorage();
        }else if (!me.source.getFeatureById(name)){
          feature.setId(name);
          me.updateStorage();
        }else{
          me.dia.ok({
              message: '<b>' + name + '</b> is already assigned',
              callback: function(){
                me.nameFeature(feature);
              }
          });
        }
      }
    });
  },
  /**
   * @private
   * @method
   * @param {JQueryEvent} event
   */
  trash: function(event){
    var me = this,
      target = $(event.target),
      feature = target.data('feature');
    me.dia.yesNo({
      message: 'Delete <b>' + feature.getId() + '</b>?',
      callback: function(yesNo){
        if (yesNo){
          me.source.removeFeature(feature);
          target.parent().fadeOut(function(){
            target.parent().remove();
          });
        }
      }
    });
  },
  /**
   * @private
   * @method
   */
  updateStorage: function(){
    var features = this.source.getFeatures();
    var geoJson = this.geoJson.writeFeatures(features, {
      featureProjection: this.view.getProjection()
    });
    this.storage.setItem(this.featuresStore, JSON.stringify(geoJson));
  },
  importExport: function(event){
    var me = this, storage = me.storage, btn = $(event.target);
    if (btn.hasClass('empty')){
      me.dia.yesNo({
        message: 'Delete all location data?',
        callback: function(yesNo){
          if (yesNo){
            storage.removeItem(me.featuresStore);
            me.source.clear();
          }
        }
      });
      me.dia.container.find('.btn-no').focus();
    }else if (btn.hasClass('export')){
      storage.saveGeoJson('locations.json', storage.getItem(me.featuresStore));
    }else{
      storage.readTextFile($.proxy(me.restoreFeatures, me));
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
  '<a class="cancel" onclick="$(\'#navigation-settings\').slideUp();"></a>' +
  '<div class="nav-settings">' +
    '<h1>Navigation settings</h1>' +
    '<label for="off-course-icon">Off course warning icon:</label>' +
    '<input id="off-course-icon" type="checkbox" data-role="flipswitch">' +
    '<label for="off-course-alarm">Off course warning alarm:</label>' +
    '<input id="off-course-alarm" type="checkbox" data-role="flipswitch">' +
    '<label for="off-course-degrees">Degrees:</label>' +
    '<input type="range" id="off-course-degrees" value="20" min="0" max="180">' +
    '<h1>Navigation locations</h1>' +
    '<button class="export" data-role="button">Export</button>' +
    '<button class="import" data-role="button">Import</button>' +
    '<button class="empty" data-role="button">Clear</button>' +
  '</div>' +
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
tk.NavAid.WAYPOINT_HTML = '<a class="waypoint ctl ctl-btn" data-role="button"></a>';

/**
 * @private
 * @const
 * @type {string}
 */
tk.NavAid.NAV_BUTTON_HTML = '<a class="nav ctl ctl-btn" data-role="button">' +
  '<audio controls loop muted style="opacity:0">' +
    '<source src="wav/warn.wav" type="audio/wav">' +
  '</audio>' +
'</a>';

/**
 * @private
 * @const
 * @type {string}
 */
tk.NavAid.NAV_WARN_HTML = '<div id="warning">' +
  '<img class="yellow" src="img/warn-yellow.svg">' +
  '<img class="red off" src="img/warn-red.svg">' +
'</div>';
