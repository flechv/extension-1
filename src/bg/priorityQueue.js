//Priority Queue
var PQ = (function () {
    var self = {};

    var RM, gapTimeServer = 2000, maxWaiting = 5,
        list = [], time, callback;

//public methods
    self.enqueue = function (item) {
        list.push(item);
        list.sort(function (a, b) { return a.times[0] - b.times[0]; });
    };
    
    self.getLength = function () {
        return list.length;
    };

    self.initServer = function (request, backgroundCallback) {
        SM.put("pages", JSON.stringify(list));

        callback = backgroundCallback;
        time = 0;
        RM = RequestManager.getInstance(request.store);
        updateUrls();

        if (RM.getGapTimeServer !== undefined && typeof RM.getGapTimeServer === "function")
            gapTimeServer = RM.getGapTimeServer();

        if (RM.getMaxWaiting !== undefined && typeof RM.getMaxWaiting === "function")
            maxWaiting = RM.getMaxWaiting();

        router();
    };

    self.stopServer = function () {
        list = [];
        SM.put("waiting", 0);
        SM.delete("resultsList");
        SM.delete("receivedPages");
    };

    self.decreaseWaiting = function () {        
        SM.put("waiting", parseInt(SM.get("waiting")) - 1);
    };

//private methods
    var router = function () {
        var page = list[0];
        if (page === undefined) {
            if (parseInt(SM.get("waiting")) === 0)
                return false; //stops the 'server'
        }
        else if (page.times[0] <= time && page.isPriority === undefined && parseInt(SM.get("waiting")) < maxWaiting) {
            page = list.shift(); //remove the first item
            page.isPriority = true;
            
            increaseWaiting();
            sendPage(page);
        }
        else {
            for (var i = 0; i < list.length; i++)
                if (list[i].times[0] <= time && list[i].isPriority != undefined) {
                    page = list.splice(i, 1)[0]; //remove the item at position i
    
                    sendPage(page);
                    break
                }
        }

        time += gapTimeServer;
        setTimeout(router, gapTimeServer);
    };

    var sendPage = function (page) {
        setTimeout(function () {
            RM.sendRequest(page, callback, receiveData, time);
        }, 1);
    };

    var increaseWaiting = function () {
        SM.put("waiting", parseInt(SM.get("waiting")) + 1);
    };

    var receiveData = function (data) {
        data.times.splice(0, 0, estimatedTimeToBeReady(data.times[0]));
        self.enqueue(data);
    };

    var estimatedTimeToBeReady = function (time) {
        return parseInt(time) + 3000;
    };
    
    var updateUrls = function (data) {
        for (var i = 0; i < list.length; i++)
            list[i].url = RM.getUrl(list[i]);
    };

    return self;
}());