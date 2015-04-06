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
                var info = mapAjaxResponse(data, response);
                
                successCallback(data, info);
            }
        });
    };
    
    //dates must be in format yyyy/mm/dd -> output dates yyyy-mm-dd
    self.getUrl = function(data) {
        var p = [];
        
        p.push(data.returnDate === null ? "oneway" : "roundtrip");
        p.push(data.origin.toLowerCase());
        p.push(data.destination.toLowerCase());
        p.push(data.departureDate.toDateFormat('yyyy-mm-dd'));
        if (data.returnDate !== null)
            p.push(data.returnDate.toDateFormat('yyyy-mm-dd'));

        p.push(data.adults);
        p.push(data.children);
        p.push(data.infants);

        return PUBLIC_BASE_URL + p.join("/") + "?utm_source=" + APP_NAME;
        
        //http://www.decolar.com/shop/flights/results/roundtrip/RIO/GRU/2015-12-31/2016-01-01/1/0/0
    };

//private methods
    //dates must be in format yyyy/mm/dd -> output dates dd-mm-yyyy
    var getServiceUrl = function (data) {
        var p = [];
        
        p.push(data.returnDate === null ? "oneway" : "roundtrip");
        p.push(data.origin.toLowerCase());
        p.push(data.destination.toLowerCase());
        p.push(data.departureDate.toDateFormat('dd-mm-yyyy'));
        
        if (data.returnDate !== null)
            p.push(data.returnDate.toDateFormat('dd-mm-yyyy'));
        else
            p.push(data.departureDate.toDateFormat('dd-mm-yyyy'));

        p.push(data.adults);
        p.push(data.children);
        p.push(data.infants);        
        p.push("i1"); //i1 is the first page of results (lowest prices), i2 the second, ...
      
        return SERVICE_BASE_URL + p.join("/") + "?order_by=total_price&order_type=asc&currency_code=BRL";
        
        //http://m.decolar.com/mobile-flights-web/results/roundtrip/RIO/GRU/31-12-2015/01-01-2016/1/0/0/i1?order_by=total_price&order_type=asc&currency_code=BRL
    };

    var mapAjaxResponse = function (data, response) {
        var info = self.parent.returnDefault();

        $('.result > .flight', response).each(function () {
            var airline = $(this).find('.airlineName').text();
            var price = $(this).find('.price').text().replace('.', '');
            var stops = {};
            $(this).find('.flightDetail').each(function () {
                var stop = 2;
                if ($(this).find("span:contains('2 escalas')").length > 0) stop = 2;
                else if ($(this).find("span:contains('1 escala')").length > 0) stop = 1;
                else if ($(this).find("span:contains('Direto')").length > 0) stop = 0;
                
                stops[stop] = true;
            });
            
            stops = Object.keys(stops);
            self.parent.checkAirlineInitialized(info, airline, data.url);
            for(var i in stops) {
                info.byCompany[airline][stops[i]].price = self.parent.getMinPrice(info.byCompany[airline][stops[i]].price, price);
                info.prices[stops[i]] = self.parent.getMinPrice(info.prices[stops[i]], price);
            }
        });
        
        return info;
    };
    
    return self;
}

Decolar.prototype = new RequestManager('Decolar', 2000, 5);
Decolar.prototype.constructor = Decolar;
Decolar.prototype.parent = RequestManager.prototype;

var DECOLAR = new Decolar();