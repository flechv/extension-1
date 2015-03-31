function RequestManager(name, gapTimeServer, MaxWaiting) {
    var self = this;
    
    self.store = self.constructor.instances.length;
    self.name = name;
    
//public methods
    self.getGapTimeServer = function () {
        return gapTimeServer;
    };

    self.getMaxWaiting = function () {
        return MaxWaiting;
    };
    
    //we're not able to make abstract methods yet
    /*
    self.getGapTimeServer;
    self.getMaxWaiting;
    self.sendRequest;
    self.getUrl;
    */
    
    return self;
}

RequestManager.prototype.push = function () {
    RequestManager.instances.push(this);
};

RequestManager.prototype.checkGiveUp = function (data, callback) {
    if (data.times.length <= 10) return false;

    //over 5 attempts, give up
    callback(data, { prices: [0, 0, 0], byCompany: {} });
    return true;
};

//static properties
RequestManager.instances = [];
RequestManager.getInstances = function () {
    return RequestManager.instances;
};

RequestManager.getInstance = function (store) {
    var inst = RequestManager.instances.filter(function (i) { return i.store == store; });
    return inst && inst.length > 0 ? inst[0] : null;
};