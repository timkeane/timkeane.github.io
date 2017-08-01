nyc.sr = nyc.sr || {};

nyc.sr.App = function(options){
	this.map = options.map;
	this.view = this.map.getView();
	this.whereNotMappable = options.whereNotMappable;
	this.cdChoices = [];
	options.cdDecorations.choices = this.cdChoices;
	this.cdSrc = this.getCds(options);
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

	this.srLyr = new ol.layer.Vector({style: $.proxy(this.style.srStyle, this.style)});
	this.map.addLayer(this.srLyr);
	new nyc.ol.FeatureTip(this.map, [{layer: this.srLyr, labelFunction: this.tip}]);
	
	this.mapRadio.on('change', $.proxy(this.changeMapType, this));
	this.sodaTextarea.container.find('textarea').click($.proxy(this.copyUrl, this));
	
	this.map.on('click', $.proxy(this.mapClick, this));
	
	this.initLegends();
	this.runFirstQuery();
};

nyc.sr.App.prototype = {
	map: null,
	view: null,
	cdChoices: null,
	cdSrc: null,
	cdLyr: null,
	srLyr: null,
	cdLeg: null,
	srLeg: null,
	style: null,
	legend: null,
	mapRadio: null,
	dateInput: null,
	cdCheck: null,
	srTypeCheck: null,
	whereNotMappable: null,
	sodaTextarea: null,
	cdSoda: null,
	srSoda: null,
	cdListSoda: null,
	srListSoda: null,
	buckets: null,
	listDetail: null,
	mapType: 'cd',
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
		return cdSrc;
	},
	gotCds: function(){
		this.cdLyr = new ol.layer.Vector({
			source: this.cdSrc, 
			style: $.proxy(this.style.cdStyle, this.style)
		});
		new nyc.ol.FeatureTip(this.map, [{layer: this.cdLyr, labelFunction: this.tip}]);
		this.map.addLayer(this.cdLyr);
		this.creatCdCheck();
	},
	creatCdCheck: function(){
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
	buildWhereClause: function(){
		var where = nyc.soda.Query.and(this.whereNotMappable, this.dateClause());
		where = nyc.soda.Query.and(where, this.inClause('community_board', this.cdCheck));
		where = nyc.soda.Query.and(where, this.inClause('complaint_type', this.srTypeCheck));
		return where;
	},
	sodaMapQuery: function(){
		var where = this.buildWhereClause(), soda, callback;
		if (this.mapType == 'cd'){
			soda = this.cdSoda;
			callback = $.proxy(this.updateCdLayer, this);
		}else{
			soda = this.srSoda;
			callback = $.proxy(this.updateSrLayer, this);
		}
		this.executeSoda(soda, where, callback);
	},
	sodaInfoQuery: function(feature, layer){
		var where = this.buildWhereClause(), soda, callback;
		if (layer === this.cdLyr){
			var cd = feature.getId();
			where = nyc.soda.Query.and(where, "community_board = '" + cd + "'");
			soda = this.cdListSoda;
			callback = $.proxy(this.cdList, this);
		}else{
			var x = feature.get('x_coordinate_state_plane');
			var y = feature.get('y_coordinate_state_plane');
			where = nyc.soda.Query.and(where, 'x_coordinate_state_plane = ' + x);
			where = nyc.soda.Query.and(where, 'y_coordinate_state_plane = ' + y);
			soda = this.srListSoda;
			callback = $.proxy(this.srList, this);
		}
		this.executeSoda(soda, where, callback);
		return true;
	},
	cdList: function(data, soda){
		this.listDetail.cdList(data, soda.query.where);
		$('#loading').fadeOut();
	},
	srList: function(data, soda){
		this.listDetail.srList(data, soda.query.where);
		$('#loading').fadeOut();
	},
	executeSoda: function(soda, where, callback){
		$('#loading').fadeIn();
		soda.execute({where: where, callback: callback});
		this.sodaTextarea.container.find('textarea').html(soda.getUrlAndQuery());		
	},
	mapClick: function(event){
		this.map.forEachFeatureAtPixel(event.pixel, $.proxy(this.sodaInfoQuery, this));
	},
	dateClause: function(){
		var where = "created_date >= '" + this.minDate.val() + "'";
		where = nyc.soda.Query.and(where, "created_date <= '" + this.maxDate.val() + "'");
		return where;
	},
	inClause: function(sodaCol, checkboxes){
		if (checkboxes && checkboxes.val().length){
			var where = sodaCol + ' IN (';
			$.each(checkboxes.val(), function(){
				where += "'" + this.value + "',";
			});
			return where.substr(0, where.length - 1) + ')';			
		}
	},
	and: function(where, more){
		if (more){
			return where + ' AND ' + more;
		}
		return where;
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
		var src = new nyc.ol.source.Decorating(
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

		src.on(nyc.ol.source.Decorating.LoaderEventType.FEATURESLOADED, function(){
			var buckets = me.buckets.build(data, src);
			if (buckets.total == 50000){
				$(me.mapRadio.inputs[1]).prop('disabled', true).checkboxradio('refresh');
				$(me.mapRadio.inputs[0]).trigger('click').checkboxradio('refresh');
			}else{
				me.style.buckets = buckets.buckets;
				me.legend.html(me.srLeg.html('Service Requests by Location', buckets.breaks));
				me.cdLyr.setVisible(false);
				me.srLyr.setVisible(true);				
			}
		});
		
		me.srLyr.setSource(src);
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