import config from './config.js';

const { colors } = config;

const CHART_OPTIONS = {
    layout: {
        background: { color: colors.background },
        textColor: colors.text,
        attributionLogo: false
    },
    grid: {
        vertLines: { color: colors.grid },
        horzLines: { color: colors.grid }
    },
    rightPriceScale: {
        borderColor: colors.border,
        scaleMargins: { top: 0.05, bottom: 0.05 }
    },
    crosshair: {
        horzLine: { color: colors.text, labelBackgroundColor: colors.border },
        vertLine: { color: colors.text, labelBackgroundColor: colors.border, labelVisible: true }
    }
};

export class StrikeChart {
    constructor(container) {
        this.container = container;
        this.chart = null;
        this.series = [];
        this.priceLine = null;
        this.strikes = [];
        this.strikeIndex = {};
        this.priceStrikeIdx = null;
        this.allData = [];
        this.priceLabel = null;

        this.preserveLegend();
        this.observeResize();
    }

    preserveLegend() {
        const legend = this.container.querySelector('.chart-legend');
        this.container.innerHTML = '';
        if (legend) this.container.appendChild(legend);
    }

    observeResize() {
        new ResizeObserver(() => this.resize()).observe(this.container);
    }

    resize() {
        if (!this.chart) return;
        this.chart.applyOptions({
            width: this.container.clientWidth,
            height: this.container.clientHeight
        });
    }

    create() {
        const formatStrike = i => this.strikes[i]?.toString() || '';

        this.chart = LightweightCharts.createChart(this.container, {
            ...CHART_OPTIONS,
            width: this.container.clientWidth,
            height: this.container.clientHeight || 640,
            timeScale: {
                borderColor: colors.border,
                tickMarkFormatter: formatStrike
            },
            localization: { timeFormatter: formatStrike }
        });
    }

    buildStrikes(currentPrice) {
        const max = Math.round(currentPrice * 2 / 5) * 5;
        this.strikes = Array.from({ length: max / 5 + 1 }, (_, i) => i * 5);
        this.strikeIndex = Object.fromEntries(this.strikes.map((s, i) => [s, i]));
    }

    setData(data, mode, currentPrice) {
        this.buildStrikes(currentPrice);
        this.allData = mode === 'net' ? data.net : [...data.calls, ...data.puts];
        this.create();

        if (mode === 'net') {
            this.renderNet(data.net);
        } else {
            this.renderCallsPuts(data);
        }
    }

    updateData(data, mode, currentPrice) {
        this.buildStrikes(currentPrice);
        this.allData = mode === 'net' ? data.net : [...data.calls, ...data.puts];
        this.clearSeries();

        if (mode === 'net') {
            this.renderNet(data.net);
        } else {
            this.renderCallsPuts(data);
        }

        this.addPriceMarker(currentPrice);
    }

    histogramOptions(color) {
        return {
            color,
            priceFormat: { type: 'custom', formatter: p => p.toFixed(2) + 'B' },
            priceScaleId: 'right',
            lastValueVisible: false
        };
    }

    clearSeries() {
        this.series.forEach(s => {
            try { this.chart.removeSeries(s); } catch {}
        });
        this.series = [];
        if (this.priceLine) {
            try { this.chart.removeSeries(this.priceLine); } catch {}
            this.priceLine = null;
        }
    }

    renderNet(data) {
        const dataMap = new Map(data.map(d => [d.strike, d.value]));
        const series = this.chart.addSeries(
            LightweightCharts.HistogramSeries,
            this.histogramOptions()
        );
        this.series.push(series);

        series.setData(this.strikes.map((strike, i) => {
            const value = dataMap.get(strike) || 0;
            return {
                time: i,
                value,
                color: value >= 0 ? colors.positive : colors.negative
            };
        }));
    }

    renderCallsPuts(data) {
        const callMap = new Map(data.calls.map(d => [d.strike, d.value]));
        const putMap = new Map(data.puts.map(d => [d.strike, d.value]));

        const callSeries = this.chart.addSeries(
            LightweightCharts.HistogramSeries,
            this.histogramOptions(colors.positive)
        );
        const putSeries = this.chart.addSeries(
            LightweightCharts.HistogramSeries,
            this.histogramOptions(colors.negative)
        );
        this.series.push(callSeries, putSeries);

        const toData = (map) => this.strikes.map((strike, i) => ({
            time: i,
            value: map.get(strike) || 0
        }));

        callSeries.setData(toData(callMap));
        putSeries.setData(toData(putMap));
    }

    centerOn(strikeIdx) {
        this.chart.timeScale().setVisibleLogicalRange({
            from: strikeIdx - 100,
            to: strikeIdx + 100
        });
    }

    addPriceMarker(price) {
        if (!price || !this.strikes.length) return;

        const closest = this.strikes.reduce((a, b) =>
            Math.abs(b - price) < Math.abs(a - price) ? b : a
        );
        this.priceStrikeIdx = this.strikeIndex[closest];

        this.centerOn(this.priceStrikeIdx);
        this.addPriceLine(this.priceStrikeIdx);
        this.addPriceLabel(this.priceStrikeIdx, price);
    }

    addPriceLine(strikeIdx) {
        const maxVal = Math.max(...this.allData.map(d => Math.abs(d.value)), 0.1);

        this.priceLine = this.chart.addSeries(LightweightCharts.LineSeries, {
            color: colors.priceLine,
            lineWidth: 1,
            lineStyle: 2,
            priceLineVisible: false,
            lastValueVisible: false,
            crosshairMarkerVisible: false,
            priceScaleId: 'right',
            autoscaleInfoProvider: () => ({
                priceRange: { minValue: -maxVal * 1.1, maxValue: maxVal * 1.1 }
            })
        });

        const extent = maxVal * 100;
        this.priceLine.setData([
            { time: strikeIdx, value: -extent },
            { time: strikeIdx, value: extent }
        ]);
    }

    addPriceLabel(strikeIdx, price) {
        if (this.priceLabel) {
            this.priceLabel.remove();
        }

        const label = document.createElement('div');
        label.className = 'x-axis-marker';
        label.textContent = price.toFixed(0);
        this.container.appendChild(label);
        this.priceLabel = label;

        const updatePosition = () => {
            const x = this.chart.timeScale().logicalToCoordinate(strikeIdx);
            label.style.display = x === null ? 'none' : 'block';
            if (x !== null) label.style.left = x + 'px';
        };

        requestAnimationFrame(updatePosition);
        this.chart.timeScale().subscribeVisibleLogicalRangeChange(updatePosition);
    }

    recenter() {
        if (this.priceStrikeIdx !== null) {
            this.centerOn(this.priceStrikeIdx);
        }
    }
}

export function createChart(container, data, currentPrice, mode) {
    const chart = new StrikeChart(container);
    chart.setData(data, mode, currentPrice);
    chart.addPriceMarker(currentPrice);
    return chart;
}
