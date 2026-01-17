export function getTradingDay() {
    const date = new Date();
    const day = date.getDay();
    if (day === 0) date.setDate(date.getDate() + 1);
    if (day === 6) date.setDate(date.getDate() + 2);
    return date.toISOString().slice(2, 10).replace(/-/g, '');
}

export function isWeekend() {
    const day = new Date().getDay();
    return day === 0 || day === 6;
}

export function formatTimestamp(str) {
    return new Date(str.replace(' ', 'T') + 'Z')
        .toLocaleString('sv')
        .replace('T', ' ');
}

export function formatBillions(n) {
    return (n >= 0 ? '+' : '') + n.toFixed(2);
}

export function valueClass(n) {
    return n >= 0 ? 'positive' : 'negative';
}
