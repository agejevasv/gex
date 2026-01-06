import { createChart } from './chart.js';
import { formatTimestamp, formatBillions, valueClass } from './util.js';

const ICONS = {
    clock: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`,
    bank: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="10" width="18" height="11" rx="2"></rect><path d="M12 3L3 10h18L12 3z"></path><line x1="12" y1="14" x2="12" y2="17"></line></svg>`,
    chevron: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>`
};

const SPINNER_HTML = `
    <div class="loading-overlay">
        <svg class="spinner" viewBox="0 0 50 50">
            <circle cx="25" cy="25" r="20" fill="none" stroke-width="4"></circle>
        </svg>
    </div>
`;

export class UI {
    constructor() {
        this.charts = { oi: null, vol: null };
        this.gex = null;
        this.elements = this.cacheElements();
        this.bindEvents();
    }

    cacheElements() {
        return {
            content: document.getElementById('content'),
            tabs: document.getElementById('tabs'),
            tabsMobile: document.getElementById('tabs-mobile'),
            viewMode: document.getElementById('view-mode'),
            viewModeMobile: document.getElementById('view-mode-mobile'),
            fetchBtn: document.getElementById('fetch-btn'),
            fetchBtnMobile: document.getElementById('fetch-btn-mobile'),
            centerBtn: document.getElementById('center-btn'),
            centerBtnMobile: document.getElementById('center-btn-mobile'),
            menuBtn: document.getElementById('menu-btn'),
            mobileMenu: document.getElementById('mobile-menu')
        };
    }

    bindEvents() {
        const { fetchBtn, fetchBtnMobile, centerBtn, centerBtnMobile, menuBtn, viewMode, viewModeMobile } = this.elements;

        fetchBtn.addEventListener('click', () => this.onRefresh?.());
        fetchBtnMobile.addEventListener('click', () => this.onRefresh?.());
        centerBtn.addEventListener('click', () => this.recenterCharts());
        centerBtnMobile.addEventListener('click', () => this.recenterCharts());

        viewMode.addEventListener('click', e => this.handleViewModeChange(e));
        viewModeMobile.addEventListener('click', e => this.handleViewModeChange(e));

        menuBtn.addEventListener('click', () => this.toggleMobileMenu());
        document.addEventListener('click', e => this.closeMobileMenuOnOutsideClick(e));
    }

    handleViewModeChange(e) {
        const btn = e.target.closest('.seg');
        if (!btn) return;

        const value = btn.dataset.value;
        document.querySelectorAll('#view-mode .seg, #view-mode-mobile .seg').forEach(b => {
            b.classList.toggle('active', b.dataset.value === value);
        });

        if (this.gex) {
            this.render(this.gex, value);
        }
    }

    toggleMobileMenu() {
        this.elements.mobileMenu.classList.toggle('open');
    }

    closeMobileMenuOnOutsideClick(e) {
        const { mobileMenu, menuBtn } = this.elements;
        if (!mobileMenu.contains(e.target) && !menuBtn.contains(e.target)) {
            mobileMenu.classList.remove('open');
        }
    }

    getViewMode() {
        return this.elements.viewMode.querySelector('.seg.active').dataset.value;
    }

    setLoading(loading) {
        const { fetchBtn, fetchBtnMobile, content } = this.elements;
        fetchBtn.disabled = loading;
        fetchBtnMobile.disabled = loading;
        fetchBtn.classList.toggle('is-fetching', loading);
        fetchBtnMobile.classList.toggle('is-fetching', loading);

        // Full overlay only for initial load
        if (this.charts.oi || this.charts.vol) return;

        const existingOverlay = content.querySelector('.loading-overlay');
        if (loading && !existingOverlay) {
            content.insertAdjacentHTML('beforeend', SPINNER_HTML);
        } else if (!loading && existingOverlay) {
            existingOverlay.remove();
        }
    }

    showError(message) {
        this.elements.content.innerHTML = `<div class="error">Error: ${message}</div>`;
    }

    recenterCharts() {
        Object.values(this.charts).forEach(chart => chart?.recenter());
    }

    render(gex, mode) {
        const hasCharts = this.charts.oi || this.charts.vol;
        this.gex = gex;

        const activeTab = document.querySelector('.tab.active')?.dataset.tab || 'oi';
        const summary = gex.getSummary(mode);

        if (hasCharts) {
            this.updateChartsData(gex, mode);
            this.updateLegends(summary, mode, gex);
        } else {
            this.renderTabs(activeTab);
            this.renderContent(gex, mode, activeTab, summary);
            this.createChartForTab(activeTab, gex, mode);
            this.bindTabEvents(gex);
            this.bindLegendToggles();
        }
    }

    updateChartsData(gex, mode) {
        const fields = { oi: 'gex', vol: 'vex' };
        for (const [tab, chart] of Object.entries(this.charts)) {
            if (chart) {
                const data = gex.getStrikeData(fields[tab], mode);
                chart.updateData(data, mode, gex.currentPrice);
            }
        }
    }

    updateLegends(summary, mode, gex) {
        const timestamp = formatTimestamp(gex.timestamp);
        const tradeDate = gex.getLastTradeTime();

        const updateLegend = (container, data) => {
            const legend = container?.querySelector('.chart-legend');
            if (!legend) return;

            const wasCollapsed = legend.classList.contains('collapsed');
            const newLegend = this.renderLegend(data, mode, timestamp, tradeDate);
            legend.outerHTML = newLegend;

            const updatedLegend = container.querySelector('.chart-legend');
            if (wasCollapsed) updatedLegend.classList.add('collapsed');
        };

        updateLegend(document.getElementById('chart-oi'), summary.gex0dte);
        updateLegend(document.getElementById('chart-vol'), summary.vex0dte);
        this.bindLegendToggles();
    }

    renderTabs(activeTab) {
        const html = `
            <button class="tab${activeTab === 'oi' ? ' active' : ''}" data-tab="oi">OI</button>
            <button class="tab${activeTab === 'vol' ? ' active' : ''}" data-tab="vol">Vol</button>
        `;
        this.elements.tabs.innerHTML = html;
        this.elements.tabsMobile.innerHTML = html;
    }

    renderContent(gex, mode, activeTab, summary) {
        const timestamp = formatTimestamp(gex.timestamp);
        const tradeDate = gex.getLastTradeTime();

        this.elements.content.innerHTML = `
            <div class="tab-content${activeTab === 'oi' ? ' active' : ''}" id="tab-oi">
                <div class="chart-container">
                    <div class="chart-box" id="chart-oi">
                        ${this.renderLegend(summary.gex0dte, mode, timestamp, tradeDate)}
                    </div>
                </div>
            </div>
            <div class="tab-content${activeTab === 'vol' ? ' active' : ''}" id="tab-vol">
                <div class="chart-container">
                    <div class="chart-box" id="chart-vol">
                        ${this.renderLegend(summary.vex0dte, mode, timestamp, tradeDate)}
                    </div>
                </div>
            </div>
        `;
    }

    renderLegend(data, mode, timestamp, tradeDate) {
        const toggleBtn = `<div class="legend-toggle">${ICONS.chevron}</div>`;

        if (mode === 'net') {
            return `
                <div class="chart-legend">
                    <div class="legend-labels">
                        <span><div class="legend-dot calls"></div> Positive</span>
                        <span><div class="legend-dot puts"></div> Negative</span>
                    </div>
                    <div class="legend-values">
                        <span class="${valueClass(data.total)}" style="font-weight:600">${formatBillions(data.total)}B</span>
                        <span class="muted">(${formatBillions(data.below)} / ${formatBillions(data.above)})</span>
                    </div>
                    <span class="muted">${ICONS.clock} ${timestamp}</span>
                    <span class="muted">${ICONS.bank} ${tradeDate}</span>
                    ${toggleBtn}
                </div>
            `;
        }

        return `
            <div class="chart-legend">
                <div class="legend-labels">
                    <span><div class="legend-dot calls"></div> Calls</span>
                    <span><div class="legend-dot puts"></div> Puts</span>
                </div>
                <div class="legend-values">
                    <span class="positive" style="font-weight:600">+${data.calls.toFixed(2)}B</span>
                    <span class="negative" style="font-weight:600">-${data.puts.toFixed(2)}B</span>
                </div>
                <span class="muted">${ICONS.clock} ${timestamp}</span>
                <span class="muted">${ICONS.bank} ${tradeDate}</span>
                ${toggleBtn}
            </div>
        `;
    }

    createChartForTab(tab, gex, mode) {
        if (this.charts[tab]) return this.charts[tab];

        const field = tab === 'oi' ? 'gex' : 'vex';
        const data = gex.getStrikeData(field, mode);
        const container = document.getElementById(`chart-${tab}`);

        this.charts[tab] = createChart(container, data, gex.currentPrice, mode);
        return this.charts[tab];
    }

    bindTabEvents(gex) {
        document.querySelectorAll('.tabs').forEach(tabs => {
            tabs.addEventListener('click', e => {
                const tab = e.target.closest('.tab')?.dataset.tab;
                if (!tab) return;

                document.querySelectorAll('.tab').forEach(t => {
                    t.classList.toggle('active', t.dataset.tab === tab);
                });
                document.querySelectorAll('.tab-content').forEach(c => {
                    c.classList.toggle('active', c.id === `tab-${tab}`);
                });

                this.createChartForTab(tab, gex, this.getViewMode()).recenter();
            });
        });
    }

    bindLegendToggles() {
        document.querySelectorAll('.legend-toggle').forEach(toggle => {
            toggle.addEventListener('click', () => {
                toggle.closest('.chart-legend').classList.toggle('collapsed');
            });
        });
    }
}
