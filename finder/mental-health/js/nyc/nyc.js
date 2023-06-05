/** @export */
window.nyc = window.nyc || {};

proj4.defs(
	'EPSG:2263',
	'+proj=lcc +lat_1=41.03333333333333 +lat_2=40.66666666666666 +lat_0=40.16666666666666 +lon_0=-74 +x_0=300000.0000000001 +y_0=0 +ellps=GRS80 +datum=NAD83 +units=ft +to_meter=0.3048006096012192 +no_defs'
);

/**
 * @const
 * @type {ol.extent}
 */
nyc.EXTENT = [912090, 119053, 1068317, 273931];

/**
 * @const
 * @type {ol.proj.Projection}
 */
nyc.EPSG_2263 = ol.proj.get('EPSG:2263');

/**
 * @const
 * @type {ol.Coordinate}
 */
nyc.CENTER = [990203, 196492];

/**
 * nyc.EventHandling
 * @export
 * @constructor
 */
nyc.EventHandling = function(){};
nyc.EventHandling.prototype = {
	/**
	 * @export
	 * @param {string} eventName
	 * @param {function(Object)} evtHdlr
	 * @param {Object=} hdlrScope
	 */
    on: function(eventName, evtHdlr, hdlrScope){
        this.addHdlr(eventName, evtHdlr, hdlrScope);
    },
	/**
	 * @export
	 * @param {string} eventName
	 * @param {function(Object)} evtHdlr
	 * @param {Object=} hdlrScope
	 */
    one: function(eventName, evtHdlr, hdlrScope){
        this.addHdlr(eventName, evtHdlr, hdlrScope, true);
    },
	/**
	 * @private
	 * @param {string} eventName
	 * @param {function(Object)} evtHdlr
	 * @param {Object} hdlrScope
	 * @param {boolean} one
	 */
    addHdlr: function(eventName, evtHdlr, hdlrScope, one){
        this.evtHdlrs = this.evtHdlrs || {};
        this.evtHdlrs[eventName] = this.evtHdlrs[eventName] || [];
        this.evtHdlrs[eventName].push({handler: evtHdlr, scope: hdlrScope, remove: one});		    	
    },
	/**
	 * @export
	 * @param {string} eventName
	 * @param {Object=} data
	 */
    trigger: function(eventName, data){
        this.evtHdlrs = this.evtHdlrs || {};
        var handlers = this.evtHdlrs[eventName], remove = [];
		if (handlers){
            $.each(handlers, function(index, hdlr){
                if (hdlr.scope){
                    hdlr.handler.call(hdlr.scope, data);
                }else{
                	hdlr.handler(data);
                }
                if (hdlr.remove){
                	remove.push(hdlr);
                }
            });
            $.each(remove, function(_, hdlr){
            	handlers.splice($.inArray(hdlr, handlers), 1);
            });
        }
    },
	/**
	 * @export
	 * @param {string} eventName
	 * @param {function(Object)} evtHdlr
	 * @param {Object=} hdlrScope
	 */
    off: function(eventName, evtHdlr, hdlrScope){
        this.evtHdlrs = this.evtHdlrs || {};
        var handlers = this.evtHdlrs[eventName];
    	$.each(handlers, function(index, hdlr){
    		if (hdlr.handler === evtHdlr && hdlr.scope === hdlrScope){
    			handlers.splice(index, 1);
    			return false;
    		}
    	});
    }
};

/**
 * @export
 * @param {Object} childCtor
 * @param {Object} parentCtor
 */
nyc.inherits = function(childCtor, parentCtor){
	for (var member in parentCtor.prototype){
		if (!(member in childCtor.prototype)){
			childCtor.prototype[member] = parentCtor.prototype[member];
		}
	}
};