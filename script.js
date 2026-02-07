document.addEventListener('DOMContentLoaded', () => {
    // State
    // State
    const state = {
        items: [
            { id: 1, spans: { desktop: { col: 1, row: 1 }, tablet: { col: 1, row: 1 }, mobile: { col: 1, row: 1 } } },
            { id: 2, spans: { desktop: { col: 2, row: 1 }, tablet: { col: 2, row: 1 }, mobile: { col: 1, row: 1 } } },
            { id: 3, spans: { desktop: { col: 1, row: 2 }, tablet: { col: 1, row: 1 }, mobile: { col: 1, row: 1 } } },
            { id: 4, spans: { desktop: { col: 1, row: 1 }, tablet: { col: 1, row: 1 }, mobile: { col: 1, row: 1 } } },
            { id: 5, spans: { desktop: { col: 2, row: 2 }, tablet: { col: 2, row: 1 }, mobile: { col: 1, row: 1 } } }
        ], // Default items
        selection: null, // Selected Item ID
        view: 'desktop', // 'desktop', 'tablet', 'mobile'
        config: {
            desktop: { columns: 4, rows: 4, gap: 16 },
            tablet: { columns: 2, rows: 4, gap: 16 }, // Default tablet
            mobile: { columns: 1, rows: 4, gap: 12 }  // Default mobile
        }
    };

    // DOM Elements
    const elements = {
        gridContainer: document.getElementById('gridContainer'),

        // Global Controls
        colCount: document.getElementById('colCount'),
        rowCount: document.getElementById('rowCount'),
        gapSize: document.getElementById('gapSize'),
        addBtn: document.getElementById('addBtn'),
        clearBtn: document.getElementById('clearBtn'),

        // View Controls
        deviceBtns: document.querySelectorAll('.device-btn'),
        currentViewLabel: document.getElementById('currentViewLabel'),

        // Inspector
        inspectorPanel: document.getElementById('inspectorPanel'),
        colSpanDisplay: document.getElementById('colSpanDisplay'),
        rowSpanDisplay: document.getElementById('rowSpanDisplay'),
        deleteItemBtn: document.getElementById('deleteItemBtn'),
        stepBtns: document.querySelectorAll('.step-btn'),

        // Export
        getCodeBtn: document.getElementById('getCodeBtn'),
        codeModal: document.getElementById('codeModal'),
        closeModal: document.getElementById('closeModal'),
        // modalTabs: document.querySelectorAll('.tab'), // If you add tabs back
        codeOutput: document.getElementById('codeOutput'),
        copyBtn: document.getElementById('copyBtn'),

        // Modal Tabs
        modalTabs: document.querySelectorAll('.tab')
    };

    // --- Core Functions ---

    function init() {
        updateViewUI();
        renderGrid();
    }

    function switchView(viewName) {
        state.view = viewName;
        updateViewUI();

        // Update Grid Container Width for Preview
        const container = elements.gridContainer;
        if (viewName === 'mobile') container.style.maxWidth = '375px';
        else if (viewName === 'tablet') container.style.maxWidth = '768px';
        else container.style.maxWidth = '1000px'; // Desktop

        loadConfigToUI();
        renderGrid();
    }

    function updateViewUI() {
        // Update Buttons
        elements.deviceBtns.forEach(btn => {
            if (btn.dataset.view === state.view) btn.classList.add('active');
            else btn.classList.remove('active');
        });

        // Update Label
        const label = state.view.charAt(0).toUpperCase() + state.view.slice(1);
        elements.currentViewLabel.textContent = `(${label})`;
    }

    function loadConfigToUI() {
        const cfg = state.config[state.view];
        elements.colCount.value = cfg.columns;
        elements.rowCount.value = cfg.rows;
        elements.gapSize.value = cfg.gap;
    }

    function renderGrid() {
        const cfg = state.config[state.view];
        const grid = elements.gridContainer;

        // Apply Grid Styles
        grid.style.gridTemplateColumns = `repeat(${cfg.columns}, 1fr)`;
        // grid.style.gridTemplateRows = `repeat(${cfg.rows}, 1fr)`; // Optional: Auto-rows usually better
        grid.style.gap = `${cfg.gap}px`;

        grid.innerHTML = '';

        state.items.forEach(item => {
            const el = document.createElement('div');
            el.className = 'grid-item';
            if (state.selection === item.id) el.classList.add('selected');

            // Get spans for current view, fallback to desktop if missing (shouldn't happen with correct init)
            const spans = item.spans[state.view] || { col: 1, row: 1 };

            el.style.gridColumnEnd = `span ${Math.min(spans.col, cfg.columns)}`; // Clamp to max cols
            el.style.gridRowEnd = `span ${spans.row}`;

            el.onclick = (e) => {
                e.stopPropagation();
                selectItem(item.id);
            };

            // Resize Handle for Selected Item
            if (state.selection === item.id) {
                const handle = document.createElement('div');
                handle.className = 'resize-handle';
                handle.onclick = (e) => e.stopPropagation(); // Prevent re-triggering selection

                handle.addEventListener('mousedown', (e) => {
                    e.stopPropagation();
                    e.preventDefault();

                    const startX = e.clientX;
                    const startY = e.clientY;
                    const startColSpan = spans.col;
                    const startRowSpan = spans.row;

                    // Get grid metrics
                    const gridStyle = window.getComputedStyle(grid);
                    const gap = parseFloat(gridStyle.gap) || 0;
                    const rect = el.getBoundingClientRect();
                    // Calculate existing cell size
                    const singleColWidth = (rect.width - (startColSpan - 1) * gap) / startColSpan;
                    const singleRowHeight = (rect.height - (startRowSpan - 1) * gap) / startRowSpan;

                    const onMouseMove = (moveEvent) => {
                        const deltaX = moveEvent.clientX - startX;
                        const deltaY = moveEvent.clientY - startY;

                        // Calculate steps based on cell size + gap
                        const colChange = Math.round(deltaX / (singleColWidth + gap));
                        const rowChange = Math.round(deltaY / (singleRowHeight + gap));

                        let newCol = startColSpan + colChange;
                        let newRow = startRowSpan + rowChange;

                        if (newCol < 1) newCol = 1;
                        if (newRow < 1) newRow = 1;
                        const maxCols = state.config[state.view].columns;
                        if (newCol > maxCols) newCol = maxCols;

                        if (newCol !== spans.col || newRow !== spans.row) {
                            item.spans[state.view].col = newCol;
                            item.spans[state.view].row = newRow;
                            renderGrid();
                            updateInspectorUI();
                        }
                    };

                    const onMouseUp = () => {
                        document.removeEventListener('mousemove', onMouseMove);
                        document.removeEventListener('mouseup', onMouseUp);
                    };

                    document.addEventListener('mousemove', onMouseMove);
                    document.addEventListener('mouseup', onMouseUp);
                });

                el.appendChild(handle);
            }

            grid.appendChild(el);
        });

        // Update Inspector if open
        if (state.selection) {
            updateInspectorUI();
        }
    }

    function addItem() {
        const newItem = {
            id: Date.now(),
            spans: {
                desktop: { col: 1, row: 1 },
                tablet: { col: 1, row: 1 },
                mobile: { col: 1, row: 1 }
            }
        };
        state.items.push(newItem);
        renderGrid();
    }

    function selectItem(id) {
        state.selection = id;
        renderGrid(); // Re-render to show selection border
        showInspector();
        updateInspectorUI();
    }

    function deselectItem() {
        state.selection = null;
        renderGrid();
        hideInspector();
    }

    function updateInspectorUI() {
        const item = state.items.find(i => i.id === state.selection);
        if (!item) return;

        const currentSpans = item.spans[state.view];
        elements.colSpanDisplay.textContent = currentSpans.col;
        elements.rowSpanDisplay.textContent = currentSpans.row;
    }

    function modifyItemSpan(target, change) {
        if (!state.selection) return;
        const item = state.items.find(i => i.id === state.selection);
        if (!item) return;

        const currentSpans = item.spans[state.view];
        let newValue = currentSpans[target === 'colSpan' ? 'col' : 'row'] + change;
        if (newValue < 1) newValue = 1;

        // For columns, clamp to max columns of current view
        if (target === 'colSpan') {
            const maxCols = state.config[state.view].columns;
            if (newValue > maxCols) newValue = maxCols;
        }

        // Apply new value
        if (target === 'colSpan') item.spans[state.view].col = newValue;
        else item.spans[state.view].row = newValue;

        renderGrid();
        updateInspectorUI();
    }

    function deleteItem() {
        if (!state.selection) return;
        state.items = state.items.filter(i => i.id !== state.selection);
        deselectItem();
    }

    // --- Code Generation ---

    function generateCode(type) {
        if (type === 'html') {
            return `<div class="bento-grid">\n${state.items.map((item, i) => `    <div class="bento-item item-${i + 1}"></div>`).join('\n')}\n</div>`;
        }

        // CSS Generation
        const generateCSS = () => {
            let css = `/* Bento Grid - Generated by BentoBlocks */\n\n`;
            css += `.bento-grid {\n`;
            css += `    display: grid;\n`;
            css += `    /* Desktop (Default) */\n`;
            css += `    grid-template-columns: repeat(${state.config.desktop.columns}, 1fr);\n`;
            css += `    gap: ${state.config.desktop.gap}px;\n`;
            css += `    width: 100%;\n`;
            css += `    max-width: 1200px;\n`;
            css += `}\n\n`;

            css += `.bento-item {\n`;
            css += `    background: #f0f0f0;\n`;
            css += `    border-radius: 16px;\n`;
            css += `    min-height: 100px;\n`;
            css += `}\n\n`;

            // Desktop Item Styles
            state.items.forEach((item, i) => {
                const span = item.spans ? item.spans.desktop : { col: 1, row: 1 };
                if (span.col > 1 || span.row > 1) {
                    css += `.item-${i + 1} {\n`;
                    if (span.col > 1) css += `    grid-column: span ${span.col};\n`;
                    if (span.row > 1) css += `    grid-row: span ${span.row};\n`;
                    css += `}\n`;
                }
            });

            // Tablet Media Query
            css += `\n/* Tablet */\n@media (max-width: 1024px) {\n`;
            css += `    .bento-grid {\n`;
            css += `        grid-template-columns: repeat(${state.config.tablet.columns}, 1fr);\n`;
            css += `        gap: ${state.config.tablet.gap}px;\n`;
            css += `    }\n`;

            state.items.forEach((item, i) => {
                const span = item.spans ? item.spans.tablet : { col: 1, row: 1 };
                css += `    .item-${i + 1} {\n`;
                css += `        grid-column: span ${Math.min(span.col, state.config.tablet.columns)};\n`;
                css += `        grid-row: span ${span.row};\n`;
                css += `    }\n`;
            });
            css += `}\n`;

            // Mobile Media Query
            css += `\n/* Mobile */\n@media (max-width: 600px) {\n`;
            css += `    .bento-grid {\n`;
            css += `        grid-template-columns: repeat(${state.config.mobile.columns}, 1fr);\n`;
            css += `        gap: ${state.config.mobile.gap}px;\n`;
            css += `    }\n`;

            state.items.forEach((item, i) => {
                const span = item.spans ? item.spans.mobile : { col: 1, row: 1 };
                css += `    .item-${i + 1} {\n`;
                css += `        grid-column: span ${Math.min(span.col, state.config.mobile.columns)};\n`;
                css += `        grid-row: span ${span.row};\n`;
                css += `    }\n`;
            });
            css += `}\n`;
            return css;
        };

        if (type === 'css') return generateCSS();

        if (type === 'combined') {
            return `<style>\n${generateCSS()}</style>\n\n<div class="bento-grid">\n${state.items.map((item, i) => `    <div class="bento-item item-${i + 1}"></div>`).join('\n')}\n</div>`;
        }

        return '';
    }

    // --- Inspector Panel Logic ---
    function showInspector() {
        elements.inspectorPanel.classList.remove('hidden');
        const emptyState = document.getElementById('inspectorEmpty');
        if (emptyState) emptyState.classList.add('hidden');
    }

    function hideInspector() {
        elements.inspectorPanel.classList.add('hidden');
        const emptyState = document.getElementById('inspectorEmpty');
        if (emptyState) emptyState.classList.remove('hidden');
    }

    // --- Event Listeners ---

    // View Switching
    elements.deviceBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            switchView(btn.dataset.view);
        });
    });

    // Grid Controls
    elements.colCount.addEventListener('input', (e) => {
        state.config[state.view].columns = parseInt(e.target.value) || 1;
        renderGrid();
    });
    elements.rowCount.addEventListener('input', (e) => {
        state.config[state.view].rows = parseInt(e.target.value) || 1;
        renderGrid();
    });
    elements.gapSize.addEventListener('input', (e) => {
        state.config[state.view].gap = parseInt(e.target.value) || 0;
        renderGrid();
    });

    elements.addBtn.addEventListener('click', addItem);
    elements.clearBtn.addEventListener('click', () => {
        state.items = [];
        deselectItem();
    });

    // Inspector Controls
    elements.deleteItemBtn.addEventListener('click', deleteItem);

    // Stepper logic
    elements.stepBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.target; // colSpan or rowSpan
            const action = btn.dataset.action; // inc or dec
            const change = action === 'inc' ? 1 : -1;
            modifyItemSpan(target, change);
        });
    });

    // Background Click to Deselect
    document.addEventListener('click', (e) => {
        const isClickInsideGrid = e.target.closest('.bento-grid');
        const isClickInsideSidebar = e.target.closest('.right-sidebar');
        const isClickInsideModal = e.target.closest('.modal-overlay');
        const isClickButton = e.target.closest('button');

        if (!isClickInsideGrid && !isClickInsideSidebar && !isClickInsideModal && !isClickButton) {
            deselectItem();
        }
    });

    // Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
        if ((e.key === 'Delete' || e.key === 'Backspace') && state.selection) {
            // Prevent backspace from navigating back if not in an input
            if (e.target.tagName !== 'INPUT') {
                deleteItem();
            }
        }
    });

    // Code Export
    elements.getCodeBtn.addEventListener('click', () => {
        const css = generateCode('css');
        elements.codeOutput.textContent = css;
        elements.codeModal.classList.remove('hidden');

        // Reset tabs
        elements.modalTabs.forEach(t => t.classList.remove('active'));
        elements.modalTabs[0].classList.add('active'); // CSS active by default
    });

    elements.closeModal.addEventListener('click', () => {
        elements.codeModal.classList.add('hidden');
    });

    elements.copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(elements.codeOutput.textContent);
        const originalText = elements.copyBtn.innerText;
        elements.copyBtn.innerText = 'Copied!';
        setTimeout(() => elements.copyBtn.innerText = originalText, 2000);
    });

    // Modal Tabs logic
    elements.modalTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            elements.modalTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const type = tab.dataset.tab; // 'css' or 'html'
            elements.codeOutput.textContent = generateCode(type);
        });
    });

    // Initialize
    init();
});
