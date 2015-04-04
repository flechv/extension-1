//Request Manager for "Submarino Viagens"
function SubmarinoViagens() {
    var self = this;
    self.parent.push.call(self);

    const SERVICE_MOBILE_URL = "http://m.submarinoviagens.com.br/flights/search?page=1&limit=50",
        SERVICE_BASE_URL = "http://www.submarinoviagens.com.br/passagens/UIService/Service.svc/",
        PUBLIC_BASE_URL = "http://www.submarinoviagens.com.br/passagens/selecionarvoo",
        SEARCH_PRIORITY_URL = "SearchGroupedFlightsPagingResultJSONMinimum",
        SEARCH_SECONDARY_URL = "GetSearchStatusPagingResultJSONMinimum",
        AFFILIATED_ID = 655,
        AFFILIATED_PW = 123456,
        POINT_OF_SALE = "SUBMARINO";

//public methods
    self.sendRequest = function (data, successCallback, failCallback, time) {
        self.parent.sendRequest({
            data: data,
            url: getServiceUrl(data),
            withCredentials: true,
            headers: {
                'Content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'userAgent': navigator.userAgent,
                'X-Requested-With': 'XMLHttpRequest'
            },
            time: time,
            successCallback: successCallback,
            failCallback: function () {
                sendRequestBackup(data, successCallback, failCallback);
            },
            callback: function (responseText) {
                var response = JSON.parse(responseText);
                var info = mapAjaxResponse(data, response);
                
                successCallback(data, info);
            },
            formData: getFormData(data)
        });
    };
    
    self.getUrl = function (data) {
        var p = [];
        
        p.push("SomenteIda=" + (data.returnDate === null));
        p.push("Origem=" + data.origin);
        p.push("Destino=" + data.destination);
        p.push("Data=" + data.departureDate.split('/').reverse().join('/'));
        
        if (data.returnDate !== null) {
            p.push("Origem=" + data.destination);
            p.push("Destino=" + data.origin);
            p.push("Data=" + data.returnDate.split('/').reverse().join('/'));
        }
        
        p.push("NumADT=" + data.adults);
        p.push("NumCHD=" + data.children);
        p.push("NumINF=" + data.infants);
        p.push("utm_source=" + APP_NAME);

        return PUBLIC_BASE_URL + "?" + p.join("&");
    };

//private methods
    var getServiceUrl = function (data) {
        return SERVICE_MOBILE_URL;
    };
    
    var getFormData = function (data) {
        var p = [];

        var departureDate = data.departureDate.parseToDate();
        p.push('origin[city]=' + (airportsById[data.origin] ? airportsById[data.origin].text : data.origin));
        p.push('origin[departure][year]=' + departureDate.getFullYear());
        p.push('origin[departure][month]=' + (departureDate.getMonth() + 1));
        p.push('origin[departure][day]='+ departureDate.getDate());

        var returnDate = (data.returnDate || data.departureDate).parseToDate();
        p.push('destination[city]=' + (airportsById[data.destination] ? airportsById[data.destination].text : data.destination));
        p.push('destination[departure][year]=' + returnDate.getFullYear());
        p.push('destination[departure][month]=' + (returnDate.getMonth() + 1));
        p.push('destination[departure][day]=' + returnDate.getDate());

        p.push('passengers[adults]=' + data.adults);
        p.push('passengers[children]=' + data.children);
        p.push('passengers[infants]='+ data.infants);
        p.push('nonstop=false');
        p.push('oneway=' + (data.returnDate === null));

        return encodeURI(p.join('&'));
        //origin%5Bcity%5D=Rio+De+Janeiro+%2F+RJ%2C+Brasil%2C+Todos+os+Aeroportos+(RIO)&origin%5Bdeparture%5D%5Byear%5D=2015&origin%5Bdeparture%5D%5Bmonth%5D=6&origin%5Bdeparture%5D%5Bday%5D=26&destination%5Bcity%5D=Fortaleza+%2F+CE%2C+Brasil%2C+Pinto+Martins+(FOR)&destination%5Bdeparture%5D%5Byear%5D=2015&destination%5Bdeparture%5D%5Bmonth%5D=6&destination%5Bdeparture%5D%5Bday%5D=28&passengers%5Badults%5D=1&passengers%5Bchildren%5D=0&passengers%5Binfants%5D=0&nonstop=false&oneway=false
    }; 
    
    var mapAjaxResponse = function (data, response) {
        var info = self.parent.returnDefault();
        
        for(var i in response.filters.stops) {
            var stops = Math.min(response.filters.stops[i].number, 2);
            info.prices[stops] = self.parent.getMinPrice(info.prices[stops], response.filters.stops[i].minPrice)
        }
        
        var companies = {};
        for (var i in response.price_groups) {
            var price_group = response.price_groups[i];
            var price = price_group.price;
            
            var departures = {};
            for(var j in price_group.departing_flights.flights) {
                var airline = price_group.departing_flights.flights[j].airline.name;
                if (departures[airline] == undefined)
                    departures[airline] = { 0: false, 1: false, 2: false };
                
                var stops = Math.min(price_group.departing_flights.flights[j].stops, 2);
                departures[airline][stops] = true;
            }
            
            var returns = {};
            for(var j in price_group.returning_flights.flights) {
                var airline = price_group.returning_flights.flights[j].airline.name;
                if (returns[airline] == undefined)
                    returns[airline] = { 0: false, 1: false, 2: false };
                
                var stops = Math.min(price_group.returning_flights.flights[j].stops, 2);
                returns[airline][stops] = true;
            }
            
            for(var j in departures) {
                if (returns[j] == undefined) continue;
                
                var stops = [];
                if (departures[j][0] && returns[j][0])
                    stops.push(0); //non stop flight
                
                if ((departures[j][0] && returns[j][1]) ||
                    (departures[j][1] && (returns[j][0] || returns[j][1])))
                    stops.push(1); //1 stop flight
                
                if (departures[j][2] || returns[j][2])
                    stops.push(2); //2 stop flight
                
                if (info.byCompany[j] == undefined) {
                    info.byCompany[j] = [];

                    for(var k in [0, 1, 2]) {
                        info.byCompany[j].push({ 
                            price: 0,
                            url: data.url,
                            code: airlinesCompaniesById[j] == undefined ? j : airlinesCompaniesById[j].code,
                            bestPrice: 0
                        });
                    }
                }
                
                for(var k in stops)
                    info.byCompany[j][stops[k]].price = self.parent.getMinPrice(info.byCompany[j][stops[k]].price, price);
            }
        }

        return info;
    };

//backup methods (desktop site)
    var sendRequestBackup = function (data, successCallback, failCallback) {
        self.parent.sendRequest({
            data: data,
            url: getServiceUrlBackup(data),
            headers: {
                'Content-type': 'application/json'
            },
            successCallback: successCallback,
            failCallback: failCallback,
            callback: function (responseText) {
                var response = JSON.parse(responseText);
                if (typeof response === "string")
                    response = deserializer(JSON.parse(response));

                if (response.SearchId.replace(/-/g, '').replace(/0/g, '') === '')
                    throw "SearchId empty";

                else if (response.Status == 0 || response.PriceMatrix == null ||
                    response.AirFiltersData == null || response.AirFiltersData.NumberOfStops == null) {

                    data.isPriority = false;
                    data.searchId = response.SearchId;
                    data.pullStatusFrom = response.PullStatusFrom;

                    throw "Not ready yet";
                }
                else if (response.Status == 1) {
                    var info = mapAjaxResponseBackup(data, response);
                    successCallback(data, info);
                }
                else
                    throw "Error";
            },
            formData: data.isPriority ? getPriorityFormDataBackup(data) : getSecondaryFormDataBackup(data)
        });
    };
    
    var getServiceUrlBackup = function (data) {
        return SERVICE_BASE_URL + (data.isPriority ? SEARCH_PRIORITY_URL : SEARCH_SECONDARY_URL)
    };
    
    //dates must be in format yyyy/mm/dd
    var getPriorityFormDataBackup = function (data) {
        var companies = data.companies === undefined ? [] : data.companies.map(function (a) { return a.code; });

        return JSON.stringify({
            filter: null,
            fim: 10,
            inicio: 0,
            req: {
                AffiliatedId: AFFILIATED_ID,
                PointOfSale: POINT_OF_SALE,
                SearchData: {
                    AffiliatedId: AFFILIATED_ID,
                    AffiliatedPw: AFFILIATED_PW,
                    IsSearch: true,
                    AirSearchData: {
                        CabinFilter: null,
                        CityPairsRequest: data.returnDate === null ? 
                            [{
                                CiaCodeList:        companies,
                                NonStop:            false,
                                Origin:             data.origin,                        //"SAO",
                                Destination:        data.destination,                   //"ORL",
                                DepartureYear:      data.departureDate.split("/")[0],   //"2014",
                                DepartureMonth:     data.departureDate.split("/")[1],   //"01",
                                DepartureDay:       data.departureDate.split("/")[2]    //"24"
                            }] :
                            [{
                                CiaCodeList:        companies,
                                NonStop:            false,
                                Origin:             data.origin,                        //"SAO",
                                Destination:        data.destination,                   //"ORL",
                                DepartureYear:      data.departureDate.split("/")[0],   //"2014",
                                DepartureMonth:     data.departureDate.split("/")[1],   //"01",
                                DepartureDay:       data.departureDate.split("/")[2]    //"24"
                            },
                            {
                                CiaCodeList:        companies,
                                NonStop:            false,
                                Origin:             data.destination,                   //"ORL",
                                Destination:        data.origin,                        //"SAO",
                                DepartureYear:      data.returnDate.split("/")[0],      //"2014",
                                DepartureMonth:     data.returnDate.split("/")[1],      //"02",
                                DepartureDay:       data.returnDate.split("/")[2]       //"12"
                            }],
                        NumberADTs: data.adults == undefined ?      1 : data.adults,    //1,
                        NumberCHDs: data.children == undefined ?    0 : data.children,  //0,
                        NumberINFs: data.infants == undefined ?     0 : data.infants,   //0,
                        SearchType: 1
                    },
                    AttractionSearchData: null,
                    HotelSearchData: null,
                    OptimizedSearch: true,
                    SearchMode: 1 //0 for synchronous and 1 for asynchronous
                },
                SlotId: "",
                UserBrowser: navigator.userAgent,
                UserSessionId: "",
                identifier: null
            }
        });
    };

    var getSecondaryFormDataBackup = function (data) {
        return JSON.stringify({
            filter: null,
            inicio: 0,
            fim: 10,
            req: {
                SearchId: data.searchId, //"d198dca6-de05-4b36-b134-f592a610b599",
                PointOfSale: POINT_OF_SALE,
                UserSessionId: "",
                AffiliatedId: AFFILIATED_ID,
                UserBrowser: navigator.userAgent
            },
            pullStatusFrom: data.pullStatusFrom //"http://travelengine24.b2w/TravelEngineWS.svc"
        });
    };

    var mapAjaxResponseBackup = function (data, response) {
        var info = self.parent.returnDefault();
        info.prices = response.AirFiltersData.NumberOfStops.map(function (a) { return a.MinPrice; });

        var companies = response.PriceMatrix.AirCompanies;
        for (var i in companies) {
            info.byCompany[companies[i].AirCompany.trim()] = companies[i].Cells.map(function (ai) {
                return {
                    price: ai.Price,
                    url: data.url,
                    code: companies[i].CiaCode,
                    bestPrice: companies[i].BestPriceAirCompany
                };
            });
        }
        
        return info;
    };

    var deserializer = function (n) {
        var isArray = Object.prototype.toString.call(n) === '[object Array]';
        if (isArray && n.length == 2) {
            var t = function(n, i, r) {
                var f, e, u;
                if (!i || n == undefined)
                    return n;
                if (f = i.d || i.e ? [] : {}, e = r[i.i], i.d)
                    for (u = 0; u < n.length; u += 2)
                        f.push({Key: n[u],Value: t(n[u + 1], e, r)});
                else if (i.e)
                    for (u = 0; u < n.length; u++)
                        f.push(t(n[u], e, r));
                else
                    for (u = 0; u < i.p.length; u++)
                        f[i.p[u].n] = t(n[u], r[i.p[u].i], r);
                return f
            };
            return t(n[1], n[0][0], n[0])
        }
        return n
    };
    
    return self;
}

SubmarinoViagens.prototype = new RequestManager('Submarino Viagens', 2000, 5);
SubmarinoViagens.prototype.constructor = SubmarinoViagens;
SubmarinoViagens.prototype.parent = RequestManager.prototype;

var SUBMARINO = new SubmarinoViagens();