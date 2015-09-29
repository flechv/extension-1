(function () {
    'use strict';

    angular
        .module('app')
        .config(config);

    config.$inject = ['$tooltipProvider', 'uiSelectConfig', 'datepickerConfig'];

    function config($tooltipProvider, uiSelectConfig, datepickerConfig) {
        $tooltipProvider.options({
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

        angular.extend(datepickerConfig, {
            showWeeks: false,
            datepickerPopup: 'dd/MM/yyyy',
            //'format-day-header': 'E',
            closeText: 'Fechar',
            currentText: 'Hoje',
            clearText: 'Resetar',
            minMode: 'day',
            maxMode: 'month',
            minDate: new Date(),
            //maxDate: new Date(),
        });
    }
})();
