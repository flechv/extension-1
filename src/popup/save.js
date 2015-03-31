var saveTextAsFile = function (results) {
	var textToWrite = getResultsTextToSaveAsFile(results);
	var textFileAsBlob = new Blob([textToWrite], { type: 'text/csv' });
	var fileNameToSaveAs = "genghis.csv";
	var downloadLink = document.createElement("a");
	downloadLink.download = fileNameToSaveAs;
	downloadLink.innerHTML = "Download File";
	downloadLink.href = window.webkitURL.createObjectURL(textFileAsBlob);
	downloadLink.click();
};

var getResultsTextToSaveAsFile = function (results) {
	var i, j, k, row, m = [];

	for (i in results) {
		var result = results[i];
		m.push([ result.key + " - Melhores Resultados" ]);

		var types = [ "Direto", "1 parada", "2+ paradas" ];
		for (j in types)
			if (result.best[j] !== undefined)
                m.push([types[j], result.best[j].date, result.best[j].price]);
		
		m.push([], [ "Dias", "Direto", "1 parada", "2+ paradas" ]);
		for (j in result.all) {
			row = [ result.all[j].date ];
			
			for (k in [0, 1, 2])
				row.push(result.all[j].prices[k] === undefined ? "-" : result.all[j].prices[k].toString());
			
			m.push(row);
		}

		m.push([], [ "Companhias", "Direto", "1 parada", "2+ paradas" ]);
		for (j in result.bestByCompany) {
			row = [ j ];
			
			for (k in [0, 1, 2])
				row.push(result.bestByCompany[j][k].price);
			
			m.push(row);
		}
		
		m.push([]);
	}

	return m.reduce(function (prev, row) {
        return prev + row.join(",") + "\n";
    }, "");
};