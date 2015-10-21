(function (RequestManager) {
	'use strict';

	function SkyScanner() {
		var self = this;
		self.parent.push.call(self);

		var SERVICE_BASE_URL = 'http://www.skyscanner.com.br/dataservices/routedate/v2.0/',
			PUBLIC_BASE_URL = 'http://www.skyscanner.com.br/transporte/passagens-aereas/';

		//public methods
		self.sendRequest = function (request, successCallback, failCallback, time) {
			self.parent.sendRequest({
				request: request,
				method: isSessionSet(request) ? 'GET' : 'POST',
				url: getServiceUrl(request),
				headers: {
					'Content-type': 'application/x-www-form-urlencoded; charset=UTF-8'
				},
				time: time,
				successCallback: successCallback,
				failCallback: failCallback,
				callback: function (responseText) {
					var response = JSON.parse(responseText);
					if (isSessionSet(response))
						request.SessionKey = response.SessionKey;
					
					// if not completed, try again. results come in Quotes
					if (response.Quotes.length === 0)
						throw 'Not ready yet. Try again later';

					var info = mapAjaxResponse(request, response);

					successCallback(request, info);
				},
				formData: getFormData(request)
			});
		};

		self.getUrl = function (request) {
			var p = [];

			p.push(request.origin.toLowerCase());
			p.push(request.destination.toLowerCase());
			p.push(request.departure.toDateFormat('yyMMdd'));
			if (request.return !== null)
				p.push(request.return.toDateFormat('yyMMdd'));

			p.push('tarifas-aereas.html');

			var pp = [];
			pp.push('adults=' + request.adults);
			pp.push('children=' + request.children);
			pp.push('infants=' + request.infants);
			pp.push('cabinclass=economy');
			pp.push('preferdirects=false');
			pp.push('outboundaltsenabled=false');
			pp.push('inboundaltsenabled=true');
			pp.push('rtn=0');
			pp.push('utm_source=' + APP_NAME);

			return PUBLIC_BASE_URL + p.join('/') + '?' + pp.join('&');

			// http://www.skyscanner.com.br/transporte/passagens-aereas/ath/ista/150722/150725/tarifas-aereas-de-internacional-de-atenas-para-istambul-em-julho-2015.html?adults=1&children=0&infants=0&cabinclass=economy&preferdirects=false&outboundaltsenabled=false&inboundaltsenabled=true&rtn=1
		};

		// private methods
		var getServiceUrl = function (request) {
			return SERVICE_BASE_URL + (!isSessionSet(request) ? '' : request.SessionKey) + '?use204=true';
			// http://www.skyscanner.com.br/dataservices/routedate/v2.0/?use204=true
		};

		var getFormData = function (request) {
			if (isSessionSet(request)) return;
			
			var p = [];

			// p.push('FROM_PAGE=SEARCH');
			p.push('MergeCodeshares=false');
			p.push('SkipMixedAirport=false');
			p.push('OriginPlace=' + request.origin + 'A');
			p.push('DestinationPlace=' + request.destination);
			p.push('OutboundDate=' + request.departure.toDateFormat('yyyy-MM-dd'));
			p.push('InboundDate=' + (request.return !== null ? request.return.toDateFormat('yyyy-MM-dd') : ''));
			p.push('Passengers.Adults=' + request.adults);
			p.push('Passengers.Children=' + request.children);
			p.push('Passengers.Infants=' + request.infants);
			p.push('UserInfo.CountryId=BR');
			p.push('UserInfo.LocaleName=pt-BR');
			p.push('UserInfo.CurrencyId=BRL');
			p.push('CabinClass=Economy');
			p.push('UserInfo.ChannelId=transportfunnel');
			p.push('JourneyModes=flight');
			p.push('PriceForPassengerGroup=true');
			p.push('RequestId=ae7249de-f8ae-4df1-b620-6ae42bddf88e');
			// p.push('DestinationAlternativePlaces=');

			return p.join('&');

			// MergeCodeshares=false&SkipMixedAirport=false&OriginPlace=HKG&DestinationPlace=CNX&OutboundDate=2016-01-20&InboundDate=&Passengers.Adults=1&Passengers.Children=0&Passengers.Infants=0&UserInfo.CountryId=BR&UserInfo.LocaleName=pt-BR&UserInfo.CurrencyId=BRL&CabinClass=Economy&UserInfo.ChannelId=transportfunnel&JourneyModes=flight&PriceForPassengerGroup=true&RequestId=f599a3f9-3795-4e48-930d-c1732b04a51b
		};

		var mapAjaxResponse = function (request, response) {
			var info = self.parent.returnDefault();
			var byCompany = {};

			for (var i = 0; i < response.Itineraries.length; i++) {
				var itinerary = response.Itineraries[i];
				var outboundLegId = itinerary.OutboundLegId;
				var outboundLeg = response.OutboundItineraryLegs.filter(function (a) { return a.Id == outboundLegId })[0];
				
				var outboundStops = outboundLeg.StopsCount;
				var carrierId = outboundLeg.OperatingCarrierIds[0];
				var carrier = response.Carriers.filter(function (c) { return c.Id == carrierId })[0];
				
				var airline = carrier.Name;
				if (!!carrier.DisplayCode) {
					var airlineObj = window.airlinesByCode[carrier.DisplayCode];
					if (!!airlineObj)
						airline = airlineObj.text;	
				}
							
				var inboundLegId = itinerary.InboundLegId;
				var inboundLeg = null;
				var inboundStops = 0;
				if (!!inboundLegId) {
					inboundLeg = response.InboundItineraryLegs.filter(function (a) { return a.Id == inboundLegId })[0];
					inboundStops = inboundLeg.StopsCount;
				}
				
				var stops = Math.max(outboundStops, inboundStops);
				stops = Math.min(Math.max(stops, 0), 2);
				
				if (!!itinerary.PricingOptions && itinerary.PricingOptions.length > 0) {
					var quoteIds = itinerary.PricingOptions[0].QuoteIds;
					
					for (var j = 0; j < quoteIds.length; j++) {
						var quoteId = quoteIds[j];
						var quote = response.Quotes.filter(function (a) { return a.Id == quoteId })[0];
						
						var price = quote.Price;

						if (!byCompany[airline]) byCompany[airline] = self.parent.pricesDefault();
						byCompany[airline][stops] = self.parent.getMinPrice(byCompany[airline][stops], price);

						info.prices[stops] = self.parent.getMinPrice(info.prices[stops], price);
					}
				}
			}

			self.parent.setAirlinePrices(info, byCompany);

			return info;
		};
		
		var isSessionSet = function (data) {
			return !!data.SessionKey;
		};

		return self;
	}

	SkyScanner.prototype = new RequestManager('Skyscanner', 'Skyscanner', 2000, 3, 2.5);
	SkyScanner.prototype.constructor = SkyScanner;
	SkyScanner.prototype.parent = RequestManager.prototype;

	// new SkyScanner();
})(window.RequestManager);
