(function () {
    'use strict';

    angular
        .module('app', [
            'ngSanitize',
            'ui.bootstrap',
            'ui.select',
            'ui.grid',
			'ui.grid.grouping',
			'ui.grid.expandable',
			'ui.grid.exporter',
            'gm.datepickerMultiSelect'
        ]);
})();
