(function () {
    function registerSpaFeature(initFn) {
        if (typeof initFn !== 'function') return;

        const run = () => initFn(document);

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', run, { once: true });
        } else {
            run();
        }

        document.addEventListener('spa:navigated', run);
    }

    window.registerSpaFeature = registerSpaFeature;
})();