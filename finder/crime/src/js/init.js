$(document).ready(function(){
	
	new nyc.Share('#map');
	
	var mapType = new nyc.Radio({
		target:'#map-type-input',
		title: 'Map Type',
		choices: [
			{value: 'precinct', label: 'Precinct Map'},
			{value: 'location', label: 'Crime Location Map'},
			{value: 'heat', label: 'Heat Map'}
		]
	});	

	var crimeType = new nyc.Radio({
		target:'#crime-type-input',
		title: 'Crime Type',
		choices: [
			{value: '*', label: 'All'},
			{value: 'BURGLARY', label: 'Burglary'},
			{value: 'FELONY ASSAULT', label: 'Felony Assault'},
			{value: 'GRAND LARCENY', label: 'Grand Larceny'},
			{value: 'GRAND LARCENY OF MOTOR VEHICLE', label: 'Grand Larceny of Motor Vehicle'},
			{value: 'MURDER', label: 'Murder'},
			{value: 'RAPE', label: 'Rape'},		
			{value: 'ROBBERY', label: 'Robbery'}		
		]
	});	

	var cartoSql = new cartodb.SQL({user: 'nycmap'});

	var sectorSql = "SELECT * FROM prd_crime_sector(${min_mo}, ${max_mo}, '${display_type}', ARRAY[${crime_types}])";
	var locationSql = "SELECT * FROM prd_crime_location(${min_mo}, ${max_mo}, '${display_type}', ARRAY[${crime_types}])";
	var precinctSql = "SELECT * FROM prd_crime_precinct(${min_mo}, ${max_mo}, '${display_type}', ARRAY[${crime_types}])";
	var heatSql = "SELECT * FROM stg_crime_heat(${min_mo}, ${max_mo}, ARRAY[${crime_types}])";

	var allChartSql = "SELECT * FROM stg_crime_chart_all(${min_mo}, ${max_mo}, '${display_type}', ARRAY[${crime_types}])";
	var summaryChartSql = "SELECT * FROM stg_crime_chart_summary(${min_mo}, ${max_mo}, '${display_type}', ARRAY[${crime_types}], ${pct}, ${boro}, '${boro_name}')";

	function layersLoaded(precinctLayer, sectorLayer, locationLayer, heatLayer){
		
		var precinctSym = new nyc.carto.JenksSymbolizer({
			cartoSql: cartoSql,
			jenksColumn: 'per1000',
			outlierFilter: 'pct NOT IN (22, -99)',
			baseCss: '#prd_crime_precinct{polygon-opacity:0.6;line-color:#000;line-width:1.5;line-opacity:0.5;}#prd_crime_precinct[pct=22]{polygon-fill:black;polygon-opacity:0.2;}#prd_crime_precinct[pct=-99]{polygon-fill:black;polygon-opacity:0.2;}',
			cssRules: ['#prd_crime_precinct[per1000<=${value}][pct!=22][pct!=-99]{polygon-fill:rgb(254,237,222);}', 
				'#prd_crime_precinct[per1000<=${value}][pct!=22][pct!=-99]{polygon-fill:rgb(253,190,133);}',
				'#prd_crime_precinct[per1000<=${value}][pct!=22][pct!=-99]{polygon-fill:rgb(253,141,60);}',
				'#prd_crime_precinct[per1000<=${value}][pct!=22][pct!=-99]{polygon-fill:rgb(230,85,13);}',
				'#prd_crime_precinct[per1000<=${value}][pct!=22][pct!=-99]{polygon-fill:rgb(166,54,3);}']
		});
		
		var locationSym = new nyc.carto.JenksSymbolizer({
			cartoSql: cartoSql,
			jenksColumn: 'crime_count',
			baseCss: '#prd_crime_location{marker-fill-opacity:0.7;marker-line-color:#000;marker-line-width:2;marker-line-opacity:0.5;marker-placement:point;marker-type:ellipse;marker-fill:#5faee7;marker-allow-overlap:true;}',
			cssRules: ['#prd_crime_location[zoom<14][crime_count<=${value}]{marker-width:5;}#prd_crime_location[zoom>13][crime_count<=${value}]{marker-width:10;}', 
				'#prd_crime_location[zoom<14][crime_count<=${value}]{marker-width:10;}#prd_crime_location[zoom>13][crime_count<=${value}]{marker-width:20;}',
				'#prd_crime_location[zoom<14][crime_count<=${value}]{marker-width:15;}#prd_crime_location[zoom>13][crime_count<=${value}]{marker-width:30;}',
				'#prd_crime_location[zoom<14][crime_count<=${value}]{marker-width:20;}#prd_crime_location[zoom>13][crime_count<=${value}]{marker-width:40;}',
				'#prd_crime_location[zoom<14][crime_count<=${value}]{marker-width:25;}#prd_crime_location[zoom>13][crime_count<=${value}]{marker-width:50;}']
		});
		
		var heatSym = new nyc.carto.HeatSymbolizer({
			map: map,
			layer: heatLayer,
			css: 'Map{\n' +
				'	-torque-frame-count:1;\n' +
				'	-torque-animation-duration:10;\n' +
				'	-torque-time-attribute:"cartodb_id";\n' +
				'	-torque-aggregation-function:"count(cartodb_id)";\n' +
				'	-torque-resolution:2;\n' +
				'	-torque-data-aggregation:linear;\n' +
				'}\n' +
				'#stg_crime_loaction{\n' +
				'	image-filters:colorize-alpha(\n' +
				'		rgba(254,237,222,0.7),\n' +
				'		rgba(253,190,133,0.7),\n' +
				'		rgba(253,141,60,0.7),\n' +
				'		rgba(230,85,13,0.7),\n' +
				'		rgba(166,54,3,0.7)\n' +
				'	);\n' +
				'	marker-file:url(https://s3.amazonaws.com/com.cartodb.assets.static/alphamarker.png);\n' +
				'	marker-fill-opacity:0.4*[value];\n' +
				'	marker-width:${size};\n' +
				'}\n' +
				'#stg_crime_loaction[frame-offset=1]{\n' +
	                'marker-fill-opacity:0.2;\n' +
	                'marker-width:${sizePlus2};\n' +
				'}\n' +
				'#stg_crime_loaction[frame-offset=2]{\n' +
	                'marker-fill-opacity:0.1;\n' +
	                'marker-width:${sizePlus4};\n' +
				'}'			
		});
		
		var locationLeg = new nyc.BinLegend(
			'location',
			nyc.BinLegend.SymbolType.POLYGON,
			nyc.BinLegend.BinType.RANGE_INT
		);
		
		var viewSwitcher = new nyc.carto.ViewSwitcher([
			new nyc.carto.SqlView({
				name: 'precinct',
				layer: precinctLayer,
				sqlTemplate: precinctSql,
				descriptionTemplate: '<b>${displayType} per 1000 Residents by Precinct<br>${displayDates}</b>',
				symbolizer: precinctSym,
				legend: new nyc.BinLegend(
					'precinct',
					nyc.BinLegend.SymbolType.POLYGON,
					nyc.BinLegend.BinType.RANGE_NUMBER
				)
			}),
			new nyc.carto.SqlView({
				name: 'sector',
				layer: sectorLayer,
				sqlTemplate: sectorSql,
				descriptionTemplate: '<b>${displayType} per Location<br>${displayDates}</b>',
				symbolizer: locationSym,
				legend: locationLeg
			}),
			new nyc.carto.SqlView({
				name: 'location',
				layer: locationLayer,
				sqlTemplate: locationSql,
				descriptionTemplate: '<b>${displayType} per Location<br>${displayDates}</b>',
				symbolizer: locationSym,
				legend: locationLeg
			}),
			new nyc.carto.SqlView({
				name: 'heat',
				layer: heatLayer,
				sqlTemplate: heatSql,
				descriptionTemplate: '<b>Concentration of ${displayType}<br>${displayDates}</b>',
				symbolizer: heatSym,
				legend: new nyc.Legend('<table class="legend heat"><caption>${caption}</caption><tbody><tr><td class="leg-bin leg-bin-0"></td><td class="leg-bin-desc">Lowest Concentration</td></tr><tr><td class="leg-bin leg-bin-1"></td><td class="leg-bin-desc"></td></tr><tr><td class="leg-bin leg-bin-2"></td><td class="leg-bin-desc"></td></tr><tr><td class="leg-bin leg-bin-3"></td><td class="leg-bin-desc"></td></tr><tr><td class="leg-bin leg-bin-4"></td><td class="leg-bin-desc">Highest Concentration</td></tr></tbody></table>')	
			})
		]);

		function labelLookup(lbl){
			var label = {
				'14': 'MTS',
				'18': 'MTN',
				'22': 'CPP',
				'-99': 'DOC',
				'Manhattan South Precinct': 'MTS',
				'Manhattan North Precinct': 'MTN',
				'Central Park Precinct': 'CPP',
				'Department of Correction': 'DOC'
			}[lbl] || lbl;
			if (label.length > 13 && label.indexOf('Precinct') > -1) {
				label = label.replace(/Precinct/, 'Pct.');
			}
			return label;
		};
						
		var chartDescription = '<div>${displayType} per 1000 Residents</div>';
		
		var allChart = new nyc.carto.Chart({
			cartoSql: cartoSql,
			canvas: '#chart-all canvas',
			sqlTemplate: allChartSql,
			descriptionTemplate: chartDescription,
			dataColumn: 'per1000',
			labelColumn: 'pct',
			labelLookupFunction: labelLookup
		});

		var summaryChart = new nyc.carto.Chart({
			cartoSql: cartoSql,
			canvas: '#chart-sum canvas',
			sqlTemplate: summaryChartSql,
			descriptionTemplate: chartDescription,
			dataColumn: 'per1000',
			labelColumn: 'label', 
			labelLookupFunction: labelLookup
		});

		var controls = new nyc.leaf.ZoomSearch(map, true);
		new cartodb.SQL({user: 'nycmap', format: "geoJSON"}).execute('SELECT * FROM prd_crime_precinct_list()').done(
			function(data){
				controls.setFeatures('precinct', 'Precinct', 'Search for a precinct...', data.features);
				new cartodb.SQL({user: 'nycmap', format: "geoJSON"}).execute('SELECT * FROM stg_crime_rikers_isl()').done(
					function(data){
						controls.setFeatures('correction', 'Department of Correction', 'Department of Correction', data.features);
						$('#mnu-srch-typ li.srch-type-correction').click(function(){
							$('#fld-srch li.srch-type-correction').trigger('click');
						});
					}
				);
			}
		);

		cartoSql.execute('SELECT * FROM stg_crime_month_range()').done(function(data){
			
			var min = data.rows[0].min_mo + '', max = data.rows[0].max_mo + '';
			
			var dateRange = new nyc.MonthRangePicker({
				target: '#date-range-input',
				title: 'Date Range',
				minMonth: min.substr(4, 2) - 1,
				minYear: min.substr(0, 4) * 1,
				maxMonth: max.substr(4, 2) - 1,
				maxYear: max.substr(0, 4) * 1
			});

			;
			
			var locationMgr = new nyc.LocationMgr({
				controls: controls,
				locate: new nyc.leaf.Locate(
					map,
					new nyc.Geoclient('//maps.nyc.gov/geoclient/v1/search.json?app_key=DE97954FE594D6617&app_id=crime-map', 'EPSG:4326'),
					nyc.leaf.EXTENT
				),
				locator: new nyc.leaf.Locator({
					map: map, 
					icon: L.icon({
					    iconUrl: 'img/me0.svg',
					    iconSize: [38, 95],
					    iconAnchor: [22, 94]
					}),
					style: function(){
						return {weight: 10, color: 'black', fill: false};
					}
				})
			});

			nyc.app = new nyc.App({
				map: map,
				viewSwitcher: viewSwitcher,
				locationMgr: locationMgr,
				mapType: mapType,
				crimeType: crimeType, 
				dateRange: dateRange,
				allChart: allChart,
				summaryChart: summaryChart,
				locationInfo: new nyc.carto.Dao(
					cartoSql,
					"SELECT * FROM prd_crime_location_info(${lng}, ${lat})"
				),
				crimeDrillDown: {
					precinct: new nyc.carto.Dao(
						cartoSql,
						"SELECT * FROM prd_crime_precinct_drilldown(${min_mo}, ${max_mo}, ${pct}, ARRAY[${crime_types}])"
					),
					sector: new nyc.carto.Dao(
						cartoSql,
						"SELECT * FROM prd_crime_sector_drilldown(${min_mo}, ${max_mo}, ${cartodb_id}, ARRAY[${crime_types}])"
					),
					location: new nyc.carto.Dao(
						cartoSql,
						"SELECT * FROM prd_crime_location_drilldown(${min_mo}, ${max_mo}, ${x}, ${y}, ARRAY[${crime_types}])"
					)
				}
			});	
			$('div.cartodb-logo').hide();
		});		
	};
	
	$('#copyright').html('&copy;' + new Date().getFullYear() + ' City of New York');
	
	var map = L.map('map', {
		center: [40.7033127, -73.979681],
		zoom: 10,
		scrollWheelZoom: true,
		maxZoom: nyc.leaf.ZoomSearch.MAX_ZOOM
	});
	L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_nolabels/{z}/{x}/{y}.png')
		.addTo(map);
	L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_only_labels/{z}/{x}/{y}.png')
		.setZIndex(100)
		.addTo(map);				
	map.fitBounds(nyc.leaf.EXTENT);

	cartodb.createLayer(map, {
		user_name: 'nycmap',
		type: 'torque',
		sublayers: [{
			sql: 'SELECT * FROM stg_crime_heat()',
			cartocss: '#stg_crime_heat{marker-opacity:0;}'
		}]
	}, {https: true}).addTo(map).done(function(heatLayer){
		cartodb.createLayer(map, {
			user_name: 'nycmap',
			type: 'cartodb',
			sublayers: [{
				sql: 'SELECT * FROM prd_crime_precinct()',
				cartocss: '#prd_crime_precinct{polygon-opacity:0;}'
			},{
				sql: 'SELECT * FROM prd_crime_sector()',
				cartocss: '#prd_crime_sector{marker-opacity:0;}'
			},{
				sql: 'SELECT * FROM prd_crime_location()',
				cartocss: '#prd_crime_location{marker-opacity:0;}'
			}]
		}, {https: true}).addTo(map).done(function(layers){
			layers.setInteraction(true);
			var precinctLayer = layers.getSubLayer(0);
			var sectorLayer = layers.getSubLayer(1);
			var locationLayer = layers.getSubLayer(2);
			layersLoaded(precinctLayer, sectorLayer, locationLayer, heatLayer);
		});
	});

});
