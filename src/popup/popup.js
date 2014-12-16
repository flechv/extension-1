var app = angular.module('app', ['ui.select2']);
app.controller("AngularController", function ($scope) {
	var bg = chrome.extension.getBackgroundPage().BG;
    
	$scope.showMessageError = false;
	$scope.showLoading = bg.showLoading();
	$scope.showAdvancedOptions = false;
	$scope.numberOfFligths = 0;
	$scope.currency = "R$";
	$scope.help = {
		origins: "De quais cidades você pode partir?",
		destinations: "Para quais cidades você quer pesquisar?",
		days: "Quantos dias você quer ficar? Escolha mais de 1 opção e ache a melhor",
		departure: "Quais dias você pode partir? Escolha mais de 1 e ache o melhor pra você",
		main: "Você pode selecionar:<br/><br/>&nbsp&nbsp 1. Uma ou mais cidades de origem <br/>&nbsp&nbsp 2. Uma ou mais cidades de destino <br/>&nbsp&nbsp 3. Quantos dias de estadia <br/>&nbsp&nbsp 4. Um ou mais dias de partida <br/>&nbsp&nbsp 5. As companhias aéreas desejadas <br/>&nbsp&nbsp 6. O nº de adultos, crianças e bebês <br/>&nbsp&nbsp 7. Site que deseja pesquisar <br/>&nbsp&nbsp 8. Um email para ser avisado <br/><br/>Sugetões? genghislabs@gmail.com",
		company: "Pesquise vôos apenas das companhias aéreas desejadas",
		download: "Salvar os resultados abaixo <br/><br/>Sugetões? genghislabs@gmail.com"
	};

	$scope.store = "0";
	$scope.adults = 1;
	$scope.children = 0;
	$scope.babies = 0;
	$scope.companies = [];	
	$scope.airlinesCompanies = airlinesCompanies;
	$scope.days = [];
	for (var i = 2; i <= 120; i++)
		$scope.days.push({ id: i, text: i + ' dias' });

	$scope.select2AirportsOptions = {
		multiple: true,
	    closeOnSelect: true,
	    formatSelection: function (i) { return i.text.split(",")[0] + " (" + i.id + ")" },
		initSelection: function(element, callback) {
			var selection = _.find(data, function(metric){ 
			  return metric.id === element.val();
			})
			callback(selection);
		},
		query: function(options){
			var pageSize = 50;
			var startIndex  = (options.page - 1) * pageSize;
			var filteredData = allAirports;
    		var stripDiacritics = window.Select2.util.stripDiacritics;

			if (options.term && options.term.length > 0) {
				if (!options.context) {
        			var term = stripDiacritics(options.term.toLowerCase());
					options.context = allAirports.filter(function (metric) {
						if (!metric.stripped_text)
							metric.stripped_text = stripDiacritics(metric.text.toLowerCase());
						
						if (!metric.stripped_country)
							metric.stripped_country = stripDiacritics(metric.country.toLowerCase());

						return (metric.stripped_text.indexOf(term) !== -1 ||
							metric.stripped_country.indexOf(term) !== -1);
					});
				}

				filteredData = options.context;
			}

			options.callback({
				context: filteredData,
			  	results: filteredData.slice(startIndex, startIndex + pageSize),
			  	more: (startIndex + pageSize) < filteredData.length
			});
		}
	}
	
	$scope.results = [];
	$scope.openResults = {};
	$scope.updateResults = function (resultsJson) {
		var results = angular.fromJson(resultsJson);
		if (results == undefined || results == null || results.length == 0) return;

		$scope.showLoading = false;
		$scope.numberOfFligths = results.reduce(function (prev, item) {
			if (item.all.length == 1)
				$scope.openResults[item.key] = false;

			return prev + item.all.length;
		}, 0);
	
		$scope.results = results;
	}
    
	bg.hideBadge();

	var request = bg.getRequest();
	$scope.origins = request.origins == undefined ? [] : request.origins;
	$scope.destinations = request.destinations == undefined ? [] :request.destinations;
	$scope.departureDates = request.departureDates == undefined ? [] : request.departureDates;
	$scope.qtyDays = request.qtyDays == undefined ? [] : request.qtyDays;
	$scope.store = request.store == undefined ? "0" : request.store;

	var resultsJson = bg.getResultsList();
	$scope.updateResults(resultsJson);
	$scope.saveAsFile = saveTextAsFile;

	var checkInvalidForm = function () {
		return	($scope.origins == null || $scope.origins.length == 0 || $scope.destinations == null || $scope.destinations.length == 0) ||
				($scope.qtyDays == null || $scope.qtyDays.length == 0 || $scope.departureDates == null || $scope.departureDates.length == 0) ||
				($scope.origins.length == 1 && $scope.destinations.length == 1 && $scope.origins[0].id == $scope.destinations[0].id) ||
				($scope.adults == 0 && $scope.children == 0 && $scope.babies == 0);
	}

	$scope.search = function () {
		if (checkInvalidForm())
			$scope.showMessageError = true;
		else {
			$scope.showMessageError = false;
			$scope.showLoading = true;
			$scope.numberOfFligths = 0;
			$scope.results = [];

			var departures = angular.copy($scope.departureDates).sort();
			chrome.extension.getBackgroundPage().BG.init({
				origins: $scope.origins,
				destinations: $scope.destinations,
				qtyDays: $scope.qtyDays,
				departureDates: departures,
				companies: $scope.companies,
				adults: $scope.adults,
				children: $scope.children,
				babies: $scope.babies,
				store: $scope.store,
				email: $scope.email,
				priceEmail: $scope.priceEmail
			});
		}
	}

	$scope.stopSearching = function () {
		chrome.extension.getBackgroundPage().PQ.stopServer();
	}

	$scope.orderCompaniesByPrices = function (company) {
		return company == undefined ? Number.MAX_SAFE_INTEGER : parseFloat(company[0].bestPrice);
	}

	$(".help, #download").tipsy({ gravity: 'w', html: true, fade: true, opacity: 0.9 });
});

app.filter('toArray', function () {
    'use strict';

    return function (obj) {
    	return Object.keys(obj).map(function (key) {
            return Object.defineProperty(obj[key], '$key', {__proto__: null, value: key});
        });
    }
});


app.directive('multipick', function () {
	return {
		link: function(scope, elm, attrs) {
			var addCustomButtons = function (year, month) {
			    setTimeout(function() {
			        $("<button>", {
			            text: "Limpar",
			    		click: function() {
			    			elm.multiDatesPicker('resetDates');
							addCustomButtons(year, month);
							scope.$apply(function() {
								scope[attrs.ngModel].splice(0); //removes all days
							});
			    		}
			        })
			        .appendTo($(".ui-datepicker-buttonpane"))
			        .addClass("ui-datepicker-clear ui-state-default ui-priority-secondary ui-corner-all");
			        
			        $("<button>", {
			            text: "Mês todo",
			    		click: function() {
			    			var days = getValidDaysInMonth(year, month);
			    			elm.multiDatesPicker('addDates', days);
							addCustomButtons(year, month);
							scope.$apply(function() {
								for (var i in days)
									if ($.inArray(days[i], scope[attrs.ngModel]) == -1)
										scope[attrs.ngModel].push(days[i]); //insert all new days
							});
			    		}
			        })
			        .appendTo($(".ui-datepicker-buttonpane"))
			        .addClass("ui-datepicker-clear ui-state-default ui-priority-secondary ui-corner-all");
			    }, 1);
			};
			
			scope.$watch(attrs.ngModel, function(value) {
				if (typeof value == 'undefined') value = [];
				var options = {
					minDate: 0,
					maxDate: '+11M',
					showButtonPanel: true,
					dateFormat: "yy/mm/dd",
					onSelect: function(date) {
						var dateIndex = $.inArray(date, value);
						if (dateIndex !== -1)
							value.splice(dateIndex, 1);
						else
							value.push(date);
						
						scope.$apply();
						addCustomButtons(date.substr(0, 4), date.substr(5, 2));
					},
				    onChangeMonthYear: function(year, month) {
				    	addCustomButtons(year, month);
				    }
				};
				
				if (value.length !== 0) {
					var dates = value.sort();
					options.addDates = dates;
					options.defaultDate = dates[0];
				}
				else {
					var today = new Date();
					options.defaultDate = today.getDateString();
				}
				
				elm.multiDatesPicker(options);
		    	addCustomButtons(options.defaultDate.split("/")[0], options.defaultDate.split("/")[1]);
			});
		}
	};
});

//month must be between 1 and 12
function getValidDaysInMonth(year, month) {
	var date = new Date(year, month - 1, 1);
	var yesterday = new Date();
	yesterday.setDate(yesterday.getDate() - 1);
	var days = [];
	while (date.getMonth() === month - 1) {
		if (date > yesterday)
			days.push(date.getDateString());
		
		date.setDate(date.getDate() + 1);
	}

	return days;
}

Number.prototype.to2Digits = function () {
   return this.toFixed(2).toString().replace(".", ",");
}

String.prototype.to2Digits = function () {
	return this == "" ? "-" : parseFloat(this).to2Digits();
}

Date.prototype.getDateString = function () {
   return this.getFullYear() + '/' + this.getMonth2() + '/' + this.getDate2();
}

Date.prototype.getDate2 = function () {
   var date = this.getDate();
   return (date < 10 ? '0' : '') + date;
}

Date.prototype.getMonth2 = function () {
   var month = this.getMonth() + 1;
   return (month < 10 ? '0' : '') + month;
}