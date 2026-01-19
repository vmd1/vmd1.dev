// 3D card tilt effect function
window.initTilt = function(card) {
    // Check if already initialized to prevent duplicate listeners
    if (card.dataset.tiltInitialized === 'true') return;
    
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
    
    card.dataset.tiltInitialized = 'true';
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

    // Apply to existing cards 
    cards.forEach(card => {
        window.initTilt(card);
    });
}

document.addEventListener('DOMContentLoaded', initSpotlight);
document.addEventListener('page:loaded', initSpotlight);
