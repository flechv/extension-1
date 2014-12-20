//Request Manager for "Decolar"
var DECOLAR = (function () {
    var self = {};

    const SITE_BASE_URL = "http://www.decolar.com/shop/flights/results/",
        GAP_TIME_SERVER = 2000,
        MAX_WAITING = 8;
    
    var pages = {}, callbackSuccess, idIndex = 0;

//content script methods
    chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
        mapAjaxResponse(request, sender, sendResponse);
    });
        
//public methods
    self.getGapTimeServer = function () {
        return GAP_TIME_SERVER;
    };

    self.getMaxWaiting = function () {
        return MAX_WAITING;
    };

    self.sendRequest = function (data, successCallback, failCallback, time) {
        callbackSuccess = successCallback;

        try {
            var url = getSiteUrl(data);
            pages[url] = data;

            var id = "genghis" + ((idIndex++) % MAX_WAITING);
            var code = 
                "if (document.getElementById('" + id + "') == null) {" +
                    "var iframe = document.createElement('iframe');" + 
                    "iframe.style.display = 'none';" +
                    "iframe.id = '" + id + "';" +
                    "iframe.src = '" + url + "';" +
                    "document.body.appendChild(iframe);" +
                "}" +
                "else document.getElementById('" + id + "').src = '" + url + "';";

            chrome.tabs.query({ url: "http://www.decolar.com/*" }, function (tabs) {
                if (tabs === undefined || tabs === null || tabs.length === 0 || tabs[0].id === undefined)
                    chrome.tabs.create({ url: "http://www.decolar.com/",  active: false }, function (tab) {
                        chrome.tabs.executeScript(tab.id, { code: code }, function () {});
                    });
                else
                    chrome.tabs.executeScript(tabs[0].id, { code: code }, function () {});
            });
        }
        catch(error) {
            console.log(error);
            failCallback(data);
        }
    };

//private methods
    //http://www.decolar.com/shop/flights/results/oneway/RIO/GRU/2014-12-31/1/0/0
    //dates must be in format yyyy/mm/dd
    var getSiteUrl = function (page) {
        var params = [];
        params.push(page.returnDate === null ? "oneway" : "roundtrip");
        params.push(page.origin.toLowerCase());
        params.push(page.destination.toLowerCase());
        params.push(page.departureDate.split('/').join('-'));
        if (page.returnDate !== null)
            params.push(page.returnDate.split('/').join('-'));

        params.push(page.adults);
        params.push(page.children);
        params.push(page.babies);
      
        return SITE_BASE_URL + params.join("/") + "?iframe";
    };

    var decodeHTMLEntities = function (text) {
        var entities = [
            ['apos', '\''],
            ['amp', '&'],
            ['lt', '<'],
            ['gt', '>']
        ];

        for (var i = 0, max = entities.length; i < max; ++i) 
            text = text.replace(new RegExp('&'+entities[i][0]+';', 'g'), entities[i][1]);

        return text;
    };

    var mapAjaxResponse = function (response, sender, sendResponse) {
        var url = sender.url.replace("iframe", "utm_source=genghis");
        var matrix = $.makeArray($(decodeHTMLEntities(response.htmlContent.matrix)).find(".matrix-airline")
            .map(function() {
                return {
                    airline: $(this).find(".airline-description").data("airline-info"),
                    prices: $.makeArray($(this).find(".priceItem")
                        .map(function() {
                            var item = $(this).data("item-info");
                            return item == undefined ? 0 
                                : item.price.filter(function(a) { return a.rawObject.code == "BRL"; })
                                    [0].rawObject.amount;
                        }))
                };
            }));

        var info = {
            prices: matrix.reduce(function (prev, a) {
                return a.prices.map(function (p, i) {
                    return p == 0 || prev[i] == 0 ? Math.max(prev[i], p) : Math.min(prev[i], p);
                });
            }, [0, 0, 0]),
            byCompany: {}
        };

        matrix.forEach(function (a) {
            var bestPrice = a.prices.reduce(function (prev, p) {
                return p == 0 || prev == 0 ? Math.max(prev, p) : Math.min(prev, p);
            }, 0);
            info.byCompany[a.airline.name] = a.prices.map(function (p) {
                return { 
                    price: p,
                    url: url,
                    code: a.airline.code,
                    bestPrice: bestPrice
                };
            })
        });
        
        var siteUrl = sender.url.split('/FARE')[0].replace('data/search', 'results') + '?iframe';
        setTimeout(function () {
            callbackSuccess(pages[siteUrl], info);
        }, 1);

        /*
        var prices = response.data.pricesSummary.matrix,
            stops = ["noScale", "oneScale", "twoPlusScales"],
            currenciesIndexs = { brl: 0, usd: 1 },
            url = sender.url.replace("iframe=true", "utm_source=genghis");

        var info = { 
            prices: stops.map(function (stop) {
                var min = Math.min.apply(null, prices.map(function (a) {
                    return a[stop] ? a[stop].prices[currenciesIndexs.brl].raw.amount : Number.MAX_VALUE;
                }));
                return min == Number.MAX_VALUE ? 0 : min;
            }),
            byCompany: {}
        };

        prices.forEach(function (a) {
            var bestPrice = Math.min.apply(null, stops.map(function (stop) { return a[stop] ? a[stop].prices[currenciesIndexs.brl].raw.amount : Number.MAX_VALUE; }));
            info.byCompany[a.airline.description.trim()] = stops.map(function (stop) {
                return { 
                    price: a[stop] ? a[stop].prices[currenciesIndexs.brl].raw.amount : 0,
                    url: url,
                    code: a.airline.code,
                    bestPrice: bestPrice == Number.MAX_VALUE ? 0 : bestPrice
                };
            });
        })

        callbackSuccess(pages[sender.url], info);
        */
    };

    return self;
}());