// Utility for managing leaderboard cache - caches rank order only, not points
const { createClient } = require("redis");
const { recordCacheHit, recordCacheMiss } = require("./metricsTracker");
const redisClient = createClient();
redisClient.connect();

const LEADERBOARD_KEY = "user_leaderboard";
const LEADERBOARD_TTL = 180; // 3 minutes
const TOP_N = 3;

// Helper: Get current top 3 from DB with points
const getTop3FromDB = async () => {
    const Task = require('../models/task.model');
    const User = require('../models/user.model');
    
    const tasks = await Task.find({ isCompleted: true });
    const userStats = {};
    
    tasks.forEach(task => {
        const userId = task.userId.toString();
        if (!userStats[userId]) {
            userStats[userId] = { points: 0, userId };
        }
        userStats[userId].points += task.points || 0;
    });
    
    const userIds = Object.keys(userStats);
    const users = await User.find({ _id: { $in: userIds } });
    
    return users.map(user => ({
        userId: user._id.toString(),
        username: user.username,
        points: userStats[user._id.toString()].points
    })).sort((a, b) => b.points - a.points).slice(0, TOP_N);
};

// Helper: Extract rank order signature (userId only - just the ordering)
const getRankOrder = (leaderboard) => 
    leaderboard.map(entry => entry.userId).join('|');

// Get top 3 users from leaderboard (rank order only from cache, points fetched separately)
const getTopUsers = async () => {
    const start = Date.now();
    
    try {
        // Try to get from Redis cache first (rank order only)
        const cachedRanking = await redisClient.get(LEADERBOARD_KEY);
        
        if (cachedRanking) {
            const latency = Date.now() - start;
            console.log(`[LEADERBOARD CACHE HIT] latency=${latency}ms`);
            recordCacheHit('leaderboard', latency);
            
            const userIds = cachedRanking.split('|');
            const pointsMap = await getUsersPoints(userIds);
            const User = require('../models/user.model');
            const users = await User.find({ _id: { $in: userIds } });
            const userNameMap = users.reduce((acc, user) => {
                acc[user._id.toString()] = user.username;
                return acc;
            }, {});
            
            return userIds.map((userId, index) => ({
                rank: index + 1,
                userId,
                username: userNameMap[userId] || 'Unknown',
                points: pointsMap[userId] || 0
            }));
        }
        
        // Cache miss - fallback to MongoDB
        console.log(`[LEADERBOARD CACHE MISS] Falling back to MongoDB`);
        const leaderboard = await getTop3FromDB();
        
        // Cache only the rank order (userId list), not points
        const rankOrder = getRankOrder(leaderboard);
        await redisClient.set(LEADERBOARD_KEY, rankOrder, { EX: LEADERBOARD_TTL });
        
        const latency = Date.now() - start;
        console.log(`[LEADERBOARD DB QUERY] top=${leaderboard.length} latency=${latency}ms ttl=${LEADERBOARD_TTL}s`);
        recordCacheMiss('leaderboard', latency);
        
        return leaderboard.map((entry, index) => ({
            rank: index + 1,
            userId: entry.userId,
            username: entry.username,
            points: entry.points
        }));
        
    } catch (err) {
        console.error("Leaderboard fetch error:", err);
        return [];
    }
};

// Update leaderboard: only invalidate if top 3 rank order changes
const updateLeaderboardIfChanged = async (userId) => {
    try {
        // Get cached rank order
        const cachedRanking = await redisClient.get(LEADERBOARD_KEY);
        const oldOrder = cachedRanking ? cachedRanking : null;
        
        // Get new top 3 from DB
        const newTop = await getTop3FromDB();
        const newOrder = getRankOrder(newTop);
        
        // Only invalidate if rank order actually changed
        if (oldOrder && oldOrder !== newOrder) {
            await redisClient.del(LEADERBOARD_KEY);
            console.log(`[LEADERBOARD RANK ORDER CHANGED] Cache invalidated`);
            return true;
        } else if (!oldOrder) {
            console.log(`[LEADERBOARD] No cached ranking yet`);
            return true;
        } else {
            console.log(`[LEADERBOARD POSITIONS UNCHANGED] Cache kept warm`);
            return false;
        }
    } catch (err) {
        console.error("Leaderboard update error:", err);
        return false;
    }
};

// Get fresh points for specific users (no caching)
const getUsersPoints = async (userIds) => {
    try {
        const Task = require('../models/task.model');
        const tasks = await Task.find({ userId: { $in: userIds }, isCompleted: true });
        const pointsMap = {};
        
        userIds.forEach(id => {
            pointsMap[id.toString()] = 0;
        });
        
        tasks.forEach(task => {
            const userId = task.userId.toString();
            pointsMap[userId] = (pointsMap[userId] || 0) + (task.points || 0);
        });
        
        return pointsMap;
    } catch (err) {
        console.error("Get users points error:", err);
        return {};
    }
};

// Clear the entire leaderboard
const clearLeaderboard = async () => {
    try {
        await redisClient.del(LEADERBOARD_KEY);
        console.log("[LEADERBOARD CLEARED]");
    } catch (err) {
        console.error("Leaderboard clear error:", err);
    }
};

module.exports = {
    getTopUsers,
    updateLeaderboardIfChanged,
    getUsersPoints,
    clearLeaderboard
};
