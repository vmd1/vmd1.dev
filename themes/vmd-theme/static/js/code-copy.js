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
            wrapper.className = 'relative group code-copy-wrap';

            pre.parentNode.insertBefore(wrapper, pre);
            wrapper.appendChild(pre);
            pre.classList.add('copy-enabled');
            pre.tabIndex = 0;

            const button = document.createElement('button');
            button.className = 'code-copy-btn';
            button.innerHTML = '<i class="ri-file-copy-line"></i>';
            button.title = 'Copy code';
            button.setAttribute('aria-label', 'Copy code block');

            const setCopiedState = (state) => {
                if (state === 'ok') {
                    button.innerHTML = '<i class="ri-check-line"></i>';
                    button.classList.add('copied');
                    button.classList.remove('error');
                } else if (state === 'error') {
                    button.innerHTML = '<i class="ri-error-warning-line"></i>';
                    button.classList.add('error');
                    button.classList.remove('copied');
                } else {
                    button.innerHTML = '<i class="ri-file-copy-line"></i>';
                    button.classList.remove('copied', 'error');
                }
            };

            const copyCode = async () => {
                const code = codeEl.innerText;
                try {
                    await navigator.clipboard.writeText(code);
                    setCopiedState('ok');
                    window.setTimeout(() => setCopiedState('idle'), 1500);
                } catch (err) {
                    console.error('Failed to copy:', err);
                    setCopiedState('error');
                    window.setTimeout(() => setCopiedState('idle'), 1800);
                }
            };

            button.addEventListener('click', async () => {
                await copyCode();
            });

            pre.addEventListener('click', async (event) => {
                if (event.target && event.target.closest('button')) return;
                await copyCode();
            });

            pre.addEventListener('keydown', async (event) => {
                if (event.key !== 'Enter' && event.key !== ' ') return;
                event.preventDefault();
                await copyCode();
            });

            wrapper.appendChild(button);
            pre.dataset.copyBound = 'true';
        });
    }

    window.initCodeCopy = initCodeCopy;
    if (window.registerSpaFeature) {
        window.registerSpaFeature(initCodeCopy);
    } else {
        initCodeCopy(document);
    }
})();
