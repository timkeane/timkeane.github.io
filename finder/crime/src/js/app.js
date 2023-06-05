/** 
 * @public 
 * @namespace
 */
var nyc = nyc || {};

/**
 * @desc A class to manage the crime map UX
 * @public
 * @class
 * @constructor
 * @param {nyc.App.Options} options Constructor options
 */
nyc.App = function(options){
	var me = this;
	me.map = options.map;
	me.viewSwitcher = options.viewSwitcher;
	me.mapType = options.mapType;
	me.crimeType = options.crimeType;
	me.dateRange = options.dateRange;
	me.allChart = options.allChart;
	me.summaryChart = options.summaryChart;
	me.locationInfo = options.locationInfo;
	me.crimeDrillDown = options.crimeDrillDown;
	me.boroughNames = options.boroughNames || me.boroughNames;
		
	me.viewSwitcher.on('updated', me.updateLegend, me);
	me.mapType.on('change', function(){$('#legend').empty();});
	me.mapType.on('change', me.updateView, me);
	me.crimeType.on('change',me.updateView, me);
	me.dateRange.on('change', me.updateView, me);
	
	options.locationMgr.on(nyc.Locate.EventType.GEOCODE, me.currentPrecinct, me);
	options.locationMgr.on(nyc.Locate.EventType.GEOLOCATION, me.currentPrecinct, me);

	me.popups();
	
	$('#btn-toggle').click(me.toggle);
	$('#chart-pane').collapsible({
		expand: function(){
			me.updateSummaryChart();
		}
	});
	$(window).unbind('resize').bind('resize', $.proxy(me.resize, me));
	$(window).unbind('orientationchange').bind('orientationchange', $.proxy(me.resize, me));
	$('#chart-all').css('left', $(window).width() + 50 + 'px');

	me.map.on('viewreset', $.proxy(me.checkForUpdate, me));
	
	me.updateView();
	
	me.prevZoom = me.map.getZoom();
};

nyc.App.prototype = {
	/**
	 * @private
	 * @member {L.Map}
	 */
	map: null,
	/**
	 * @private
	 * @member {nyc.carto.ViewSwitcher}
	 */
	viewSwitcher: null,
	/**
	 * @private
	 * @member {nyc.Radio}
	 */
	mapType: null,
	/**
	 * @private
	 * @member {nyc.Radio}
	 */
	crimeType: null,
	/**
	 * @private
	 * @member {nyc.MonthRangePicker}
	 */
	dateRange: null,
	/**
	 * @private
	 * @member {nyc.carto.Chart}
	 */
	allChart: null,
	/**
	 * @private
	 * @member {nyc.carto.Chart}
	 */
	summaryChart: null,
	/**
	 * @private
	 * @member {nyc.carto.Dao}
	 */
	locationInfo: null,
	/**
	 * @private
	 * @member {Object<string, nyc.carto.Dao>}
	 */
	crimeDrillDown: null,
	/**
	 * @private
	 * @member {Object<string, string>}
	 */
	boroughNames: {'1': 'Manhattan', '2': 'Bronx', '3': 'Brooklyn', '4': 'Queens', '5': 'Staten Isl.'},
	/**
	 * @private
	 * @member {nyc.Locate.Result}
	 */
	location: null,
	/**
	 * @private
	 * @member {nyc.Dialog}
	 */
	dialog: null,
	/**
	 * @private
	 * @member {number}
	 */
	prevZoom: -1,
	/**
	 * @private
	 * @member {Object.<string, string>}
	 */
	crimeTypePlurals: {
		BURGLARY: 'Burglaries',
		'FELONY ASSAULT': 'Felony Assaults',
		'GRAND LARCENY': 'Grand Larcenies',
		'GRAND LARCENY OF MOTOR VEHICLE': 'Grand Larcenies of Motor Vehicles',
		MURDER: 'Murders',
		RAPE: 'Rapes',
		ROBBERY: 'Robberies'
	},
	/**
	 * @desc Hides the large precinct chart
	 * @public
	 * @method
	 */
	hideAllChart: function(){
		$('#chart-all').animate({left: $(window).width() + 50});		
		$('#chart-all-close').hide();
	},
	/** 
	 * @desc Toggle between the map and panel of input controls on mobile display
	 * @public 
	 * @method
	 * @param {Object} event The event object
	 */
	toggle: function(event){
		var btn = $(event.target);
		btn.toggleClass('btn-map').toggleClass('btn-panel');
		$('#panel').slideToggle();
	},
	/** 
	 * @private
	 * @method
	 * @param {Element} btn 
	 * @param {nyc.carto.Popup} popup 
	 */
	drillDownLink: function(btn, popup){
		var data = popup.popupEventData[3];
		if (data.type == 'Crimes' && data.crime_count){
			var me = this;
			var list = $(popup.infowin.el).find('ul.crime-count-type');					
			$(btn).toggleClass('ui-icon-carat-u').toggleClass('ui-icon-carat-d');
			if (list.children().length == 0){
				me.drillDown(data, popup);
			}else{
				list.slideToggle(function(){me.panPopup(popup);});
			}
		}
	},
	/** 
	 * @private
	 * @method
	 * @param {Object} data 
	 * @param {nyc.carto.Popup} popup 
	 */
	drillDown: function(data, popup){
		var me = this, filters = me.filters().filterValues, dao;
		if (data.pct){
			filters.precinct = {pct: data.pct};
			dao = this.crimeDrillDown.precinct;
		}else if (data.cartodb_id){
			filters.sector = {cartodb_id: data.cartodb_id};
			dao = this.crimeDrillDown.sector;
		}else{
			filters.location = {x: data.x, y: data.y};
			dao = this.crimeDrillDown.location;
		}
		dao.data(filters, function(data){
			var list = $(popup.infowin.el).find('ul.crime-count-type');					
			$.each(data.rows, function(_, row){
				list.append(
					'<li class="crime-type-count"><span class="crime-type-indent">' +
					'<span class="fmt-num">' + row.crime_count + '</span> ' + 
					me.crimeTypePlurals[row.type] + '</span></li>'
				);
			});
			nyc.util.formatNumberHtml({elements: '.crime-type-indent .fmt-num'}).removeClass('fmt-num');
			list.slideToggle(function(){me.panPopup(popup);});
		});
	},
	/** 
	 * @private
	 * @method
	 * @param {nyc.carto.Popup} popup 
	 */
	panPopup: function(popup){
		var pop = $(popup.infowin.el), list = pop.find('ul.crime-count-type');					
		if (list.css('display') == 'block'){
			var infoTop = pop.position().top;
			if (infoTop < 0){
				this.map.panBy([0, infoTop - 10]);
			}
		}
	},
	/** 
	 * @private 
	 * @method
	 * @param {nyc.Locate.Result} data
	 */
	currentPrecinct: function(data){
		var me = this, lngLat = data.coordinates;
		this.location = data;
		data = data.data || {};
		me.precinct = data.pct || data.policePrecinct || data.leftSegmentPolicePrecinct;
		me.boro = !isNaN(data.boro) ? data.boro : data.boroughCode1In;
		if (isNaN(me.precinct) || isNaN(me.boro)){
			me.locationInfo.data(
				{location: {lng: lngLat[0], lat: lngLat[1]}}, 
				function(data){
					if (data.rows.length){
						me.precinct = data.rows[0].pct;
						me.boro = data.rows[0].boro;
						me.updateSummaryChart();
					}else{
						$('#chart-sum').addClass('chart-none');
					}
				}
			);
		}else{
			me.updateSummaryChart();
		}
	},
	/**
	 * @private
	 * @method
	 * @return {number}
	 */
	winWidth: function(){
		return $(window).width();
	},
	/**
	 * @private
	 * @method
	 */
	resize: function(){
		if ($('#chart-all').position().left > 0){
			$('#chart-all').css('left', this.winWidth() + 50 + 'px');
		}
		if (this.winWidth() >= 495){
			$('#panel').show();
		}
		if ($('#panel').css('display') == 'none'){
			$('#btn-toggle').removeClass('btn-map').addClass('btn-panel');
		}else{
			$('#btn-toggle').removeClass('btn-panel').addClass('btn-map');
		}
		
		/* when showing the browser controls, mobile safari fires resize before the browser is done resizing */
		var me = this;
		setTimeout(function(){
			me.chartHeight();
			me.allChart.render();
		}, nyc.util.isIos() ? 1000 : 0);
	},
	chartHeight: function(){
		if ($('#chart-all').height() < 320){
			$('#chart-all').height($('body').height() - 45);
			$('#chart-all canvas').height($('#chart-all').height() - 85);
		}		
	},
	/** 
	 * @private 
	 * @method
	 * @return {Object<string, string>}
	 */
	crimeTypesParam: function(){
		var crimeType = this.crimeType.val(), params = {displayType: this.crimeTypePlurals[crimeType] || "Crimes"};
		if (crimeType == '*'){
			params.crimeType = "'BURGLARY','FELONY ASSAULT','GRAND LARCENY','GRAND LARCENY OF MOTOR VEHICLE','MURDER','RAPE','ROBBERY'";
		}else{
			params.crimeType = "'" + crimeType + "'";
		}
		return params;
	},
	/** 
	 * @private 
	 * @method
	 * @param {number=} yearOffset
	 * @return {Object<string, Object<string, string>>}
	 */
	filters: function(yearOffset){
		var crimeTypeParams = this.crimeTypesParam(),
			start = this.date(this.dateRange.val().start, yearOffset),
			end = this.date(this.dateRange.val().end, yearOffset),
			descriptionValues = {
				displayType: crimeTypeParams.displayType,
				displayDates: start.toLocaleDateString() + ' - ' + end.toLocaleDateString()
			},
			filterValues = {
				mo: {
					min_mo: (start.getFullYear() * 100) + start.getMonth() + 1,
					max_mo: (end.getFullYear() * 100) + end.getMonth() + 1
				},
				crimeType: {
					display_type: crimeTypeParams.displayType,
					crime_types: crimeTypeParams.crimeType
				}
			};
		return {filterValues: filterValues, descriptionValues: descriptionValues};
	},
	/** 
	 * @private 
	 * @method
	 * @param {Object<string, string>} filterValues
	 */
	appendLocationFilters: function(filterValues){
		if (this.location){
			filterValues.areas = {
				pct: this.precinct,
				boro: this.boro,
				boro_name: this.boroughNames[this.boro] || ''
			};
		}		
	},
	/** 
	 * @private
	 * @method
	 * @return {Object<string, Object>}
	 */
	chartFilters: function(){
		var series0 = this.filters(),
			start = this.dateRange.val().start,
			end = this.dateRange.val().end,
			result = {
				filterValues: [series0.filterValues],
				descriptionValues: {
					displayType: series0.descriptionValues.displayType,
					seriesTitles: [series0.descriptionValues.displayDates]
				}
			};
		this.appendLocationFilters(series0.filterValues);
		var diff = this.secondSeries(start, end);
		if (diff){
			var series1 = this.filters(diff);
			this.appendLocationFilters(series1.filterValues);
			result.filterValues.push(series1.filterValues);
			result.descriptionValues.seriesTitles.push(series1.descriptionValues.displayDates);
		}
		return result;
	},
	/** 
	 * @private 
	 * @method
	 * @param {Object} start
	 * @param {Object} end
	 * @return {number}
	 */
	secondSeries: function(start, end){
		var result = 0;
		if (start.getFullYear() == end.getFullYear()){
			var startBefore = new Date(start), endAfter = new Date(end);
			startBefore.setFullYear(startBefore.getFullYear() - 1);
			endAfter.setFullYear(endAfter.getFullYear() + 1);
			if (startBefore >= this.dateRange.minDate){
				/* there is a corresponding range in previous year */
				result = -1; 
			}else if (endAfter <= this.dateRange.maxDate){
				/* there is a corresponding range in next year */
				result = 1; 
			}
		}

		return result;
	},
	/** 
	 * @private 
	 * @method
	 * @param {Date} date
	 * @param {number=} yearOffset
	 * @return {Date}
	 */
	date: function(date, yearOffset){
		yearOffset = yearOffset || 0;
		date = new Date(date);
		date.setFullYear(date.getFullYear() + yearOffset);
		return date;
	},
	/** 
	 * @private 
	 * @method
	 */
	checkForUpdate: function(){
		var zoom = this.map.getZoom();
		if ((this.prevZoom < 13 && zoom >= 13) || (this.prevZoom > 12 && zoom <= 12)){
			this.updateView();
		}
		this.prevZoom = zoom;
		$('#legend')[this.map.getZoom() < 14 ? 'addClass' : 'removeClass']('small');
	},
	/**
	 * @private
	 * @method
	 */
	updateView: function(){
		var filters = this.filters(), view = this.mapType.val();
		$('#spinner').show();
		if (view == 'location' && this.map.getZoom() < 13){
			view = 'sector';
		}
		this.disableChoices();	
		this.viewSwitcher.switchView(view, filters.filterValues, filters.descriptionValues);
		this.updateAllChart();		
		this.updateSummaryChart();
	},
	/**
	 * @private
	 * @method
	 */
	disableChoices: function(){
		var disabled = this.crimeType.val() == 'RAPE';
		this.mapType.disabled('location', disabled);
		this.mapType.disabled('heat', disabled);
		this.crimeType.disabled('RAPE', this.mapType.val() != 'precinct');
	},
	/** 
	 * @private 
	 * @method
	 * @param {JQuery|Element|string} yearOffset
	 */
	updateLegend: function(legendHtml){
		var legend = $(legendHtml);
		nyc.util.formatNumberHtml({elements: legend.find('.fmt-num')}).removeClass('fmt-num');
		$('#spinner').hide();
		$('#legend').html(legend);
		$('#first-load').fadeOut();
	},
	/**
	 * @private
	 * @method
	 */
	updateSummaryChart: function(){
		if (this.location && $('#chart-sum:visible').length){
			var filters = this.chartFilters();
			this.summaryChart.chart(filters.filterValues, $('#chart-sum .chart-title'), filters.descriptionValues);
			$('#chart-sum').removeClass('chart-none');
		}
	},
	/**
	 * @private
	 * @method
	 */
	showAllChart: function(){
		var chart = $('#chart-all');
		this.updateAllChart();
		if (chart.position().left > 0){
			chart.animate({left: 0}, $.proxy(this.updateAllChart, this));
			$('#chart-all-close').show();
		}
	},
	/**
	 * @private
	 * @method
	 * @param {boolean} force
	 */
	updateAllChart: function(force){
		if (force || $('#chart-all').position().left < $(window).width()){
			var filters = this.chartFilters();
			this.chartHeight();			
			this.allChart.chart(filters.filterValues, $('#chart-all .chart-title'), filters.descriptionValues);	
		}
	},
	/**
	 * @private 
	 * @method
	 */
	popups: function(){
		var views = this.viewSwitcher.views;
		new nyc.carto.Popup({
			map: this.map,
			layer: views.precinct.layer,
			interactivity: ['pop', 'name', 'pct', 'type', 'crime_count', 'per1000'],
			template: $('#info-pct').html(),
			onShowPopup: $.proxy(this.setupPopup, this),
			onTipChange: this.tipChange
		});		
		new nyc.carto.Popup({
			map: this.map,
			layer: views.sector.layer,
			interactivity: ['cartodb_id', 'type', 'crime_count'],
			template: $('#info-sct').html(),
			onShowPopup: $.proxy(this.setupPopup, this),
			onTipChange:this.tipChange
		});		
		new nyc.carto.Popup({
			map: this.map,
			layer: views.location.layer,
			interactivity: ['x', 'y', 'type', 'crime_count'],
			template: $('#info-loc').html(),
			onShowPopup: $.proxy(this.setupPopup, this),
			onTipChange:this.tipChange
		});		
	},
	/**
	 * @private 
	 * @method
	 * @param {nyc.carto.Popup} popup
	 */
	setupPopup: function(popup){
		var me = this, btn = $(popup.infowin.el).find('.crime-count a');
		nyc.util.formatNumberHtml({elements: '.cartodb-popup .fmt-num'}).removeClass('fmt-num');
		if (!btn.data('drilldown')){
			btn.data('drilldown', true);
			btn.click(function(event){
				me.drillDownLink(event.target, popup);
			});
		}
	},
	/**
	 * @private 
	 * @method
	 */
	tipChange: function(){
		nyc.util.formatNumberHtml({elements: '.cartodb-tooltip .fmt-num'}).removeClass('fmt-num');
	}
};

/**
 * @desc Object type to hold constructor options for nyc.App
 * @public
 * @typedef {Object}
 * @property {L.Map} The Leaflet map that will be used as the crime map 
 * @property {nyc.carto.ViewSwitcher} viewSwitcher Switches between various views of the data
 * @property {nyc.LocationMgr} locationMgr Locates using geolocation and geocoding
 * @property {nyc.Radio} mapType UX controls for selecting the map type
 * @property {nyc.Radio} crimeType UX controls for selecting the map type
 * @property {nyc.MonthRangePicker} dateRange UX controls for selecting the month range
 * @property {nyc.Chart} allChart All precinct chart controller
 * @property {nyc.Chart} summaryChart Summary chart controller
 * @property {nyc.carto.Dao} locationInfo DAO to access drill-down data at a location
 * @property {Object<string, nyc.carto.Dao>} crimeDrillDown DAOs to access drill-down data for a precinct
 * @property {Object<string, string>=} boroughNames A map of borough name to borough code
 */
nyc.App.Options;