(function () {
    'use strict';

    angular
        .module('app')
        .config(config);

    config.$inject = ['$uibTooltipProvider', 'uiSelectConfig', 'uibDatepickerConfig'];

    function config($uibTooltipProvider, uiSelectConfig, uibDatepickerConfig) {
        $uibTooltipProvider.options({
            trigger: 'mouseenter',
            placement: 'right',
            animation: false,
            popupDelay: 150,
            appendToBody: true
        });

        angular.extend(uiSelectConfig, {
            theme: 'bootstrap',
            resetSearchInput: true,
            appendToBody: true
        });

        var today = new Date();

        angular.extend(uibDatepickerConfig, {
            showWeeks: false,
            datepickerPopup: 'dd/MM/yyyy',
            //'format-day-header': 'E',
            minMode: 'day',
            maxMode: 'month',
            minDate: new Date(),
            //maxDate: new Date(),
        });
    }
})();
