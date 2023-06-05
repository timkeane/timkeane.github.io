window.nyc = window.nyc || {};
window.nyc.foodhelp = window.nyc.foodhelp || {};

nyc.foodhelp.Style = function() {
	this.locationCache = {};
}

nyc.foodhelp.Style.prototype = {
	imgExt : function() {
		return nyc.util.isIe() ? '.png' : '.svg';
	},
	zoom : function(resolution) {
		var resolutions = nyc.ol.layer.BaseLayer.RESOLUTIONS, zoom = resolutions.indexOf(resolution);
		if (zoom == -1) {
			for (var z = 0; z < resolutions.length; z++) {
				if (resolution > resolutions[z]) {
					zoom = z;
					break;
				}
			}
		}
		return zoom > -1 ? zoom : resolutions.length - 1;
	},
	locationStyle: function(feature, resolution){
		var zoom = this.zoom(resolution);
		var radius = [8, 8, 8, 8, 12, 12, 16, 16, 16, 16, 16][zoom];
		var	fontSize = radius * 2 - 10;
		var color = feature.color();		
		var text = feature.text(fontSize) || '';
		var opacity = feature.get('CLOSED') ? .5 : 1;

		this.locationCache[zoom] = this.locationCache[zoom] || {};
		this.locationCache[zoom][color] = this.locationCache[zoom][color] || {};
		this.locationCache[zoom][color][text.text || 'notext'] = this.locationCache[zoom][color][text.text || 'notext'] || {};
		
		var style = this.locationCache[zoom][color][text.text || 'notext'][opacity];

		if (!style){
			if (!text){
				style = new ol.style.Style({
					image: new ol.style.Circle({
						radius: radius,
						fill: new ol.style.Fill({color: color}),
						stroke: new ol.style.Stroke({color: 'white', width: radius < 12 ? 1.5 : 2})
					}),
					zIndex: 0
				});
			}else{
				style = new ol.style.Style({
					image: new ol.style.Circle({
						radius: radius,
						fill: new ol.style.Fill({color: color}),
						stroke: new ol.style.Stroke({color: 'white', width: radius < 12 ? 1.5 : 2})
					}), 
					text: new ol.style.Text(text),
					zIndex: nyc.foodhelp.app.zindex++
				});	
			}
			style.getImage().setOpacity(opacity);
			this.locationCache[zoom][color][text.text || 'notext'][opacity] = style
		}
		return this.locationCache[zoom][color][text.text || 'notext'][opacity];
	}
};
