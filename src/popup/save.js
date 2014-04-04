function saveTextAsFile() {
	var textToWrite = getResultsTextToSaveAsFile();
	var textFileAsBlob = new Blob([textToWrite], { type: 'text/plain' });
	var fileNameToSaveAs = "genghis";
	var downloadLink = document.createElement("a");
	downloadLink.download = fileNameToSaveAs;
	downloadLink.innerHTML = "Download File";
	downloadLink.href = window.webkitURL.createObjectURL(textFileAsBlob);
	downloadLink.click();
}

function getResultsTextToSaveAsFile() {
	var response = "";
	var breakline = "\n";

	$("#results li").each(function() {
//main header
		response += $(this).find('.locals').text();
		response += $(this).find('.bestResultsMsg').text();
		response += breakline + breakline;

//main body
		for (var i in [0, 1, 2]) {
			response += $(this).find('.stop' + i + ' .type').text().completeColumn();
			response += $(this).find('.stop' + i + ' .date').text().completeColumn();
			response += $(this).find('.stop' + i + ' .bestPrice').text() + breakline;	
		}
		
		response += breakline;
		
//table results if visible
		if($(this).find('.tableResultsByDates').is(':visible')) {
			//header
			for (var i in [0, 1, 2, 3])
				response += $(this).find('.tableResultsByDates th:eq(' + i + ')').text().completeColumn();
			response += breakline;

			//body obs:slice will skip the first result (header)
			$(this).find('.tableResultsByDates tr').slice(1).each(function () {
				response += $(this).find('.resultsDate').text().completeColumn();
				for (var i in [0, 1, 2])
					response += $(this).find('.resultsStop' + i).text().completeColumn();
				response += breakline;
			});
			
			response += breakline;
		}

//table results by companies if visible
		if($(this).find('.tableResultsByCompanies').is(':visible')) {
			//header
			for (var i in [0, 1, 2, 3])
				response += $(this).find('.tableResultsByCompanies th:eq(' + i + ')').text().completeColumn();
			response += breakline;

			//body obs:slice will skip the first result (header)
			$(this).find('.tableResultsByCompanies tr').slice(1).each(function () {
				response += $(this).find('.resultsCompany').text().completeColumn();
				for (var i in [0, 1, 2])
					response += $(this).find('.resultsStop' + i).text().completeColumn();
				response += breakline;
			});
			
			response += breakline;
		}
		
		response += breakline;
	});

	return response;
}

//complete string with tabs the prefixed column length (7 tabs)
String.prototype.completeColumn = function () {
	var tabLength = 4, delta = 7 * tabLength - this.length, resp = this;
	for(var i = 1; i < parseInt(delta / tabLength) + (delta % tabLength ? 1 : 0); i++) resp += "\t";
	return resp;
}
