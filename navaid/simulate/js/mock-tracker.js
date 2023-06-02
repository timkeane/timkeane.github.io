var tk = window.tk || {};

tk.MockNavAid = function(options){
  tk.NavAid.call(this, options);
  this.featuresStore = this.featuresStore + '-simulate';
  this.iconStore = this.iconStore + '-simulate';
  this.alarmStore = this.alarmStore + '-simulate';
  this.degreesStore = this.degreesStore + '-simulate';
  this.metersStore = this.metersStore + '-simulate';
  this.warnAlarm = true;
  this.warnIcon = true;
  this.degreesOff = 20;
  this.metersOff = 50;
  this.source.clear();
  this.source.addFeature(this.trackFeature);
  this.restoreFeatures(tk.MockNavAid.JONES);
  $('audio').click($.proxy(this.simulate, this));
};

tk.MockNavAid.prototype = {
  intv: null,
  positionIdx: 0,
  position: null,
  mockPositions: null,
  hackAudio: function(btn){
    var me = this, audio = btn.find('audio');
    $('.pause-btn').append(audio);
    audio.css({
      opacity: 0,
      'z-index': 1000,
      height: '35px',
      width: '100px',
      position: 'absolute',
      margin: '0 0 0 -15px'
    }).on('play', function(){
      me.simulate();
    }).trigger('click');
    me.audio = audio.get(0);
  },
  getPosition: function(){
    return this.position;
  },
  getHeading: function(){
    var  deg = this.heading(
      new ol.geom.LineString([
        this.position,
        this.mockPositions[this.positionIdx + 1]
      ]), true
    );
    return (deg * 2 * Math.PI / 360);
  },
  getSpeed: function(){
    return 11.175;
  },
  getAccuracy: function(){
    return 30;
  },
  mockTracking: function(){
    this.position = this.mockPositions[this.positionIdx];
    this.positionIdx++;
    if (this.positionIdx == this.mockPositions.length - 2){
      clearInterval(this.intv);
      this.navSource.clear();
      this.navFeature = null;
      this.warnOff();
      this.navBtn.removeClass('stop');
    }
    this.dispatchEvent('changed');
    this.updatePosition();
    this.dispatchEvent(nyc.ol.Tracker.EventType.UPDATED, this);
  },
  simulate: function(){
    $('#simulate').fadeOut();
    $.ajax({
      url: 'data/mock-track.json',
      success: $.proxy(this.ready, this)
    });
  },
  ready: function(geoJson){
    var feature = this.geoJson.readFeature(geoJson, {
      dataProjection: 'EPSG:4326',
      featureProjection: this.view.getProjection()
    });
    this.mockPositions = feature.getGeometry().getCoordinates();
    this.mockTracking();
    this.intv = setInterval($.proxy(this.mockTracking, this), 600);
    $('a.pause-btn').trigger('click');
    this.beginNavigation({
      target: $('<div></div>')
        .data('feature', this.source.getFeatureById('Entering Jones Inlet'))
    });
  }
}

nyc.inherits(tk.MockNavAid, tk.NavAid);

tk.MockNavAid.JONES = "{\"type\":\"Feature\",\"id\":\"Entering Jones Inlet\",\"geometry\":{\"type\":\"LineString\",\"coordinates\":[[-73.58690761250433,40.560225360189776],[-73.58526987952833,40.57200297051088],[-73.58532447062753,40.57378601958308],[-73.58379591984992,40.57639830800193],[-73.57877353872351,40.580834818103796],[-73.5763169392595,40.58307369280058],[-73.57405392141149,40.58553517488795],[-73.57268063039588,40.586512910917406],[-73.569461979578,40.588663879868704],[-73.56469837636755,40.592411615022456]]},\"properties\":null}";
