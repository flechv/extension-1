var app = angular.module('app', ['ui.select2']);
app.controller("AngularController", function ($scope) {
    var getBg = function () {
        return chrome.extension.getBackgroundPage().BG
    };
	var bg = getBg();
    
    $scope.showMessageError = false;
	$scope.showLoading = bg.showLoading();
	$scope.showAdvancedOptions = false;
	$scope.initialNumberOfFlights = 0;
    $scope.numberOfFlights = 0;
	$scope.currency = "R$";
	$scope.help = {
		origins: "De quais cidades você pode partir?",
		destinations: "Para quais cidades você gostaria de ir?",
		departure: "Quais dias você pode partir?<br/>Escolha mais de um e ache o melhor",
		days: "Quantos dias você quer ficar?<br/>Escolha mais de um e ache o melhor<br/><br/> Ou clique aqui para escolher dias exatos",
        site: "Escolha em qual site deseja pesquisar",
        savedSearches: "Escolha uma das suas pesquisas salvas",
		main: "Você pode selecionar:<br/><br/>&nbsp 1. Uma ou mais cidades de origem<br/>&nbsp 2. Uma ou mais cidades de destino<br/>&nbsp 3. Um ou mais dias de partida<br/>&nbsp 4. Duração da viagem ou dias de volta<br/>&nbsp 5. As companhias aéreas desejadas<br/>&nbsp 6. O nº de adultos, crianças e bebês<br/>&nbsp 7. Site que deseja pesquisar<br/>&nbsp 8. Um email para ser avisado <br/><br/>Sugetões? genghislabs@gmail.com",
		company: "Pesquise vôos apenas das companhias aéreas desejadas",
		download: "Salvar os resultados abaixo",
        donation: "Faça uma doação para continuar melhorando esse app!",
        deleteSavedSearches: "Excluir histórico"
	};

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
		$scope.numberOfFlights = results.reduce(function (prev, item) {
			if (item.all.length == 1)
				$scope.openResults[item.key] = false;

			return prev + item.all.length;
		}, 0);
	
		$scope.results = results;
	};
    
    bg.hideBadge();

    $scope.updateForm = function (request, initialNumberOfFlights) {
        if (typeof request === "string")
            request = JSON.parse(request);
        
        $scope.origins = request.origins || [];
        $scope.destinations = request.destinations || [];
        $scope.departureDates = request.departureDates || [];
        $scope.returnDates = request.returnDates || [];
        $scope.qtyDays = request.qtyDays || [];
        $scope.showQtyDays = typeof request.showQtyDays === "boolean" ? request.showQtyDays : true;
        $scope.companies = request.companies || [];	
        $scope.adults = request.adults || 1;
        $scope.children = request.children || 0;
        $scope.infants = request.infants || 0;
        $scope.store = request.store || "0";
        $scope.searchedStore = $scope.store;

        $scope.initialNumberOfFlights = initialNumberOfFlights || 0;
    };
    
    $scope.savedSearches = bg.getRequests();
    $scope.updateForm($scope.savedSearches[0] || {}, bg.getInitialNumberOfFlights());
    
    var getRequest = function () {
        var departureDates = angular.copy($scope.departureDates).sort();
        var returnDates = angular.copy($scope.returnDates).sort();
        
        return {
            origins: $scope.origins,
            destinations: $scope.destinations,
            departureDates: departureDates,
            returnDates: $scope.showQtyDays ? [] : returnDates,
            qtyDays: $scope.showQtyDays ? $scope.qtyDays : [],
            showQtyDays: $scope.showQtyDays,
            companies: $scope.companies,
            adults: $scope.adults,
            children: $scope.children,
            infants: $scope.infants,
            store: $scope.store,
            email: $scope.email,
            priceEmail: $scope.priceEmail
        };
    };
    
    $scope.deleteSavedSearches = function () {
        var bg = getBg();
		bg.deleteRequests();
		bg.deleteResults();
		$scope.stop();
		
		$scope.updateForm({});
		$scope.savedSearches = [];
		$scope.results = [];
		$scope.numberOfFlights = 0;
    };

	var resultsJson = bg.getResultsList();
	$scope.updateResults(resultsJson);
	$scope.saveAsFile = saveTextAsFile;

	var checkInvalidForm = function () {
        return (($scope.origins || []).length == 0 || ($scope.destinations || []).length == 0) ||
            ($scope.origins.length == 1 && $scope.destinations.length == 1 && $scope.origins[0].id == $scope.destinations[0].id) ||
            (($scope.departureDates || []).length == 0) ||
            ($scope.showQtyDays && ($scope.qtyDays || []).length == 0) ||
            (!$scope.showQtyDays && ($scope.returnDates || []).length > 0 && $scope.departureDates[0] > $scope.returnDates[$scope.returnDates.length - 1]) || //the highest return can not be before the lowest departure
            
            ($scope.adults == 0 && $scope.children == 0 && $scope.infants == 0);
	};

	$scope.search = function () {
		if (checkInvalidForm())
			$scope.showMessageError = true;
        else {
			$scope.showMessageError = false;
			$scope.showLoading = true;
			$scope.numberOfFlights = 0;
			$scope.results = [];
	        $scope.searchedStore = $scope.store;

			$scope.initialNumberOfFlights = getBg().init(getRequest());
		}
	};

	$scope.stop = function () {
		getBg().getPq().stopServer();
	};
    
    $scope.disableStop = function () {
        return $scope.initialNumberOfFlights <= $scope.numberOfFlights;
    };
    
    var getMinPrice = function (previousPrice, price) {
        return previousPrice == 0 || price == 0 ? Math.max(previousPrice, price) : Math.min(previousPrice, price);
    };
    
	$scope.orderCompaniesByPrices = function (company) {
        if (company == undefined) return Number.MAX_SAFE_INTEGER;
        
        var min = 0;
        for(var i in company)
            min = getMinPrice(min, company[i].price);
        
        return min;
	};
    
    $scope.stores = bg.getStores();

    $scope.print = function (price, value) {
        return price > 0 ? (value ? value : price) : "-";
    };
	
	$scope.printSavedSearch = function (item, index) {
		return (index + 1) + '- ' + item.origins[0].id + ' - ' + item.destinations[0].id + ' - ' +
			item.departureDates[0].toDateFormat('dd/mm/yyyy') + (item.returnDates && item.returnDates[0] ? (' - ' + item.returnDates[0].toDateFormat('dd/mm/yyyy')) : '')
	};
    
	$(".help").tipsy({ gravity: 'w', html: true, fade: true, opacity: 0.95 });
});

app.filter('toArray', function () {
    'use strict';

    return function (obj) {
    	return Object.keys(obj).map(function (key) {
            return Object.defineProperty(obj[key], '$key', { __proto__: null, value: key });
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
			        .appendTo($("div[name='" + attrs['name'] + "'] .ui-datepicker-buttonpane"))
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
			        .appendTo($("div[name='" + attrs['name'] + "'] .ui-datepicker-buttonpane"))
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
				
                elm.multiDatesPicker('resetDates');
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