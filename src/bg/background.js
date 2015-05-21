const APP_NAME = "genghis";

var BG = (function (SM, PQ) {
    var self = {};

    const GAP_TIME = 300, REPEAT_SEARCH_DELAY = 6 * 60 * 60 * 1000; //6 HOURS

    var sendEmailTimeout, repeatSearchTimeout;

//public methods
    self.init = function (req) {
        var time = 0;
        PQ.stopServer();

        var i, j, k, w, companies = req.companies.map(function (a) { return airlinesCompaniesById[a]; });
        for (i in req.origins) {
            for (j in req.destinations) {
                var origin = req.origins[i].id, destination = req.destinations[j].id;
                if (origin === destination) continue;
                
                for (k in req.departureDates) {
                    if (req.qtyDays !== null && req.qtyDays.length > 0) {
                        for (w in req.qtyDays) {
                            var returnDate = req.qtyDays[w] == 0 ? null : addDaystoDate(req.departureDates[k], req.qtyDays[w]);

                            enqueue(origin, destination, req.departureDates[k], returnDate,
                                companies, req.adults, req.children, req.infants,
                                req.qtyDays, req.email, req.priceEmail, time);

                            time += GAP_TIME;
                        }
                        
                        continue;
                    }
                    
                    //oneway
                    if (req.returnDates === null || req.returnDates.length === 0) {
                        enqueue(origin, destination, req.departureDates[k], null,
                            companies, req.adults, req.children, req.infants,
                            req.qtyDays, req.email, req.priceEmail, time);

                        time += GAP_TIME;
                        continue;
                    }

                    //roundtrip
                    for (w in req.returnDates) {
                        if (req.departureDates[k] > req.returnDates[w]) continue;

                        enqueue(origin, destination, req.departureDates[k], req.returnDates[w],
                            companies, req.adults, req.children, req.infants,
                            req.qtyDays, req.email, req.priceEmail, time);

                        time += GAP_TIME;
                    }
                }
            }
        }
                
        setTimeout(function () {
            self.saveRequest(req);
            PQ.initServer(req, getResponse);
        }, 1);
        
        setupRepeatSearch(req);

        SM.put("initialNumberOfFlights", PQ.getLength());
        return PQ.getLength();
    };
    
    self.showLoading = function() {
        return PQ.getLength() !== 0 && self.getResultsList().length === 0;
    };

    self.hideBadge = function () {
        chrome.browserAction.setBadgeText({ "text": "" });
    };
    
    self.saveRequest = function (request) {
        var req = JSON.stringify(request);
        if (req == undefined || req === "null" || req === "{}") return;
        
        var requests = self.getRequests();
        for (var i in requests) {
            if (req === JSON.stringify(requests[i])) {
				requests.splice(i, 1); //remove it
				break;
			}
		}
		
        requests.splice(0, 0, request); //save it on begining
        SM.put("requests", JSON.stringify(requests));
    };

    self.getRequests = function () {
        return !SM.get("requests") ? [] : JSON.parse(SM.get("requests"));
    };
    
    self.deleteRequests = function () {
        SM.delete("requests");
    };
    
    self.deleteResults = function () {
        SM.delete("resultsList");
    };

    self.getResultsList = function () {
        return !SM.get("resultsList") ? [] : JSON.parse(SM.get("resultsList"));
    };
    
    self.getStores = function () {
        return RequestManager.getInstances();
    };

    self.getInitialNumberOfFlights = function () {
        return !SM.get("initialNumberOfFlights") ? 0 : parseInt(SM.get("initialNumberOfFlights"));
    };
	
	self.getPq = function () {
		return PQ;
	};

//private methods
    var enqueue = function(origin, destination, departureDate, returnDate,
            companies, adults, children, infants, qtyDays, email, priceEmail, time) {
        PQ.enqueue({
            origin: origin,
            destination: destination,
            departureDate: departureDate,
            returnDate: returnDate,
            companies: companies,
            adults: adults,
            children: children,
            infants: infants,
            qtyDays: qtyDays,
            email: email,
            priceEmail: priceEmail,
            times: [time]
        });
    };
    
    //date must be in format yyyy/mm/dd
    var addDaystoDate = function (dateStr, days) {
        return dateStr.parseToDate().addDays(parseInt(days)).toDateFormat('yyyy/mm/dd');
    };

    var getResponse = function (page, response) {
        PQ.decreaseWaiting();

        var info = filterInfoWithValidCompanies(page, response),
            results = savePricesReceived(page, info);

        var popup = chrome.extension.getViews({ type: 'popup' })[0];
        if (popup !== undefined) {
            self.hideBadge();
            var scope = popup.angular
                .element(popup.document.getElementsByTagName('body'))
                .scope();
            
            scope.$apply(function () {
                scope.updateResults(results);
            });
        }
        else {
            updateBadge();            
        }

        //if (checkResultToNotify(result))
        //    notifyFinishCity(page, result.best);

        if (page.email !== undefined && page.priceEmail !== undefined)
            sendEmailIfLowFare(page, results);
    };

    var filterInfoWithValidCompanies = function (page, response) {
        if (page.companies == undefined || page.companies == null || page.companies.length == 0)
            return response;

        var info = RequestManager.prototype.returnDefault();
        var companies = page.companies.map(function (a) { return a.code; });
        for (var i in page.companies) {
            var a = { code: page.companies[i].code, price: 0, bestPrice: 0, url: page.url };
            info.byCompany[page.companies[i].text] = [a, a, a];
        }

        for (var i in response.byCompany) {
            var code = response.byCompany[i][0].code;
            if (companies.indexOf(code) == -1)
                continue;
        
            info.prices = response.byCompany[i].map(function (company, j) { return getMinimumFloat(company.price, info.prices[j]); });
            info.byCompany[airlinesCompaniesByCode[code]] = response.byCompany[i];
        }

        for (var i in info.prices)
            if (info.prices[i] == Number.MAX_VALUE)
                info.prices[i] = 0;

        return info;
    };

    var getMinimumFloat = function (p1, p2) {
        var f1 = isNaN(parseFloat(p1)) || p1 == 0 ? Number.MAX_VALUE : parseFloat(p1);
        var f2 = isNaN(parseFloat(p2)) || p2 == 0 ? Number.MAX_VALUE : parseFloat(p2);
        return Math.min(f1, f2);
    };

    var getMinPrice = function (prices) {
        var minPrice = Number.MAX_SAFE_INTEGER;
        for (var k = 0; k < prices.length; k++)
            if (prices[k] > 0 && prices[k] < minPrice)
                minPrice = prices[k];

        return minPrice;
    };

    //save to SM prices received from page (origin, destination, url, dates) and info (prices)
    var savePricesReceived = function (page, info) {
        var results = self.getResultsList(), key = getKey(page), date = getDateFormatted(page), url = page.url;
        var index = getIndexResultForKey(results, key), minPrice = getMinPrice(info.prices);
            
        if (index == undefined) {
            results.push({
                key: key,
                best: info.prices.map(function (price) {
                    return { date: date, price: price, url: url };
                }),
                bestByCompany: info.byCompany,
                all: [{ date: date, prices: info.prices, url: url, minPrice: minPrice }]
            });
        } else {
            for (var i = 0; i < info.prices.length; i++)
                if (results[index].best[i] == undefined || info.prices[i] == getMinimumFloat(info.prices[i], results[index].best[i].price))
                    results[index].best[i] = { date: date, price: info.prices[i], url: url };

            for (var i in info.byCompany) {
                if (results[index].bestByCompany[i] == undefined)
                    results[index].bestByCompany[i] = info.byCompany[i];

                else {
                    for (var j = 0; j < info.byCompany[i].length; j++) {
                        if (info.byCompany[i][j].bestPrice == getMinimumFloat(info.byCompany[i][j].bestPrice, results[index].bestByCompany[i][j].bestPrice))
                            results[index].bestByCompany[i][j].bestPrice = info.byCompany[i][j].bestPrice;

                        if (info.byCompany[i][j].price == getMinimumFloat(info.byCompany[i][j].price, results[index].bestByCompany[i][j].price)) {                            
                            results[index].bestByCompany[i][j].price = info.byCompany[i][j].price;
                            results[index].bestByCompany[i][j].url = info.byCompany[i][j].url;
                        }
                    }
                }
            }

            results[index].all.push({ date: date, prices: info.prices, url: url, minPrice: minPrice });
            results[index].all.sort(function (a, b) {
                return a.minPrice != b.minPrice ? (a.minPrice - b.minPrice) : (a.date > b.date ? 1 : (a.date < b.date ? -1 : 0));
            });
        }

        SM.put("resultsList", JSON.stringify(results));
        SM.put("receivedPages", !SM.get("receivedPages") ? 1 : parseInt(SM.get("receivedPages")) + 1);

        return results;
    };

    var getIndexResultForKey = function (results, key) {
        for (var i = results.length - 1; i >= 0; i--)
            if (results[i].key == key)
                return i;

        return undefined;
    };
  
    var updateBadge = function () {
        chrome.browserAction.setBadgeBackgroundColor({"color": [220, 0, 0, 255]});
        chrome.browserAction.setBadgeText({ "text": SM.get("receivedPages") });
    };

    var getKey = function (page) {
        return page.origin + "-" + page.destination;
    };

    //dates must be in format yyyy/mm/dd and will be shown in format dd/mm/yyyy
    var getDateFormatted = function (page) {
        var response = page.departureDate.toDateFormat('dd/mm/yyyy');

        if (page.returnDate !== null)
            response += " - " + page.returnDate.toDateFormat('dd/mm/yyyy');

        return response;
    };

    var sendEmailIfLowFare = function (page, results) {
        var datesWithLowFare = "";
        for (var i in results) {
            var hasLowFare = false;
            for (var j in results[i].best)
                if (results[i].best[j].price > 0 && results[i].best[j].price < page.priceEmail)
                    hasLowFare = true;

            if (hasLowFare) {
                for (var j in results[i].all) {
                    var minPrice = Number.MAX_SAFE_INTEGER;
                    for (var k in results[i].all[j].prices)
                        if (results[i].all[j].prices[k] > 0 && results[i].all[j].prices[k] < minPrice)
                            minPrice = results[i].all[j].prices[k];

                    if (minPrice < page.priceEmail)
                        datesWithLowFare += '<br/><a href="' + results[i].all[j].url + '">' +
                            results[i].key + ' - ' + results[i].all[j].date + '</a>';
                }

            }
        }

        if (datesWithLowFare !== "") {
            clearTimeout(sendEmailTimeout);
            clearTimeout(repeatSearchTimeout);
            sendEmailTimeout = setTimeout(function () {
                $.ajax({
                    type: "POST",
                    url: "https://mandrillapp.com/api/1.0/messages/send.json",
                    data: {
                        //please don't use this key. Sign up for https://mandrill.com/signup/ It's free!
                        "key": "9oF6KGko9Eg43LpgM2GCXA",
                        "message": {
                            "html": "As seguintes datas têm preço menor que " + page.priceEmail +
                                ":<br>" + datesWithLowFare + "<br><br>Att,<br>Passagens aéreas Genghis",
                            "subject": "Passagens baratas encontradas",
                            "from_email": "genghislabs@gmail.com",
                            "from_name": "Passagens aéreas",
                            "to": [
                                {
                                    "email": page.email,
                                    "type": "to"
                                }
                            ],
                            "headers": {
                                "Reply-To": "genghislabs@gmail.com"
                            },
                            "auto_html": null,
                            "bcc_address": "genghislabs@gmail.com"
                        }
                    }
                });
            }, 2000 * 60); //wait two minutes, enough time to fetch more results
        }
    };

    var setupRepeatSearch = function (req) {
        if (req === undefined) { //pc turn on, verify if we need do the saved search
            var timeToSearch = SM.get("repeatSearchTime");
            if (timeToSearch !== null) {
                clearTimeout(repeatSearchTimeout);
                repeatSearchTimeout = setTimeout(function () {
                    self.init(JSON.parse(SM.get("repeatSearchRequest")));
                }, Math.max(1, parseInt(timeToSearch) - (new Date()).getTime()));
            }
        }
        else if (req.email !== undefined && req.priceEmail !== undefined) {
            var now = new Date();
            now.setMilliseconds(now.getMilliseconds() + REPEAT_SEARCH_DELAY);
            //saving ticks, in case the pc shutdown. So next time the pc turn on, we verify this
            SM.put("repeatSearchTime", now.getTime());
            SM.put("repeatSearchRequest", JSON.stringify(req));

            clearTimeout(repeatSearchTimeout);
            repeatSearchTimeout = setTimeout(function () {
                self.init(JSON.parse(SM.get("repeatSearchRequest")));
            }, REPEAT_SEARCH_DELAY);
        }
        else {
            SM.delete("repeatSearchTime");
            SM.delete("repeatSearchRequest");
            clearTimeout(repeatSearchTimeout);
        }
    };

    setupRepeatSearch();

/*
    var getPages = function () {
        return !SM.get("pages") ? [] : JSON.parse(SM.get("pages"));
    }

    var checkResultToNotify = function (result) {
        var pagesForKey = getPages().filter(function(a) { return getKey(a) == result.key; });
        return result.all.length >= pagesForKey.length;
    }

    var notifyFinishCity = function (page, prices) {
        var origin = "", destination = "";
        for (var country in allAirports) {
            for (var airport in allAirports[country].children) {
                if (allAirports[country].children[airport].id == page.origin)
                    origin = allAirports[country].children[airport].text.split(',')[0];

                else if (allAirports[country].children[airport].id == page.destination)
                    destination = allAirports[country].children[airport].text.split(',')[0];
            }

            if (origin != "" && destination != "")
                break;        
        }
        var imageUrl = "http://www.tpmmoderna.com/wp-content/uploads/2012/08/book-england-france-heart-london-Favim.com-193664_large.jpg";
        chrome.notifications.create("id" + Math.floor(Math.random() * 10000), {
            type: "image",
            title: origin + " para " + destination + ":",
            message: "Direto: "     + "\t\t" + (prices[0] ? "R$ " + prices[0].price.toString() : "-") + "\n" +
                     "1 Parada: "   + "\t"   + (prices[1] ? "R$ " + prices[1].price.toString() : "-") + "\n" +
                     "2+ Paradas: " + "\t"   + (prices[2] ? "R$ " + prices[2].price.toString() : "-"),
            iconUrl: chrome.runtime.getURL("../../images/icon48.png"),
            imageUrl: imageUrl
          }, function() {});
    }
*/
    return self;
}(SM, PQ));
