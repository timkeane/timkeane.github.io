nyc.foodhelp = nyc.foodhelp || {};

nyc.foodhelp.App = function(map, locationSource, locator, style, locationMgr, lang, popup){
	var me = this;
	me.map = map;
	me.locationSource = locationSource;
	me.locator = locator;
	me.view = map.getView();
	me.view.setMaxZoom(19);
	me.popup = popup;
	me.location = {};
	me.pager = new nyc.ListPager();
	me.zindex = 1;

	lang.on(nyc.lang.Translate.EventType.CHANGE, $.proxy(this.listPantries, this));

	$(map.getTarget()).on('tap click', $.proxy(me.tap, me));


	me.filter = new nyc.foodhelp.Filter(me.locationSource);
	me.filter.on('changed', me.listPantries, me);

	me.locationSource.once(nyc.ol.source.Decorating.LoaderEventType.FEATURESLOADED, $.proxy(me.ready, me));

	var locationLayer = new ol.layer.Vector({source: me.locationSource});
	locationLayer.setStyle($.proxy(style.locationStyle, style));
	map.addLayer(locationLayer);

	locationMgr.on('geocode', me.setLocation, me);
	locationMgr.on('geolocate', me.setLocation, me);

	$('#tabs a').click($.proxy(me.tabs, me));
	$('body').pagecontainer({change: $.proxy(me.pageChanged, me)});
	$('.splash-call, .splash-map').click($.proxy(me.page, me));

	$('#filter-by-borough, #filter-by-type, #filter-by-language, #filter-by-kosher').change(function() {
		me.filter.change();
	});

	$('#btn-more a').click($.proxy(me.listNextPage, me));

	$(window).resize($.proxy(me.pageChanged, me));

	$(map.getTarget()).append($('#main a.call-311'));

    new nyc.ol.FeatureTip(map, [{layer: locationLayer, labelFunction: function(){
    	var tip = this.get('NAME');
    	if (this.get('CLOSED')){
    		tip += ('<div class="closed">' + this.message('info_closed') + '</div>');
    	}
    	return {text: tip};
    }}]);
};

nyc.foodhelp.App.prototype = {
	 /**
	  * @private
	  * @member {boolean}
	  */
	mapLoaded: false,
	 /**
	  * @private
	  * @member {ol.Map}
	  */
	map: null,
	 /**
	  * @private
	  * @member {ol.View}
	  */
	view: null,
	 /**
	  * @private
	  * @member {nyc.ol.source.FilteringAndSorting}
	  */
	locationSource: null,
	 /**
	  * @private
	  * @member {nyc.foodhelp.Locator}
	  */
	locator: null,
	 /**
	  * @private
	  * @member {nyc.Locate.Result}
	  */
	location: null,
	 /**
	  * @private
	  * @member {nyc.ol.Popup}
	  */
	popup: null,
	 /**
	  * @private
	  * @member {nyc.ListPager}
	  */
	pager: null,
	 /**
	  * @private
	  * @member {nyc.foodhelp.Filter}
	  */
	filter: null,
	/**
	 * @private
	 * @method
	 * @param {nyc.Locate.Result} location
	 */
	setLocation: function(location){
		this.location = location;
		$('#filter-by-borough').val('All').selectmenu('refresh');
		this.filter.change();
	},
	/**
	 * @private
	 * @method
	 * @param {ol.Feature} pantry
	 */
	goTo: function(pantry){
		var me = this, coords = pantry.getGeometry().getCoordinates();
		me.view.animate({zoom: 17, center: coords});
		me.map.once('moveend', function(){
			me.mapClick({coordinates: coords, html: pantry.html('inf-pop even-row')});
		});
		if ($('#panel').width() == $(window).width()){
			$('body').pagecontainer('change', $('#map-page'), {transition: 'slideup'});
		}
	},
	/**
	 * @private
	 * @method
	 * @param {JQuery.Event} event
	 */
	tap: function(event){
		this.mapClick({pixel: [event.offsetX, event.offsetY]});
	},
	/**
	 * @private
	 * @method
	 * @param {Object} event
	 */
	mapClick: function(event){
		var me = this, map = me.map, px = event.pixel, coords = event.coordinates, html = event.html;
		if (px){
			var i = 0;
			html = $('<div></div>');
			map.forEachFeatureAtPixel(px, function(feature, layer){
				if (i < 3 && feature.html){
					var css = i % 2 == 0 ? 'inf-pop even-row' : 'inf-pop';
					coords = feature.getGeometry().getCoordinates();
					html.append(feature.html(css));
					i++;
				}
			});
		}
		if (coords){
			this.popup.setOffset([0, -10]);
			this.popup.show({
				coordinates: coords,
				html: html
			});
		}
	},
	/**
	 * @private
	 * @method
	 * @param {JQuery.Event} event
	 */
	tabs: function(event){
		var target = $(event.currentTarget);
		$('#panel').css(
			'z-index',
			target.attr('href') == '#map-tab' ? 999 : 1000
		);
	},
	/**
	 * @private
	 * @method
	 */
	listPantries: function(){
		var features = this.locationSource.sort(this.location.coordinates);
		if (this.location.coordinates){
			this.locator.zoomLocation(this.location);
		}else{
			this.view.fit(nyc.ol.Basemap.EXTENT, this.map.getSize());
		}
		this.popup.hide();
		this.pager.reset(features);
		$('#location-list').empty();
		this.listNextPage();
	},
	/**
	 * @private
	 * @method
	 */
	listNextPage: function(){
		var container = $('#location-list');
		$.each(this.pager.next(), function(i, fp){
			var div = fp.html('inf-list');
			if (i % 2 == 0) $(div).addClass('even-row');
			$('#location-list').append(div).trigger('create');
		});
		$('#btn-more')[$('div.inf-list').length == this.locationSource.getFeatures().length ? 'fadeOut' : 'fadeIn']();
	},
	/**
	 * @private
	 * @method
	 */
	ready: function(){
		var me = this;

		me.listPantries();

		if ($('#panel').width() == $(window).width()){
			$('#map-tab-btn a').trigger('click');
		}else{
			$('#tabs').tabs({active: 1});
		}

		$('#first-load').fadeOut();
	},
	pageChanged: function(){
		var fullPanel = $('#panel').width() == $(window).width();

		$('#locations-tab-btn a').trigger('click');
		setTimeout(function(){
			if ($('#map-tab-btn a').is(':visible')){
				$('#map-tab-btn a').trigger('click');
			}
		}, 400);

		if (!this.mapLoaded){
			this.view.fit(nyc.ol.Basemap.EXTENT, this.map.getSize());
			this.map.once('change:size', function(){
				$('#first-load').fadeOut();
			});
			this.map.updateSize();
			this.mapLoaded = true;
		}

		if (!$('.hamburger').is(':visible')){
			$('.lnks').show();
		}

		var prn = $('.prn-btn, .prn-msg');
	    if (fullPanel || nyc.util.isMobile() || !('execCommand' in document) || $(window).height() < 500){
	    	prn.hide();
	    }else{
	        if (!prn.data('print-button-click-enabled')){
		    	prn.data('print-button-click-enabled', true);
		    	prn.click(function(){
		        	if (!document.execCommand('print')){
								window.print();
							}
		        });
	        }
	    	$('.prn-btn').fadeIn();
	    }

	},
	/**
	 * @private
	 * @method
	 * @param {JQuery.Event} event
	 */
	page: function(event){
		if (!this.mapLoaded){
			$('#first-load').fadeIn();
		}
		$('body').pagecontainer('change', $('#map-page'), {transition: 'slideup'});
	}
};

/**
 * @desc Manages filtering of the foodhelp facility features
 * @public
 * @class
 * @extends {nyc.EventHandling}
 * @constructor
 * @param {nyc.ol.source.FilteringAndSorting} locationSource
 * @fires nyc.foodhelp.Filter#change
 */
nyc.foodhelp.Filter = function(locationSource) {
	this.locationSource = locationSource;
};

/**
 * @desc Rebuild filters and trigger the change event
 * @public
 * @method
 */
nyc.foodhelp.Filter.prototype.change = function() {
	var borough = $('#filter-by-borough').val();
	var type =  $('#filter-by-type').val();
	var kosher =  $('#filter-by-kosher').is(':checked');
	var language =  $('#filter-by-language').val();
	var filter = [];

	if (borough != 'All')
		filter.push({property:'BOROUGH', values:[borough]});
	if (type != 'All') {
		type = type.slice(0, 2);
		filter.push({property:'TYPE', values:[type]});
	}
	if (kosher) {
		type = type.slice(0, 2);
		filter.push({property:'KOSHER', values:['yes']});
	}
	/* No presentation of language information at facilities at this time

	if (language != 'en')
		filter.push({property:'language_'+ language, values:['YES']});

	*/
	this.locationSource.filter(filter);
	this.trigger('changed');
};
nyc.inherits(nyc.foodhelp.Filter, nyc.EventHandling);
