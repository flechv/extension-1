//Pool of Request Managers
var PRM = (function () {
    var self = {};
    var pool = arguments;

    self.getRequestManager = function (index) {
        return pool[index] === undefined ? pool[0] : pool[index];
    };
    
    return self;
}(SUBMARINO, DECOLAR, ITA));

//Priority Queue
var PQ = (function (PRM) {
    var self = {};

    var RM, gapTimeServer = 1500, maxWaiting = 8,
        list = [], time, callback;

//public methods
    self.enqueue = function (item) {
        list.push(item);
        list.sort(function (a, b) { return a.times[0] - b.times[0]; });
    };
    
    self.isEmpty = function () {
        return list.length === 0;
    };

    self.initServer = function (request, backgroundCallback) {
        SM.put("request", JSON.stringify(request));
        SM.put("pages", JSON.stringify(list));

        callback = backgroundCallback;
        time = 0;
        RM = PRM.getRequestManager(request.store);

        if (RM.getGapTimeServer !== undefined && typeof RM.getGapTimeServer === "function")
            gapTimeServer = RM.getGapTimeServer();

        if (RM.getMaxWaiting !== undefined && typeof RM.getMaxWaiting === "function")
            maxWaiting = RM.getMaxWaiting();

        router();
    };

    self.stopServer = function () {
        list = [];
        SM.clear();
        SM.put("waiting", 0);
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

    return self;
}(PRM));