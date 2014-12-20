//Request Manager for "ITA Software"
var ITA = (function () {
    var self = {};

    const SERVICE_BASE_URL = "http://matrix.itasoftware.com/xhr/shop/",
        SEARCH_PRIORITY_URL = "search",
        SEARCH_SECONDARY_URL = "summarize",
        GAP_TIME_SERVER = 200,
        MAX_WAITING = 1,
        CACHE_TIMEOUT_HOURS = 1,
        MAX_DIFF_DAYS_ALLOW_BY_SERVICE = 30,
        MAX_DIFF_LAYOVER_ALLOW_BY_SERVICE = 7;
    
    var cache = {}, companyCache = {}, cacheTime = new Date(), receivedStops = 0;

//public methods
    self.getGapTimeServer = function () {
        return GAP_TIME_SERVER;
    };

    self.getMaxWaiting = function () {
        return MAX_WAITING;
    };

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

        data.isPriority = true;
        doRequest(data, successCallback, failCallback);
    };

//private methods
    var doRequest = function (data, successCallback, failCallback, stop) {
        var xhr = new XMLHttpRequest();
        xhr.open("POST", SERVICE_BASE_URL + (data.isPriority ? SEARCH_PRIORITY_URL : SEARCH_SECONDARY_URL), true);
        xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
        xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");

        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4 && xhr.status === 200) {
                try {
                    var response = eval("(" + xhr.responseText + ")");
                    
                    if (response.error !== undefined)
                        throw response.error.message !== undefined ? response.error.message : "unknown error";

                    if (data.isPriority) {
                        data.isPriority = false;
                        data.solutionSet = response.result.solutionSet;
                        data.session = response.result.session;
                        
                        doRequest(data, successCallback, failCallback, 0);
                        doRequest(data, successCallback, failCallback, 1);
                        doRequest(data, successCallback, failCallback, 2);
                    }
                    else {
                        updateCache(data, response.result, stop);
                        receivedStops++;

                        if (receivedStops === 3) {
                            cacheTime = new Date();
                            mapAjaxResponse(data, successCallback);
                        }
                    }
                }
                catch (error) {
                    console.log(error);
                    
                    data.failAttemps = data.failAttemps === undefined ? 1 : (data.failAttemps + 1);
                    if (data.failAttemps > 5) return;

                    setTimeout(function () {
                        doRequest(data, successCallback, failCallback);
                    }, 2500);
                }
            }
        };

        xhr.send(getRequestData(data, stop));
    };

    var getDataKey = function (data) {
        var response = [
            data.origin,
            data.destination,
            parseDateString(data.departureDate).getDateString()
        ];

        if (data.returnDate !== null)
            response.push(parseDateString(data.returnDate).getDateString());

        return response.join(',');
    };

    //date must be in format yyyy/mm/dd
    var parseDateString = function (date) {
        var dateSplited = date.split("/");
        return new Date(dateSplited[0], parseInt(dateSplited[1]) - 1, dateSplited[2]);
    };

    var getLayovers = function (data) {
        var minLayover = 0, maxLayover = 0;

        if (data.returnDate !== null) {
            var date = parseDateString(data.departureDate);
            var date1 = parseDateString(data.returnDate);
            minLayover = Math.round((date1 - date) / (1000 * 60 * 60 * 24)) - 1;
            if (minLayover < 0)
                minLayover = 0;
            
            maxLayover = parseInt(minLayover) + MAX_DIFF_LAYOVER_ALLOW_BY_SERVICE;
        }

        return {
            min: minLayover,
            max: maxLayover
        };
    };

    var getRequestData = function (data, stop) {
        var date = parseDateString(data.departureDate);
        var date1 = parseDateString(data.departureDate);
        date1.setDate(date1.getDate() + MAX_DIFF_DAYS_ALLOW_BY_SERVICE);

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
    };

    var updateCache = function (data, result, stop) {
        var layover = getLayovers(data);

        for (var i = 0; i < result.calendar.months.length; i++) {
            var month = result.calendar.months[i];

            for (var j = 0; j < month.weeks.length; j++) {
                var week = month.weeks[j];

                for (var k = 0; k < week.days.length; k++) {
                    var day = week.days[k];

                    if (day.solutionCount > 0 && day.tripDuration !== undefined) {
                        for (var l = 0; l < day.tripDuration.options.length; l++) {
                            var key = data.origin + ',' + data.destination + ',' +
                                day.tripDuration.options[l].solution.slices
                                .map(function (m) { return m.departure.split("T")[0]; }) //"2014-12-01T18:50-02:00" -> "2014-12-01"
                                .join(",");

                            if (cache[key] === undefined) cache[key] = [];
                            cache[key][stop] = day.tripDuration.options[l].minPrice.replace(/[^\d.,]/g, '');
                        }
                    }
                    else {
                        var day0 = new Date(month.year, month.month - 1, day.date);
                        var departureDate = day0.getDateString();
                        
                        for (var l = layover.min; l <= layover.max; l++) {
                            var day1 = new Date(month.year, month.month - 1, day.date + l);
                            var key = data.origin + ',' + data.destination + ',' + departureDate + (l == 0 ? "" : "," + day1.getDateString());
                            
                            if (cache[key] === undefined) cache[key] = [];
                            cache[key][stop] = 0;
                        }
                    }
                }
            }
        }

        for (var i in result.itineraryCarrierList.groups) {
            var company = result.itineraryCarrierList.groups[i];
            var key = airlinesCompaniesByCode[company.label.code] == undefined
                ? company.label.shortName.trim()
                : airlinesCompaniesByCode[company.label.code];
            if (companyCache[key] === undefined) companyCache[key] = [];
            
            companyCache[key][stop] = {
                price: company.minPrice.replace(/[^\d.,]/g, ''),
                code: company.label.code
            };
        }
    };
    
    var mapAjaxResponse = function (data, callback) {
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

        callback(data, info);
    };

    return self;
}());

Date.prototype.getDateString = function () {
   return this.getFullYear() + '-' + this.getMonth2() + '-' + this.getDate2();
}