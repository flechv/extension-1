if (document.referrer == '' || document.referrer == 'http://www.decolar.com/' || document.referrer.indexOf('http://www.decolar.com/') == -1) {
    function findRegexKeyValue(text, key) {
        var regexKey = key.replace(/ /g, '\\s*');
        var initialKeyIndex = text.search(regexKey);
        var initialValueIndex = text.indexOf("'", initialKeyIndex) + 1;
        var finalValueIndex = text.indexOf("'", initialValueIndex) - 1;
        return text.substr(initialValueIndex, finalValueIndex - initialValueIndex + 1);
    }

    function loadHashForData() {
        try {
            var bodyHtml = document.getElementsByTagName("body")[0].innerHTML;
            if (bodyHtml.indexOf('hashForData') == -1)
                throw 'error';

            var url = findRegexKeyValue(bodyHtml, "search : '");
            
            if (url.indexOf('hashForData') == -1 || url == 'gtm.start')
                throw 'error';

            location.href = "http://www.decolar.com" + url + '&iframe';
        }
        catch(error) {
            setTimeout(loadHashForData, 1);
        }
    }

    setTimeout(loadHashForData, 1);
}
else {
    var result = JSON.parse(document.getElementsByTagName('pre')[0].innerHTML).result;
    chrome.runtime.sendMessage(result.status.code == "SUCCEEDED" ? result : {}, function() {});
}