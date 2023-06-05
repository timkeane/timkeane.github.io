/** @public */
window.nyc = window.nyc || {};
nyc.foodhelp = nyc.foodhelp || {};

/**
 * @desc A class for managing map location
 * @public
 * @class
 * @implements {nyc.Locator}
 * @constructor
 * @param {nyc.ol.Locator.Options} options Constructor options
 * @param {ol.source.Vector} foodhelpSource The source of the foodhelp locations
 */
nyc.foodhelp.Locator = function(options, foodhelpSource){
	this.foodhelpSource = foodhelpSource;
	nyc.ol.Locator.call(this, options);
};

nyc.foodhelp.Locator.prototype = {
	/**
	 * @private
	 * @member {ol.source.Vector}
	 */
	foodhelpSource: null,
	/**
	 * @public
	 * @override
	 * @method
	 * @param {nyc.Locate.Result} data The location to which the map will be oriented
	 * @param {function()} callback The function to call after the locator has zoomed to the location
	 */
	zoomLocation: function(data, callback){
		var map = this.map, view = this.view, source = this.source, feature = this.feature(data), coords = data.coordinates;
		source.clear();
		source.addFeature(feature);
		if (callback){
			map.once('moveend', callback);
		}
		if (coords){
			var near = this.nearestFoodhelp(coords);
			view.fit(ol.extent.boundingExtent([coords, near]), map.getSize());
		}
	},
	/**
	 * @private
	 * @method
	 * @param {ol.Coordinate} coordinate
	 */
	nearestFoodhelp: function(coordinate){
		var dist = Number.MAX_VALUE, food;
		$.each(this.foodhelpSource.getFeatures(), function(){
			var coords = this.getGeometry().getCoordinates();
			var line = new ol.geom.LineString([coords, coordinate]);
			var len = line.getLength();
			if (len < dist){
				dist = len;
				food = coords;
			}
		});
		return food;
	}
};

nyc.inherits(nyc.foodhelp.Locator, nyc.ol.Locator);