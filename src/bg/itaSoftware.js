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
        var xhr = new XMLHttpRequest();
        xhr.open("POST", SERVICE_URL, true);
        xhr.setRequestHeader('Content-type', 'application/javascript; charset=UTF-8');
        //xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");
        xhr.setRequestHeader("X-GWT-Module-Base", "http://matrix.itasoftware.com/gwt/");
        xhr.setRequestHeader("X-GWT-Permutation", "46F5E3E13C7765F3F74D16C58212BAA2");
        
        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4 && xhr.status === 200) {
                try {
                    var response = eval("(" + xhr.responseText + ")");

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
            2: minLayover, //min
            1: maxLayover  //max
        };
    };

    var getRequestData = function (data, stop) {
        var date = parseDateString(data.departureDate);
        var date1 = parseDateString(data.departureDate);
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
                    13: date1.getDateString(), //endDate
                    15: "MONDAY", //firstDayOfWeek
                    //17: 2, //stops
                    //19: "SAO" //salesCity
                    22: "default",
                    23: date.getDateString() //startDate
                }
            }
        };
        
        
        if (stop === undefined) {
            req.method = "search";
            req.params[4] = "calendar";            
            req.params[7] = "!6-hCHhKLRclJQcZEdJHKMa0SC1wCAAAAUVIAAAAIKgD-X8ffq7Oykw-j8qoA72DeFjWEX0Ubvgbn0paVm7vHsbJ3NlNiZkBaOsVegTDKvFWdEmroixagpqNoKFPDmiswzulX_u6IS-JYwNNcnmZN51fQfw69Oq5m7tt6_vlYWUnvfOVvuoS6WDSCWiMKfe-9PBt1NpRYuGMtzXgRXSWDlh4ycSYklBL42oGCVnoK63egsTHpXe6cRUFvMdUljYWU1O9VcHxMc7K4AnRLmtt_oyzkjBj83EXjrC9rh_K-XDy99LfVC0NH1V2Gs85cro-7rZu4DKXe2W5aWJBNh3xiLv3A4KWhMxXOTIfuI7XYrsUWWBPCvgwS_JnZz1YCM6o";
            
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
                        var departureDate = day0.getDateString();
                        
                        for (var l = layover.min; l <= layover.max; l++) {
                            var day1 = new Date(year, month - 1, day.date + l);
                            var key = data.origin + ',' + data.destination + ',' + departureDate + (l == 0 ? "" : "," + day1.getDateString());
                            
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
}

Ita.prototype = new RequestManager('Ita Software By Google', 200, 1);
Ita.prototype.constructor = Ita;
Ita.prototype.parent = RequestManager.prototype;

var ITA = new Ita();

Date.prototype.getDateString = function () {
   return this.getFullYear() + '-' + this.getMonth2() + '-' + this.getDate2();
};