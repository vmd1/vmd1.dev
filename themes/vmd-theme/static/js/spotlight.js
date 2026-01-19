// 3D card tilt effect function
function initTilt(card) {
    card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const { width, height } = rect;
        
        const rotateX = (y / height - 0.5) * -20; // Max rotation 10 degrees
        const rotateY = (x / width - 0.5) * 20;  // Max rotation 10 degrees

        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    });

    card.addEventListener('mouseleave', () => {
        card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0)';
    });
};

function initSpotlight() {
    const spotlight = document.getElementById('spotlight');
    const cards = document.querySelectorAll('.card');

    if (!window.spotlightInitialized) {
        // Spotlight effect - only bind once
        document.addEventListener('mousemove', (e) => {
            if (spotlight) {
                spotlight.style.left = `${e.clientX}px`;
                spotlight.style.top = `${e.clientY}px`;
            }
        });
        window.spotlightInitialized = true;
    }

    // Apply to existing cards - idempotent if card already has listeners?
    // Listeners stack, which is bad. We should check if initialized.
    cards.forEach(card => {
        if (card.dataset.tiltInitialized) return;
        initTilt(card);
        card.dataset.tiltInitialized = "true";
    });
}

document.addEventListener('DOMContentLoaded', initSpotlight);
document.addEventListener('page:loaded', initSpotlight);
