(function () {
	'use strict';

	angular
		.module('app')
		.filter('toDate', ToDate);

	ToDate.$inject = ['$filter'];

	function ToDate($filter) {
		return function (time) {
			if (!time || !angular.isNumber(time)) return '';

			var date = new Date(time);
			var format = date.getYear() === new Date().getYear() ? 'dd/MM' : 'dd/MM/yy';
			return $filter('date')(date, format);
		};
	}
})();
