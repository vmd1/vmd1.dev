(function () {
    function ensureLightbox() {
        let lightbox = document.getElementById('lightbox');
        let lightboxImg;

        if (!lightbox) {
            lightbox = document.createElement('div');
            lightbox.id = 'lightbox';
            lightbox.className = 'fixed inset-0 z-[100] bg-black bg-opacity-90 hidden flex items-center justify-center cursor-zoom-out opacity-0 transition-opacity duration-300';

            lightboxImg = document.createElement('img');
            lightboxImg.className = 'max-h-[90vh] max-w-[90vw] object-contain transition-transform duration-300 transform scale-95';
            lightboxImg.id = 'lightbox-image';

            lightbox.appendChild(lightboxImg);
            document.body.appendChild(lightbox);

            lightbox.addEventListener('click', () => {
                lightbox.classList.add('opacity-0');
                lightboxImg.classList.remove('scale-100');
                lightboxImg.classList.add('scale-95');

                setTimeout(() => {
                    lightbox.classList.add('hidden');
                }, 300);
            });
        } else {
            lightboxImg = document.getElementById('lightbox-image');
        }

        return { lightbox, lightboxImg };
    }

    function initLightbox(root) {
        const scope = root || document;
        const { lightbox, lightboxImg } = ensureLightbox();
        const contentImages = scope.querySelectorAll('.prose img');

        contentImages.forEach((img) => {
            if (img.dataset.lightboxBound === 'true') return;

            img.classList.add('cursor-zoom-in', 'transition-transform', 'duration-200', 'hover:scale-[1.02]');
            img.addEventListener('click', (e) => {
                e.stopPropagation();
                lightboxImg.src = img.src;
                lightboxImg.alt = img.alt;
                lightbox.classList.remove('hidden');
                requestAnimationFrame(() => {
                    lightbox.classList.remove('opacity-0');
                    lightboxImg.classList.remove('scale-95');
                    lightboxImg.classList.add('scale-100');
                });
            });

            img.dataset.lightboxBound = 'true';
        });
    }

    window.initLightbox = initLightbox;
    initLightbox(document);
    document.addEventListener('spa:navigated', () => {
        initLightbox(document);
    });
})();
