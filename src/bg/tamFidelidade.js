//Request Manager for "Tam Fidelidade"
function TamFidelidade() {
    var self = this;
    self.parent.push.call(self);
    
    const BASE_URL = "http://book.tam.com.br/TAM/dyn/air/";
    
//public methods
    self.sendRequest = function (data, successCallback, failCallback, time) {
        self.parent.sendRequest({
            data: data,
            url: getServiceUrl(data),
            headers: {
                'Content-type': 'application/x-www-form-urlencoded'
            },
            time: time,
            successCallback: successCallback,
            failCallback: failCallback,
            callback: function (responseText) {
                var parser = new DOMParser();
                var response = parser.parseFromString(responseText, "text/html");
                var info = mapAjaxResponse(data, response);
                
                successCallback(data, info);
            },
            formData: getFormData(data)
        });
    };
    
    //there is not a public url
    self.getUrl = function(data) {
        return BASE_URL + 'entry?WDS_DEST_PAGE=SEARCH&SITE=JJBKJJBK&LANGUAGE=BR&WDS_MARKET=BR&utm_source=' + APP_NAME;
        
        //http://book.tam.com.br/TAM/dyn/air/entry?WDS_DEST_PAGE=SEARCH&SITE=JJBKJJBK&LANGUAGE=BR&WDS_MARKET=BR
    };

//private methods
    var getServiceUrl = function (data) {
        return BASE_URL + 'booking/upslDispatcher';
        
        //http://book.tam.com.br/TAM/dyn/air/booking/upslDispatcher
    };
    
    var getFormData = function (data) {
        var p = [];
        
        p.push('FROM_PAGE=SEARCH');
        p.push('SITE=JJRDJJRD');
        p.push('LANGUAGE=BR');
        p.push('SWITCH_TO_SSL=false');
        p.push('REFRESH=0');
        p.push('FORCE_OVERRIDE=TRUE');
        p.push('WDS_FORCE_SITE_UPDATE=TRUE');
        p.push('WDS_DISABLE_REDEMPTION=false');
        p.push('WDS_MARKET=BR');
        p.push('WDS_FORCE_SITE_UPDATE=TRUE');
        p.push('WDS_CORPORATE_SALES=FALSE');
        p.push('WDS_NAVIGATION_TAB=ONLINESEARCH');
        p.push('B_DATE_1=' + data.departureDate.toDateFormat('yyyymmdd0000'));
        
        if (data.returnDate !== null)
            p.push('B_DATE_2=' + data.returnDate.toDateFormat('yyyymmdd0000'));
        
        p.push('B_LOCATION_1=' + data.origin);
        p.push('E_LOCATION_1=' + data.destination);
        p.push('TRIP_TYPE=' + (data.returnDate === null ? 'O' : 'R')); //O: oneway, R: roundtrip 
        p.push('passenger_useMyPoints=true');
        p.push('search_from=' + airportsById[data.origin] ? airportsById[data.origin].text : data.origin);
        p.push('search_to=' + airportsById[data.destination] ? airportsById[data.destination].text : data.destination);
        p.push('search_outbound_date=' + data.departureDate.toDateFormat('dd/mm/yyyy'));
        p.push('MULTICITY_STATE=');
        p.push('MULTICITY_B_LOCATION_1=');
        p.push('MULTICITY_E_LOCATION_1=');
        p.push('MULTICITY_B_DATE_1=');
        p.push('MULTICITY_B_LOCATION_2=');
        p.push('MULTICITY_E_LOCATION_2=');
        p.push('MULTICITY_B_DATE_2=');
        p.push('MULTICITY_B_LOCATION_3=');
        p.push('MULTICITY_E_LOCATION_3=');
        p.push('MULTICITY_B_DATE_3=');
        p.push('MULTICITY_B_LOCATION_4=');
        p.push('MULTICITY_E_LOCATION_4=');
        p.push('MULTICITY_B_DATE_4=');
        p.push('adults=' + data.adults);
        p.push('children=' + data.children);
        p.push('infants=' + data.infants);
        p.push('COMMERCIAL_FARE_FAMILY_1=' + getCommercialFareFamily(data));
        p.push('CORPORATE_CODE_INPUT=');
        p.push('SEARCH_COOKIE=' + JSON.stringify({
            bounds: [
                null,null,null,null,null,null,null,null,null,null,
                {
                    bLocation: data.origin,
                    eLocation: data.destination,
                    bDate: data.departureDate.toDateFormat('yyyymmdd0000')
                },
                (data.returnDate === null ? null : { bDate: data.returnDate.toDateFormat('yyyymmdd0000') })
            ],
            roundtripCommon: {
                tripType: data.returnDate === null ? 'O' : 'R',
                useMyPoints: 'true',
                adults: data.adults + '',
                children: data.children + '',
                infants: data.infants + '',
                cff: getCommercialFareFamily(data)
            }
        }));
        
        return p.join('&');
        
        //FROM_PAGE=SEARCH&SITE=JJRDJJRD&LANGUAGE=BR&SWITCH_TO_SSL=false&REFRESH=0&WDS_FORCE_SITE_UPDATE=TRUE&FORCE_OVERRIDE=TRUE&WDS_DISABLE_REDEMPTION=false&WDS_MARKET=BR&WDS_FORCE_SITE_UPDATE=TRUE&WDS_CORPORATE_SALES=FALSE&WDS_NAVIGATION_TAB=ONLINESEARCH&B_DATE_1=201507010000&B_LOCATION_1=FOR&E_LOCATION_1=RIO&TRIP_TYPE=O&passenger_useMyPoints=true&search_from=FOR&search_to=RIO&search_outbound_date=01/07/2015&MULTICITY_STATE=&MULTICITY_B_LOCATION_1=&MULTICITY_E_LOCATION_1=&MULTICITY_B_DATE_1=&MULTICITY_B_LOCATION_2=&MULTICITY_E_LOCATION_2=&MULTICITY_B_DATE_2=&MULTICITY_B_LOCATION_3=&MULTICITY_E_LOCATION_3=&MULTICITY_B_DATE_3=&MULTICITY_B_LOCATION_4=&MULTICITY_E_LOCATION_4=&MULTICITY_B_DATE_4=&adults=1&children=0&infants=0&COMMERCIAL_FARE_FAMILY_1=TAMAWFLX&CORPORATE_CODE_INPUT=&SEARCH_COOKIE={"bounds":[null,null,null,null,null,null,null,null,null,null,{"bLocation":"FOR","eLocation":"RIO","bDate":"201507010000"},null],"roundtripCommon":{"tripType":"O","useMyPoints":"true","adults":"1","children":"0","infants":"0","cff":"TAMAWFLX"}}
    };
    
    var mapAjaxResponse = function (data, response) {
        var info = self.parent.returnDefault();
        
        var isOneWay = data.returnDate === null;
        //departure flights
        var minPrices = [0, 0, 0];
        $('#outbound_list_flight tr.flight', response).each(function () {
            var stops = Math.min($(this).attr('data-number-of-stops'), 2);
            var price = 0;
            $(this).find('td').each(function () {
                //there are also data-cell-price-chd and data-cell-price-inf
                price = self.parent.getMinPrice(price, parseInt($(this).attr('data-cell-price-adt') || 0));                
            });
            
            var airlineName = airlinesCompaniesByCode[$(this).attr('data-airlinecode')] || $(this).attr('data-airlinecompany');
            
            //if it's a round trip, show departure and return airlines separated
            var airline = isOneWay ? airlineName : airlineName + self.parent.departureLabel;
            
            self.parent.checkAirlineInitialized(info, airline, data.url);
            info.byCompany[airline][stops].price = self.parent.getMinPrice(info.byCompany[airline][stops].price, price);
            minPrices[stops] = self.parent.getMinPrice(minPrices[stops], price);
        });
        
        //return flights
        var minPricesReturn = [0, 0, 0];
        $('#inbound_list_flight tr.flight', response).each(function () {
            var stops = Math.min($(this).attr('data-number-of-stops'), 2);
            var price = 0;
            $(this).find('td').each(function () {
                //there are also data-cell-price-chd and data-cell-price-inf
                price = self.parent.getMinPrice(price, parseInt($(this).attr('data-cell-price-adt') || 0));                
            });
            
            var airlineName = airlinesCompaniesByCode[$(this).attr('data-airlinecode')] || $(this).attr('data-airlinecompany');
            var airline = airlineName + self.parent.returnLabel;
            
            self.parent.checkAirlineInitialized(info, airline, data.url);
            info.byCompany[airline][stops].price = self.parent.getMinPrice(info.byCompany[airline][stops].price, price);
            minPricesReturn[stops] = self.parent.getMinPrice(minPricesReturn[stops], price);
        });
        
        for(var i in [0, 1, 2]) {
            var min = 0;
            for(var j = 0; j <= i; j++) {
                if (minPrices[i] > 0 && (isOneWay || minPricesReturn[j] > 0))
                    min = self.parent.getMinPrice(min, minPrices[i] + minPricesReturn[j])
                    
                if (minPrices[j] > 0 && !isOneWay && minPricesReturn[i] > 0)
                    min = self.parent.getMinPrice(min, minPrices[j] + minPricesReturn[i])
            }
            
            info.prices[i] = min;
        }
        
        return info;
    };
    
    var getCommercialFareFamily = function (data) {
        var defaultCountry = airportsById["SAO"] ? airportsById["SAO"].country : "Brasil";
        var countryOrigin = airportsById[data.origin] ? airportsById[data.origin].country : defaultCountry;
        var countryDestination = airportsById[data.destination] ? airportsById[data.destination].country : defaultCountry;
        
        return countryOrigin !== defaultCountry || countryDestination !== defaultCountry
            ? "TAMAW3"
            : "TAMAWFLX";
    };
    
    return self;
}

TamFidelidade.prototype = new RequestManager('Tam Fidelidade - Multiplus', 2000, 5);
TamFidelidade.prototype.constructor = TamFidelidade;
TamFidelidade.prototype.parent = RequestManager.prototype;

var FIDELIDADE = new TamFidelidade();