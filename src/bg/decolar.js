//Request Manager for "Decolar"
function Decolar() {
    var self = this;
    self.parent.push.call(self);
    
    const SERVICE_BASE_URL = "http://m.decolar.com/mobile-flights-web/results/",
        PUBLIC_BASE_URL = "http://www.decolar.com/shop/flights/results/";
    
//public methods
    self.sendRequest = function (data, successCallback, failCallback, time) {
        self.parent.sendRequest({
            data: data,
            method: "GET",
            url: getServiceUrl(data),
            headers: {
                'Content-type': 'text/html;charset=UTF-8'
            },
            time: time,
            successCallback: successCallback,
            failCallback: failCallback,
            callback: function (responseText) {
                var parser = new DOMParser();
                var response = parser.parseFromString(responseText, "text/html");

                mapAjaxResponse(data, response, successCallback);
            }
        });
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
      
        return SERVICE_BASE_URL + p.join("/") + "?order_by=total_price&order_type=asc&currency_code=BRL";
        
        //http://m.decolar.com/mobile-flights-web/results/roundtrip/RIO/GRU/31-12-2015/01-01-2016/1/0/0/i1?order_by=total_price&order_type=asc&currency_code=BRL
    };

    var mapAjaxResponse = function (data, response, callback) {
        var info = self.parent.returnDefault();

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
                info.byCompany[airline][layovers[i]].price = self.parent.getMinPrice(info.byCompany[airline][layovers[i]].price, price);
                info.prices[layovers[i]] = self.parent.getMinPrice(info.prices[layovers[i]], price);
            }
        });
        
        callback(data, info);
    };
    
    return self;
}

Decolar.prototype = new RequestManager('Decolar', 2000, 5);
Decolar.prototype.constructor = Decolar;
Decolar.prototype.parent = RequestManager.prototype;

var DECOLAR = new Decolar();