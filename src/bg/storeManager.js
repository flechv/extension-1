//Store Manager
var SM = (function () {
    var my = {};

    my.get = function (key) {
        return localStorage.getItem(key);
    }
    my.put = function (key, value) {
        return localStorage.setItem(key, value);
    }
    my.delete = function (key) {
        return localStorage.removeItem(key);
    }
    my.clear = function () {
        return localStorage.clear();
    }

    return my;
}());