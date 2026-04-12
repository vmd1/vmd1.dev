(function () {
    function initCodeCopy(root) {
        const scope = root || document;
        const codeBlocks = scope.querySelectorAll('pre');

        codeBlocks.forEach((pre) => {
            if (pre.dataset.copyBound === 'true') return;

            // Only attach copy controls to code blocks.
            const codeEl = pre.querySelector('code');
            if (!codeEl) return;

            const wrapper = document.createElement('div');
            wrapper.className = 'relative group';

            pre.parentNode.insertBefore(wrapper, pre);
            wrapper.appendChild(pre);

            const button = document.createElement('button');
            button.className = 'absolute top-2 right-2 w-8 h-8 flex items-center justify-center rounded bg-slate-700 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-400';
            button.innerHTML = '<i class="ri-file-copy-line"></i>';
            button.title = 'Copy code';

            button.addEventListener('click', async () => {
                const code = codeEl.innerText;
                try {
                    await navigator.clipboard.writeText(code);
                    button.innerHTML = '<i class="ri-check-line text-green-400"></i>';
                    setTimeout(() => {
                        button.innerHTML = '<i class="ri-file-copy-line"></i>';
                    }, 2000);
                } catch (err) {
                    console.error('Failed to copy:', err);
                    button.innerHTML = '<i class="ri-error-warning-line text-red-400"></i>';
                }
            });

            wrapper.appendChild(button);
            pre.dataset.copyBound = 'true';
        });
    }

    window.initCodeCopy = initCodeCopy;
    initCodeCopy(document);
    document.addEventListener('spa:navigated', () => {
        initCodeCopy(document);
    });
})();
