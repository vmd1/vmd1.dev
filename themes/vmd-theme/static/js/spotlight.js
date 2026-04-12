// 3D tilt effect for interactive cards only.
(function () {
    function initTilt(card) {
        if (card.dataset.tiltBound === 'true') return;

        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const { width, height } = rect;

            const rotateX = (y / height - 0.5) * -20;
            const rotateY = (x / width - 0.5) * 20;

            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0)';
        });

        card.dataset.tiltBound = 'true';
    }

    function initSpotlight(root) {
        const scope = root || document;
        const cards = scope.querySelectorAll('.card:not(.static-card)');
        cards.forEach((card) => initTilt(card));
    }

    window.initSpotlight = initSpotlight;
    initSpotlight(document);
    document.addEventListener('spa:navigated', () => {
        initSpotlight(document);
    });
})();
