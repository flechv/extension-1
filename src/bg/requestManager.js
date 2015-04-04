function RequestManager(name, gapTimeServer, maxWaiting) {
    var self = this;
    
    self.store = self.constructor.instances.length;
    self.name = name;
    
//public methods
    self.getGapTimeServer = function () {
        return gapTimeServer;
    };

    self.getMaxWaiting = function () {
        return maxWaiting;
    };
    
    return self;
}

RequestManager.prototype.push = function () {
    RequestManager.instances.push(this);
};

RequestManager.prototype.checkGiveUp = function (data, callback) {
    if (data.times.length <= 6) return false;

    //over 3 attempts, give up
    callback(data, this.returnDefault());
    return true;
};

RequestManager.prototype.returnDefault = function () {
    return { prices: [0, 0, 0], byCompany: {} };
};

RequestManager.prototype.sendRequest = function (config) {
    var self = this;
    var c = config || {};
    
    var xhr = new XMLHttpRequest();
    xhr.open(c.method || "POST", c.url, true);
    for(var i in c.headers) xhr.setRequestHeader(i, c.headers[i]);
    
    if (c.withCredentials) xhr.withCredentials = c.withCredentials;
    
    var init = new Date();
    xhr.onload = function (e) {
        if (c.time) c.data.times.splice(0, 0, c.time + ((new Date()) - init));
        if (self.checkGiveUp(c.data, c.successCallback)) return;

        if (xhr.status === 200) {
            try {
                c.callback(xhr.responseText);
            }
            catch(error) {
                c.failCallback(c.data);
            }
        }
        else {
            c.failCallback(c.data);
        }
    };

    try
    {
        xhr.send(c.formData);
    }
    catch(error) {
        if (self.checkGiveUp(c.data, c.successCallback)) return;
        c.failCallback(c.data);
    }
};

RequestManager.prototype.getMinPrice = function (previousPrice, price) {
    return previousPrice == 0 || price == 0 ? Math.max(previousPrice, price) : Math.min(previousPrice, price);
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