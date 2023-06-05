/** @export */
window.nyc = window.nyc || {};

/**
 * An interface for geocoding and geolocating
 * @export
 * @interface
 * @implements {nyc.EventHandling}
 */
nyc.Locate = function(){};

/**
 * Locate once using device geolocation
 * @export
 */
nyc.Locate.prototype.locate = function(){};

/**
 * Track using device geolocation
 * @export
 * @param {boolean} track
 */
nyc.Locate.prototype.track = function(track){};
	
/**
 * Geocode an input string and trigger an event of nyc.Locate.LocateEventType with nyc.Locate.LocateResult or nyc.LocateAmbiguoud data
 * @export
 * @param {string} input
 */
nyc.Locate.prototype.search = function(input){};

/**
 * Enum for locate event type
 * @export
 * @enum {string}
 */
nyc.Locate.LocateEventType = {
	GEOCODE: 'geocode',
	GEOLOCATION: 'geolocation',
	AMBIGUOUS: 'ambiguous',
	ERROR: 'error'
};

/**
 * Enum for locate result type
 * @export
 * @enum {string}
 */
nyc.Locate.LocateResultType = {
	GEOCODE: 'geocode',
	GEOLOCATION: 'geolocation'
};

/**
 * Object type to hold data about a successful result of a geocoder search or device geolocation
 * @typedef {Object}
 * @property {string} name
 * @property {ol.Coordinate} coordinates
 * @property {number} accuracy
 * @property {nyc.Locate.LocateResultType} type
 * @property {(boolean|undefined)} zip
 */
nyc.Locate.LocateResult;

/**
 * Object type to hold data about possible locations resulting from a geocoder search
 * @typedef {Object}
 * @property {string} input
 * @property {Array.<nyc.Locate.LocateResult>} possible
 */
nyc.Locate.LocateAmbiguous;
