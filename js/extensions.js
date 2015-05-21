Date.prototype.getDateString = function () {
   return this.getFullYear() + '/' + this.getMonth2() + '/' + this.getDate2();
};

Date.prototype.addDays = function (days) {
    this.setDate(this.getDate() + days);
    return this;
};

Date.prototype.getDate2 = function () {
   var date = this.getDate();
   return (date < 10 ? '0' : '') + date;
};

Date.prototype.getMonth2 = function () {
   var month = this.getMonth() + 1;
   return (month < 10 ? '0' : '') + month;
};

Date.prototype.toDateFormat = function (format) {
    format = format || "yyyy/mm/dd";
    
    return format.toLowerCase()
        .replace(/yyyy/g, this.getFullYear())
        .replace(/yy/g, this.getYear())
        .replace(/mm/g, this.getMonth2())
        .replace(/m/g, this.getMonth() + 1)
        .replace(/dd/g, this.getDate2())
        .replace(/d/g, this.getDate());
};

//date must be in format yyyy/mm/dd => output new Date(y, m, d)
String.prototype.parseToDate = function () {
    var s = this.split("/");
    return s.length === 3 ? new Date(s[0], parseInt(s[1]) - 1, s[2]) : null;
};

String.prototype.toDateFormat = function (format) {
    return this.parseToDate().toDateFormat(format);
};

Number.prototype.to2Digits = function () {
   return this.toFixed(2).toString().replace(".", ",");
};

String.prototype.to2Digits = function () {
	return this == "" ? "-" : parseFloat(this).to2Digits();
};