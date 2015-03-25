/*
//Request Manager for "Submarino Viagens"
var SUBMARINO_MOBILE = (function () {
    var self = {};

    const SERVICE_BASE_URL = "http://m.submarinoviagens.com.br/b2wviagens/passagens";
    
//public methods
    self.sendRequest = function (data, successCallback, failCallback, time) {
        var xhr = new XMLHttpRequest();
        xhr.open("GET", SERVICE_BASE_URL + "?" getQueryString(data), true);
        xhr.setRequestHeader('Content-type', 'application/json');
        xhr.onreadystatechange = function() {
            if (xhr.readyState == 4 && xhr.status == 200) {
                try {
                    
                }
                catch(error) {
                    console.log(error);
                    failCallback(data);
                }
            }
        }

        try
        {
            xhr.send(data.searchId == undefined ? searchGroupedFlights(data) : getSearchStatus(data.searchId, data.pullStatusFrom));
        }
        catch(error) {
            console.log(error);
            failCallback(data);
        }
    }

//private methods
    var getQueryString = function (page) {
        var departureDate = page.departureDate.split('/');
        var returnDate = page.returnDate == null ? page.departureDate.split('/') : page.returnDate.split('/');
        var params = [
            "trip[adults]", "trip[children]", "trip[infants]", 
            "trip[departure_date_day]", "trip[departure_date_month]", "trip[departure_date_year]",
            "trip[return_date_day]", "trip[return_date_month]", "trip[return_date_year]",
            "trip[origin]", "trip[destination]", "trip[direct_flights_only]", "trip[trip_type]"
        ];
        var values = [
            page.adults, page.children, page.infants,
            departureDate[0], departureDate[1], departureDate[2],
            returnDate[0], returnDate[1], returnDate[2],
            page.origin, page.destination, "0", page.returnDate == null ? "OneWay" : "RoundTrip"
        ];

        return params.reduce(function(prev, param, i) {
            return prev + param + "=" + values[i] + "&";
        }, "");
    };

    var mapAjaxResponse = function (data, response, callback) {
        //console.log("mapAjaxResponse. tentativas:" + data.times.length / 2);
        console.log("tempo desde inicio:" + (data.times[0] - data.times[data.times.length - 2]) / 1000);
        console.log("tempos:" + data.times.join(", "));
        console.log(response);

        var info = { 
            prices: response.AirFiltersData.NumberOfStops.map(function (a) { return a.MinPrice; }),
            byCompany: {}
        };

        var companies = response.PriceMatrix.AirCompanies;
        for (var i in companies)
            info.byCompany[companies[i].AirCompany.trim()] = companies[i].Cells.map(function (ai) {
                return { price: ai.Price, url: data.url, code: companies[i].CiaCode, bestPrice: companies[i].BestPriceAirCompany };
            });

        callback(data, info);
    }

    return self;
}());
*/

//Request Manager for "Submarino Viagens"
var SUBMARINO = (function () {
    var self = {};

    const SERVICE_BASE_URL = "http://www.submarinoviagens.com.br/passagens/UIService/Service.svc/",
        SEARCH_PRIORITY_URL = "SearchGroupedFlightsPagingResultJSONMinimum",
        SEARCH_SECONDARY_URL = "GetSearchStatusPagingResultJSONMinimum",
        AFFILIATED_ID = 655,
        AFFILIATED_PW = 123456,
        POINT_OF_SALE = "SUBMARINO",
        GAP_TIME_SERVER = 2000,
        MAX_WAITING = 5;

//public methods
    self.getGapTimeServer = function () {
        return GAP_TIME_SERVER;
    };

    self.getMaxWaiting = function () {
        return MAX_WAITING;
    };

    self.sendRequest = function (data, successCallback, failCallback, time) {
        var xhr = new XMLHttpRequest();
        xhr.open("POST", SERVICE_BASE_URL + (data.isPriority ? SEARCH_PRIORITY_URL : SEARCH_SECONDARY_URL), true);
        xhr.setRequestHeader('Content-type', 'application/json');

        var dateInit = new Date();
        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4 && xhr.status === 200) {
                try {
                    var dateFinal = new Date();
                    data.times.splice(0, 0, time + (dateFinal - dateInit));
                    
                    var response = JSON.parse(xhr.responseText);
                    if (typeof response === "string")
                        response = deserializer(JSON.parse(response));

                    //over 5 attempts, give up
                    if (data.times.length > 10)
                        mapAjaxResponse(data, { PriceMatrix: { AirCompanies: [] }, AirFiltersData: { NumberOfStops: [] } }, successCallback);

                    else if (response.SearchId.replace(/-/g, '').replace(/0/g, '') === '')
                        throw "SearchId empty";
                    
                    else if (response.Status == 0 || response.PriceMatrix == null ||
                        response.AirFiltersData == null || response.AirFiltersData.NumberOfStops == null) {
                        
                        data.isPriority = false;
                        data.searchId = response.SearchId;
                        data.pullStatusFrom = response.PullStatusFrom;

                        throw "Not ready yet";
                    }
                    else if (response.Status == 1)
                        mapAjaxResponse(data, response, successCallback);

                    else
                        throw "Error";
                }
                catch(error) {
                    failCallback(data);
                }
            }
        };

        try
        {
            xhr.send(data.isPriority ? getPriorityRequestData(data) : getSecondaryRequestData(data));
        }
        catch(error) {
            failCallback(data);
        }
    };

//private methods
    //dates must be in format yyyy/mm/dd
    var getPriorityRequestData = function (data) {
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
                        NumberINFs: data.babies == undefined ?      0 : data.babies,    //0,
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
    }

    var getSecondaryRequestData = function (data) {
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
    }

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
    }

    var mapAjaxResponse = function (data, response, callback) {
        var info = { 
            prices: response.AirFiltersData.NumberOfStops.map(function (a) { return a.MinPrice; }),
            byCompany: {}
        };

        var companies = response.PriceMatrix.AirCompanies;
        for (var i in companies)
            info.byCompany[companies[i].AirCompany.trim()] = companies[i].Cells.map(function (ai) {
                return { price: ai.Price, url: data.url, code: companies[i].CiaCode, bestPrice: companies[i].BestPriceAirCompany };
            });

        callback(data, info);
    }

    return self;
}());