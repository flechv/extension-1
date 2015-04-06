//Request Manager for "ITA Software"
function Ita() {
    var self = this;
    self.parent.push.call(self);

    const SERVICE_URL = "http://matrix.itasoftware.com/search",
        CACHE_TIMEOUT_HOURS = 1,
        MAX_DIFF_DAYS_ALLOW_BY_SERVICE = 31,
        MAX_DIFF_LAYOVER_ALLOW_BY_SERVICE = 7;
    
    var cache = {}, companyCache = {}, cacheTime = new Date(), receivedStops = 0;

//public methods
    self.sendRequest = function (data, successCallback, failCallback) {
        var now = new Date();
        now.setHours(now.getHours() - CACHE_TIMEOUT_HOURS);
        if (now <= cacheTime && cache[getDataKey(data)] !== undefined) {            
            mapAjaxResponse(data, successCallback);
            return;
        }

        //restart properties
        cache = {};
        companyCache = {};
        receivedStops = 0;

        doRequest(data, successCallback, failCallback);
    };
    
    //same as submarino viagens since Ita software doesn't sell flights
    self.getUrl = function (data) {
        SUBMARINO.getUrl(data);
    };

//private methods
    var doRequest = function (data, successCallback, failCallback, stop) {
        self.parent.sendRequest({
            data: data,
            url: SERVICE_URL,
            headers: {
                'Content-type': 'application/javascript; charset=UTF-8',
                'X-Requested-With': 'XMLHttpRequest',
                'X-GWT-Module-Base': 'http://matrix.itasoftware.com/gwt/',
                'X-GWT-Permutation': 'B5513158EEAFFE2FEBD482C2895FDA7B'
            },
            withCredentials: true,
            time: time,
            successCallback: successCallback,
            failCallback: failCallback,
            callback: function (responseText) {
                var response = eval("(" + responseText + ")");

                if (response.error !== undefined)
                    throw response.error.message !== undefined ? response.error.message : "unknown error";

                if (stop === undefined) {
                    data.solutionSet = response.result[response.result.length - 3]; //response.result.solutionSet;
                    data.session = response.result[response.result.length - 1]; //response.result.session;

                    doRequest(data, successCallback, failCallback, 0);
                    doRequest(data, successCallback, failCallback, 1);
                    doRequest(data, successCallback, failCallback, 2);
                }
                else {
                    updateCache(data, response.result, stop);
                    receivedStops++;

                    if (receivedStops === 3) {
                        cacheTime = new Date();
                        var info = mapAjaxResponse(data);
                        
                        successCallback(data, info);
                    }
                }
            },
            formData: getformData(data, stop)
        });
    };

    var getDataKey = function (data) {
        var response = [
            data.origin,
            data.destination,
            data.departureDate.toDateFormat('yyyy-mm-dd')
        ];

        if (data.returnDate !== null)
            response.push(data.returnDate.toDateFormat('yyyy-mm-dd'));

        return response.join(',');
    };
    
    var getLayovers = function (data) {
        var minLayover = 0, maxLayover = 0;

        if (data.returnDate !== null) {
            var date = data.departureDate.parseToDate();
            var date1 = data.returnDate.parseToDate();
            minLayover = Math.round((date1 - date) / (1000 * 60 * 60 * 24)) - 1;
            if (minLayover < 0)
                minLayover = 0;
            
            maxLayover = parseInt(minLayover) + MAX_DIFF_LAYOVER_ALLOW_BY_SERVICE;
        }

        return {
            2: minLayover, //min
            1: maxLayover  //max
        };
    };

    var getformData = function (data, stop) {
        var date = data.departureDate.parseToDate();
        var date1 = data.departureDate.parseToDate();
        date1.setDate(date1.getDate() + MAX_DIFF_DAYS_ALLOW_BY_SERVICE);

        var slices = [{
            3: [data.destination], //destinations
            5: [data.origin], //origins
            9: 1, //originPreferCity
            11: 1 //destinationPreferCity
        }];
        
        if (data.returnDate !== null)
            slices.push({
                3: [data.origin], //destinations
                5: [data.destination], //origins
                9: 1, //destinationPreferCity
                11: 1 //originPreferCity
            });

        var req = {
            params:
            {
                2: [ //summarizers
                    "calendar",
                    "overnightFlightsCalendar",
                    "itineraryStopCountList",
                    "itineraryCarrierList",
                    "currencyNotice"
                ],
                3: //input
                {
                    2: getLayovers(data), //layover
                    4:
                    {
                        2: 30
                    },
                    5: //pax
                    {
                        1: 1, //adults
                        //2: 1 //children
                    },
                    7: slices,
                    8: "COACH", //cabin
                    9: 1, //changeOfAirport
                    10: 1, //checkAvailability
                    //12: "BRL", //currency
                    13: date1.toDateFormat('yyyy-mm-dd'), //endDate
                    15: "MONDAY", //firstDayOfWeek
                    //17: 2, //stops
                    //19: "SAO" //salesCity
                    22: "default",
                    23: date.toDateFormat('yyyy-mm-dd') //startDate
                }
            }
        };
        
        
        if (stop === undefined) {
            req.method = "search";
            req.params[4] = "calendar";            
            req.params[7] = "!ISJCR5gwqHt4w8hEm59PMbi5PY8CAAAAMlIAAAAHKgD-HRO37CrrpXeaF6mk7JFgOd-OWCUuJJ-J10g6r0gJwNeb5AMRDWt-D85rbr7yXYfknH1LyW8TQ6Q-Xm1KBhnofEoebNUjRC-oEmXZXj-YybEn2ISyhLKzbJXC8pWE5qdNaJ7IGy2BwExW9YkeynMckCik5x5s3qlYLs_-cVtF7Efu0Cm5SInts3P3DLVjKljTxjjPQGYZ-Jd-BuL9xSmI03EC621Q4FmAupOoMExEw6Oz-TEFlg1pNr7iYurAhZ_AJ1v4FLh6wIeVPz7a22UvkJU_kf6kC6Tmx_fLU69gktEjaN-Q74IYOroPGo8-rKNKLneKMCv2Yu8iHmi-JRI";
            
        } else {
            req.method = "summarize";
            req.params[3][1] = {2: {1: [stop]}};
            req.params[4] = data.solutionSet;
            req.params[5] = data.session;
        }
        
        return JSON.stringify(req);
        /*
        var slices = [{
            origins: [data.origin],
            originPreferCity: true,
            destinations: [data.destination],
            destinationPreferCity: true
        }];
        
        if (data.returnDate !== null)
            slices.push({
                destinations: [data.origin],
                destinationPreferCity: true,
                origins: [data.destination],
                originPreferCity: true
            });

        var inputs = {
            slices: slices,
            startDate: date.getDateString(),
            pax: {
                adults: 1
            },
            currency: "BRL",
            cabin: "COACH",
            changeOfAirport: true,
            checkAvailability: true,
            firstDayOfWeek: "MONDAY",
            endDate: date1.getDateString()
        };

        if (data.returnDate !== null)
            inputs.layover = getLayovers(data);

        if (stop !== undefined || (data.companies !== undefined && data.companies.length > 0)) {
            inputs.filter = {};

            if (stop !== undefined)
                inputs.filter.maxStopCount = {
                    values: [stop]
                };

            if (data.companies !== undefined && data.companies.length > 0)
                inputs.filter.carriers = {
                    values: data.companies.map(function (a) { return a.code; })
                };
        }

        var response = [
            "summarizers=calendar,itineraryStopCountList,itineraryCarrierList",
            "format=JSON",
            "inputs=" + JSON.stringify(inputs)
        ];

        if (data.isPriority)
            response.push("name=calendar");
        else
            response.push("solutionSet=" + data.solutionSet, "session=" + data.session);

        return response.join("&");
        */
    };

    var updateCache = function (data, result, stop) {
        var layover = getLayovers(data);
        var calendar = result[7];
        var months = calendar[1];
        
        for (var i = 0; i < months.length; i++) {
            var monthInfo = months[i];
            var weeks = monthInfo[1], month = monthInfo[2], year = monthInfo[3];
    
            for (var j = 0; j < weeks.length; j++) {
                var weekInfo = weeks[j];
                var days = weekInfo[1];

                for (var k = 0; k < days.length; k++) {
                    var dayInfo = days[k];
                    var day = dayInfo[1], tripDuration = dayInfo[3], solutionCount = dayInfo[10];

                    if (solutionCount > 0 && tripDuration !== null) {
                        var options = tripDuration[1];

                        for (var l = 0; l < options.length; l++) {
                            var optionsInfo = options[l];
                            var slices = optionsInfo[1], minPrice = optionsInfo[2];
                            var dates = slices[3];
                            var key = data.origin + ',' + data.destination + ',' +
                                dates.map(function (m) { return m[1].split("T")[0]; }) //"2014-12-01T18:50-02:00" -> "2014-12-01"
                                .join(",");

                            if (cache[key] === undefined) cache[key] = [];
                            cache[key][stop] = minPrice.replace(/[^\d.,]/g, '');
                        }
                    }
                    else {
                        var day0 = new Date(year, month - 1, day.date);
                        var departureDate = day0.toDateFormat('yyyy-mm-dd');
                        
                        for (var l = layover.min; l <= layover.max; l++) {
                            var day1 = new Date(year, month - 1, day.date + l);
                            var key = data.origin + ',' + data.destination + ',' + departureDate + (l == 0 ? "" : "," + day1.toDateFormat('yyyy-mm-dd'));
                            
                            if (cache[key] === undefined) cache[key] = [];
                            cache[key][stop] = 0;
                        }
                    }
                }
            }
        }
        
        var itineraryCarrierList = result[22];
        var groups = itineraryCarrierList[1];
        for (var i in groups) {
            var company = groups[i];
            var label = company[1], minPrice = company[2];
            var code = label[1], shortName = label[2];
            
            var key = airlinesCompaniesByCode[code] == undefined
                ? shortName.trim()
                : airlinesCompaniesByCode[code];
            if (companyCache[key] === undefined) companyCache[key] = [];
            
            companyCache[key][stop] = {
                price: minPrice.replace(/[^\d.,]/g, ''),
                code: code
            };
        }
    };
    
    var mapAjaxResponse = function (data) {
        for (var i in companyCache) {
            var bestPrice = Number.MAX_SAFE_INTEGER;
            for (var j in companyCache[i])
                if (companyCache[i][j].price > 0 && companyCache[i][j].price < bestPrice)
                    bestPrice = companyCache[i][j].price;

            for (var j in companyCache[i]) {
                companyCache[i][j].bestPrice = bestPrice == Number.MAX_SAFE_INTEGER ? 0 : bestPrice;
                companyCache[i][j].url = data.url;   
            }
        }

        var dataKey = getDataKey(data);
        var prices = cache[dataKey];
        var info = {
            prices: prices == undefined ? [0, 0, 0] : prices,
            byCompany: companyCache
        };

        return info;
    };
    
    return self;
}

Ita.prototype = new RequestManager('Ita Software By Google', 200, 1);
Ita.prototype.constructor = Ita;
Ita.prototype.parent = RequestManager.prototype;

//var ITA = new Ita();
//This is not working yet