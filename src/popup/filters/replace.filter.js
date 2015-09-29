(function () {
	'use strict';

	angular
		.module('app')
		.filter('replace', Replace);

	Replace.$inject = ['$sce'];

	function Replace($sce) {
		return function (string, searchValue, newValue) {
			if (string && string.$$unwrapTrustedValue)
				string = string.$$unwrapTrustedValue();

			if (!string || !angular.isString(string)) return '';

			return $sce.trustAsHtml(string.replace(searchValue, newValue));
		};
	}
})();
