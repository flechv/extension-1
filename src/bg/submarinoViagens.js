//Request Manager for "Submarino Viagens"
function SubmarinoViagens() {
    var self = this;
    self.parent.push.call(self);

    const SERVICE_BASE_URL = "http://www.submarinoviagens.com.br/passagens/UIService/Service.svc/",
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
            headers: {
                'Content-type': 'application/json'
            },
            time: time,
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
                else if (response.Status == 1)
                    mapAjaxResponse(data, response, successCallback);

                else
                    throw "Error";
            },
            requestData: data.isPriority ? getPriorityRequestData(data) : getSecondaryRequestData(data)
        });
    };
    
    self.getUrl = function(data) {
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
        p.push("NumINF=" + data.babies);
        p.push("utm_source=" + APP_NAME);

        return PUBLIC_BASE_URL + "?" + p.join("&");
    };

//private methods
    var getServiceUrl = function (data) {
        return SERVICE_BASE_URL + (data.isPriority ? SEARCH_PRIORITY_URL : SEARCH_SECONDARY_URL)
    };
    
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
    };

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

    var mapAjaxResponse = function (data, response, callback) {
        var info = self.parent.returnDefault();
        var info.prices = response.AirFiltersData.NumberOfStops.map(function (a) { return a.MinPrice; });

        var companies = response.PriceMatrix.AirCompanies;
        for (var i in companies)
            info.byCompany[companies[i].AirCompany.trim()] = companies[i].Cells.map(function (ai) {
                return { price: ai.Price, url: data.url, code: companies[i].CiaCode, bestPrice: companies[i].BestPriceAirCompany };
            });

        callback(data, info);
    };

    return self;
}

SubmarinoViagens.prototype = new RequestManager('Submarino Viagens', 2000, 5);
SubmarinoViagens.prototype.constructor = SubmarinoViagens;
SubmarinoViagens.prototype.parent = RequestManager.prototype;

var SUBMARINO = new SubmarinoViagens();