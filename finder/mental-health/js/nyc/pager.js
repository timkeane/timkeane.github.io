/** @export */
window.nyc = window.nyc || {};

/** @export */
nyc.Pager = function(list){
	this.list = list;
};

nyc.Pager.prototype = {
	list: null,
	index: 0,
	reset: function(list){
		this.list = list;
		this.index = 0;
	},
	next: function(n){
		n = n || 10;
		var result = this.list.slice(this.index, this.index + n);
		this.index = this.index + n;
		return result;
	}
};