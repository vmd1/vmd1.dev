document.addEventListener('DOMContentLoaded', () => {
    document.addEventListener('click', async (e) => {
        const link = e.target.closest('a');
        
        // Basic validation
        if (!link) return;
        
        // Check if it's an internal link
        if (link.origin !== location.origin) return;
        
        // Check for specific attributes relative to behavior
        if (link.target && link.target !== '_self') return; 
        if (link.hasAttribute('download')) return;
        if (link.getAttribute('href').startsWith('mailto:')) return;
        if (link.getAttribute('href').endsWith('.pdf')) return;

        // Check modify keys
        if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;

        // Check for same page anchors
        const currentUrl = new URL(location.href);
        const targetUrl = new URL(link.href);
        if (currentUrl.pathname === targetUrl.pathname && 
            currentUrl.search === targetUrl.search && 
            targetUrl.hash) {
            // Let default behavior handle anchor scroll
            return;
        }

        e.preventDefault();
        const url = link.href;

        try {
            // Optional: Add NProgress or similar loading indicator here if needed
            
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Response status: ${response.status}`);
            const html = await response.text();
            
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const newMain = doc.querySelector('#main-content');
            const newHeader = doc.querySelector('header');
            const newTitle = doc.title;

            if (!newMain) {
                // If we can't find the main content, fall back to full reload
                window.location = url;
                return;
            }

            const updateDOM = () => {
                const currentMain = document.querySelector('#main-content');
                if (currentMain) currentMain.replaceWith(newMain);

                const currentHeader = document.querySelector('header');
                if (newHeader && currentHeader) {
                    currentHeader.replaceWith(newHeader);
                }
                
                document.title = newTitle;
                window.scrollTo(0, 0);
                
                // Dispatch event for other scripts to re-initialize
                document.dispatchEvent(new Event('page:loaded'));
            };

            if (document.startViewTransition) {
                const transition = document.startViewTransition(updateDOM);
            } else {
                updateDOM();
            }
            
            history.pushState({}, '', url);

        } catch (err) {
            console.error('Navigation failed, falling back to load:', err);
            window.location = url;
        }
    });

    window.addEventListener('popstate', () => {
        // For simplicity and correctness, reload on back/forward
        window.location.reload();
    });
});
