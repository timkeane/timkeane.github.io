nyc.sr = nyc.sr || {};

nyc.sr.ListDetail = function(options){
	var collapsible = new nyc.Collapsible({target: $(options.target), title: 'Service Request Info'});
	this.container = collapsible.container;
	this.container.find('.ui-collapsible-content').append(nyc.sr.ListDetail.LIST_DETAIL_HTML).trigger('create');
	
	this.listDetailContainer = this.container.find('.list-detail');

	this.listDetailContainer.collapsibleset('option', {
			collapsedIcon: 'carat-d', 
			expandedIcon: 'carat-u'
		})
		.addClass('ctl-collapse')
		.hide();

	this.listContainer = this.container.find('.list');
	this.detailContainer = this.container.find('.detail'); 
	this.list = this.listContainer.find('p');
	this.detail = this.detailContainer.find('p'); 
	this.listTitle = this.listContainer.find('span.title');
	this.detailTitle = this.detailContainer.find('span.title');	
	
	this.cdSrTypeDrilldown = options.cdSrTypeDrilldown;
};

nyc.sr.ListDetail.prototype = {
	container: null,
	listDetailContainer: null,
	listContainer: null,
	detailContainer: null,
	list: null,
	detail: null,
	listTitle: null,
	detailTitle: null,
	cdSrTypeDrilldown: null,
	srListDetail: function(data, soda, title){
		var me = this;
		var title = data.length + ' ' + (title || data[0].complaint_type);
		var moreFields = nyc.sr.ListDetail.SR_DETAIL_MORE;
		me.detail.empty();
		me.detailTitle.html(title);
		$.each(data, function(i, row){
			var detail = $(me.replace(nyc.sr.ListDetail.SR_DETAIL_HTML, row));
			var more = $('<div class="more"></div>');
			detail.append(more);
			if (i % 2 != 0){
				detail.addClass('odd-row');
			}
			me.detail.append(detail).trigger('create');
			for (var field in moreFields){
				var val = (row[field] || '').trim();
				if (val){
					more.append(me.replace(moreFields[field], row));
				}
			}
			nyc.util.formatDateHtml({
				elements: detail.find('.sr-date')
			});
		});
		this.detailContainer.collapsible('expand');
	},
	srList: function(data){
		this.listDetailContainer.show();
		this.container.find('.list').hide();
		this.container.collapsible('expand');
		this.srListDetail(data, null, 'Service Requests');
	},
	cdList: function(data, where){
		var me = this, table = $(nyc.sr.ListDetail.CD_LIST_HTML), tbody = table.find('tbody');
		me.listDetailContainer.show();
		me.cdSrTypeDrilldown.setQuery({where: where});
		me.listTitle.html(me.cdListHeading(data[0]));
		$.each(data, function(){
			var row = $(me.replace(nyc.sr.ListDetail.CD_TR_HTML, this));
			tbody.append(row);
			row.find('a').data('soda-row', this).click($.proxy(me.cdDrilldown, me));
		});
		this.list.html(table);
		this.container.find('.list').show();
		this.container.collapsible('expand');
		this.listContainer.collapsible('expand');
	},
	cdDrilldown: function(event){
		var row = $(event.target).data('soda-row');
		var where = this.cdSrTypeDrilldown.query.where;
		where = this.andComplaintType(where, row.complaint_type);
		this.cdSrTypeDrilldown.execute({
			where: where,
			callback: $.proxy(this.srListDetail, this)
		});
	},
	andComplaintType: function(where, type){
		var clauses = where.split(' AND '), last = clauses[clauses.length - 1];
		if (last.indexOf('complaint_type =') == 0){
			where = where.substr(0, where.lastIndexOf(' AND '));
		}
		where = nyc.soda.Query.and(where, "complaint_type = '" + type + "'");
		return where;
	},
	cdListHeading: function(row){
		var orig = row.community_board;
		var num = orig.split(' ')[0];
		var boro = orig.replace(num, '').trim().toLowerCase();
		return boro + ' ' + (num * 1);
	}
};

nyc.inherits(nyc.sr.ListDetail, nyc.ReplaceTokens);

nyc.sr.ListDetail.LIST_DETAIL_HTML = '<div class="list-detail" data-role="collapsible-set"><div class="list" data-role="collapsible" data-collapsed="false"><h3><span class="title"></span></h3><p></p></div><div class="detail" data-role="collapsible"><h3><span class="title">Detail</span></h3><p></p></div></div>';

nyc.sr.ListDetail.CD_LIST_HTML = '<table class="cd-info"><thead><tr><th>Count</th><th>Type</th></tr></thead><tbody></tbody></table>';

nyc.sr.ListDetail.CD_TR_HTML = '<tr><td>${sr_count}</td><td><a>${complaint_type}</a></td></tr>';

nyc.sr.ListDetail.SR_DETAIL_HTML = '<div id="sr-${unique_key}" class="sr"><div class="sr-num"><b>SR number:</b>${unique_key}</div><div><b>complaint type:</b>${complaint_type}</div><div><b>agency:</b>${agency_name}</div><div><b>created date:</b><span class="sr-date">${created_date}</span></div><div><a data-role="button" onclick="$(this).parent().next().slideToggle();">Details...</a></div></div>';

nyc.sr.ListDetail.SR_DETAIL_MORE = {
	incident_address: '<div><b>address:</b><br>${incident_address}<br>${city}, NY ${incident_zip}</div>',
	street_name: '<div><b>location:</b><br>${street_name} btw. ${cross_Street_1} &amp; ${cross_Street_2}<br>${city}, NY ${incident_zip}</div>',
	intersection_street_1: '<div><b>location:</b><br>${intersection_street_1} and ${intersection_street_2}<br>${city}, NY ${incident_zip}</div>',
	closed_date: '<div><b>closed date:</b><span class="sr-date">${closed_date}<span></div>',
	resolution_description: '<div><b>resolution:</b><br>${resolution_description}</div>'
};


