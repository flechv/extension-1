(function (RequestManager) {
	'use strict';

	function Smiles() {
		var self = this;
		self.parent.push.call(self);

		const SERVICE_BASE_URL = 'https://www.smiles.com.br/c/portal/render_portlet',
			PUBLIC_BASE_URL = 'https://www.smiles.com.br/passagens-com-milhas',
			PARTNERS_SERVICE_BASE_URL = 'https://produtos.smiles.com.br/Congeneres/AvailableFlights.aspx';

		// public methods
		self.sendRequest = function (request, successCallback, failCallback, time) {
			self.parent.sendRequest({
				request: request,
				url: getServiceUrl(request),
				headers: {
					'Content-type': 'text/plain;charset=UTF-8'
				},
				time: time,
				successCallback: successCallback,
				failCallback: failCallback,
				callback: function (responseText) {
					sendRequest2(request, successCallback, failCallback);
				}
			});
		};

		self.getUrl = function (request) {
			var p = [];

			p.push('tripType=' + (request.return === null ? 2 : 1));
			p.push('originAirport=' + request.origin);
			p.push('destinationAirport=' + request.destination);
			p.push('departureDay=' + (request.departure / 1000));
			p.push('returnDay=' + (request.return / 1000));

			p.push('adults=' + request.adults);
			p.push('children=' + request.children);
			p.push('infants=' + request.infants);
			p.push('utm_source=' + APP_NAME);

			return PUBLIC_BASE_URL + '?' + p.join('&');

			// https://www.smiles.com.br/passagens-com-milhas?tripType=1&originAirport=RIO&destinationAirport=GRU&departureDay=1430708400&returnDay=1431313200&adults=01&children=0&infants=0
		};

		// private methods
		var getServiceUrl = function (request) {
			var p = [];

			p.push('p_l_id=25746');
			p.push('p_p_id=smilessearchflightsresultportlet_WAR_smilesflightsportlet');
			p.push('p_p_lifecycle=0');
			p.push('p_t_lifecycle=0');
			p.push('p_p_state=normal');
			p.push('p_p_mode=view');
			p.push('p_p_col_id=column-2');
			p.push('p_p_col_pos=0');
			p.push('p_p_col_count=2');
			p.push('p_p_isolated=1');

			var publicUrl = self.getUrl(request);
			var pathUrl = publicUrl.replace('https://www.smiles.com.br', '');
			p.push('currentURL=' + encodeURIComponent(pathUrl));

			return SERVICE_BASE_URL + '?' + p.join('&');
		};

		var sendRequest2 = function (request, successCallback, failCallback) {
			self.parent.sendRequest({
				request: request,
				url: getServiceUrl2(request),
				headers: {
					'Content-type': 'application/x-www-form-urlencoded'
				},
				successCallback: successCallback,
				failCallback: failCallback,
				callback: function (responseText) {
					var response = JSON.parse(responseText);
					var info = mapAjaxResponse(request, response, successCallback);

					if (response.hasCongenereFligts)
						sendRequestPartners(request, successCallback, failCallback, info);
					else
						successCallback(request, info);
				},
				formData: getFormData2(request)
			});
		};

		var getServiceUrl2 = function (request) {
			var p = [];

			p.push('p_p_id=smilessearchflightsresultportlet_WAR_smilesflightsportlet');
			p.push('p_p_lifecycle=2');
			p.push('p_p_state=normal');
			p.push('p_p_mode=view');
			p.push('p_p_resource_id=getFlights');
			p.push('p_p_cacheability=cacheLevelPage');
			p.push('p_p_col_id=column-2');
			p.push('p_p_col_count=2');

			var publicUrl = self.getUrl(request);
			var pathUrl = publicUrl.replace('https://www.smiles.com.br', '');
			p.push('_smilessearchflightsresultportlet_WAR_smilesflightsportlet_currentURL=' + encodeURIComponent(pathUrl));

			return PUBLIC_BASE_URL + '?' + p.join('&') + '?noCache=' + (new Date()).getTime();

			//https://www.smiles.com.br/passagens-com-milhas?p_p_id=smilessearchflightsresultportlet_WAR_smilesflightsportlet&p_p_lifecycle=2&p_p_state=normal&p_p_mode=view&p_p_resource_id=getFlights&p_p_cacheability=cacheLevelPage&p_p_col_id=column-2&p_p_col_count=2&_smilessearchflightsresultportlet_WAR_smilesflightsportlet_currentURL=%2Fpassagens-com-milhas%3FtripType%3D1%26originAirport%3DRIO%26destinationAirport%3DGRU%26departureDay%3D1430708400%26returnDay%3D1431313200%26adults%3D01%26children%3D0%26infants%3D0?noCache=1431313200
		};

		var getFormData2 = function (request) {
			return '_smilessearchflightsresultportlet_WAR_smilesflightsportlet_JSONParameters=' + JSON.stringify({
				getAvailableRequest: {
					routes: [{
						tripType: request.return === null ? 'ONE_WAY' : 'ROUND_TRIP',
						origin: request.origin,
						destination: request.destination,
						originAirport: request.origin,
						destinationAirport: request.destination,
						departureDay: request.departure,
						returnDay: request.return,
						departureDayFinal: null,
						returnDayFinal: null,
						adults: request.adults,
						infants: request.infants,
						children: request.children,
						role: null,
						currencyCode: 'BRL'
                    }]
				}
			});

			// _smilessearchflightsresultportlet_WAR_smilesflightsportlet_JSONParameters={'getAvailableRequest':{'routes':[{'tripType':'ROUND_TRIP','origin':'RIO','destination':'GRU','originAirport':'RIO','destinationAirport':'GRU','departureDay':1430708400000,'returnDay':1431313200000,'departureDayFinal':null,'returnDayFinal':null,'adults':1,'infants':0,'children':0,'role':null,'currencyCode':'BRL'}]}}
		};

		var mapAjaxResponse = function (request, response, callback) {
			self.parent.maxWaiting = 5; // just in case of it had been decreased by mapAjaxResponsePartners

			var isOneWay = request.return === null;

			var departurePrices = [0, 0, 0];
			var returnPrices = [0, 0, 0];
			var byCompany = {};

			for (var i = 0; i < response.legs.length; i++) {
				var legFlights = response.legs[i].categoryFlights;

				for (var j = 0; j < legFlights.length; j++) {
					var flight = legFlights[j].flights[0];
					var price = flight.smilesCost[0].originalSmiles;

					if (flight.clubSmilesCost !== null && flight.clubSmilesCost.length > 0)
						price = flight.clubSmilesCost[0].originalSmiles;

					var stops = parseInt(flight.stops) || 0;
					stops = Math.min(Math.max(stops, 0), 2); // must be between 0 and 2

					// if it's a round trip, show departure and return prices separated
					var airline = 'Gol';
					if (!isOneWay)
						airline += (i === 0 ? self.parent.departureLabel : self.parent.returnLabel);

					if (!byCompany[airline]) byCompany[airline] = self.parent.pricesDefault();
					byCompany[airline][stops] = self.parent.getMinPrice(byCompany[airline][stops], price);

					if (i === 0) { // departure flights
						departurePrices[stops] = self.parent.getMinPrice(departurePrices[stops], price);
					} else { // it has response.legs.length to support multiple cities, but for now we only support round trip
						returnPrices[stops] = self.parent.getMinPrice(returnPrices[stops], price);
					}
				}
			}

			var info = self.parent.returnDefault();
			self.parent.setTotalPrices(info, departurePrices, returnPrices, isOneWay);
			self.parent.setAirlinePrices(info, byCompany);

			return info;
		};

		var sendRequestPartners = function (request, successCallback, failCallback, info) {
			self.parent.sendRequest({
				request: request,
				method: 'GET',
				url: getServiceUrlPartners(request),
				headers: {
					'Content-type': 'text/html;charset=UTF-8'
				},
				successCallback: successCallback,
				failCallback: failCallback,
				callback: function (responseText) {
					var parser = new DOMParser();
					var response = parser.parseFromString(responseText, 'text/html');
					var formData = $('form', response).serialize() + '&btnStartAvailability=';

					sendRequestPartners2(request, successCallback, failCallback, formData, info);
				}
			});
		};

		var getServiceUrlPartners = function (request) {
			var p = [];

			p.push('dep=' + request.origin);
			p.push('arr=' + request.destination);
			p.push('std=' + request.departure.toDateFormat('yyyyMMdd'));

			if (request.return !== null)
				p.push('returnstd=' + request.return.toDateFormat('yyyyMMdd'));

			p.push('paxCount=' + request.adults);
			p.push('CHDCount=' + request.children);
			p.push('InfantCount=' + request.infants);

			return PARTNERS_SERVICE_BASE_URL + '?' + p.join('&');

			// https://produtos.smiles.com.br/Congeneres/AvailableFlights.aspx?dep=GRU&arr=AMS&std=20151231&paxCount=1&CHDCount=0&InfantCount=0
		};

		var sendRequestPartners2 = function (request, successCallback, failCallback, formData, info) {
			self.parent.sendRequest({
				request: request,
				url: getServiceUrlPartners(request),
				headers: {
					'Content-type': 'application/x-www-form-urlencoded'
				},
				withCredentials: true,
				successCallback: successCallback,
				failCallback: failCallback,
				callback: function (responseText) {
					var parser = new DOMParser();
					var response = parser.parseFromString(responseText, 'text/html');
					var infoPartners = mapAjaxResponsePartners(request, response, info);

					successCallback(request, infoPartners);
				},
				formData: formData
			});
		};

		var mapAjaxResponsePartners = function (request, response, info) {
			self.parent.maxWaiting = 2; // decrease maxWaiting since server can't handle many pending request

			var isOneWay = request.return === null;

			var departurePrices = [0, 0, 0];
			var returnPrices = [0, 0, 0];
			var byCompany = {};

			// departure flights
			$('#tblOutboundFlights tr', response).each(function () {
				var flights = $(this).find('.resulttableFly .tStops');
				var miles = $(this).find('.resulttable');

				if (flights.size() == 0 || miles.size() == 0) return;
				var price = miles.text().trim().replace('.', '');
				// one tr is the header and the other is the flight '/2'
				// if there is one flight shown that is a non stop flight '-1'
				var stops = (flights.find('tr').size() / 2) - 1;

				// Usually the last flight is the most important one (the first is the regional flight)
				var airlineName = flights.find('tr:last-child td:nth-child(2)').text().trim();

				// if it's a round trip, show departure and return airlines separated
				var airline = isOneWay ? airlineName : airlineName + self.parent.departureLabel;

				if (!byCompany[airline]) byCompany[airline] = self.parent.pricesDefault();
				byCompany[airline][stops] = self.parent.getMinPrice(byCompany[airline][stops], price);

				departurePrices[stops] = self.parent.getMinPrice(departurePrices[stops], price);
			});

			// return flights
			if (!isOneWay) {
				$('#tblInboundFlights tr', response).each(function () {
					var flights = $(this).find('.resulttableFly .tStops');
					var miles = $(this).find('.resulttable');

					if (flights.size() == 0 || miles.size() == 0) return;
					var price = miles.text().trim().replace('.', '');
					// one tr is the header and the other is the flight '/2'
					// if there is one flight shown that is a non stop flight '-1'
					var stops = (flights.find('tr').size() / 2) - 1;

					// Usually the first flight is the most important one in a return flight
					var airlineName = flights.find('tr:nth-child(2) td:nth-child(2)').text().trim();
					var airline = airlineName + self.parent.returnLabel;

					if (!byCompany[airline]) byCompany[airline] = self.parent.pricesDefault();
					byCompany[airline][stops] = self.parent.getMinPrice(byCompany[airline][stops], price);

					returnPrices[stops] = self.parent.getMinPrice(returnPrices[stops], price);
				});
			}

			info = info || self.parent.returnDefault();
			self.parent.setTotalPrices(info, departurePrices, returnPrices, isOneWay);
			self.parent.setAirlinePrices(info, byCompany);

			return info;
		};

		return self;
	}

	Smiles.prototype = new RequestManager('Smiles', 'Smiles - Milhas Gol', 2000, 5);
	Smiles.prototype.constructor = Smiles;
	Smiles.prototype.parent = RequestManager.prototype;

	new Smiles();
})(window.RequestManager);
