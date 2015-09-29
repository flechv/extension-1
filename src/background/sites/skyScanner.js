(function (RequestManager) {
	'use strict';

	function SkyScanner() {
		var self = this;
		self.parent.push.call(self);

		const SERVICE_BASE_URL = 'http://www.skyscanner.com.br/dataservices/routedate/v2.0/',
			PUBLIC_BASE_URL = 'http://www.skyscanner.com.br/transporte/passagens-aereas/';

		//public methods
		self.sendRequest = function (request, successCallback, failCallback, time) {
			self.parent.sendRequest({
				request: request,
				url: getServiceUrl(request),
				headers: {
					'Content-type': 'application/x-www-form-urlencoded'
				},
				time: time,
				successCallback: successCallback,
				failCallback: failCallback,
				callback: function (responseText) {
					var parser = new DOMParser();
					var response = parser.parseFromString(responseText, 'text/html');
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
			var p = [];

			p.push('use204=true');
			p.push('abvariant=fps_cache_reuse_v2_01%3Aaa%7CFss_BackButton_V1%3Ab%7CFss_DateNudger_V0%3Ab%7Crts_npt_toproutes_v1%3Aa%7CFss_MobileTap_V0%3Aa');

			return SERVICE_BASE_URL + '?' + p.join('&');

			// http://www.skyscanner.com.br/dataservices/routedate/v2.0/?use204=true&abvariant=fps_cache_reuse_v2_01%3Aaa%7CFss_BackButton_V1%3Ab%7CFss_DateNudger_V0%3Ab%7Crts_npt_toproutes_v1%3Aa%7CFss_MobileTap_V0%3Aa
		};

		var getFormData = function (request) {
			var p = [];

			p.push('FROM_PAGE=SEARCH');
			p.push('MergeCodeshares:false');
			p.push('SkipMixedAirport:false');
			p.push('OriginPlace:' + request.origin);
			p.push('DestinationPlace:' + request.destination);
			p.push('OutboundDate:' + request.departure.toDateFormat('yyyy-MM-dd'));
			p.push('InboundDate:' + (request.return !== null ? request.return.toDateFormat('yyyy-MM-dd') : ''));
			p.push('Passengers.Adults:' + request.adults);
			p.push('Passengers.Children:' + request.children);
			p.push('Passengers.Infants:' + request.infants);
			p.push('UserInfo.CountryId:BR');
			p.push('UserInfo.LanguageId:PT');
			p.push('UserInfo.CurrencyId:BRL');
			p.push('CabinClass:Economy');
			p.push('UserInfo.ChannelId:transportfunnel');
			p.push('JourneyModes:flight');
			p.push('PriceForPassengerGroup:true');
			p.push('RequestId:ae7249de-f8ae-4df1-b620-6ae42bddf88e');
			p.push('DestinationAlternativePlaces:');

			return p.join('&');

			// MergeCodeshares=false&SkipMixedAirport=false&OriginPlace=ATH&DestinationPlace=ISTA&OutboundDate=2015-07-22&InboundDate=&Passengers.Adults=1&Passengers.Children=0&Passengers.Infants=0&UserInfo.CountryId=BR&UserInfo.LanguageId=PT&UserInfo.CurrencyId=BRL&CabinClass=Economy&UserInfo.ChannelId=transportfunnel&JourneyModes=flight&PriceForPassengerGroup=true&RequestId=ae7249de-f8ae-4df1-b620-6ae42bddf88e&DestinationAlternativePlaces=IST%2CSAW%2CBTZ
		};

		var mapAjaxResponse = function (request, response) {
			var info = self.parent.returnDefault();

			$('.result > .flight', response).each(function () {
				var airline = $(this).find('.airlineName').text().trim();
				var price = $(this).find('.price').text().trim().replace('.', '');

				var stops = {};
				$(this).find('.flightDetail').each(function () {
					var stop = 2;
					if ($(this).find('span:contains("2 escalas")').length > 0) stop = 2;
					else if ($(this).find('span:contains("1 escala")').length > 0) stop = 1;
					else if ($(this).find('span:contains("Direto")').length > 0) stop = 0;

					stops[stop] = true;
				});

				stops = Object.keys(stops);
				self.parent.setAirlinePrices(info, airline, request.url);
				for (var i in stops) {
					info.byCompany[airline][stops[i]].price = self.parent.getMinPrice(info.byCompany[airline][stops[i]].price, price);
					info.prices[stops[i]] = self.parent.getMinPrice(info.prices[stops[i]], price);
				}
			});

			return info;
		};

		return self;
	}

	SkyScanner.prototype = new RequestManager('SkyScanner', 'Sky scanner', 2000, 3);
	SkyScanner.prototype.constructor = SkyScanner;
	SkyScanner.prototype.parent = RequestManager.prototype;

	// new SkyScanner();
})(window.RequestManager);
