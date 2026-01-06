import config from './config.js';

const STRIKE_RANGE = { lower: 0.92, upper: 1.08 };
const BILLIONS = 1e9;

export class GEX {
    constructor(ticker, date) {
        this.ticker = ticker;
        this.date = date;
        this.currentPrice = null;
        this.timestamp = null;
        this.options = [];
        this.options0dte = [];
    }

    async load() {
        const response = await fetch(`${config.apiUrl}/${this.ticker}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch data (${response.status})`);
        }
        const quotes = await response.json();
        this.parse(quotes);
        this.calculateExposure();
        return this;
    }

    parse(quotes) {
        const symbol = this.ticker.replace('_', '');
        this.currentPrice = quotes.data.current_price;
        this.timestamp = quotes.timestamp;

        this.options = quotes.data.options.map(opt => ({
            ...opt,
            type: opt.option.match(/\d([CP])\d/)?.[1] || null,
            strike: parseInt(opt.option.match(/\d[CP](\d+)\d{3}/)?.[1]) || null
        }));

        this.options0dte = this.options.filter(opt =>
            opt.option.startsWith(`${symbol}W${this.date}`) ||
            opt.option.startsWith(`${symbol}${this.date}`)
        );
    }

    calculateExposure() {
        const multiplier = 100 * this.currentPrice ** 2 * 0.01;

        const addExposure = item => {
            const gamma = item.gamma || 0;
            const sign = item.type === 'P' ? -1 : 1;
            return {
                ...item,
                gex: gamma * (item.open_interest || 0) * multiplier * sign,
                vex: gamma * (item.volume || 0) * multiplier * sign
            };
        };

        this.options = this.options.map(addExposure);
        this.options0dte = this.options0dte.map(addExposure);
    }

    getStrikeData(field, mode) {
        const lower = this.currentPrice * STRIKE_RANGE.lower;
        const upper = this.currentPrice * STRIKE_RANGE.upper;
        const inRange = item => item.strike >= lower && item.strike <= upper;

        if (mode === 'net') {
            return { net: this.aggregateNet(field, inRange) };
        }
        return this.aggregateByType(field, inRange);
    }

    aggregateNet(field, filter) {
        const byStrike = {};
        for (const item of this.options0dte) {
            if (!filter(item)) continue;
            byStrike[item.strike] = (byStrike[item.strike] || 0) + (item[field] || 0) / BILLIONS;
        }
        return this.toSortedArray(byStrike);
    }

    aggregateByType(field, filter) {
        const calls = {}, puts = {};
        for (const item of this.options0dte) {
            if (!filter(item)) continue;
            const value = Math.abs(item[field] || 0) / BILLIONS;
            if (item.type === 'C') calls[item.strike] = (calls[item.strike] || 0) + value;
            if (item.type === 'P') puts[item.strike] = (puts[item.strike] || 0) + value;
        }
        return {
            calls: this.toSortedArray(calls, 1),
            puts: this.toSortedArray(puts, -1)
        };
    }

    toSortedArray(obj, sign = 1) {
        return Object.entries(obj)
            .map(([strike, value]) => ({ strike: +strike, value: value * sign }))
            .sort((a, b) => a.strike - b.strike);
    }

    getLastTradeTime() {
        const times = this.options0dte
            .map(o => o.last_trade_time)
            .filter(Boolean)
            .sort();
        return new Date(times.at(-1) + '-05:00')
            .toLocaleString('sv')
            .replace('T', ' ');
    }

    getSummary(mode) {
        if (mode === 'net') {
            return this.getNetSummary();
        }
        return this.getTypeSummary();
    }

    getNetSummary() {
        const sum = (field, condition) => this.options0dte
            .filter(i => !condition || condition(i))
            .reduce((s, i) => s + (i[field] || 0), 0) / BILLIONS;

        const price = this.currentPrice;
        return {
            gex0dte: {
                total: sum('gex'),
                below: sum('gex', i => i.strike < price),
                above: sum('gex', i => i.strike >= price)
            },
            vex0dte: {
                total: sum('vex'),
                below: sum('vex', i => i.strike < price),
                above: sum('vex', i => i.strike >= price)
            }
        };
    }

    getTypeSummary() {
        const sumByType = (field, type) => this.options0dte
            .filter(i => i.type === type)
            .reduce((s, i) => s + Math.abs(i[field] || 0), 0) / BILLIONS;

        return {
            gex0dte: { calls: sumByType('gex', 'C'), puts: sumByType('gex', 'P') },
            vex0dte: { calls: sumByType('vex', 'C'), puts: sumByType('vex', 'P') }
        };
    }
}
