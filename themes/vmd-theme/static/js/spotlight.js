// 3D card tilt effect function
window.initTilt = function(card) {
    // Check if empty (some containers might be empty) or already initialized
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
    
    if (!window.spotlightInitialized) {
        // Spotlight effect - only bind once
        document.addEventListener('mousemove', (e) => {
            if (spotlight) {
                spotlight.style.left = `${e.clientX}px`;
                spotlight.style.top = `${e.clientY}px`;
            }
        });
        
        // Observer for dynamic content
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) { // ELEMENT_NODE
                        // Check if the node itself is a card
                        if (node.classList.contains('card')) {
                            window.initTilt(node);
                        }
                        // Check for cards inside the node
                        node.querySelectorAll('.card').forEach(card => window.initTilt(card));
                    }
                });
            });
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        window.spotlightInitialized = true;
    }

    // Initial pass
    document.querySelectorAll('.card').forEach(card => {
        window.initTilt(card);
    });
}

document.addEventListener('DOMContentLoaded', initSpotlight);
// page:loaded listener is still good for re-running initial pass if observer missed something during big swap
document.addEventListener('page:loaded', initSpotlight);
