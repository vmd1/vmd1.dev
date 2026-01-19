document.addEventListener('DOMContentLoaded', () => {
    // Create lightbox elements
    const lightbox = document.createElement('div');
    lightbox.id = 'lightbox';
    lightbox.className = 'fixed inset-0 z-[100] bg-black bg-opacity-90 hidden flex items-center justify-center cursor-zoom-out opacity-0 transition-opacity duration-300';
    
    const lightboxImg = document.createElement('img');
    lightboxImg.className = 'max-h-[90vh] max-w-[90vw] object-contain transition-transform duration-300 transform scale-95';
    
    lightbox.appendChild(lightboxImg);
    document.body.appendChild(lightbox);

    // Add click event to all content images
    const contentImages = document.querySelectorAll('.prose img');
    contentImages.forEach(img => {
        img.classList.add('cursor-zoom-in', 'transition-transform', 'duration-200', 'hover:scale-[1.02]');
        img.addEventListener('click', (e) => {
            e.stopPropagation();
            lightboxImg.src = img.src;
            lightboxImg.alt = img.alt;
            lightbox.classList.remove('hidden');
            // Small delay to allow display:block to apply before opacity transition
            requestAnimationFrame(() => {
                lightbox.classList.remove('opacity-0');
                lightboxImg.classList.remove('scale-95');
                lightboxImg.classList.add('scale-100');
            });
        });
    });

    // Close lightbox
    lightbox.addEventListener('click', () => {
        lightbox.classList.add('opacity-0');
        lightboxImg.classList.remove('scale-100');
        lightboxImg.classList.add('scale-95');
        
        setTimeout(() => {
            lightbox.classList.add('hidden');
        }, 300);
    });
});
