(function () {
	'use strict';

	angular
		.module('app')
		.filter('airport', Airport);

	Airport.$inject = ['$sce'];

	function Airport($sce) {
		return function (airport, airportsById) {
			var response = '';
			if (airport && airport.text && airport.id)
				response = airport.text + ' (' + airport.id + ')';
			
			var internalAirport = airportsById[airport];
			if (internalAirport && internalAirport.text && internalAirport.id)
				response = internalAirport.text + ' (' + internalAirport.id + ')';

			return $sce.trustAsHtml(response);
		};
	}
})();