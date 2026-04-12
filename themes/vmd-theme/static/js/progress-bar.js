(function () {
    function updateProgressBar() {
        const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
        const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        const scrolled = height > 0 ? (winScroll / height) * 100 : 0;
        const progressBar = document.getElementById('reading-progress');
        if (progressBar) {
            progressBar.style.width = `${scrolled}%`;
        }
    }

    function initProgressBar() {
        if (window.__progressBarBound) {
            updateProgressBar();
            return;
        }

        window.addEventListener('scroll', updateProgressBar, { passive: true });
        window.__progressBarBound = true;
        updateProgressBar();
    }

    window.initProgressBar = initProgressBar;
    initProgressBar();
    document.addEventListener('spa:navigated', () => {
        initProgressBar();
    });
})();
