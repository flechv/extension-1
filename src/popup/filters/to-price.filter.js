(function () {
	'use strict';

	angular
		.module('app')
		.filter('toPrice', ToPrice);

	ToPrice.$inject = ['$filter', 'constants'];

	function ToPrice($filter, constants) {
		return function (amount, gridScope) {
			if (!amount || amount === constants.priceInfinity)
				return '-';

			var fractionSize = 0;
			if (gridScope && gridScope.row && gridScope.row.entity && gridScope.row.entity.money)
				fractionSize = 2;

			return $filter('currency')(amount, '', fractionSize);
		};
	}
})();
