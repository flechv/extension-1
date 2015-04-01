//Request Manager for "Smiles"
function Smiles() {
    var self = this;
    self.parent.push.call(self);
    
    const SERVICE_BASE_URL = "https://www.smiles.com.br/c/portal/render_portlet",
          PUBLIC_BASE_URL = "https://www.smiles.com.br/passagens-com-milhas",
          PARTNERS_SERVICE_BASE_URL = "https://produtos.smiles.com.br/Congeneres/AvailableFlights.aspx";
    
//public methods
    self.sendRequest = function (data, successCallback, failCallback, time) {
        var xhr = new XMLHttpRequest();
        xhr.open("POST", getServiceUrl(data), true);
        xhr.setRequestHeader("Content-Type", "text/plain;charset=UTF-8");
        
        var dateInit = new Date();
        xhr.onload = function (e) {
            if (xhr.status === 200) {
                try {
                    var dateFinal = new Date();
                    data.times.splice(0, 0, time + (dateFinal - dateInit));
                    if (self.parent.checkGiveUp.call(self, data, successCallback)) return;

                    sendRequest2(data, successCallback, failCallback);
                }
                catch(error) {
                    if (self.parent.checkGiveUp.call(self, data, successCallback)) return;
                    failCallback(data);
                }
            }
            else {
                var dateFinal = new Date();
                data.times.splice(0, 0, time + (dateFinal - dateInit));
                if (self.parent.checkGiveUp.call(self, data, successCallback)) return;
                failCallback(data);
            }
        };

        try
        {
            xhr.send();
        }
        catch(error) {
            if (self.parent.checkGiveUp.call(self, data, successCallback)) return;
            failCallback(data);
        }
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
    
    var sendRequest2 = function (data, successCallback, failCallback, time) {
        var xhr = new XMLHttpRequest();
        xhr.open("POST", getServiceUrl2(data), true);
        xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
        
        xhr.onload = function (e) {
            if (xhr.status === 200) {
                try {
                    var response = JSON.parse(xhr.responseText);
                    if (response.hasCongenereFligts)
                        sendRequestPartners(data, successCallback, failCallback);
                    else
                        mapAjaxResponse(data, response, successCallback);
                }
                catch(error) {
                    failCallback(data);
                }
            }
            else {
                failCallback(data);
            }
        };

        try
        {
            xhr.send(getRequest2(data));
        }
        catch(error) {
            failCallback(data);
        }
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

    var sendRequestPartners = function (data, successCallback, failCallback, time) {
        var xhr = new XMLHttpRequest();
        xhr.open("GET", getServiceUrlPartners(data), true);
        
        xhr.onload = function (e) {
            if (xhr.status === 200) {
                try {
                    var parser = new DOMParser();
                    var response = parser.parseFromString(xhr.responseText, "text/html");

                    sendRequestPartners2(data, successCallback, failCallback, time, $("form", response).serialize());
                }
                catch(error) {
                    failCallback(data);
                }
            }
            else {
                failCallback(data);
            }
        };

        try
        {
            xhr.send();
        }
        catch(error) {
            failCallback(data);
        }
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

    var sendRequestPartners2 = function (data, successCallback, failCallback, time, requestData) {
        var xhr = new XMLHttpRequest();
        xhr.open("POST", getServiceUrlPartners(data), true);
        xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
        xhr.withCredentials = true;
        
        xhr.onload = function (e) {
            if (xhr.status === 200) {
                try {
                    var parser = new DOMParser();
                    var response = parser.parseFromString(xhr.responseText, "text/html");
                    
                    mapAjaxResponsePartners(data, response, successCallback);
                }
                catch(error) {
                    failCallback(data);
                }
            }
            else {
                failCallback(data);
            }
        };

        try
        {
            xhr.send(requestData);
        }
        catch(error) {
            failCallback(data);
        }
    };
    
    var mapAjaxResponse = function (data, response, callback) {
        var info = {
            prices: [0, 0, 0],
            byCompany: {}
        };

        for(var i = 0; i < response.legs.length; i++) {
            var legFlights = response.legs[i].categoryFlights;
            
            for(var j = 0; j < legFlights.length; j++) {
                var flight = legFlights[j].flights[0];
                var airCompany = airlinesCompaniesByCode[flight.carrierCode];
                var price = flight.smilesCost[0].originalSmiles;
                
                if (flight.clubSmilesCost != null && flight.clubSmilesCost.length > 0)
                    price = flight.clubSmilesCost[0].originalSmiles;
                
                var stops = flight.stops === null ? 0 : parseInt(flight.stops);
                
                info.prices[stops] = getMinPrice(info.prices[stops], price);
            }
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
        var info = {
            prices: [0, 0, 0],
            byCompany: {}
        };

        //departure flights
        $('#tblOutboundFlights tr', response).each(function () {
            var flights = $(this).find('.resulttableFly .tStops');
            var milesTd = $(this).find('.resulttable');
            
            if (fly.size() == 0 || miles.size() == 0) return;
            var price = milesTd.text().trim();
            //one tr is the header and each other tr is a flight
            //if there is one flight shown that is a non stop flight
            var layover = flights.find("tr").size() - 2;
            
            //Usually the last flight is the most important one (the first is the regional flight) 
            var airline = flights.find("tr:last-child td:nth-child(2)").text().trim();
            
            if (info.byCompany[airline] == undefined) {
                info.byCompany[airline] = [];

                for(var i in [0, 1, 2]) {
                    info.byCompany[airline].push({ 
                        price: 0,
                        url: data.url,
                        code: airlinesCompaniesById[airline] == undefined ? airline : airlinesCompaniesById[airline].code,
                        bestPrice: 0
                    });
                }
            }
        });
        
        //return flights
        $('#tblInboundFlights tr', response).each(function () {
            var flights = $(this).find('.resulttableFly .tStops');
            var milesTd = $(this).find('.resulttable');
            
            if (fly.size() == 0 || miles.size() == 0) return;
            var price = milesTd.text().trim();
            //one tr is the header and each other tr is a flight
            //if there is one flight shown that is a non stop flight
            var layover = flights.find("tr").size() - 2;
            
            //Usually the last flight is the most important one (the first is the regional flight) 
            var airline = flights.find("tr:last-child td:nth-child(2)").text().trim();
        
            if (info.byCompany[airline] == undefined) {
                info.byCompany[airline] = [];

                for(var i in [0, 1, 2]) {
                    info.byCompany[airline].push({ 
                        price: 0,
                        url: data.url,
                        code: airlinesCompaniesById[airline] == undefined ? airline : airlinesCompaniesById[airline].code,
                        bestPrice: 0
                    });
                }
            }
        });

        for(var i in layovers) {
            info.byCompany[airline][layovers[i]].price = getMinPrice(info.byCompany[airline][layovers[i]].price, price);
            info.prices[layovers[i]] = getMinPrice(info.prices[layovers[i]], price);
        }
        
        callback(data, info);
    };
    
    var getMinPrice = function (previousPrice, price) {
        return previousPrice == 0 || price == 0 ? Math.max(previousPrice, price) : Math.min(previousPrice, price);
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