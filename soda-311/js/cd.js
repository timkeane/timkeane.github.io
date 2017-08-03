nyc.cd = {
	feature: {
		BOROS: ['Manhattan', 'Bronx', 'Brooklyn', 'Queens', 'Staten Island'],
		extendFeature: function(){
			var val = this.getValue();
			this.setId(val);
			this.set('community_board', val);
			this.choices.push({name: 'community_board', value: val, label: this.getLabel(), sort: this.get('BoroCD')});
		},
		getLabel: function(){
			var cd = this.get('BoroCD') + '';
			return this.BOROS[cd.substr(0, 1) - 1] + ' ' + (1 * cd.substr(1));
		},
		getValue: function(){
			var cd = this.get('BoroCD') + '';
			return cd.substr(1) + ' ' + this.BOROS[cd.substr(0, 1) - 1].toUpperCase();
		}
	}		
};
