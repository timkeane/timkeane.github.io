nyc.sr = nyc.sr || {};

Date.prototype.toShortISOString = function(){
	return this.toISOString().split('T')[0];
};

nyc.sr.App = function(options){
	this.map = options.map;
	this.view = this.map.getView();
	this.view.setMinZoom(9);
	this.cdChoices = [];
	options.cdDecorations.choices = this.cdChoices;
	this.tips = [];
	this.getCds(options);
	this.style = options.style;
	this.legend = options.legend.container.find('.legend');
	this.mapRadio = options.mapRadio;
	this.dateInput = options.dateInput;
	this.sodaTextarea = options.sodaTextarea;
	this.cdSoda = options.cdSoda;
	this.srSoda = options.srSoda;
	this.cdListSoda = options.cdListSoda;
	this.srListSoda = options.srListSoda;
	this.buckets = options.buckets;
	this.listDetail = options.listDetail;
	
	this.defaultDates();

	this.highlightSrc = new ol.source.Vector({});
	this.highlightLyr = new ol.layer.Vector({
		source: this.highlightSrc, 
		style: $.proxy(this.style.highlightStyle, this.style),
		zIndex: 1000
	});
	this.map.addLayer(this.highlightLyr);
	
	this.srLyr = new ol.layer.Vector({style: $.proxy(this.style.srStyle, this.style)});
	this.map.addLayer(this.srLyr);
	this.tips.push(new nyc.ol.FeatureTip(this.map, [
        {layer: this.srLyr, labelFunction: this.tip
	}]));
	
	this.mapRadio.on('change', $.proxy(this.changeMapType, this));
	this.sodaTextarea.container.find('textarea').click($.proxy(this.copyUrl, this));
	$('#record-count a.toggle').click($.proxy(this.toggle, this));
	
	this.map.on('click', $.proxy(this.mapClick, this));
	
	$(window).resize(function(){
		if ($('#panel').width() != $(window).width()) {
			$('#panel').show();
		}
	});
	
	this.initLegends();
	this.runFirstQuery();
};

nyc.sr.App.prototype = {
	map: null,
	view: null,
	cdChoices: null,
	highlightSrc: null,
	highlightLyr: null,
	cdSrc: null,
	cdLyr: null,
	srSrc: null,
	srLyr: null,
	cdLeg: null,
	srLeg: null,
	style: null,
	legend: null,
	mapRadio: null,
	dateInput: null,
	cdCheck: null,
	srTypeCheck: null,
	sodaTextarea: null,
	cdSoda: null,
	srSoda: null,
	cdListSoda: null,
	srListSoda: null,
	buckets: null,
	listDetail: null,
	tips: null,
	mapType: 'cd',
	toggle: function(){
		var pw = $('#panel').width(), ww = $(window).width();
		if (pw == ww || pw == 0){
			$('#record-count a.toggle').toggleClass('panel');
			$('#panel').slideToggle();
		}
	},
	initLegends: function(){
		this.cdLeg = new nyc.BinLegend(
			'cd-leg',
			nyc.BinLegend.SymbolType.POLYGON,
			nyc.BinLegend.BinType.RANGE_NUMBER
		);
		this.srLeg = new nyc.BinLegend(
			'sr-leg',
			nyc.BinLegend.SymbolType.POINT,
			nyc.BinLegend.BinType.RANGE_NUMBER
		);
	},
	runFirstQuery: function(){
		if (this.cdSrc.getFeatures().length){
			this.sodaMapQuery();
		}else{
			var me = this;
			setTimeout(function(){
				me.runFirstQuery();
			}, 200);
		}
	},
	changeMapType: function(type){
		this.mapType = type[0].name;
		this.sodaMapQuery();
	},
	defaultDates: function(){
		var today = new Date(), lastWeek = new Date();
		lastWeek.setDate(lastWeek.getDate() - 7);
		this.minDate = this.dateInput.container.find('#created-date-min');
		this.maxDate = this.dateInput.container.find('#created-date-max');
		this.dateInput.container.find('input').change($.proxy(this.sodaMapQuery, this));
		this.minDate.val(lastWeek.toShortISOString());
		this.maxDate.val(today.toShortISOString());
	},
	getCds: function(options){		
		var cdSrc = new nyc.ol.source.Decorating(
			{url: options.cdUrl, format: new ol.format.GeoJSON()},
			[options.cdDecorations],
			{nativeProjection: 'EPSG:4326', projection: 'EPSG:3857'}
		);
		cdSrc.on(nyc.ol.source.Decorating.LoaderEventType.FEATURESLOADED, $.proxy(this.gotCds, this));
		this.cdSrc = cdSrc;
	},
	gotCds: function(){
		this.cdLyr = new ol.layer.Vector({
			source: this.cdSrc, 
			style: $.proxy(this.style.cdStyle, this.style)
		});
		this.tips.push(new nyc.ol.FeatureTip(this.map, [
            {layer: this.cdLyr, labelFunction: this.tip}
        ]));
		this.map.addLayer(this.cdLyr);
		this.createCdCheck();
	},
	createCdCheck: function(){
		var div = $('<div id="community-districts"></div>');		
		this.cdChoices.sort(function(a, b){
			var aCd = a.sort, bCd = b.sort;
			if (aCd < bCd) return -1;
			if (aCd > bCd) return 1;
			return 0;
		});
		this.cdCheck = new nyc.Check({
			target: div, 
			title: 'Community District',
			choices: this.cdChoices
		});
		this.dateInput.container.after(div);
		div.trigger('create');
		this.cdCheck.on('change', $.proxy(this.sodaMapQuery, this));		
	},
	gotSrTypes: function(data){
		var div = $('<div id="complaint-types"></div>');		
		var types = [];
		$.each(data, function(i, typ){
			types.push({
				name: 'complaint_type',
				label: typ.complaint_type,
				value: typ.complaint_type
			});
			return i < 9;
		});
		this.srTypeCheck = new nyc.Check({
			target: div, 
			title: 'Complaint Type',
			choices: types
		});
		this.sodaTextarea.container.before(div);		
		div.trigger('create');
		this.srTypeCheck.on('change', $.proxy(this.sodaMapQuery, this));
	},
	getFilters: function(props){
		var filters = {
			created_date: this.dateFilters(),
			community_board: this.filterValues(this.cdCheck),
			complaint_type: this.filterValues(this.srTypeCheck)
		};
		props = props || {};
		if (props.x_coordinate_state_plane){
			filters.x_coordinate_state_plane = [{op: '=', value: props.x_coordinate_state_plane}];
			filters.y_coordinate_state_plane = [{op: '=', value: props.y_coordinate_state_plane}];
		}
		if (props.community_board){
			filters.community_board = [{op: '=', value: props.community_board}];
		}
		return filters;
	},		
	dateFilters: function(){
		return [
	        {op: '>=', value: this.minDate.val()},
	        {op: '<=', value: this.maxDate.val()}
        ];
	},
	sodaMapQuery: function(){
		var filters = this.getFilters(), soda, callback;
		if (this.mapType == 'cd'){
			soda = this.cdSoda;
			callback = $.proxy(this.updateCdLayer, this);
		}else{
			soda = this.srSoda;
			callback = $.proxy(this.updateSrLayer, this);
		}
		this.executeSoda(soda, filters, callback);
		this.highlightSrc.clear();
		this.listDetail.listDetailContainer.hide();
		this.listDetail.container.collapsible('collapse');		
	},
	sodaInfoQuery: function(feature, layer){
		var filters = this.getFilters(feature.getProperties()), soda, callback;
		if (layer === this.cdLyr){
			soda = this.cdListSoda;
			callback = $.proxy(this.cdList, this);
		}else{
			soda = this.srListSoda;
			callback = $.proxy(this.srList, this);
		}
		this.highlight(feature);
		this.executeSoda(soda, filters, callback);
		return true;
	},
	highlight: function(feature){
		this.highlightSrc.clear();
		this.highlightSrc.addFeature(feature);
	},
	cdList: function(data, soda){
		this.listDetail.cdList(data, soda.filters);
		this.toggle();
		$('#loading').fadeOut();
	},
	srList: function(data, soda){
		this.listDetail.srList(data, soda.filters);
		this.toggle();
		$('#loading').fadeOut();
	},
	executeSoda: function(soda, filters, callback){
		$('#loading').fadeIn();
		soda.execute({filters: filters}, callback);
		this.sodaTextarea.container.find('textarea').html(
			decodeURIComponent(
				soda.getUrlAndQuery()
			)
		);		
	},
	mapClick: function(event){
		this.map.forEachFeatureAtPixel(event.pixel, $.proxy(this.sodaInfoQuery, this));
	},
	filterValues: function(check){
		if (check && check.val().length){
			var values = [];
			$.each(check.val(), function(){
				values.push(this.value);
			});
			return [{op: 'IN', value: values}];
		}
	},
	updateCdLayer: function(data){
		var me = this, buckets = this.buckets.build(data, this.cdSrc);
		$.each(me.cdSrc.getFeatures(), function(){
			this.set('sr_count', undefined);
		});
		$.each(data, function(){
			var cd = me.cdSrc.getFeatureById(this.id);
			cd.set('sr_count', this.sr_count);
		});
		this.style.buckets = buckets.buckets;
		me.cdLyr.dispatchEvent('change');
		me.legend.html(me.cdLeg.html('Service Requests by<br>Community District', buckets.breaks));
		$(me.mapRadio.inputs[1]).prop('disabled', buckets.total > 50000).checkboxradio('refresh');
		me.srLyr.setVisible(false);
		me.cdLyr.setVisible(true);
	},
	updateSrLayer: function(data){
		var me = this;
		me.srSrc = new nyc.ol.source.Decorating(
			{loader: new nyc.ol.source.CsvPointFeatureLoader({
				url: me.srSoda.getUrlAndQuery(),
				projection: 'EPSG:2263',
				fidCol: 'id',
				xCol: 'x_coordinate_state_plane',
				yCol: 'y_coordinate_state_plane'
			})},
			[],
			{nativeProjection: 'EPSG:2263', projection: 'EPSG:3857'}
		);

		me.srSrc.on(nyc.ol.source.Decorating.LoaderEventType.FEATURESLOADED, function(){
			var buckets = me.buckets.build(data, me.srSrc);
			if (buckets.total >= 50000){
				$(me.mapRadio.inputs[1]).prop('disabled', true).checkboxradio('refresh');
				$(me.mapRadio.inputs[0]).trigger('click').checkboxradio('refresh');
			}else{
				me.style.buckets = buckets.buckets;
				me.legend.html(me.srLeg.html('Service Requests by Location', buckets.breaks));
				me.cdLyr.setVisible(false);
				me.srLyr.setVisible(true);				
			}
		});
		
		me.srLyr.setSource(me.srSrc);
	},
	tip: function(){
		var count = this.get('sr_count') || '', txt = '';
		if (this.getLabel){
			txt = '<b>' + this.getLabel() + '</b><br>';
		}
		return {text: txt + count + ' Service Requests'};
	},
	copyUrl: function(event){
		var target = $(event.target), pos = target.position(), tip = $('#soda-url .tip');
		target.select();
		document.execCommand('copy');
		tip.css({left: pos.left + 'px', top: pos.top + 'px'}).fadeIn(function(){
			$(document).one('click', $.proxy(tip.fadeOut, tip));
		});
	}
};