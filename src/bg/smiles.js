//Request Manager for "Smiles"
function Smiles() {
    var self = this;
    self.parent.push.call(self);
    
    const SERVICE_BASE_URL = "https://www.smiles.com.br/c/portal/render_portlet",
          PUBLIC_BASE_URL = "https://www.smiles.com.br/passagens-com-milhas",
          PARTNERS_SERVICE_BASE_URL = "https://produtos.smiles.com.br/Congeneres/AvailableFlights.aspx";
    
//public methods
    self.sendRequest = function (data, successCallback, failCallback, time) {
        self.parent.sendRequest({
            data: data,
            url: getServiceUrl(data),
            headers: {
                'Content-type': 'text/plain;charset=UTF-8'
            },
            time: time,
            successCallback: successCallback,
            failCallback: failCallback,
            callback: function (responseText) {
                sendRequest2(data, successCallback, failCallback);
            }
        });
    };
    
    self.getUrl = function(data) {
        var p = [];
        
        p.push("tripType=" + (data.returnDate === null ? 2 : 1));
        p.push("originAirport=" + data.origin);
        p.push("destinationAirport=" + data.destination);
        p.push("departureDay=" + getTime(data.departureDate, true));
        p.push("returnDay=" + getTime(data.returnDate, true));
        
        p.push("adults=" + data.adults);
        p.push("children=" + data.children);
        p.push("infants=" + data.babies);
        //p.push("utm_source=" + APP_NAME);

        return PUBLIC_BASE_URL + "?" + p.join("&");
        
        //https://www.smiles.com.br/passagens-com-milhas?tripType=1&originAirport=RIO&destinationAirport=GRU&departureDay=1430708400&returnDay=1431313200&adults=01&children=0&infants=0
    };

//private methods
    var getServiceUrl = function (data) {
        var p = [];
        
        p.push("p_l_id=25746");
        p.push("p_p_id=smilessearchflightsresultportlet_WAR_smilesflightsportlet");
        p.push("p_p_lifecycle=0");
        p.push("p_t_lifecycle=0");
        p.push("p_p_state=normal");
        p.push("p_p_mode=view");
        p.push("p_p_col_id=column-2");
        p.push("p_p_col_pos=0");
        p.push("p_p_col_count=2");
        p.push("p_p_isolated=1");
        
        var publicUrl = self.getUrl(data);
        var pathUrl = publicUrl.replace("https://www.smiles.com.br", "");
        p.push("currentURL=" + encodeURIComponent(pathUrl));
        
        return SERVICE_BASE_URL + "?" + p.join("&");
    };
    
    var sendRequest2 = function (data, successCallback, failCallback) {
        self.parent.sendRequest({
            data: data,
            url: getServiceUrl2(data),
            headers: {
                'Content-type': 'application/x-www-form-urlencoded'
            },
            successCallback: successCallback,
            failCallback: failCallback,
            callback: function (responseText) {
                var response = JSON.parse(responseText);
                if (response.hasCongenereFligts)
                    sendRequestPartners(data, successCallback, failCallback);
                else
                    mapAjaxResponse(data, response, successCallback);
            },
            requestData: getRequest2(data)
        });
    };
    
    var getServiceUrl2 = function (data) {
        var p = [];
        
        p.push("p_p_id=smilessearchflightsresultportlet_WAR_smilesflightsportlet");
        p.push("p_p_lifecycle=2");
        p.push("p_p_state=normal");
        p.push("p_p_mode=view");
        p.push("p_p_resource_id=getFlights");
        p.push("p_p_cacheability=cacheLevelPage");
        p.push("p_p_col_id=column-2");
        p.push("p_p_col_count=2");
        
        var publicUrl = self.getUrl(data);
        var pathUrl = publicUrl.replace("https://www.smiles.com.br", "");
        p.push("_smilessearchflightsresultportlet_WAR_smilesflightsportlet_currentURL=" + encodeURIComponent(pathUrl));
        
        return PUBLIC_BASE_URL + "?" + p.join("&") + "?noCache=" + (new Date()).getTime();
        
        //https://www.smiles.com.br/passagens-com-milhas?p_p_id=smilessearchflightsresultportlet_WAR_smilesflightsportlet&p_p_lifecycle=2&p_p_state=normal&p_p_mode=view&p_p_resource_id=getFlights&p_p_cacheability=cacheLevelPage&p_p_col_id=column-2&p_p_col_count=2&_smilessearchflightsresultportlet_WAR_smilesflightsportlet_currentURL=%2Fpassagens-com-milhas%3FtripType%3D1%26originAirport%3DRIO%26destinationAirport%3DGRU%26departureDay%3D1430708400%26returnDay%3D1431313200%26adults%3D01%26children%3D0%26infants%3D0?noCache=1431313200
    };

    var getRequest2 = function (data) {
        return "_smilessearchflightsresultportlet_WAR_smilesflightsportlet_JSONParameters=" + JSON.stringify({
                getAvailableRequest:
                {
                    routes:
                    [{
                        tripType: data.returnDate === null ? "ONE_WAY" : "ROUND_TRIP",
                        origin: data.origin,
                        destination: data.destination,
                        originAirport: data.origin,
                        destinationAirport: data.destination,
                        departureDay: getTime(data.departureDate),
                        returnDay: data.returnDate === null ? null : getTime(data.returnDate),
                        departureDayFinal: null,
                        returnDayFinal: null,
                        adults: '0'+ data.adults,
                        infants: data.babies,
                        children: data.children,
                        role: null,
                        currencyCode: "BRL"
                    }]
                }
        });
        
        //_smilessearchflightsresultportlet_WAR_smilesflightsportlet_JSONParameters={"getAvailableRequest":{"routes":[{"tripType":"ROUND_TRIP","origin":"RIO","destination":"GRU","originAirport":"RIO","destinationAirport":"GRU","departureDay":1430708400000,"returnDay":1431313200000,"departureDayFinal":null,"returnDayFinal":null,"adults":1,"infants":0,"children":0,"role":null,"currencyCode":"BRL"}]}}
    };

    var sendRequestPartners = function (data, successCallback, failCallback) {
        self.parent.sendRequest({
            data: data,
            method: "GET",
            url: getServiceUrlPartners(data),
            headers: {
                'Content-type': 'text/html;charset=UTF-8'
            },
            time: time,
            successCallback: successCallback,
            failCallback: failCallback,
            callback: function (responseText) {
                var parser = new DOMParser();
                var response = parser.parseFromString(responseText, "text/html");
                var requestData =  $("form", response).serialize() + '&btnStartAvailability=';

                sendRequestPartners2(data, successCallback, failCallback, requestData);
            }
        });
    };

    var getServiceUrlPartners = function (data) {
        var p = [];
        
        p.push("dep=" + data.origin);
        p.push("arr=" + data.destination);
        p.push("std=" + data.departureDate.split("/").join(""));
        
        if (data.returnDate !== null)
            p.push("returnstd=" + data.returnDate.split("/").join(""));
        
        p.push("paxCount=" + data.adults);
        p.push("CHDCount=" + data.children);
        p.push("InfantCount=" + data.babies);
        
        return PARTNERS_SERVICE_BASE_URL + "?" + p.join("&");
        
        //https://produtos.smiles.com.br/Congeneres/AvailableFlights.aspx?dep=GRU&arr=AMS&std=20151231&paxCount=1&CHDCount=0&InfantCount=0
    };

    var sendRequestPartners2 = function (data, successCallback, failCallback, requestData) {
        self.parent.sendRequest({
            data: data,
            url: getServiceUrlPartners(data),
            headers: {
                'Content-type': 'application/x-www-form-urlencoded'
            },
            withCredentials: true,
            successCallback: successCallback,
            failCallback: failCallback,
            callback: function (responseText) {
                var parser = new DOMParser();
                var response = parser.parseFromString(responseText, "text/html");

                mapAjaxResponsePartners(data, response, successCallback);
            },
            requestData: requestData
        });
    };
    
    var mapAjaxResponse = function (data, response, callback) {
        var info = self.parent.returnDefault();
        
        for(var i = 0; i < response.legs.length; i++) {
            var legFlights = response.legs[i].categoryFlights;
            
            var minPricesLeg = [0, 0, 0];
            for(var j = 0; j < legFlights.length; j++) {
                var flight = legFlights[j].flights[0];
                var airCompany = airlinesCompaniesByCode[flight.carrierCode];
                var price = flight.smilesCost[0].originalSmiles;
                
                if (flight.clubSmilesCost != null && flight.clubSmilesCost.length > 0)
                    price = flight.clubSmilesCost[0].originalSmiles;
                
                var stops = flight.stops === null ? 0 : parseInt(flight.stops);
                minPricesLeg[stops] = self.parent.getMinPrice(minPricesLeg[stops], price);
            }
            
            for(var k in [0, 1, 2])
                info.prices[k] += minPricesLeg[k];
        }
        
        var airline = "Gol";
        info.byCompany[airline] = [];
        for(var i in [0, 1, 2]) {
            info.byCompany[airline].push({ 
                price: info.prices[i],
                url: data.url,
                code: airlinesCompaniesById[airline] == undefined ? airline : airlinesCompaniesById[airline].code,
                bestPrice: 0
            });
        }
        
        callback(data, info);
    };
    
    var mapAjaxResponsePartners = function (data, response, callback) {
        var info = self.parent.returnDefault();
        
        //departure flights
        $('#tblOutboundFlights tr', response).each(function () {
            var flights = $(this).find('.resulttableFly .tStops');
            var miles = $(this).find('.resulttable');
            
            if (flights.size() == 0 || miles.size() == 0) return;
            var price = miles.text().trim().replace('.', '');
            //one tr is the header and the other is the flight '/2'
            //if there is one flight shown that is a non stop flight '-1'
            var layover = (flights.find("tr").size() / 2) - 1;
            
            //Usually the last flight is the most important one (the first is the regional flight) 
            var airline = flights.find("tr:last-child td:nth-child(2)").text().trim();
            
            //if it's a round trip, show departure and return airlines separated
            var departureAirline = data.returnDate === null ? airline : airline + ' - Ida';
            if (info.byCompany[departureAirline] == undefined) {
                info.byCompany[departureAirline] = [];

                for(var i in [0, 1, 2]) {
                    info.byCompany[departureAirline].push({ 
                        price: 0,
                        url: data.url,
                        code: airlinesCompaniesById[airline] == undefined ? airline : airlinesCompaniesById[airline].code,
                        bestPrice: 0
                    });
                }
            }
            
            info.byCompany[departureAirline][layover].price = self.parent.getMinPrice(info.byCompany[departureAirline][layover].price, price);
            info.prices[layover] = self.parent.getMinPrice(info.prices[layover], price);
        });
        
        var minPricesReturn = [0, 0, 0];
        //return flights
        $('#tblInboundFlights tr', response).each(function () {
            var flights = $(this).find('.resulttableFly .tStops');
            var miles = $(this).find('.resulttable');
            
            if (flights.size() == 0 || miles.size() == 0) return;
            var price = miles.text().trim().replace('.', '');
            //one tr is the header and the other is the flight '/2'
            //if there is one flight shown that is a non stop flight '-1'
            var layover = (flights.find("tr").size() / 2) - 1;

            //Usually the first flight is the most important one in a return flight 
            var airline = flights.find("tr:nth-child(2) td:nth-child(2)").text().trim();
            
            var returnAirline = airline + ' - Volta';
            if (info.byCompany[returnAirline] == undefined) {
                info.byCompany[returnAirline] = [];

                for(var i in [0, 1, 2]) {
                    info.byCompany[returnAirline].push({ 
                        price: 0,
                        url: data.url,
                        code: airlinesCompaniesById[airline] == undefined ? airline : airlinesCompaniesById[airline].code,
                        bestPrice: 0
                    });
                }
            }
            
            info.byCompany[returnAirline][layover].price = self.parent.getMinPrice(info.byCompany[returnAirline][layover].price, price);
            minPricesReturn[layover] = self.parent.getMinPrice(minPricesReturn[layover], price);
        });
        
        for(var i in [0, 1, 2])
            info.prices[i] += minPricesReturn[i];
        
        callback(data, info);
    };
    
    //dates must be in format yyyy/mm/dd -> output dates new Date().getTime()
    var getTime = function (dateStr, cutEnd) {
        if (dateStr == null || dateStr == undefined) return null;
        
        var s = dateStr.split('/');
        var date = new Date(s[0], parseInt(s[1]) - 1, s[2]);
        return date.getTime() / (cutEnd ? 1000 : 1); //remove 000 at the end
    };
    
    return self;
}

Smiles.prototype = new RequestManager('Smiles - Milhas Gol', 2000, 5);
Smiles.prototype.constructor = Smiles;
Smiles.prototype.parent = RequestManager.prototype;

var SMILES = new Smiles();