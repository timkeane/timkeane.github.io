nyc.sr = nyc.sr || {};

nyc.sr.Style = function(){
	this.setCdStyles();
	this.setSrStyles();
	this.buckets = [];
};

nyc.sr.Style.prototype = {
	COLORS: ['rgba(254,237,222,.4)', 'rgba(253,190,133,.4)', 'rgba(253,141,60,.4)', 'rgba(230,85,13,.4)', 'rgba(166,54,3,.4)'],
	SIZES: {
		 9: [ 1,    2,   3,   6,  12],
		10: [ 1.5,  3,   5,   8,  14],
		11: [ 2,    4,   7,  10,  16],
		12: [ 2.5,  5,   9,  12,  18],
		13: [ 3,    6,  11,  14,  20],
		14: [ 3.5,  7,  13,  16,  22],
		15: [ 4,    8,  15,  18,  24],
		16: [ 4.5,  9,  17,  20,  26],
		17: [ 5,   10,  19,  22,  28],
		18: [ 5.5, 11,  21,  24,  30],
		19: [ 6,   12,  22,  26,  32]
	},
	OPACITIES: {
		 9:  .05,
		10:  .075,
		11:  .1,
		12:  .15,
		13:  .2,
		14:  .25,
		15:  .35,
		16:  .5,
		17:  .7,
		18:  .9,
		19: 1
	},
	nullStyle: new ol.style.Style({}),
	buckets: null,
	cdStyles: null,
	srStyles: null,
	srStyle: function(feature, resolution){
		var z = nyc.ol.TILE_GRID.getZForResolution(resolution);
		return this.getStyle(this.srStyles, feature.get('sr_count'), z);
	},
	cdStyle: function(feature){
		return this.getStyle(this.cdStyles, feature.get('sr_count'));
	},
	getStyle: function(styles, count, z){
		if (count){
			var styleIdx;
			$.each(this.buckets, function(i, b){
				if (count >= b[0] && count <= b[1]){
					styleIdx = i;
					return false;
				}
			});
			return styles[styleIdx][z] || styles[styleIdx];
		}
		return this.nullStyle;
	},
	setSrStyles: function(){
		var me = this, srStyles = [];
		for (var z in me.SIZES){
			$.each(me.COLORS, function(i, color){
				srStyles[i] = srStyles[i] || {};
				srStyles[i][z] = new ol.style.Style({
					image: new ol.style.Circle({
						radius: me.SIZES[z][i],
						fill: new ol.style.Fill({
							color: color
						}),
						stroke: new ol.style.Stroke({
//							color: 'rgba(166,54,3,' + (((i + 1) / 5) * ((i + 1) / 5)) + ')',
							color: 'rgba(166,54,3,' + me.OPACITIES[z] + ')',
							width: 1
						})
					})
				});
			});
		}	
		me.srStyles = srStyles;		
	},
	setCdStyles: function(){
		var cdStyles = [];
		$.each(this.COLORS, function(_, color){
			cdStyles.push(
				new ol.style.Style({
					fill: new ol.style.Fill({
						color: color
					}),
					stroke: new ol.style.Stroke({
						color: 'rgba(255,255,255,0.2)',
						width: 3
					})
				})
			);
		});
		this.cdStyles = cdStyles;
	}
};
