function addPricesReceived(page, info) {
	var bg = chrome.extension.getBackgroundPage().BG;
    var key = bg.getKey(page), date = bg.getDateFormatted(page), url = page.url;

	if ($("#results #" + key).length <= 0)
		addNewCitiesPair(key, [date, date, date], [url, url, url], info.prices);
	else 
		updatePricesOldCitiesPair(key, date, url, info.prices);

	addDateToResults(key, date, url, info.prices);
	addCompaniesToResults(key, info.byCompany);
	sortTableResultsByCompanies(key);
	
	$("#loading").hide();
}

//add new origin-destiny info with prices received
function addNewCitiesPair(key, dates, urls, prices) {
	var temp = $(".template").clone();
	temp.children("li").attr("id", key);
	temp.find(".locals").text(key);
	
	for (var i in prices)
		if (parseFloat(prices[i]) > 0) {
			temp.find(".stop" + i + " .date").text(dates[i].toShortDate());
			temp.find(".stop" + i + " .flightUrl").attr("href", urls[i]).show();
			temp.find(".stop" + i + " .bestPrice").text(prices[i].to2Digits());
		}

	$("#results").append(temp.html());
}

//compare prices already added with prices received and update best prices
function updatePricesOldCitiesPair(key, date, url, prices) {
	var li = $("#results #" + key);
	for (var i in prices)
		if (parseFloat(prices[i]) == getMinimumFloat(prices[i], li.find(".stop" + i + " .bestPrice").text())) {
			li.find(".stop" + i + " .date").text(date.toShortDate());
			li.find(".stop" + i + " .flightUrl").attr("href", url).show();
			li.find(".stop" + i + " .bestPrice").text(prices[i].to2Digits());
		}
}

function addDateToResults(key, date, url, prices) {
	if (!(key && date && url && prices))
		return false;

	var temp = $(".resultsByDatesTemplate").clone();
	temp.find(".resultsDate").text(date.toShortDate());
	for (var i in prices)
		temp.find(".resultsStop" + i).attr("href", url).text(prices[i] ? prices[i].to2Digits() : "-");		

	var minPrice = getMinimumFloat(getMinimumFloat(prices[0], prices[1]), prices[2]);
	orderAndAppendToContainer(key, temp, "tableResultsByDates", minPrice);
}

function orderAndAppendToContainer(key, temp, container, minPrice) {
	temp.children().attr("minPrice", minPrice);
	
	var alreadyAppended = false;
	$("#results #" + key + " ." + container + " tbody tr").each(function () {
		if (minPrice < $(this).attr("minPrice")) {
			$(this).before(temp.html());
			alreadyAppended = true;
			return false;
		}
	});

	if (!alreadyAppended)
		$("#results #" + key + " ." + container + " tbody").append(temp.html());
}

function addCompaniesToResults(key, pricesByCompany) {
	if (!(key && pricesByCompany))
		return false;

	for (var i in pricesByCompany) {
		var classId = i.replace(/ /g, '-');

		if ($("#results #" + key + " .tableResultsByCompanies > tbody > tr." + classId).length <= 0)
			addNewCompanyPrices(key, classId, pricesByCompany[i], i);

		else
			updateCompanyPrices(key, classId, pricesByCompany[i]);
	}

	$("#results #" + key + " .showResults").show();
}

function addNewCompanyPrices(key, classId, companyPrices, companyName) {
	var temp = $(".resultsByCompaniesTemplate").clone();
	temp.find("tr").addClass(classId);
	temp.find(".resultsCompany").text(companyName);

	for (var j in companyPrices)
		temp.find(".resultsStop" + j)
			.attr("href", companyPrices[j].url + "&Cia=" + companyPrices[j].code)
			.text(companyPrices[j].price ? companyPrices[j].price.to2Digits() : "-");

	orderAndAppendToContainer(key, temp, "tableResultsByCompanies", companyPrices[0].bestPrice);
};

function updateCompanyPrices(key, classId, companyPrices) {
	var tr = $("#results #" + key + " .tableResultsByCompanies > tbody > tr." + classId);
	for (var j in companyPrices)
		if (parseFloat(companyPrices[j].price) == getMinimumFloat(companyPrices[j].price, tr.find(".resultsStop" + j).text()))
			tr.find(".resultsStop" + j)
				.attr("href", companyPrices[j].url + "&Cia=" + companyPrices[j].code)
				.text(companyPrices[j].price.to2Digits());

	if (companyPrices[0].bestPrice == getMinimumFloat(companyPrices[0].bestPrice, tr.attr("minprice")))
		tr.attr("minPrice", companyPrices[0].bestPrice);
}

function sortTableResultsByCompanies(key) {
	var minPrices = $("#results #" + key + " .tableResultsByCompanies > tbody > tr").slice(1).map(function () {
		return { minPrice: $(this).attr("minPrice"), class: $(this).attr("class") };
	}).sort(function (a, b) {
		return a.minPrice - b.minPrice;
	});

	for (var i = 0; i < minPrices.length - 1; i++)
		$("#results #" + key + " .tableResultsByCompanies > tbody > tr:eq(" + (i + 1) + ")")
			.before($("#results #" + key + " .tableResultsByCompanies > tbody > tr." + minPrices[i].class));
}


function getMinimumFloat(p1, p2) {
    var f1 = isNaN(parseFloat(p1)) || p1 == 0 ? Number.MAX_VALUE : parseFloat(p1);
    var f2 = isNaN(parseFloat(p2)) || p2 == 0 ? Number.MAX_VALUE : parseFloat(p2);
    return Math.min(f1, f2);
}

//change string format from dd/mm/yyyy to dd/mm/yy (or dd/mm/yyyy - dd/mm/yyyy to dd/mm/yy - dd/mm/yy)
String.prototype.toShortDate = function () {
	return this.indexOf("-") == -1 ?
		this.replace(/(\d{2})\/(\d{2})\/20(\d{2})/,'$1/$2/$3') :
		this.replace(/(\d{2})\/(\d{2})\/20(\d{2}) - (\d{2})\/(\d{2})\/20(\d{2})/,'$1/$2/$3 - $4/$5/$6');
}

Number.prototype.to2Digits = function () {
   return this.toFixed(2).toString().replace(".", ",");
}

String.prototype.to2Digits = function () {
	return this == "" ? "-" : parseFloat(this).to2Digits();
}