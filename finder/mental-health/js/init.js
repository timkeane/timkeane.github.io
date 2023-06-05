$(document).ready(function(){

	var SURFACE_WATER_ZONE = 7,
		GEOCLIENT_URL = '//maps.nyc.gov/geoclient/v1/search.json?app_key=17AFAE4AA01BB4EB3&app_id=mental-health',
		GOOGLE_URL = 'https://maps.googleapis.com/maps/api/js?key=AIzaSyBB0m1-hNGz_za3-BpD3uoc6JqwITWI_xg&channel=mental-health&sensor=false&libraries=visualization',
		MESSAGES = {
			facility_info_field: '<div class="${css} notranslate" translate="no">${value}</div>',
			facility_info_web: '<li class="inf-web"><div><a href="${web}" target="_blank">${web}</a></div>&nbsp;</li>',
			facility_info_phone: '<a class="inf-phone" data-role="button" href="tel:${href}" ${target}>${text}</a>',
			facility_distance: '<div class="inf-dist">&#8226; ${distance} miles &#8226;</div>',
			facility_info_map: '<a class="capitalize inf-map" data-role="button" onclick=\'nyc.app.zoomFacility("${id}");\'>map</a>',
			facility_info_dir: '<a class="capitalize inf-dir" data-role="button" onclick=\'nyc.app.direct("${id}");\'>directions</a>',
			facility_info_detail: '<a class="capitalize inf-detail" data-role="button" onclick="nyc.app.details(this);">details</a>',
			facility_info_eligibility: 'Call to confirm eligibility ',
			facility_info_resident: '<li class="inf-res">${note}</li>',
			facility_info_in_patient: '<li class="inf-in">${note}</li>',
			facility_tip: '<div class="${css}">${name}</div>',
			bad_input: 'The location you entered was not understood',
			data_load_error: 'There was a problem loading map data. Please refresh the page to try again.',
			data_filter_warn: 'There are no facilities that meet the criteria of the applied filters.  Please modify your filter choices.',
			copyright: '&copy; ${yr} City of New York',
			lifenet_word: '1-800-LIFENET',
			lifenet_number: '(1-800-543-3638)',
			lifenet_word_es: '1-877-AYUDESE',
			lifenet_number_es: '(1-877-990-8585)',
			lifenet_word_ko: '1-877-990-8585',
			facility_vcard: '<a class="capitalize inf-vcard ${css}" data-role="button" onclick="nyc.app.vcard(this);" data-feature-id="${id}" data-ios="${ios}">add contact</a>',
			note_in_patient: 'This may be an inpatient service provider. (A 24/7 hospital-based program for treatment of a person who can not be adequately served in the community.)',
			note_resident: 'This may be an residential treatment service provider. (A 24-hour program which houses individuals in the community and provides a supervised, therapeutic environment, which seeks to develop the resident\'s skills and capacity to live in the community and attend school/ work as appropriate.)',
			note_download: 'This contact was downloaded from https://maps.nyc.gov/mental-health/',
			type_age: 'Age groups: ',
			type_care: 'Types of care: ',
			type_insurance: 'Types of insurance: ',
			type_demographic: 'Demographics: '			
		},
		LANGUAGES = {
		    en: {val: 'English', desc: 'English', hint: 'Translate'},
		    ar: {val: 'Arabic', desc: '&#x627;&#x644;&#x639;&#x631;&#x628;&#x64A;&#x629;' /* العربية */, hint: '&#x62A;&#x631;&#x62C;&#x645;' /* ترجم */},
		    bn: {val: 'Bengali', desc: '&#x9AC;&#x9BE;&#x999;&#x9BE;&#x9B2;&#x9BF;' /* বাঙালি */, hint: '&#x985;&#x9A8;&#x9C1;&#x9AC;&#x9BE;&#x9A6; &#x995;&#x9B0;&#x9BE;' /* অন�?বাদ করা */},
		    'zh-CN': {val: 'Chinese (Simplified)', desc: '&#x4E2D;&#x56FD;' /* 中国 */, hint: '&#x7FFB;&#x8BD1;' /* 翻译 */},
		    fr: {val: 'French', desc: 'Fran&#231;ais' /* Français */, hint: 'Traduire'},
		    ht: {val: 'Haitian Creole', desc: 'Krey&#242;l Ayisyen' /* Kreyòl Ayisyen */, hint: 'Tradui'},
		    ko: {val: 'Korean', desc: '&#xD55C;&#xAD6D;&#xC758;' /* 한국�?� */, hint: '&#xBC88;&#xC5ED;' /* 번역 */},
		    ru: {val: 'Russian', desc: 'P&#x443;&#x441;&#x441;&#x43A;&#x438;&#x439;' /* Pу�?�?кий */, hint: '&#x43F;&#x435;&#x440;&#x435;&#x432;&#x435;&#x441;&#x442;&#x438;' /* переве�?ти */},
		    es: {val: 'Spanish', desc: 'Espa&#241;ol' /* Español */, hint: 'Traducir'},
		    ur: {val: 'Urdu', desc: '&#x627;&#x631;&#x62F;&#x648;' /* اردو */, hint: '&#x62A;&#x631;&#x62C;&#x645;&#x6C1; &#x6A9;&#x631;&#x6CC;&#x6BA;' /* ترجم�? کریں */}
		},
		FEATURE_DECORATIONS = {
			fieldAccessors: {
				getCoordinates: function(){
					var g = this.getGeometry();
					return g ? g.getCoordinates() : null;
				},
				getName: function(){
					return this.get('name_1');
				},
				getName2: function(){
					return this.get('name_2');
				},
				getAddress: function(){
					return this.getAddress1() + ', ' + this.getAddress3();
				},
				getAddress1: function(){
					return this.get('street_1');
				},
				getAddress2: function(){
					return this.get('street_2');
				},
				getCity: function(){
					return this.capitalize(this.get('city'));
				},
				getZip: function(){
					return this.get('zip');
				},
				getAddress3: function(){
					return this.getCity() + ', NY ' + this.getZip();
				},
				getPhoneText: function(){
					var phone = this.get('phone').replace(/[\(\-\s\x]/g, '');
					if (phone.substr(0, 1) == '1') phone = phone.substr(1);
					if (phone.length == 10){
						phone = phone.replace(/(\w{3})(\w{3})(\w{4})/, '($1) $2-$3');
					}else if (phone.length > 10){
						phone = phone.replace(/(\w{3})(\w{3})(\w{4})/, '($1) $2-$3 ');
					}else{
						phone = '';
					}
					return phone;
				},
				getPhoneNumber: function(){
					var phone = this.get('phone').replace(/[\(\)\-\s\x]/g, '');
					if (phone.substr(0, 1) == '1') phone = phone.substr(1);
					if (phone.length > 10){
						phone = phone.replace(/(\w{3})(\w{3})(\w{4})(\w*)/, '$1-$2-$3,$4');
					}else{
						phone = phone.replace(/(\w{3})(\w{3})(\w{4})/, '$1-$2-$3');
					}
					return '+1-' + phone;
				},
				getWeb: function(){
					return this.get('website');
				},
				isInPatient: function(){
					return this.get('filter_inpatient_svc') == 1;
				},
				isResidential: function(){
					return this.get('filter_residential_pgm') == 1;
				},
				isIos: function(){
					return navigator.userAgent.match(/(iPad|iPhone|iPod|iOS)/g);
				},
				capitalize: function(s){
					var words = s.split(' '), result = '';
					$.each(words, function(i, w){
						var word = w.toLowerCase();
						result += word.substr(0, 1).toUpperCase();
						result += word.substr(1).toLowerCase();
						result += ' ';
					});
					return result.trim();
				},
				vCardData: function(){
					var coords = proj4('EPSG:2263', 'EPSG:4326', this.getCoordinates()), 
						orgs = [this.getName()],
						note = [this.message('facility_info_eligibility')],
						svcTypes = this.getServiceTypes(), 
						data = {};
					for (var type in svcTypes){
						var types = svcTypes[type];
						if (types.length){
							var typeNote = this.message('type_' + type);
							$.each(types, function(i, type){
								var comma = i < types.length - 1 ? ', ' : '';
								typeNote += (type + comma);
							});
							note.push(typeNote);
						}
					}
					
					if (this.getName2()){
						orgs.push(this.getName2());
					}
					if (this.isInPatient()){
						note.push(this.message('note_in_patient') );						
					}
					if (this.isResidential()){
						note.push(this.message('note_resident'));												
					}
					note.push(this.message('note_download'));
					data.organization = orgs;
					data.orgType = 'Meantal health service provider';
					data.address1 = this.getAddress1();
					data.address2 = this.getAddress2();
					data.city = this.getCity();
					data.state = 'NY';
					data.zip = this.getZip();
					data.phone = this.getPhoneNumber();
					data.url = this.getWeb();
					data.note = note;
					if (!this.isIos()){
						data.longitude = coords[0];
						data.latitude =coords[1];
					}
					return data;
				},
				getAgeTypes: function(){
					var types = [];
					if (this.get('flag_chld')){
						types.push('Children & Adolescents (17 and younger)');
					}
					if (this.get('flag_yad')){
						types.push('Young Adults (18-25)');
					}
					if (this.get('flag_adlt')){
						types.push('Adults (26-64)');
					}
					if (this.get('flag_snr')){
						types.push('Seniors (65 or older)');
					}
					return types;
				},
				getCareTypes: function(){
					var types = [];
					if (this.get('flag_mhf')){
						types.push('Mental Health');
					}
					if (this.get('flag_saf')){
						types.push('Substance Use');
					}
					return types;
				},
				getInsuranceTypes: function(){
					var types = [];
					if (this.get('flag_mc')){
						types.push('Medicare');
					}
					if (this.get('flag_md')){
						types.push('Medicaid');
					}
					if (this.get('flag_si')){
						types.push('CHP/FHP/Essential');
					}
					if (this.get('flag_pi')){
						types.push('Private');
					}
					if (this.get('flag_np_ss')){
						types.push('No insurance');
					}
					return types;
				},
				getDemographicTypes: function(){
					var types = [];
					if (this.get('filter_military')){
						types.push('Military-Affiliated');
					}
					if (this.get('flag_gl')){
						types.push('LGBTQ Community');
					}
					if (this.get('flag_pw')){
						types.push('Pregnant/postpartum women');
					}
					if (this.get('flag_dv')){
						types.push('Intimate Partner Violence Survivors');
					}
					if (this.get('flag_hv')){
						types.push('HIV/AIDS Community');
					}
					return types;
				},
				getServiceTypes: function(){
					return {
						age: this.getAgeTypes(),
						care: this.getCareTypes(),
						insurance: this.getInsuranceTypes(),
						demographic: this.getDemographicTypes()
					}
				}
			},
			htmlRenderer: {
				html: function(renderFor){
					var id = this.getId(), div = $('<div></div>'), result = $('<div></div>');
					result.append(div);
					div.addClass(renderFor)
						.addClass('inf-facility')
						.append(this.message('facility_info_field', {css: 'inf-name', value: this.getName()}))
						.append(this.message('facility_info_field', {css: 'inf-name', value: this.getName2()}))
						.append(this.message('facility_info_field', {css: 'inf-addr', value: this.getAddress1()}))
						.append(this.message('facility_info_field', {css: 'inf-addr', value: this.getAddress2()}))
						.append(this.message('facility_info_field', {css: 'inf-addr', value: this.getAddress3()}));
					this.phoneGrp(div);
					this.mapGrp(div, id);
					if (!isNaN(this.getDistance())){
						div.prepend(this.message('facility_distance', {distance: (this.getDistance() / 5280).toFixed(2)}));
					}
					return result.html();
				},
				vCardBtn: function(css){
					return this.message('facility_vcard', {
						id: this.getId(),
						ios: this.isIos() ? '1' : '',
						css: css
					});
				},
				phoneGrp: function(div){
					var html = '', css =  '';
					if (this.getPhoneText()){
						 html = this.message('facility_info_phone', {
							text: this.getPhoneText(),
							href: this.getPhoneNumber()
						});
					}else{
						css = 'vcard-big';
					}
					div.append(this.buttonGrp('grp-phone', html + this.vCardBtn(css)));
				},
				mapGrp: function(div, id){
					var group = this.buttonGrp(
						'grp-map', 
						this.message('facility_info_map', {id: id}) +
						this.message('facility_info_dir', {id: id})
					);
					this.details(div, group);
					div.append(group);
				},
				buttonGrp: function(css, html){
					var group = $('<div class="btn-grp" data-role="controlgroup" data-type="horizontal"></div>');
					group.addClass(css);
					group.append(html);
					return group;
				},
				details: function(div, group){
					var web = this.getWeb(), svcTypes = this.getServiceTypes(), ul = $('<ul></ul>');
					group.append(this.message('facility_info_detail'));
					div.append(ul);
					if (web) ul.append(this.message('facility_info_web', {web: web}));
					ul.append('<li><b>' + this.message('facility_info_eligibility') + '</b></li>');
					for (var type in svcTypes){
						var types = svcTypes[type];
						if (types.length){
							var li = $('<li><b>' + this.message('type_' + type) + '</b> </li>');
							ul.append(li);
							$.each(types, function(i, type){
								var comma = i < types.length - 1 ? ', ' : '';
								li.append(type + comma);
							});
						}
					}					
					if (this.isInPatient()){
						ul.append(this.message('facility_info_in_patient', {note: this.message('note_in_patient')}));
					}
					if (this.isResidential()){
						ul.append(this.message('facility_info_resident', {note: this.message('note_resident')}));
					}
				}				
			}
		};
	
	var content = new nyc.Content(MESSAGES);
	
	new nyc.Share('#map', 'http://www1.nyc.gov/nyc-resources/mental-health-finder-form.page');
	
	var map = new ol.Map({
		target: $('#map')[0],
		layers: [new nyc.ol.layer.BaseLayer()],
		view: new ol.View({
			projection: nyc.EPSG_2263,
			resolutions: nyc.ol.layer.BaseLayer.RESOLUTIONS
		})
	});
	map.getView().fit(nyc.EXTENT, map.getSize());
	
	var lang = new nyc.Lang('#translate-container', LANGUAGES);
	
	nyc.app = new nyc.App(
		map,
		'https://data.cityofnewyork.us/api/views/8nqg-ia7v/rows.csv?accessType=DOWNLOAD',
		FEATURE_DECORATIONS,
		content,
		new nyc.Style(),
		new nyc.ol.control.ZoomSearch(map),
		new nyc.ol.Locate(
			new nyc.Geoclient(GEOCLIENT_URL),
			nyc.EPSG_2263,
			nyc.EXTENT
		),
		new nyc.Directions('#dir-map', '#directions', GOOGLE_URL),
		new nyc.ol.Popup(map),
		new nyc.Pager(),
		lang
	);

});