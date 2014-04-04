//Methods to validate form
function checkValidForm(form) {
	if  ((form.origins == null || form.destinations == null || form.qtyDays == null || form.departureDates == null) ||
		(form.origins.length == 1 && form.destinations.length == 1 && form.origins[0] == form.destinations[0]) ||
		(form.departureDates.length == 1 && form.departureDates[0] == "") ||
		(form.adults == 0 && form.children == 0 && form.babies == 0))
		return false;
	
	return true;
}

function informInvalidForm() {
	$("#msgError").show();
}

var loading;
function showMsgLoading() {
	$("#msgError").hide();
	$("#msgLoading").show();
	loading = setInterval(function () {
		switch($("#msgLoading span").text().trim()) {
			case "...": $("#msgLoading span").html("&nbsp;&nbsp;&nbsp;"); break;
			case "..":  $("#msgLoading span").html("..."); break;
			case ".":   $("#msgLoading span").html("..&nbsp;"); break;
			default:    $("#msgLoading span").html(".&nbsp;&nbsp;"); break;
		}
	}, 1000);
}

function finalLoading() {
	$("#msgLoading").hide();
	clearInterval(loading);
}

/****************************************************************************************************************************/
//Methods to initialize page
function setUpSelects() {
	var format = function (item, max_length) {
		return item.text.length < max_length ? item.text : item.text.substr(0, max_length) + "...";
	};

	$(".select2").select2({
		multiple: true,
	    data: popularAirports,
	    formatSelection: function (i) { return format(i, 34); },
		formatResult: function (i) { return format(i, 45); },
	    closeOnSelect: false
	});

	$("#companiesSelect").select2({
		multiple: true,
	    data: airlinesCompanies,
	    formatSelection: function (i) { return format(i, 11); },
	    closeOnSelect: false
	});

	$("#departureDatesInput").select2({
		multiple: true,
	    data: [],
	    closeOnSelect: true,
	    openOnEnter: false
	})
	.on("select2-opening", function (event) {
		//prevent to open dropdownlist
	 	event.preventDefault();
	})
	.on("select2-focus", function(event) {
		if (!$("#departureDatesInputFake").hasClass("hasDatepicker"))
			$("#departureDatesInputFake").multiDatesPicker({
				minDate: 0,
				maxDate: '+11M',
				showButtonPanel: true,
				onSelect: function(date) {
					var dates = $("#departureDatesInput").select2("data").map(function (a) { return a.id; });
					var i = dates.indexOf(date);
					if (i > -1) dates.splice(i, 1);
					else dates.push(date);

					$("#departureDatesInput").select2("data", dates.sort(function (a, b) {
						return a.split("/").reverse().join("/") < b.split("/").reverse().join("/") ? -1 : 1;
					}).map(function (a) {
						return { id: a, text: a.substr(0, 5) }
					}));
				}
			});

		$("#departureDatesInputFake").focus();
	 })
	.on("select2-removing", function (event) {
		$("#departureDatesInputFake").multiDatesPicker("removeDates", event.val);
	 });
	 
	var days = [{ id: 0, text: 'Somente vôos de ida' }, { id: 1, text: '1 dia' }];
	for(var i = 2; i <= 30; i++)
		days.push({ id: i, text: i + ' dias' });

	$("#qtyDaysSelect").select2({
		multiple: true,
	    data: days,
	    closeOnSelect: false
	});

	$("#adultsSelect, #childrenSelect, #babiesSelect").select2();
}

function setUpAuxiliaryEvents(dom) {
	dom.on("click", "#avancada", function () { $("#divAvancada").toggle(); });
	dom.on("click", "#download", function () { saveTextAsFile(); });
	dom.on("click", ".showResults", function () {
		//align the table results and table results by companies
		$($(this).parent().find(".tableResultsByCompanies td")[0]).width($($(this).parent().find(".tableResultsByDates td")[0]).width());
		$(this).parent().find(".divResultsExpanded").toggle();
		$(this).text($(this).text() == "Ampliar Resultados" ? "Resumir Resultados" : "Ampliar Resultados");		
	});

	$(".help, #download").tipsy({ gravity: 'nw', html: true, fade: true, opacity: 0.9 });
}

function loadSavedForm(bg) {
	var request = bg.getRequest();
	if (request.origins != undefined)
		$("#originsSelect").select2("val", request.origins);

	if (request.destinations != undefined)
		$("#destinationsSelect").select2("val", request.destinations);
			
	if (request.departureDates != undefined) {
		$("#departureDatesInput").select2("data", request.departureDates.map(function (a) {
				return { id: a, text: a.substr(0, 5) }
			}));

		$("#departureDatesInputFake").multiDatesPicker({
			minDate: 0,
			maxDate: '+11M',
			showButtonPanel: true,
			addDates: request.departureDates,
			defaultDate: request.departureDates.sort()[0],
			onSelect: function (date) {
				var dates = $("#departureDatesInput").select2("data").map(function (a) { return a.id; });
				var i = dates.indexOf(date);
				if (i > -1) dates.splice(i, 1);
				else dates.push(date);

				$("#departureDatesInput").select2("data", dates.sort(function (a, b) {
					return a.split("/").reverse().join("/") < b.split("/").reverse().join("/") ? -1 : 1;
				}).map(function (a) {
					return { id: a, text: a.substr(0, 5) }
				}));
			}
		});
	}
		
	if (request.qtyDays != undefined)
		$("#qtyDaysSelect").select2("val", request.qtyDays);
}

function loadSavedResults(bg) {
	var results = bg.getResultsList();
	if (results != undefined && results != null && results.length > 0)
		for (var i in results) {
			if (!(results[i].best))
				continue;

			addNewCitiesPair(results[i].key,
				results[i].best.map(function (a) { return a.date; }),
				results[i].best.map(function (a) { return a.url; }),
				results[i].best.map(function (a) { return a.price; })
			);

			addCompaniesToResults(results[i].key, results[i].bestByCompany);
			for (var j in results[i].all)
				addDateToResults(results[i].key, results[i].all[j].date, results[i].all[j].url, results[i].all[j].prices);
		}

	if (bg.IsOver())
		finalLoading();
	else
		showMsgLoading();
}

$(document).ready(function () {
	var dom = $(document);
	var bg = chrome.extension.getBackgroundPage().BG;
	bg.hideBadge();

	setUpSelects();
	setUpAuxiliaryEvents(dom);

	dom.on("click", "#btnBuscar", function () {
		var request = {
			origins: 		$("#originsSelect").select2("val"),
			destinations: 	$("#destinationsSelect").select2("val"),
			departureDates: $("#departureDatesInput").select2("val"),
			qtyDays: 		$("#qtyDaysSelect").select2("val"),
			companies: 		$("#companiesSelect").select2("val"),
			adults: 		$("#adultsSelect").val(),
			children: 		$("#childrenSelect").val(),
			babies: 		$("#babiesSelect").val()
		};
		console.log(request);
			
		if (!checkValidForm(request))
			informInvalidForm();
		else {
			showMsgLoading();
			$("#results").html("");
			$("#loading").show();
			
			bg.init(request);
		}
	});

	loadSavedForm(bg);
	loadSavedResults(bg);
});