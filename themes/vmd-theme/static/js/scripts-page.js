// State variables - need to be global or persistent across re-renders if we want to keep state?
// For now, let's reset state on navigation for simplicity, or keep them if outside init function.
// Keeping them inside a module/scope relative to the page lifecycle is better.

let allScripts = [];
let selectedScripts = new Set();
let currentFilter = 'all';

async function initScriptsPage() {
    const scriptsGrid = document.getElementById('scripts-grid');
    if (!scriptsGrid) return;

    // Reset state if needed, or keep it? 
    // If we navigate away and back, we probably want a fresh state unless we persist it.
    // Let's reset for consistency with page reload.
    if (!scriptsGrid.dataset.initialized) {
           selectedScripts = new Set();
           currentFilter = 'all';
           allScripts = []; 
    } else {
        // Already initialized (shouldn't happen with full page swap, but...)
        return;
    }
    scriptsGrid.dataset.initialized = 'true';

    // Search functionality
    const searchInput = document.getElementById('script-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            renderScripts(e.target.value);
        });
    }

    // Filter functionality
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
             // Update active state
             document.querySelectorAll('.filter-btn').forEach(b => {
                b.classList.remove('bg-blue-600', 'text-white');
                b.classList.add('text-gray-400');
            });
            btn.classList.remove('text-gray-400');
            btn.classList.add('bg-blue-600', 'text-white');
            
            currentFilter = btn.dataset.os;
            renderScripts(searchInput ? searchInput.value : '');
        });
    });
    
    // Fetch scripts
    try {
        const response = await fetch('https://sc.vmd1.dev/scripts.json');
        const data = await response.json();
        allScripts = data;
        renderScripts();
    } catch (error) {
        console.error('Error fetching scripts:', error);
        scriptsGrid.innerHTML = `
            <div class="col-span-full text-center py-12 text-red-400">
                <i class="ri-error-warning-line text-3xl mb-2 inline-block"></i>
                <p>Failed to load scripts. Please try again later.</p>
            </div>
        `;
    }
    
    // Global functions needed for inline event handlers
    window.toggleSelection = toggleSelection;
    window.clearBatch = clearBatch;
    window.copyBatchCommand = copyBatchCommand;
    window.copyToClipboard = copyToClipboard;
}

function renderScripts(searchTerm = '') {
    const grid = document.getElementById('scripts-grid');
    if (!grid) return;
    
    const term = searchTerm.toLowerCase();
    
    // Check for active selection to enforce OS filter
    let selectionOS = null;
    if (selectedScripts.size > 0) {
        const firstCode = selectedScripts.values().next().value;
        const firstScript = allScripts.find(s => s['short-code'] === firstCode);
        if (firstScript) {
            selectionOS = firstScript.oses.includes('windows') ? 'windows' : 'linux';
        }
    }

    const filteredScripts = allScripts.filter(script => {
        const matchesSearch = script.name.toLowerCase().includes(term) || 
                            script['short-code'].toLowerCase().includes(term);
        
        let matchesOS = currentFilter === 'all' || script.oses.includes(currentFilter);
        
        // If selection is active, only show scripts from that OS
        if (selectionOS) {
            matchesOS = script.oses.includes(selectionOS);
        }

        return matchesSearch && matchesOS;
    });

    if (filteredScripts.length === 0) {
        grid.innerHTML = `
            <div class="col-span-full text-center py-12 text-gray-500">
                <p>No scripts found matching your criteria.</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = filteredScripts.map(script => {
        const isWindows = script.oses.includes('windows');
        const osColor = isWindows ? 'text-blue-400 bg-blue-400/10' : 'text-purple-400 bg-purple-400/10';
        const osIcon = isWindows ? 'ri-windows-fill' : 'ri-qq-fill';
        const osName = isWindows ? 'Windows' : 'Linux';
        const isSelected = selectedScripts.has(script['short-code']);
        
        // Generate command
        let command = '';
        if (isWindows) {
            command = `irm https://sc.vmd1.dev/w -OutFile $env:TEMP\\\\w.ps1; & $env:TEMP\\\\w.ps1 ${script['short-code']}`;
        } else {
            command = `curl https://sc.vmd1.dev/l -o /tmp/l && bash /tmp/l ${script['short-code']}`;
        }

        // Escape single quotes for the function call
        const safeCommand = command.replace(/'/g, "\\'");

        return `
            <div class="block card p-6 bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors duration-200 h-full group relative ${isSelected ? 'ring-2 ring-blue-500' : ''}" onclick="window.toggleSelection('${script['short-code']}', '${isWindows ? 'windows' : 'linux'}')">
                <div class="absolute bottom-4 right-4 z-10">
                    <div class="w-6 h-6 rounded border ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-slate-600 bg-slate-800'} flex items-center justify-center transition-colors">
                        ${isSelected ? '<i class="ri-check-line text-white text-sm"></i>' : ''}
                    </div>
                </div>

                <div class="flex justify-between items-start mb-4">
                    <div class="flex items-center gap-2">
                        <span class="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${osColor}">
                            <i class="${osIcon}"></i>
                            ${osName}
                        </span>
                    </div>
                    <a href="${script.url}" target="_blank" class="text-gray-400 hover:text-blue-400 transition-colors z-20 relative" title="View Source" onclick="event.stopPropagation()">
                        <i class="ri-external-link-line"></i>
                    </a>
                </div>
                
                <h3 class="text-xl font-bold text-gray-100 mb-2">${script.name}</h3>
                <div class="flex items-center gap-2 text-sm text-gray-400 mb-4 font-mono bg-slate-900/50 px-2 py-1 rounded w-fit">
                    <i class="ri-terminal-box-line"></i>
                    ${script['short-code']}
                </div>

                <div class="relative" onclick="event.stopPropagation()">
                    <div class="bg-slate-900 rounded-lg p-3 font-mono text-xs text-gray-300 break-all pr-10 h-20 overflow-y-auto custom-scrollbar">
                        ${command}
                    </div>
                    <button onclick="window.copyToClipboard(this, '${safeCommand}')" 
                        class="absolute top-2 right-2 p-1.5 rounded-md bg-slate-800 text-gray-400 hover:text-white hover:bg-slate-700 transition-all border border-slate-700"
                        title="Copy command">
                        <i class="ri-file-copy-line"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');

    // Initialize tilt on new elements
    if (window.initTilt) {
        grid.querySelectorAll('.card').forEach(card => window.initTilt(card));
    }
}

function toggleSelection(shortCode, os) {
    // Check if we're mixing OSes
    if (selectedScripts.size > 0) {
         const firstScriptCode = selectedScripts.values().next().value;
         const firstScript = allScripts.find(s => s['short-code'] === firstScriptCode);
         if (firstScript) {
             const firstScriptOS = firstScript.oses.includes('windows') ? 'windows' : 'linux';
             
             if (firstScriptOS !== os && !selectedScripts.has(shortCode)) {
                 alert(`Cannot mix Windows and Linux scripts in one command.\nPlease clear your selection first.`);
                 return;
             }
         }
    }

    if (selectedScripts.has(shortCode)) {
        selectedScripts.delete(shortCode);
    } else {
        selectedScripts.add(shortCode);
    }
    
    const searchInput = document.getElementById('script-search');
    renderScripts(searchInput ? searchInput.value : '');
    updateBatchBar();
}

function clearBatch() {
    selectedScripts.clear();
    const searchInput = document.getElementById('script-search');
    renderScripts(searchInput ? searchInput.value : '');
    updateBatchBar();
}

function updateBatchBar() {
    const bar = document.getElementById('batch-bar');
    const count = document.getElementById('batch-count');
    const commandInput = document.getElementById('batch-command');
    
    if (selectedScripts.size > 0) {
        bar.classList.remove('translate-y-full');
        count.textContent = selectedScripts.size;
        
        // Generate batch command
        const codes = Array.from(selectedScripts).join(' ');
        const firstScriptCode = selectedScripts.values().next().value;
        const firstScript = allScripts.find(s => s['short-code'] === firstScriptCode);
        const isWindows = firstScript.oses.includes('windows');
        
        if (isWindows) {
            commandInput.value = `irm https://sc.vmd1.dev/w -OutFile $env:TEMP\\\\w.ps1; & $env:TEMP\\\\w.ps1 ${codes}`;
        } else {
            commandInput.value = `curl https://sc.vmd1.dev/l -o /tmp/l && bash /tmp/l ${codes}`;
        }
    } else {
        bar.classList.add('translate-y-full');
    }
}

function copyBatchCommand(btn) {
    const command = document.getElementById('batch-command').value;
    navigator.clipboard.writeText(command).then(() => {
        const originalContent = btn.innerHTML;
        btn.innerHTML = '<i class="ri-check-line"></i><span>Copied!</span>';
        btn.classList.remove('bg-blue-600', 'hover:bg-blue-700');
        btn.classList.add('bg-green-600', 'hover:bg-green-700');
        
        setTimeout(() => {
            btn.innerHTML = originalContent;
            btn.classList.add('bg-blue-600', 'hover:bg-blue-700');
            btn.classList.remove('bg-green-600', 'hover:bg-green-700');
        }, 2000);
    });
}

function copyToClipboard(btn, text) {
    navigator.clipboard.writeText(text).then(() => {
        const icon = btn.querySelector('i');
        const originalClass = icon.className;
        
        icon.className = 'ri-check-line text-green-400';
        btn.classList.add('border-green-500/50');
        
        setTimeout(() => {
            icon.className = originalClass;
            btn.classList.remove('border-green-500/50');
        }, 2000);
    });
}

document.addEventListener('DOMContentLoaded', initScriptsPage);
document.addEventListener('page:loaded', initScriptsPage);
