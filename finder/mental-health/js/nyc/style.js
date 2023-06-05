/** @export */
window.nyc = window.nyc || {};

/** @export */
nyc.Style = (function(){	
	/** 
	 * @constructor  
	 * @param {boolean} isIe
	 */
	var styleClass = function(){
		this.facilityCache = {};
		this.locationCache = null;
	};
	
	styleClass.prototype = {
		facilityCache: null,
		locationCache: null,
		isIe: function(){
			return 'ActiveXObject' in window;
		},
		imgExt: function(){
			return this.isIe() ? '.png' : '.svg';
		},
		zoom: function(resolution){
			var resolutions = nyc.ol.layer.BaseLayer.RESOLUTIONS, zoom = resolutions.indexOf(resolution);
			if (zoom == -1) {
				for (var z = 0; z < resolutions.length; z++){
					if (resolution > resolutions[z]){
						zoom = z;
						break;
					}
				}
			}
			return zoom > -1 ? zoom : resolutions.length - 1;
		},
		locationStyle: function(feature, resolution){
			if (!this.locationCache){
				var image = 'img/me0' + this.imgExt();
				this.locationCache = [new ol.style.Style({
					image: new ol.style.Icon({
						scale: 48 / 512,
						src: image,
						offset: navigator.userAgent.match(/Safari/g) ? undefined : [0, 24] //remove test after ol bug fix #4337
					})
				})];
			}
			return this.locationCache;
		},
		facilityStyle: function(feature, resolution){
			var zoom = this.zoom(resolution),
				radius = [8, 8, 8, 12, 12, 12, 16, 16, 16, 16, 16][zoom];
			if (!this.facilityCache[zoom]){
				this.facilityCache[zoom] = [new ol.style.Style({
					image: new ol.style.Circle({
						radius: radius,
						fill: new ol.style.Fill({color: '#181f4a'}),
						stroke: new ol.style.Stroke({color: 'white', width: radius < 12 ? 1.5 : 2})
					})
				})];
			}
			return this.facilityCache[zoom];
		}
	};

	return styleClass;
}());
