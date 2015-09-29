(function () {
	'use strict';

	angular
		.module('app')
		.filter('savedSearch', SavedSearch);

	SavedSearch.$inject = [];

	function SavedSearch() {
		return function (item) {
			return (!item || !item.origins || !item.destinations)
				? ''
				: item.origins.join(',') + ' - ' + item.destinations.join(',');
		};
	}
})();
