var BG = (function (SM, PQ) {
    var my = {};

    const APP_NAME = "genghis", GAP_TIME = 300;

    var sendEmailTimeout;

//public methods
    my.init = function (req) {
        var time = 0;
        PQ.stopServer();

        var companies = req.companies.map(function (a) { return airlinesCompaniesById[a]; });
        for (var i in req.origins)
            for (var j in req.destinations) {
                var origin = req.origins[i].id, destination = req.destinations[j].id;
                if (origin == destination) continue;
                
                for (var k in req.departureDates)
                    for (var w in req.qtyDays) {
                        var returnDate = req.qtyDays[w] == 0 ? null : addDaystoDate(req.departureDates[k], req.qtyDays[w]);
                        var url = getUrl(req.store, origin, destination, req.departureDates[k], returnDate, req.adults, req.children, req.babies);
                        
                        PQ.enqueue({
                            url: url,
                            origin: origin,
                            destination: destination,
                            departureDate: req.departureDates[k],
                            returnDate: returnDate,
                            companies: companies,
                            adults: req.adults,
                            children: req.children,
                            babies: req.babies,
                            qtyDays: req.qtyDays,
                            email: req.email,
                            priceEmail: req.priceEmail,
                            times: [time]
                        });

                        time += GAP_TIME;
                    }
            }
        
        setTimeout(function () {
            PQ.initServer(req, getResponse);
        }, 1);
    }
    
    my.showLoading = function() {
        return !PQ.isEmpty() && my.getResultsList().length == 0;
    }

    my.hideBadge = function () {
        chrome.browserAction.setBadgeText({ "text": "" });
    }

    my.getRequest = function () {
        return !SM.get("request") ? {} : JSON.parse(SM.get("request"));
    }

    my.getResultsList = function () {
        return !SM.get("resultsList") ? [] : JSON.parse(SM.get("resultsList"));
    }

//private methods
    //date must be in format yyyy/mm/dd
    var addDaystoDate = function (strDate, days) {
        var dateSplited = strDate.split("/");
        var date = new Date(dateSplited[0], (dateSplited[1] - 1), parseInt(dateSplited[2]) + parseInt(days));
        return date.getFullYear() + '/' + date.getMonth2() + '/'+ date.getDate2();
    }

    var getUrl = function (siteToSearch, origin, destination, departureDate, returnDate, adults, children, babies) {
        switch(siteToSearch) {
            case "2":
                return returnDate == null ?
                    "http://www.decolar.com/shop/flights/results/oneway/" + origin + "/" + destination + "/" + 
                    departureDate.split('/').join('-') + "/" + adults + "/" + children + "/" + babies + "?utm_source=" + APP_NAME :
                
                    "http://www.decolar.com/shop/flights/results/roundtrip/"  + origin + "/" + destination + "/" +
                    departureDate.split('/').join('-') + "/" + returnDate.split('/').join('-') + "/" + 
                    adults + "/" + children + "/" + babies + "?utm_source=" + APP_NAME;

            case "0": case "1": default:
                return returnDate == null ?
                    "http://www.submarinoviagens.com.br/Passagens/selecionarvoo?SomenteIda=true" +
                    "&Origem=" + origin + "&Destino=" + destination + "&Data=" + departureDate.split('/').reverse().join('/') +
                    "&NumADT=" + adults + "&NumCHD=" + children + "&NumINF=" + babies + "&utm_source=" + APP_NAME :
                    
                    "http://www.submarinoviagens.com.br/Passagens/selecionarvoo?SomenteIda=false" +
                    "&Origem=" + origin + "&Destino=" + destination + "&Data=" + departureDate.split('/').reverse().join('/') + 
                    "&Origem=" + destination + "&Destino=" + origin + "&Data=" + returnDate.split('/').reverse().join('/') + 
                    "&NumADT=" + adults + "&NumCHD=" + children + "&NumINF=" + babies + "&utm_source=" + APP_NAME;            
        }
    }

    var getResponse = function (page, response) {
        PQ.decreaseWaiting();

        var info = filterInfoWithValidCompanies(page, response);
        var results = savePricesReceived(page, info);

        var popup = chrome.extension.getViews({ type: 'popup' })[0];
        if (popup != undefined) {
            my.hideBadge();
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
    }

    var filterInfoWithValidCompanies = function (page, response) {
        if (page.companies == undefined || page.companies == null || page.companies.length == 0)
            return response;

        var info = { prices: [], byCompany: {} };
        
        var companies = page.companies.map(function (a) { return a.code; });
        for (var i in page.companies) {
            var a  = { code: page.companies[i].code, price: 0, bestPrice: 0, url: page.url };
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
    }

    var getMinimumFloat = function (p1, p2) {
        var f1 = isNaN(parseFloat(p1)) || p1 == 0 ? Number.MAX_VALUE : parseFloat(p1);
        var f2 = isNaN(parseFloat(p2)) || p2 == 0 ? Number.MAX_VALUE : parseFloat(p2);
        return Math.min(f1, f2);
    }

    var getMinPrice = function (prices) {
        var minPrice = Number.MAX_SAFE_INTEGER;
        for (var k = 0; k < prices.length; k++)
            if (prices[k] > 0 && prices[k] < minPrice)
                minPrice = prices[k];

        return minPrice;
    }

    //save to SM prices received from page (origin, destination, url, dates) and info (prices)
    var savePricesReceived = function (page, info) {
        var results = my.getResultsList(), key = getKey(page), date = getDateFormatted(page), url = page.url;
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
    }

    var getIndexResultForKey = function (results, key) {
        for (var i = results.length - 1; i >= 0; i--)
            if (results[i].key == key)
                return i;

        return undefined;
    }
  
    var updateBadge = function () {
        chrome.browserAction.setBadgeBackgroundColor({"color": [220, 0, 0, 255]});
        chrome.browserAction.setBadgeText({ "text": SM.get("receivedPages") });
    }

    var getKey = function (page) {
        return page.origin + "-" + page.destination;
    }

    //dates must be in format yyyy/mm/dd and will be shown in format dd/mm/yyyy
    var getDateFormatted = function (page) {
        var response = page.departureDate.split('/').reverse().join('/');

        if (page.returnDate !== null)
            response += " - " + page.returnDate.split('/').reverse().join('/');

        return response;
    }

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
    }
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
    return my;
}(SM, PQ));

Date.prototype.getDate2 = function () {
   var date = this.getDate();
   return (date < 10 ? '0' : '') + date;
}

Date.prototype.getMonth2 = function () {
   var month = this.getMonth() + 1;
   return (month < 10 ? '0' : '') + month;
}