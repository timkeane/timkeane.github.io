var tk = window.tk || {};

tk.MockNavAid = function(options){
  tk.NavAid.call(this, options);
};

tk.MockNavAid.prototype = {
  intv: null,
  positionIdx: 0,
  position: null,
  mockPositions: null,
  getPosition: function(){
    return this.position;
  },
  getHeading: function(){
    return (2 * Math.PI) - this.heading(
      new ol.geom.LineString([
        this.position,
        this.mockPositions[this.positionIdx + 1]
      ]), true
    );
  },
  getSpeed: function(){
    return 22;
  },
  getAccuracy: function(){
    return 30;
  },
  mockTracking: function(){
    this.position = this.mockPositions[this.positionIdx];
    this.positionIdx++;
    if (this.positionIdx == this.mockPositions.length - 2){
      clearInterval(this.intv);
    }
    this.dispatchEvent('changed');
    this.updatePosition();
  },
  loadMockData: function(){
    $('.load-data').remove();
    this.storage.loadGeoJsonFile(this.map, $.proxy(this.ready, this));
  },
  ready: function(layer){
    this.mockPositions = layer.getSource().getFeatures()[0]
      .getGeometry().getCoordinates();
    this.intv = setInterval($.proxy(this.mockTracking, this), 500);
  }
}

nyc.inherits(tk.MockNavAid, tk.NavAid);
