const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://127.0.0.1:5000/api'
    : '/api';


let charts = {};
let previousSwapCount = 0;

async function fetchJSON(endpoint) {
    try {
        const response = await fetch(`${API_URL}${endpoint}`);
        if (!response.ok) {
            if (response.status === 400) {
                return null;
            }
            throw new Error(`HTTP ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        return null;
    }
}

function formatNumber(num, decimals = 2) {
    if (num === undefined || num === null || isNaN(num)) return '—';
    return num.toFixed(decimals);
}

function formatCurrency(num) {
    if (num === undefined || num === null || isNaN(num)) return '$—';
    return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

async function updateHealthStatus() {
    const health = await fetchJSON('/health');
    if (health) {
        document.getElementById('healthStatus').textContent = health.status === 'operational' ? 'OPERATIONAL' : 'OFFLINE';
    }
}

async function updateEncryptionInfo() {
    const keyInfo = await fetchJSON('/keys/fhe_public');
    if (keyInfo) {
        document.getElementById('polyDegree').textContent = keyInfo.poly_degree;
        document.getElementById('coeffMod').textContent = keyInfo.coeff_modulus.toLocaleString();
        document.getElementById('scale').textContent = formatNumber(keyInfo.scale, 0);
        document.getElementById('encryptionAlgo').textContent = keyInfo.algorithm;
    }
}

async function updateSwapMetrics() {
    const [metadata, analytics] = await Promise.all([
        fetchJSON('/swaps/count'),
        fetchJSON('/analytics/aggregate')
    ]);

    if (!metadata) return;

    const swapCount = metadata.count || 0;
    const by_destination = metadata.by_destination || {};
    const by_platform = metadata.by_platform || {};

    document.getElementById('heroSwaps').textContent = swapCount;
    document.getElementById('swapCount').textContent = swapCount;

    if (swapCount > previousSwapCount) {
        const trend = previousSwapCount > 0 ? `+${Math.round((swapCount - previousSwapCount) / previousSwapCount * 100)}%` : 'LIVE';
        document.getElementById('swapTrend').textContent = trend;
    }
    previousSwapCount = swapCount;

    if (analytics) {
        const volume = analytics.total_volume_zec || 0;
        const fees = analytics.total_fees_zec || 0;
        const avgSwap = analytics.average_swap_zec || 0;

        document.getElementById('swapVolume').textContent = `${formatNumber(volume)} ZEC`;
        document.getElementById('swapAverage').textContent = `${formatNumber(avgSwap, 3)} ZEC`;
        document.getElementById('swapFees').textContent = `${formatNumber(fees, 4)} ZEC`;

        const avgFee = swapCount > 0 ? fees / swapCount : 0;
        document.getElementById('swapAvgFee').textContent = `Avg: ${formatNumber(avgFee, 4)} ZEC`;
    }

    const destCount = Object.keys(by_destination).length;
    const platformCount = Object.keys(by_platform).length;
    document.getElementById('destTotal').textContent = `${destCount} ${destCount === 1 ? 'asset' : 'assets'}`;
    document.getElementById('platformTotal').textContent = `${platformCount} ${platformCount === 1 ? 'platform' : 'platforms'}`;

    updateDestinationsChart(by_destination);
    updatePlatformsChart(by_platform);
}

async function updateTransactionMetrics() {
    const txData = await fetchJSON('/analytics/transactions');
    if (!txData) return;

    const count = txData.num_transactions || 0;
    const volume = txData.total_volume_zec || 0;
    const fees = txData.total_fees_zec || 0;
    const avgTx = txData.average_amount_zec || 0;

    document.getElementById('heroTransactions').textContent = count;
    document.getElementById('txCount').textContent = count;
    document.getElementById('txVolume').textContent = `${formatNumber(volume)} ZEC`;
    document.getElementById('txAverage').textContent = `${formatNumber(avgTx, 3)} ZEC`;
    document.getElementById('txFees').textContent = `${formatNumber(fees, 6)} ZEC`;

    const by_type = txData.by_type || {};
    const by_pool = txData.by_pool || {};
    const by_platform = txData.by_platform || {};

    const pools = Object.entries(by_pool);
    if (pools.length > 0) {
        const topPool = pools.reduce((a, b) => a[1] > b[1] ? a : b);
        const poolName = topPool[0].toUpperCase();
        document.getElementById('txTopPool').textContent = poolName;
    } else {
        document.getElementById('txTopPool').textContent = '—';
    }

    updateTxTypesChart(by_type);
    updateTxPoolsChart(by_pool);
    updateTxPlatformsChart(by_platform);
}

function initializeCharts() {
    const colors = {
        gold: 'rgba(251, 191, 36, 0.85)',
        emerald: 'rgba(52, 211, 153, 0.85)',
        rose: 'rgba(251, 113, 133, 0.85)',
        violet: 'rgba(167, 139, 250, 0.85)',
        cyan: 'rgba(34, 211, 238, 0.85)',
        gridColor: 'rgba(251, 191, 36, 0.08)',
        textColor: '#a1a1aa',
        borderColor: '#18181b'
    };

    Chart.defaults.font.family = "'JetBrains Mono', 'Outfit', monospace";

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: true,
                position: 'bottom',
                labels: {
                    color: colors.textColor,
                    padding: 16,
                    font: { size: 11, weight: 500 },
                    usePointStyle: true,
                    pointStyle: 'rectRounded'
                }
            }
        }
    };

    const barOptions = {
        ...chartOptions,
        plugins: { legend: { display: false } },
        scales: {
            y: {
                beginAtZero: true,
                grid: { color: colors.gridColor, drawBorder: false },
                ticks: { color: colors.textColor, font: { size: 10 } }
            },
            x: {
                grid: { display: false },
                ticks: { color: colors.textColor, font: { size: 10 } }
            }
        }
    };

    const destinationsCtx = document.getElementById('destinationsChart')?.getContext('2d');
    if (destinationsCtx) {
        charts.destinations = new Chart(destinationsCtx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: 'Swaps',
                    data: [],
                    backgroundColor: [colors.gold, colors.cyan, colors.emerald, colors.violet, colors.rose],
                    borderColor: [colors.gold, colors.cyan, colors.emerald, colors.violet, colors.rose],
                    borderWidth: 1,
                    borderRadius: 6,
                    barPercentage: 0.7
                }]
            },
            options: barOptions
        });
    }

    const platformsCtx = document.getElementById('platformsChart')?.getContext('2d');
    if (platformsCtx) {
        charts.platforms = new Chart(platformsCtx, {
            type: 'doughnut',
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    backgroundColor: [colors.gold, colors.emerald, colors.cyan, colors.violet],
                    borderWidth: 3,
                    borderColor: colors.borderColor,
                    hoverOffset: 8
                }]
            },
            options: { ...chartOptions, cutout: '65%' }
        });
    }

    const txTypesCtx = document.getElementById('txTypesChart')?.getContext('2d');
    if (txTypesCtx) {
        charts.txTypes = new Chart(txTypesCtx, {
            type: 'pie',
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    backgroundColor: [colors.emerald, colors.rose, colors.gold, colors.violet],
                    borderWidth: 3,
                    borderColor: colors.borderColor,
                    hoverOffset: 8
                }]
            },
            options: chartOptions
        });
    }

    const txPoolsCtx = document.getElementById('txPoolsChart')?.getContext('2d');
    if (txPoolsCtx) {
        charts.txPools = new Chart(txPoolsCtx, {
            type: 'doughnut',
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    backgroundColor: [colors.violet, colors.emerald, colors.cyan],
                    borderWidth: 3,
                    borderColor: colors.borderColor,
                    hoverOffset: 8
                }]
            },
            options: { ...chartOptions, cutout: '65%' }
        });
    }

    const txPlatformsCtx = document.getElementById('txPlatformsChart')?.getContext('2d');
    if (txPlatformsCtx) {
        charts.txPlatforms = new Chart(txPlatformsCtx, {
            type: 'doughnut',
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    backgroundColor: [colors.gold, colors.cyan, colors.rose],
                    borderWidth: 3,
                    borderColor: colors.borderColor,
                    hoverOffset: 8
                }]
            },
            options: { ...chartOptions, cutout: '65%' }
        });
    }
}

function updateDestinationsChart(by_destination) {
    if (!charts.destinations) return;

    const entries = Object.entries(by_destination).sort((a, b) => b[1] - a[1]);
    charts.destinations.data.labels = entries.map(e => e[0]);
    charts.destinations.data.datasets[0].data = entries.map(e => e[1]);
    charts.destinations.update('none');
}

function updatePlatformsChart(by_platform) {
    if (!charts.platforms) return;

    const entries = Object.entries(by_platform);
    charts.platforms.data.labels = entries.map(e => e[0].toUpperCase());
    charts.platforms.data.datasets[0].data = entries.map(e => e[1]);
    charts.platforms.update('none');
}

function updateTxTypesChart(by_type) {
    if (!charts.txTypes) return;

    const entries = Object.entries(by_type);
    charts.txTypes.data.labels = entries.map(e => e[0].charAt(0).toUpperCase() + e[0].slice(1));
    charts.txTypes.data.datasets[0].data = entries.map(e => e[1]);
    charts.txTypes.update('none');
}

function updateTxPoolsChart(by_pool) {
    if (!charts.txPools) return;

    const entries = Object.entries(by_pool);
    charts.txPools.data.labels = entries.map(e => e[0].charAt(0).toUpperCase() + e[0].slice(1));
    charts.txPools.data.datasets[0].data = entries.map(e => e[1]);
    charts.txPools.update('none');
}

function updateTxPlatformsChart(by_platform) {
    if (!charts.txPlatforms) return;

    const entries = Object.entries(by_platform);
    charts.txPlatforms.data.labels = entries.map(e => e[0].toUpperCase());
    charts.txPlatforms.data.datasets[0].data = entries.map(e => e[1]);
    charts.txPlatforms.update('none');
}

async function updateCombinedVolume() {
    const [swapAnalytics, txData] = await Promise.all([
        fetchJSON('/analytics/aggregate'),
        fetchJSON('/analytics/transactions')
    ]);

    const swapVolume = swapAnalytics?.total_volume_zec || 0;
    const txVolume = txData?.total_volume_zec || 0;
    const combinedVolume = swapVolume + txVolume;

    document.getElementById('heroVolume').textContent = formatNumber(combinedVolume) + ' ZEC';
}

async function refreshData() {
    await Promise.all([
        updateHealthStatus(),
        updateSwapMetrics(),
        updateTransactionMetrics(),
        updateCombinedVolume()
    ]);
}

window.refreshData = refreshData;

document.addEventListener('DOMContentLoaded', async () => {
    initializeCharts();
    await refreshData();

    setInterval(refreshData, 5000);
});
