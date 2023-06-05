nyc.foodhelp = nyc.foodhelp || {};

nyc.foodhelp.TRANSLATION_LANGS = {
	en: {desc: 'English', hint: 'Translate'}, /* English */
	es: {desc: 'Espa&#241;ol', hint: 'Traducir'}, /* Spanish */
	zh: {desc: '&#31616;&#20307;&#20013;&#25991;', hint: '&#32763;&#35793;'}, /* Chinese (Traditional) */
	tw: {desc: '&#32321;&#39636;&#20013;&#25991;', hint: '&#32763;&#35695;'}, /* Chinese (Traditional) */ 
	ru: {desc: 'P&#x443;&#x441;&#x441;&#x43A;&#x438;&#x439;', hint: '&#x43F;&#x435;&#x440;&#x435;&#x432;&#x435;&#x441;&#x442;&#x438;'}, /* Russian */
	ar: {desc: '&#x627;&#x644;&#x639;&#x631;&#x628;&#x64A;&#x629;', hint: '&#x62A;&#x631;&#x62C;&#x645;'}, /* Arabic */
	bn: {desc: '&#x9AC;&#x9BE;&#x999;&#x9BE;&#x9B2;&#x9BF;', hint: '&#x985;&#x9A8;&#x9C1;&#x9AC;&#x9BE;&#x9A6; &#x995;&#x9B0;&#x9BE;'}, /* Bengali */
	fr: {desc: 'Fran&#231;ais', hint: 'Traduire'},
	ht: {desc: 'Krey&#242;l Ayisyen', hint: 'Tradui'}, /* Haitian Creole */
	ko: {desc: '&#xD55C;&#xAD6D;&#xC758;', hint: '&#xBC88;&#xC5ED;'}, /* Korean */
	pl: {desc: 'Polski', hint: 'T&#322;umaczy&#263;'}, /* Polish */
	ur: {desc: '&#x627;&#x631;&#x62F;&#x648;', hint: '&#x62A;&#x631;&#x62C;&#x645;&#x6C1; &#x6A9;&#x631;&#x6CC;&#x6BA;'} /* Urdu */
};

nyc.foodhelp.FILTER_LANGS = {
	en: 'English', /* English */
	es: 'Espa&#241;ol', /* Spanish */
	cn: '&#20013;&#25991;', /* Chinese (Simplified) */ 
	ru: 'P&#x443;&#x441;&#x441;&#x43A;&#x438;&#x439;', /* Russian */ 
    ar: '&#x627;&#x644;&#x639;&#x631;&#x628;&#x64A;&#x629;', /* Arabic */
	bn: '&#x9AC;&#x9BE;&#x999;&#x9BE;&#x9B2;&#x9BF;', /* Bengali */
	ht: 'Krey&#242;l Ayisyen', /* Haitian Creole */
	he: '&#1506;&#1489;&#1512;&#1497;&#1514;', /* Hebrew */
	hi: '&#2361;&#2342;', /* Hindi */ 
	ko: '&#xD55C;&#xAD6D;&#xC758;', /* Korean */
	yi: '&#1497;&#1497;&#1491;&#1497;&#1513;', /* Yiddish */
	yo: 'Yor&#249;b&#225;' /* Yoruba */
};

$(document).ready(function(){
    for (var lang in nyc.foodhelp.FILTER_LANGS){
    	var opt = $('<option></option>')
    		.html(nyc.foodhelp.FILTER_LANGS[lang])
    		.attr('value', lang);
    	$('#filter-by-language').append(opt);
    }  
	
});

nyc.foodhelp.fieldAccess = {
	extendFeature: function(){
		var props = this.getProperties();
		var lang = (props['LANGUAGE'] || '').trim();
		lang = lang ? lang.split(',') : [];
		props.languages = [];
		$.each(lang, function(){
			props['language_' + this] = 'YES';
			props.languages.push(nyc.foodhelp.FILTER_LANGS[this]);
		})
		this.setProperties(props);
	}
};

nyc.foodhelp.renderer = {
	html: function(css){
		var div = $('<div></div>');
		div.addClass(css);
		div.append(this.distHtml());
		div.append(this.nameHtml());
		div.append(this.addrHtml());
		
		/* No presentation of language information at facilities at this time 
		
		div.append(this.langHtml());
		
		 */
		
		div.append(this.specialHtml());
		div.append(this.closedHtml(div));
		div.append(this.btnHtml());
		return div;
	},
	closedHtml: function(parent){
		var closed = this.get('CLOSED');
		if (closed){
			var div = $('<div class="inf-closed"></div>');
			parent.addClass('closed');
			div.html(this.message('info_closed'));
			return div;
		}
	},
	distHtml: function(){
		var dist = this.get('distance');
		if (dist != undefined){
			var div = $('<div class="inf-dist"></div>');
			div.append(' &#8226; ' + (dist/5280).toFixed(2) + ' mi &#8226;');
			return div;
		}
	},
	nameHtml: function(){
		var div = $('<div class="inf-name"></div>');
		div.append(this.iconHtml());
		div.append('<div>' + this.get('NAME') + '</div>');
		return div;
	},
	iconHtml: function(){
		var div = $('<div class="circle"></div>'), text = this.text(16);
		div.css('background-color', this.color());
		if (text){
			div.css('font', text.font);
			div.html(text.text);
		}
		return div;
	},
	addrHtml: function(){
		var div = $('<div class="inf-summary"></div>');
		div.append(this.get('ADDRESS') + '<br>');
		div.append(this.get('BOROUGH') + ', NY ' + this.get('ZIP'));
		return div;
	},
	langHtml: function(){
		var langs = this.get('languages'), div = $('<div class="inf-lang"></div>');
		div.append('<b>' + this.message('info_languages') + ': </b>');
		if (langs.length){
			return div.append(langs.join(', '));			
		}
	},
	specialHtml: function(){
		var special = [], div = $('<div class="inf-special"></div>');
		div.append('<b>' + this.message('info_speciality') + ': </b>');
		if (this.get("KOSHER") == 'yes') {
			special.push('Kosher');
		}
		if (this.get("AIDSPROGRAM") == 'yes') {
			special.push('AIDS Program');
		}
		if (this.get("MOBILE") == 'yes') {
			special.push('Mobile');
		}
		if (special.length){
			return div.append(special.join(', '));			
		}
	},
	btnHtml: function(){
		var me = this, div = $('<div class="inf-btn inf-map"><a data-role="button">Map</a></div>');
		div.find('a').html(this.message('map_tab'));
		div.click(function(){
			nyc.foodhelp.app.goTo(me);
		});
		return div;
	},
	message: function(key){
		var trans = nyc.lang.translate;
		var def = trans.defaultLanguage || 'en';
		var lang = trans.lang() || def;
		return trans.messages[lang][key] || trans.messages[def][key]; 
	},
	color: function(){
		switch (this.get('TYPE')) {
			case 'SL':
				return '#13c66b';
			case 'SK':
				return '#a73fff';
			case 'FP': 
				return '#ff7000';
		};		
		return '#000';
	},
	text: function(fontSize){
		var result = {font: 'bold italic ' + fontSize + 'px Arial, Verdana, Helvetica, sans-serif'};
		if (this.get('KOSHER') == 'yes') {
			result.text = 'K';
		}
		if (this.get('AIDSPROGRAM') == 'yes') {
			result.text = 'A';
		}
		if (this.get('MOBILE') == 'yes') {
			result.text = 'M';
		}
		return result.text ? result : null;
	} 
};