(function () {
	'use strict';

	angular
		.module('app')
		.run(run);

	run.$inject = ['$rootScope', '$sce', 'constants'];

	function run($rootScope, $sce, constants) {
		$rootScope.labels = {};
		for (var key in constants.labels)
			$rootScope.labels[key] = $sce.trustAsHtml(constants.labels[key]);

		$rootScope.placeholders = {};
		for (var key in constants.placeholders)
			$rootScope.placeholders[key] = $sce.trustAsHtml(constants.placeholders[key]);

		$rootScope.tooltips = {};
		for (var key in constants.tooltips)
			$rootScope.tooltips[key] = $sce.trustAsHtml(constants.tooltips[key]);

		$rootScope.messages = {};
		for (var key in constants.messages)
			$rootScope.messages[key] = $sce.trustAsHtml(constants.messages[key]);

	}
})();
