/** @export */
window.nyc = window.nyc || {};

/** @export */
nyc.App = (function(){	
	/**
	 * nyc.App - a class to manage user interaction with the hurricane map
	 * 
	 * @constructor
	 * @param {ol.Map} map
	 * @param {Object} featureDecorations
	 * @param {nyc.Content} content
	 * @param {nyc.Style} style
	 * @param {nyc.ol.control.ZoomSearch} controls
	 * @param {nyc.Locate} locate
	 * @param {nyc.Directions} directions
	 * @param {nyc.ol.Popup} popup
	 * @param {nyc.Pager} pager
	 * @param {nyc.Lang} lang
	 * 
	 */
	var appClass = function(map, csvUrl, featureDecorations, content, style, controls, locate, directions, popup, pager, lang){
		var me = this;
		me.map = map;
		me.content = content;
		me.view = map.getView();
		me.controls = controls;
		me.locate = locate;
		me.directions = directions;
		me.popup = popup;
		me.pager = pager;
		me.location = {};
		me.zoneOrders = {};
		me.tips = [];
		
		lang.on(nyc.Lang.EventType.CHANGE, function(code){
			var word = content.message('lifenet_word_' + nyc.lang.lang()) || content.message('lifenet_word'),
				number = content.message('lifenet_number_' + nyc.lang.lang()) || content.message('lifenet_number');
			$('.lifenet-number').html(number);
			$('.lifenet-word').html(word);
			$('a.lifenet-word').attr('href', 'tel:' + word);
		});

		$('#copyright').html(content.message('copyright', {yr: new Date().getFullYear()}));	

		me.facilitySource = new nyc.ol.source.FilteringAndSorting(
			{},
			[content, featureDecorations.fieldAccessors, featureDecorations.htmlRenderer]
		);
		me.facilityLayer = new ol.layer.Vector({
			map: map, 
			source: me.facilitySource,
			style: $.proxy(style.facilityStyle, style)
		});
		me.tips.push(
			new nyc.ol.FeatureTip(map, [{source: me.facilitySource, labelFunction: me.facilityTip}])
		);
		
		me.loadCsv(csvUrl);
		
		me.locationSource = new nyc.ol.source.Decorating({}, [{getName: function(){return this.get('name')}}]);
		new ol.layer.Vector({
			map: map, 
			source: me.locationSource,
			style: $.proxy(style.locationStyle, style)
		});
		me.tips.push(
			new nyc.ol.FeatureTip(map, [{source: me.locationSource, labelFunction: me.locationTip}])
		);

		$('#panel, .banner, .ctl').hover($.proxy(me.hideTips, me));

		$('#filters select').change($.proxy(me.filter, me));
		
		controls.on(nyc.ol.control.ZoomSearch.EventType.GEOLOCATE, $.proxy(locate.locate, locate));
		controls.on(nyc.ol.control.ZoomSearch.EventType.DISAMBIGUATED, $.proxy(me.zoomLocation, me));
		controls.on(nyc.ol.control.ZoomSearch.EventType.SEARCH, $.proxy(locate.search, locate));
		
		locate.on(nyc.Locate.LocateEventType.GEOCODE, $.proxy(me.zoomLocation, me));
		locate.on(nyc.Locate.LocateEventType.GEOLOCATION, $.proxy(me.zoomLocation, me));
		locate.on(nyc.Locate.LocateEventType.AMBIGUOUS, $.proxy(me.ambiguous, me));
		locate.on(nyc.Locate.LocateEventType.ERROR, function(){controls.searching(false);});
		
		directions.on(nyc.Directions.EventType.CHANGED, $.proxy(me.resize, me));
		$(window).resize($.proxy(me.resize, me));
		$('body').pagecontainer({
			change: function(){
				$(window).trigger('resize');
			}
		});
		
		map.on('click', $.proxy(me.mapClick, me));
		
		$('#transparency').change($.proxy(me.transparency, me));
		
		$('#map-tab-btn a').click($.proxy(me.mapSize, me));
		
		if (me.isMobile()){
			$('a, button').each(function(_, n){
				if ($(n).attr('onclick')){
					$(n).bind('tap', function(){
						$(n).trigger('click');
					});
				}
			});
		}
		
		$('input').focus(function(){ //android keyboard was opened so don't resize b/c it will switch tabs
			me.skipResize = true;
			setTimeout(function(){
				me.skipResize = false;
			}, 1000);
		});
	};
	
	appClass.prototype = {
		/** @private */
		map: null,
		/** @private */
		view: null,
		/** @private */
		zoneSource: null,
		/** @private */
		zoneLayer: null,
		/** @private */
		facilitySource: null,
		/** @private */
		facilityLayer: null,
		/** @private */
		locationSource: null,
		/** @private */
		content: null,
		/** @private */
		controls: null,
		/** @private */
		locate: null,
		/** @private */
		directions: null,
		/** @private */
		popup: null,
		/** @private */
		tips: null,
		/** @private */
		location: null,
		/** @private */
		zoneOrders: null,
		/** @private */
		skipResize: false,
		/** @export */
		vcard: function(node){
			var me = this,
				target = $(node), 
				ios = target.data('ios'),
				id = target.data('feature-id'),
				last = target.data('last-click'),
				feature = this.facilitySource.getFeatureById(id),
				now = new Date().getTime();
			if ((last * 1) + 600 < now || !last){
				$.ajaxSettings.traditional = true;
				if (ios){
					var text = $('#vcard-download').html();
					text = text.replace(/<font>/gi, '');
					text = text.replace(/<\/font>/gi, '');
					window.open('vcard.html?' + $.param(feature.vCardData()) + '&text=' + text);
				}else{
					window.open('/vcard/?' + $.param(feature.vCardData()));
				}
				target.data('last-click', now);
			}
		},
		/**
		 * @private 
		 * @param {string} csvUrl
		 * */
		loadCsv: function(csvUrl){
			var me = this;
			$.support.cors = true;
			$.ajax({
				url: csvUrl + '&today=' + encodeURIComponent(new Date().toLocaleDateString()), //break open data cache daily
				dataType: 'text',
				success: function(csvData){
					var csvFeatures = $.csv.toObjects(csvData), wkt = new ol.format.WKT(), features = [];
					$.each(csvFeatures, function(id, f){
						var lngLat = proj4('EPSG:4326', 'EPSG:2263', [f.longitude, f.latitude]),
							feature = wkt.readFeature('POINT (' + lngLat[0] + ' ' + lngLat[1] + ')');
						feature.setProperties(f);
						feature.setId(id);
						features.push(feature);
					});
					me.facilitySource.addFeatures(features);
					me.initList();
					me.clearFirstLoad();
				},
				error: function(){
					me.alert(me.content.message('data_load_error'));
				}
			});				
		},
		/** @export */
		initList: function(){
			if (!$('#facilities div').length){
				this.list(this.location.coordinates);
			}
		},
		/** @export */
		details: function(node){
			var me = this, 
				target = $(node),
				last = target.data('last-click'),
				now = new Date().getTime();
			if ((last * 1) + 400 < now || !last){
				var parent = target.parent().parent();
				parent.parent().find('ul').slideToggle(function(){
					if (parent.parent().hasClass('inf-pop')) {
						me.popup.pan();
					}				
				});
				target.data('last-click', now);
			}
		},
		/** @private */
		clearFirstLoad: function(){
			if ($('#lang-choice-button').length){
				$('#first-load').fadeOut();				
			}else{
				setTimout(this.ready, 200);
			}
		},
		/** @private */
		resize: function(event){
			if (!this.skipResize){
				var h =  $('#dir-toggle').css('display') == 'block' ? $('#dir-toggle').height() : 0;
				$('#directions').height(
					$('#dir-panel').height() - 
					h - $('.banner').height() -
					$('.footer').height() -
					$('#dir-content').height() - 
					$('#copyright').height() - 15
				);
				if (event && $('#splash').css('display') == 'none'){
					this.layout();
				}
				this.map.render();				
			}
		},
		/** @export */
		layout: function(event){
			var mobile = $('#panel').width() == $(window).width();
			$('#copyright').css('color', '#181f4a');
			$('#tabs').tabs({
				activate: function(event, ui){
					$('#map-page .ui-content').css(
						'z-index', 
						mobile && ui.newPanel.attr('id') == 'map-tab' ? '1000' : 'auto'
					);
				}
			});
			$('#tabs li a').removeClass('ui-btn-active');
			$('#map-tab-btn')[mobile ? 'show' : 'hide']();
			$('#tabs').tabs('refresh')
			$('#tabs').tabs({active: 1});
			$('#facility-tab-btn a').addClass('ui-btn-active');
			this.map.updateSize();
			setTimeout(function(){
				$('#filter-tab').append($('#filters'));
				$('#click-blocker').fadeOut();
			}, 400);
		},
		/**
		 * @export
		 * @param {string} id
		 */
		zoomFacility: function(id){
			var me = this, feature = me.facilitySource.getFeatureById(id);
			if ($('#panel').width() == $(window).width()){
				$('#tabs').tabs({active: 0});
				$('#tabs li a').removeClass('ui-btn-active');
				$('#map-tab-btn a').addClass('ui-btn-active');
			}
			me.zoomCoords(feature.getCoordinates());
			me.map.once('moveend', function(){
				me.showPopup(feature.getCoordinates(), feature.html('inf-pop'))
			});
		},
		/** @private */
		facilityInView: function(){
			var extent = this.view.calculateExtent(this.map.getSize()),
				closest = this.facilitySource.getClosestFeatureToCoordinate(this.location.coordinates);
			if (!ol.extent.containsCoordinate(extent, closest.getCoordinates())){
				extent = ol.extent.extend(extent, closest.getGeometry().getExtent());
				this.map.beforeRender(
					ol.animation.zoom({resolution: this.view.getResolution()}), 
					ol.animation.pan({source: this.view.getCenter()})
				);				
				this.view.fit(extent, this.map.getSize());
			}
		},
		/**
		 * @private
		 * @param {nyc.Locate.LocateResult} data
		 */
		zoomLocation: function(data){
			this.controls.val(data.type == nyc.Locate.LocateEventType.GEOLOCATION ? '' : data.name);
			this.list(data.coordinates);
			this.location = data;
			this.locationSource.clear();
			this.locationSource.addFeature(new ol.Feature({
				geometry: new ol.geom.Point(data.coordinates),
				name: data.name
			}));
			this.zoomCoords(data.coordinates, $.proxy(this.facilityInView, this));
			this.facilityInView();
		},
		/** 
		 * @private 
		 * @param {nyc.Locate.LocateAmbiguous} data
		 */
		ambiguous: function(data){
			if (data.possible.length){
				this.controls.disambiguate(data.possible);
			}else{
				this.controls.searching(false);
				this.alert(this.content.message('bad_input'));
			}
		},
		/**
		 * @export
		 * @param {string} id
		 */
		direct: function(id){
			var me = this,
				feature = me.facilitySource.getFeatureById(id),
				to = feature.getAddress(),
				name = feature.getName(),
				from = me.location.name || '';
			
			$('body').pagecontainer('change', $('#dir-page'), {transition: 'slideup'});
			if (me.lastDir != from + '|' + to){
				var args = {from: unescape(from), to: unescape(to), facility: unescape(name)};
				me.lastDir = from + '|' + to;
				me.directions.directions(args);
			}
		},
		/** @private */
		mapSize: function(){
			var map = this.map;
			setTimeout(function(){map.updateSize()}, 10);
		},
		/** 
		 * @private 
		 * @param {ol.Coordinate} coordinates
		 */
		list: function(coordinates){
			var container = $('#facilities');
			container.empty();
			this.pager.reset(this.facilitySource.sort(coordinates));
			this.next();
		},
		/** @export */
		next: function(){
			var facilities = this.pager.next();
			this.appendInfo($('#facilities'), facilities);
			$('div.list-more')[facilities.length < 10 ? 'hide' : 'show']();
		},
		/** @private
		 * @return {boolean}
		 */
		isMobile: function(){
			return navigator.userAgent.match(/(iPad|iPhone|iPod|iOS|Android)/g);
		},
		/** @private
		 * @param {JQuery} container
		 * @param {Array<Object>} facility
		 */
		appendInfo: function(container, facilities){
			$.each(facilities, function(i, facility){
				var info = $(facility.html('inf-list'));
				if (i % 2 != 0) info.addClass('odd-row');
				container.append(info).trigger('create');
			});
			if (this.isMobile()){
				container.find('a, button').each(function(_, n){
					if ($(n).attr('onclick')){
						$(n).bind('tap', function(){
							$(n).trigger('click');
						});
					}
				});				
			}
		},
		/** @private */
		qstr: function(qstr){
			var args = {};
			try{
				var params = qstr.substr(1).split('&');
				for (var i = 0; i < params.length; i++){
					var p = params[i].split('=');
					args[p[0]] = decodeURIComponent(p[1]);
				}
			}catch(ignore){}
			if (args.address){
				this.locate.search(args.address);
			}else{
				this.locate.locate();
			}
		},
		/** 
		 * @private 
		 * @param {Object} evt
		 */
		filter: function(){
			var filters = [];
			$('#filters select').each(function(_, select){
				var props = $(select).val().split(',');
				$.each(props, function(_, prop){
					if (prop != 'any')
						filters.push({property: prop, values: ['1']});
				});
			});
			this.facilitySource.filter(filters);
			this.list(this.location.coordinates);
			if (!this.facilitySource.getFeatures().length){
				this.alert(this.content.message('data_filter_warn'));
				$('div.list-more').hide();
			}
		},
		/** 
		 * @private 
		 * @param {ol.Coordinate} coordinates
		 */
		zoomCoords: function(coords, afterZoom){
			if (afterZoom){
				this.map.once('moveend', afterZoom);
			}
			this.map.beforeRender(
				ol.animation.zoom({resolution: this.view.getResolution()}), 
				ol.animation.pan({source: this.view.getCenter()})
			);
			this.view.setZoom(7);
			this.view.setCenter(coords);
		},
		/** 
		 * @private 
		 * @param {Object} evt
		 */
		mapClick: function(evt){
			var me = this, map = me.map, px = evt.pixel;
			map.forEachFeatureAtPixel(px, function(feature, layer){
				if (layer == me.facilityLayer){
					var coords = feature.getCoordinates();
					if (coords){
						me.showPopup(coords, feature.html('inf-pop'));
						return true;
					}
				}
			});
		},
		/** 
		 * @private 
		 * @param {ol.Coordinate} coordinates
		 * @param {string} html
		 */
		showPopup: function(coordinates, html){
			this.hideTips();
			this.popup.setOffset([0, -10]);
			this.popup.show({
				coordinates: coordinates,
				html: html
			});
		},
		/** @private */
		facilityTip: function(){
			return {
				cssClass: 'tip-facility',
				text:  this.message('facility_tip', {name: this.getName()})
			};
		},
		/** @private */
		locationTip: function(){
			return {
				cssClass: 'tip-location',
				text: this.getName().replace(/,/, '<br>')
			};			
		},
		/** @private */
		hideTips: function(){
			$.each(this.tips, function(_, tip){
				tip.hide();
			});
		},
		/**
		 * @private 
		 * @param {string} msg
		 */
		alert: function(msg){
			$('body').append($('#alert'));
			$('#alert-msg').html(msg);
			$('#alert').fadeIn();
			$('#alert button').focus();
		}
	};
	
	return appClass;
}());

	