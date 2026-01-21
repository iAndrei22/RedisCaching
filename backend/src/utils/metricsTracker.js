// Shared metrics tracker for all cache operations
const metricsData = {
    hits: { user_tasks: 0, user_stats: 0, other: 0 },
    misses: { user_tasks: 0, user_stats: 0, other: 0 },
    latencies: { hits: [], misses: [] },
    operations: []
};

const recordCacheHit = (type = 'other', latency = 0) => {
    if (!metricsData.hits[type]) metricsData.hits[type] = 0;
    metricsData.hits[type]++;
    metricsData.latencies.hits.push(latency);
    metricsData.operations.push({
        timestamp: new Date().toISOString(),
        type,
        status: 'HIT',
        latency
    });
    // Keep only last 100 operations
    if (metricsData.operations.length > 100) {
        metricsData.operations.shift();
    }
};

const recordCacheMiss = (type = 'other', latency = 0) => {
    if (!metricsData.misses[type]) metricsData.misses[type] = 0;
    metricsData.misses[type]++;
    metricsData.latencies.misses.push(latency);
    metricsData.operations.push({
        timestamp: new Date().toISOString(),
        type,
        status: 'MISS',
        latency
    });
    // Keep only last 100 operations
    if (metricsData.operations.length > 100) {
        metricsData.operations.shift();
    }
};

const getMetricsData = () => {
    return metricsData;
};

const resetMetrics = () => {
    metricsData.hits = { user_tasks: 0, user_stats: 0, other: 0 };
    metricsData.misses = { user_tasks: 0, user_stats: 0, other: 0 };
    metricsData.latencies = { hits: [], misses: [] };
    metricsData.operations = [];
};

module.exports = {
    metricsData,
    recordCacheHit,
    recordCacheMiss,
    getMetricsData,
    resetMetrics
};
