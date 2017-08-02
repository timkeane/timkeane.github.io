nyc.soda = {};

nyc.soda.Query = function(options){
	options = options || {};
	this.query = {};
	this.setUrl(options.url);
	this.setQuery(options);
};

nyc.soda.Query.prototype = {
	url: null,
	query: null,
	setUrl: function(url){
		this.url = url || this.url;
	},
	setQuery: function(options){
		this.query.select = options.select || this.query.select;
		this.query.where = options.where || this.query.where;
		this.query.group = options.group || this.query.group;
		this.query.order = options.order || this.query.order;
		this.query.limit = options.limit || this.query.limit;
	},
	execute: function(options){
		var me = this, csv;
		options = options || {};
		me.setUrl(options.url);
		csv = me.csv();
		me.setQuery(options);
		$.ajax({
			url: me.url,
			method: 'GET',
			data: me.qstr(),
			success: function(data){
				me.callback(data, csv, options.callback);
			}
		});
	},
	qstr: function(){
		var qry = {};
		for (var p in this.query){
			qry['$' + p] = this.query[p];
		}
		return $.param(qry);
	},
	getUrlAndQuery: function(){
		return this.url + '?' + this.qstr();
	},
	callback: function(data, csv, callback){
		var data = this.csv() ? $.csv.toObjects(data) : data; 
		if (callback) {
			callback(data, this);
		}
	},
	csv: function(){
		var idxCsv = this.url.indexOf('.csv');
		var idxQstr = this.url.indexOf('?');
		var len = this.url.length;
		var csvPos = len - idxCsv;
		var qstrPos = len - idxQstr;
		return idxCsv > -1 && (csvPos == 4 || (qstrPos == csvPos - 4));
		
	}
};

nyc.soda.Query.and = function(where, more){
	if (more){
		return where + ' AND ' + more;
	}
	return where;	
};