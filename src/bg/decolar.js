//Request Manager for "Decolar"
function Decolar() {
    var self = this;
    self.parent.push.call(self);
    
    const SERVICE_BASE_URL = "http://m.decolar.com/mobile-flights-web/results/",
        PUBLIC_BASE_URL = "http://www.decolar.com/shop/flights/results/";
    
//public methods
    self.sendRequest = function (data, successCallback, failCallback, time) {
        var xhr = new XMLHttpRequest();
        xhr.open("GET", getServiceUrl(data), true);
        xhr.setRequestHeader('Content-type', 'text/html;charset=UTF-8');
        
        var dateInit = new Date();
        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4 && xhr.status === 200) {
                try {
                    var dateFinal = new Date();
                    data.times.splice(0, 0, time + (dateFinal - dateInit));
                    if (self.parent.checkGiveUp.call(self, data, successCallback)) return;

                    var parser = new DOMParser();
                    var response = parser.parseFromString(xhr.responseText, "text/html");
                    
                    mapAjaxResponse(data, response, successCallback);
                }
                catch(error) {
                    if (self.parent.checkGiveUp.call(self, data, successCallback)) return;
                    failCallback(data);
                }
            }
            else if (xhr.readyState === 4) {
                var dateFinal = new Date();
                data.times.splice(0, 0, time + (dateFinal - dateInit));
                if (self.parent.checkGiveUp.call(self, data, successCallback)) return;
                failCallback(data);
            }
        };

        try
        {
            xhr.send();
        }
        catch(error) {
            if (self.parent.checkGiveUp.call(self, data, successCallback)) return;
            failCallback(data);
        }
    };
    
    //dates must be in format yyyy/mm/dd -> output dates yyyy-mm-dd
    self.getUrl = function(data) {
        var p = [];
        
        p.push(data.returnDate === null ? "oneway" : "roundtrip");
        p.push(data.origin.toLowerCase());
        p.push(data.destination.toLowerCase());
        p.push(data.departureDate.split('/').join('-'));
        if (data.returnDate !== null)
            p.push(data.returnDate.split('/').join('-'));

        p.push(data.adults);
        p.push(data.children);
        p.push(data.babies);        

        return PUBLIC_BASE_URL + p.join("/") + "?utm_source=" + APP_NAME;
        
        //http://www.decolar.com/shop/flights/results/roundtrip/RIO/GRU/31-12-2015/01-01-2016/1/0/0
    };

//private methods
    //dates must be in format yyyy/mm/dd -> output dates dd-mm-yyyy
    var getServiceUrl = function (data) {
        var p = [];
        
        p.push(data.returnDate === null ? "oneway" : "roundtrip");
        p.push(data.origin.toLowerCase());
        p.push(data.destination.toLowerCase());
        p.push(data.departureDate.split('/').reverse().join('-'));
        
        if (data.returnDate !== null)
            p.push(data.returnDate.split('/').reverse().join('-'));
        else
            p.push(data.departureDate.split('/').reverse().join('-'));

        p.push(data.adults);
        p.push(data.children);
        p.push(data.babies);        
        p.push("i1"); //i1 is the first page of results (lowest prices), i2 the second, ...
      
        return SERVICE_BASE_URL + p.join("/");
        
        //http://m.decolar.com/mobile-flights-web/results/roundtrip/RIO/GRU/31-12-2015/01-01-2016/1/0/0/i1
    };

    var mapAjaxResponse = function (data, response, callback) {
        var info = {
            prices: [0, 0, 0],
            byCompany: {}
        };

        $('.result > .flight', response).each(function () {
            var airline = $(this).find('.airlineName').text();
            var price = $(this).find('.price').text().replace('.', '');
            var layovers = {};
            $(this).find('.flightDetail').each(function () {
                var layover = 2;
                if ($(this).find("span:contains('2 escalas')").length > 0) layover = 2;
                else if ($(this).find("span:contains('1 escala')").length > 0) layover = 1;
                else if ($(this).find("span:contains('Direto')").length > 0) layover = 0;
                
                layovers[layover] = true;
            });
            layovers = Object.keys(layovers);
            
            if (info.byCompany[airline] == undefined) {
                info.byCompany[airline] = [];

                for(var i in [0, 1, 2]) {
                    info.byCompany[airline].push({ 
                        price: 0,
                        url: data.url,
                        code: airlinesCompaniesById[airline] == undefined ? airline : airlinesCompaniesById[airline].code,
                        bestPrice: 0
                    });
                }
            }
                            
            for(var i in layovers) {
                info.byCompany[airline][layovers[i]].price = getMinPrice(info.byCompany[airline][layovers[i]].price, price);
                info.prices[layovers[i]] = getMinPrice(info.prices[layovers[i]], price);
            }
        });
        
        callback(data, info);
    };
                
    var getMinPrice = function (previousPrice, price) {
        return previousPrice == 0 || price == 0 ? Math.max(previousPrice, price) : Math.min(previousPrice, price);
    };
    
    return self;
}

Decolar.prototype = new RequestManager('Decolar', 2000, 5);
Decolar.prototype.constructor = Decolar;
Decolar.prototype.parent = RequestManager.prototype;

var DECOLAR = new Decolar();