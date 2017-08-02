nyc.sr.Buckets = function(target){
	this.target = $(target);
};

nyc.sr.Buckets.prototype = {
	interval: null,
	count: function(countTo){
		var me = this, target = this.target;
		if (me.interval) clearInterval(me.interval);
		var start = $('#record-count span').html().replace(/,/, '') * 1;
		var end = countTo;
		var count = start;
		var step = (end - start) / 500;
		this.interval = setInterval(function(){
			count = Math[step > 0 ? 'ceil' : 'floor'](count + step);
			if ((step > 0 && count >= end) || (step < 0 && count <= end) || count == end){
				clearInterval(me.interval);
				delete this.interval;
				count = end;
				$('#loading').fadeOut();
			}
			nyc.util.formatNumberHtml({
				elements: target.html(count)
			});
		}, 1);
	},
	build: function(data, source){
		var min  = Number.MAX_VALUE, max = -1, total = 0;
		$.each(data, function(){
			var c = this.sr_count * 1;
			source.getFeatureById(this.id).set('sr_count', c);
			if (c < min) min = c;
			if (c > max) max = c;
			total += c;
		});
		this.count(total);
		var delta = max - min;
		var fifth = Math.round(delta / 5);
		var buckets = [[min, min + fifth]];
		var breaks = [min + fifth];
		for (var i = 1; i < 4; i++){
			buckets.push([buckets[i - 1][1], buckets[i - 1][1] + fifth]);
			breaks.push(buckets[i - 1][1] + fifth);
		}
		buckets.push([breaks[breaks.length - 1], max]);
		breaks.push(max);
		return {buckets: buckets, breaks: breaks, total: total};
	}
};
