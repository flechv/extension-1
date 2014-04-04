//Store Manager
var SM = (function () {
    var my = {};

    my.get = function (key) {
        return localStorage.getItem(key);
    }
    my.put = function (key, value) {
        return localStorage.setItem(key, value);
    }
    my.delete = function (key) {
        return localStorage.removeItem(key);
    }
    my.clear = function () {
        return localStorage.clear();
    }

    return my;
}());

//Request Manager for "Submarino Viagens"
var RM = (function () {
    var my = {};

    const SERVICE_BASE_URL = "http://www.submarinoviagens.com.br/passagens/UIService/Service.svc/",
        SEARCH_FLIGHT_URL = "SearchGroupedFlightsJSONMinimum",
        SEARCH_STATUS_URL = "GetSearchStatusJSONMinimum",
        AFFILIATED_ID = 616,
        POINT_OF_SALE = "SUBMARINO";

    var searchGroupedFlights = function (data) {
        var companies = data.companies == undefined ? [] : data.companies.map(function (a) {
            return airlinesCompanies.filter(function (ai) { return ai.id == a })[0].code;
        });

        return JSON.stringify({
            req: {
                PointOfSale: POINT_OF_SALE,
                SearchData: {
                    SearchMode: 1,
                    AirSearchData: {
                        CityPairsRequest: data.returnDate == null ? 
                            [{
                                CiaCodeList:        companies,
                                NonStop:            false,
                                Origin:             data.origin,                        //"SAO",
                                Destination:        data.destination,                   //"ORL",
                                DepartureYear:      data.departureDate.split("/")[2],   //"2014",
                                DepartureMonth:     data.departureDate.split("/")[1],   //"01",
                                DepartureDay:       data.departureDate.split("/")[0]    //"24"
                            }] :
                            [{
                                CiaCodeList:        companies,
                                NonStop:            false,
                                Origin:             data.origin,                        //"SAO",
                                Destination:        data.destination,                   //"ORL",
                                DepartureYear:      data.departureDate.split("/")[2],   //"2014",
                                DepartureMonth:     data.departureDate.split("/")[1],   //"01",
                                DepartureDay:       data.departureDate.split("/")[0]    //"24"
                            },
                            {
                                CiaCodeList:        companies,
                                NonStop:            false,
                                Origin:             data.destination,                   //"ORL",
                                Destination:        data.origin,                        //"SAO",
                                DepartureYear:      data.returnDate.split("/")[2],      //"2014",
                                DepartureMonth:     data.returnDate.split("/")[1],      //"02",
                                DepartureDay:       data.returnDate.split("/")[0]       //"12"
                            }],
                        NumberADTs: data.adults == undefined ?      1 : data.adults,    //1,
                        NumberCHDs: data.children == undefined ?    0 : data.children,  //0,
                        NumberINFs: data.babies == undefined ?      0 : data.babies,    //0,
                        SearchType: 1,
                        //CabinFilter: null
                    },
                    //HotelSearchData: null,
                    //AttractionSearchData: null,
                    OptimizedSearch: true
                },
                UserSessionId: "",
                AffiliatedId: AFFILIATED_ID,
                UserBrowser: navigator.userAgent
            }
        });
    }

    var getSearchStatus = function (searchId, pullStatusFrom) {
        return JSON.stringify({
            req: {
                SearchId: searchId, //"d198dca6-de05-4b36-b134-f592a610b599",
                PointOfSale: POINT_OF_SALE,
                UserSessionId: "",
                AffiliatedId: AFFILIATED_ID,
                UserBrowser: navigator.userAgent
            },
            pullStatusFrom: pullStatusFrom //"http://travelengine24.b2w/TravelEngineWS.svc"
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
        console.log("mapAjaxResponse. tentativas:" + data.times.length / 2);
        console.log("tempo desde inicio:" + (data.times[data.times.length - 1] - data.times[1]) / 1000);

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

//public methods
    my.sendRequest = function (data, successCallback, failCallback) {
        //console.log("sendRequest");
        
        var xhr = new XMLHttpRequest();
        xhr.open("POST", SERVICE_BASE_URL + (data.searchId == undefined ? SEARCH_FLIGHT_URL : SEARCH_STATUS_URL), true);
        xhr.setRequestHeader('Content-type', 'application/json');
        xhr.onreadystatechange = function() {
            if (xhr.readyState == 4) {
                var response = JSON.parse(xhr.responseText);
                if (typeof response == "string")
                    response = deserializer(JSON.parse(response));
                
                if (response.SearchId.replace(/-/g, '').replace(/0/g, '') == '') {
                    console.log("Processing Error");
                    failCallback(data);
                }
                else if (response.Status == 0 || response.PriceMatrix == null) {
                    data.SearchId = response.SearchId;
                    data.PullStatusFrom = response.PullStatusFrom;
                    console.log("Status = 0 " + data.departureDate + " - " + data.returnDate + " " + data.SearchId);

                    failCallback(data);
                }
                else if (response.Status == 1 && successCallback != undefined && typeof successCallback == "function")
                    mapAjaxResponse(data, response, successCallback);
                
                else console.log("Error Status");
            }
        }
        xhr.send(data.searchId == undefined ? searchGroupedFlights(data) : getSearchStatus(data.searchId, data.pullStatusFrom));
    }

//return object
    return my;
}());

//Priority Queue
var PQ = (function (RM) {
    var my = {};

    const GAP_TIME_SERVER = 150,
        MAX_WAITING = 9;
    
    var list = new Array(),
        time,
        callback;

    var estimatedTimeToBeReady = function (data) {
        return data.times[0] + (data.returnDate == null ? 1500 : 2000);
    }

    var receiveData = function (data) {
        data.times.splice(0, 0, estimatedTimeToBeReady(data));
        my.queue(data);
    }

    var increaseWainting = function () {
        SM.put("waiting", parseInt(SM.get("waiting")) + 1);
    };

    var router = function () {
        //console.log("router");

        var page = list[0];
        if (page == undefined) {
            if (parseInt(SM.get("waiting")) == 0)
                return false; //stops the 'server'
        }
        else if (page.times[0] <= time && page.SearchId == undefined && parseInt(SM.get("waiting")) <= MAX_WAITING) {
            page = list.shift();
            page.times.splice(0, 0, time);
            increaseWainting();
            RM.sendRequest(page, callback, receiveData);
        }
        else
            for (var i = 0; i < list.length; i++)
                if (list[i].times[0] <= time && list[i].SearchId != undefined) {
                    page = list.splice(i, 1)[0]; //remove the item
                    page.times.splice(0, 0, time);
                    console.log("sending waiting");
                    RM.sendRequest(page, callback, receiveData);
                    break
                }

        time += GAP_TIME_SERVER;
        setTimeout(router, GAP_TIME_SERVER);
    };
//public methods
    my.initServer = function (request, backgroundCallback) {
        callback = backgroundCallback;

        SM.clear();
        SM.put("request", JSON.stringify(request));
        SM.put("pages", JSON.stringify(list));
        SM.put("waiting", 0);

        time = 0;
        router();
    };

    my.decreaseWainting = function () {        
        SM.put("waiting", parseInt(SM.get("waiting")) - 1);
    }

    my.queue = function (item) {
        list.push(item);
        list.sort(function (a, b) { return a.times[0] - b.times[0]; });
    }

    return my;
}(RM));

var BG = (function (SM, PQ) {
    var my = {};

    const APP_NAME = "genghis";
    const SITE_TO_SEARCH = "submarinoviagens";
    const GAP_TIME = 200;

    //date must be in format dd/mm/yyyy
    var addDaystoDate = function (strDate, days) {
        var dateParts = strDate.split("/");
        var dateObj = new Date(dateParts[2], (dateParts[1] - 1), dateParts[0]);
        dateObj.setTime(dateObj.getTime() + days * 86400000);

        var dd = ("0" + dateObj.getDate()).slice(-2);
        var mm = ("0" + (dateObj.getMonth() + 1)).slice(-2);
        var yyyy = dateObj.getFullYear();
        
        return dd + '/'+ mm + '/'+ yyyy;
    }

    var getUrl = function (origin, destination, departureDate, returnDate, adults, children, babies) {
        switch(SITE_TO_SEARCH) {
            case "decolar":
                return returnDate == null ?
                    "http://www.decolar.com/shop/flights/results/oneway/" + origin + "/" + destination + "/" + 
                    departureDate.split('/').reverse().join('-') + "/" + adults + "/" + children + "/" + babies :
                
                    "http://www.decolar.com/shop/flights/results/roundtrip/"  + origin + "/" + destination + "/" +
                    departureDate.split('/').reverse().join('-') + "/" + returnDate.split('/').reverse().join('-') + "/" + 
                    adults + "/" + children + "/" + babies;

            case "submarinoviagens": default:
                return returnDate == null ?
                    "http://www.submarinoviagens.com.br/Passagens/selecionarvoo?SomenteIda=true" +
                    "&Origem=" + origin + "&Destino=" + destination + "&Data=" + departureDate +
                    "&NumADT=" + adults + "&NumCHD=" + children + "&NumINF=" + babies + "&utm_source=" + APP_NAME :
                    
                    "http://www.submarinoviagens.com.br/Passagens/selecionarvoo?SomenteIda=false" +
                    "&Origem=" + origin + "&Destino=" + destination + "&Data=" + departureDate + 
                    "&Origem=" + destination + "&Destino=" + origin + "&Data=" + returnDate + 
                    "&NumADT=" + adults + "&NumCHD=" + children + "&NumINF=" + babies + "&utm_source=" + APP_NAME;            
        }
        
        return undefined;
    }

    var getMinimumFloat = function (p1, p2) {
        var f1 = isNaN(parseFloat(p1)) || p1 == 0 ? Number.MAX_VALUE : parseFloat(p1);
        var f2 = isNaN(parseFloat(p2)) || p2 == 0 ? Number.MAX_VALUE : parseFloat(p2);
        return Math.min(f1, f2);
    }

    var updateBadge = function () {
        chrome.browserAction.setBadgeBackgroundColor({"color": [220, 0, 0, 255]});
        chrome.browserAction.setBadgeText({ "text": SM.get("receivedPages") });
    }

    var getIndexResultForKey = function (results, key) {
        //console.log("getIndexResultForKey");

        for (var i = results.length - 1; i >= 0; i--)
            if (results[i].key == key)
                return i;

        return undefined;
    }

    //save to SM prices received from page (origin, destination, url, dates) and info (prices)
    var savePricesReceived = function (page, info) {
        //console.log("savePricesReceived");
        
        var results = my.getResultsList(), key = my.getKey(page), date = my.getDateFormatted(page), url = page.url;
        var index = getIndexResultForKey(results, key);
        
        if (index == undefined)
            results.push({
                key: key,
                best: info.prices.map(function (price) {
                    return { date: date, price: price, url: url };
                }),
                bestByCompany: info.byCompany,
                all: [{ date: date, prices: info.prices, url: url }]
            });

        else {
            var result = results[index];
            result.best = info.prices.map(function (price, i) {
                return price == getMinimumFloat(price, result.best[i].price) ?
                    { date: date, price: price, url: url } : 
                    result.best[i];
            });

            for (var i in info.byCompany) {
                if (result.bestByCompany[i] == undefined)
                    result.bestByCompany[i] = info.byCompany[i];

                else {                        
                    for (var j in info.byCompany[i]) {
                        if (info.byCompany[i][j].bestPrice == getMinimumFloat(info.byCompany[i][j].bestPrice, result.bestByCompany[i][j].bestPrice))
                            result.bestByCompany[i][j].bestPrice = info.byCompany[i][j].bestPrice;

                        if (info.byCompany[i][j].price == getMinimumFloat(info.byCompany[i][j].price, result.bestByCompany[i][j].price)) {                            
                            result.bestByCompany[i][j].price = info.byCompany[i][j].price;
                            result.bestByCompany[i][j].url = info.byCompany[i][j].url;
                        }
                    }
                }
            }

            result.all.push({ date: date, prices: info.prices, url: url });
            result.all.sort(function (a, b) {
                var minA = getMinimumFloat(getMinimumFloat(a.prices[0], a.prices[1]), a.prices[2]);
                var minB = getMinimumFloat(getMinimumFloat(b.prices[0], b.prices[1]), b.prices[2]);
                return minA - minB;
            });

            results[index] = result;
        }

        SM.put("resultsList", JSON.stringify(results));
        SM.put("receivedPages", !SM.get("receivedPages") ? 1 : parseInt(SM.get("receivedPages")) + 1);
    }


    var filterInfoWithValidCompanies = function (page, response) {
        //console.log("filterInfoWithValidCompanies");
        
        var companies = page.companies;
        if (companies == undefined || companies == null || companies.length == 0)
            return response;

        var info = { prices: [], byCompany: {} };
        for (var i in companies) {
            if (response.byCompany[companies[i]] == undefined)
                continue;

            info.prices = response.byCompany[companies[i]].map(function (company, j) { return getMinimumFloat(company.price, info.prices[j]); });
            info.byCompany[companies[i]] = response.byCompany[companies[i]];
        }

        for (var i in info.prices)
            if (info.prices[i] == Number.MAX_VALUE)
                info.prices[i] = null;

        return info;
    }

    var getResponse = function (page, response) {
        //console.log("getResponse");
        
        PQ.decreaseWainting();

        var info = filterInfoWithValidCompanies(page, response);
        savePricesReceived(page, info);

        var popup = chrome.extension.getViews({ type: 'popup' })[0];
        if (popup != undefined) {
            my.hideBadge();
            popup.addPricesReceived(page, info);
            
            if (my.IsOver())
                popup.finalLoading();
        }
        else
            updateBadge();
    }

//public methods
    my.hideBadge = function () {
        chrome.browserAction.setBadgeText({ "text": "" });
    }

    my.getResultsList = function () {
        return !SM.get("resultsList") ? [] : JSON.parse(SM.get("resultsList"));
    }

    my.getKey = function (page) {
        return page.origin + "-" + page.destination;
    }

    my.getDateFormatted = function (page) {
        return page.departureDate + (page.returnDate == null ? "" : (" - " + page.returnDate));
    }

    my.getPages = function () {
        return !SM.get("pages") ? [] : JSON.parse(SM.get("pages"));
    }

    my.getRequest = function () {
        return !SM.get("request") ? {} : JSON.parse(SM.get("request"));
    }

    my.IsOver = function () {
		if (JSON.parse(SM.get("pages")) == null)
			return true;
			
        return parseInt(SM.get("receivedPages")) >= JSON.parse(SM.get("pages")).length;
    }

    my.init = function (req) {
       //console.log("init");
        
        var time = 0;
        for (var i in req.origins)
            for (var j in req.destinations) {
                if (req.origins[i] == req.destinations[j]) continue;
                
                for (var k in req.departureDates)
                    for (var w in req.qtyDays) {
                        //one way trip
                        if (req.qtyDays[w] == 0)
                            PQ.queue({
                                url: getUrl(req.origins[i], req.destinations[j], req.departureDates[k], null, req.adults, req.children, req.babies),
                                origin: req.origins[i],
                                destination: req.destinations[j],
                                departureDate: req.departureDates[k],
                                returnDate: null,
                                companies: req.companies,
                                adults: req.adults,
                                children: req.children,
                                babies: req.babies,
                                times: [time]
                            });

                        else {
                            var returnDate = addDaystoDate(req.departureDates[k], req.qtyDays[w]);
                            PQ.queue({
                                url: getUrl(req.origins[i], req.destinations[j], req.departureDates[k], returnDate, req.adults, req.children, req.babies),
                                origin: req.origins[i],
                                destination: req.destinations[j],
                                departureDate: req.departureDates[k],
                                returnDate: returnDate,
                                companies: req.companies,
                                adults: req.adults,
                                children: req.children,
                                babies: req.babies,
                                times: [time]
                            });
                        }

                        time += GAP_TIME;
                    }
            }

        PQ.initServer(req, getResponse);
    }

    return my;
}(SM, PQ));