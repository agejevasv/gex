import { GEX } from './gex.js';
import { UI } from './ui.js';
import { getTradingDay } from './util.js';

class App {
    constructor() {
        this.ui = new UI();
        this.ui.onRefresh = () => this.load();
        this.autoFetchInterval = null;
        this.bindAutoFetch();
    }

    bindAutoFetch() {
        const autoFetch = document.getElementById('auto-fetch');
        const autoFetchMobile = document.getElementById('auto-fetch-mobile');

        const syncAndUpdate = (checked) => {
            autoFetch.checked = checked;
            autoFetchMobile.checked = checked;
            this.setAutoFetch(checked);
        };

        autoFetch.addEventListener('change', (e) => syncAndUpdate(e.target.checked));
        autoFetchMobile.addEventListener('change', (e) => syncAndUpdate(e.target.checked));

        // Start auto-fetch since it's on by default
        this.setAutoFetch(true);
    }

    setAutoFetch(enabled) {
        if (this.autoFetchInterval) {
            clearInterval(this.autoFetchInterval);
            this.autoFetchInterval = null;
        }
        if (enabled) {
            this.autoFetchInterval = setInterval(() => this.load(), 60000);
        }
    }

    async load() {
        this.ui.setLoading(true);

        try {
            const gex = await new GEX('_SPX', getTradingDay()).load();
            this.ui.render(gex, this.ui.getViewMode());
        } catch (err) {
            this.ui.showError(err.message);
        } finally {
            this.ui.setLoading(false);
        }
    }
}

function init() {
    const app = new App();
    app.load();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
