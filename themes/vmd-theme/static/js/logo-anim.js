const initLogoAnim = () => {
    const logo = document.getElementById('site-logo');
    if (!logo || logo.dataset.animInitialized) return;
    logo.dataset.animInitialized = 'true';

    // Set transition with a bouncy effect
    logo.style.transition = 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';
    logo.style.transform = 'scale(1)';
    
    const randomDelay = (min, max) => Math.random() * (max - min) + min;

    const pop = () => {
        // Apply pop
        logo.style.transform = `scale(1.3)`;
        
        setTimeout(() => {
            logo.style.transform = `scale(1)`;
            
            // Pop every few seconds (3-5s)
            setTimeout(pop, randomDelay(3000, 5000));
        }, 200);
    };

    // Start
    setTimeout(pop, randomDelay(1000, 3000));
};

document.addEventListener('DOMContentLoaded', initLogoAnim);
document.addEventListener('page:loaded', initLogoAnim);
