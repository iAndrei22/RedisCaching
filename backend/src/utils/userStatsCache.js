// User stats: fetch directly from MongoDB (no Redis caching)
const Task = require('../models/task.model');

// Always compute fresh from DB
const getUserStats = async (userId) => {
    const tasks = await Task.find({ userId, isCompleted: true });
    const totalPoints = tasks.reduce((sum, t) => sum + (t.points || 0), 0);
    return { totalPoints, completedTasksCount: tasks.length };
};

// No-op setter (kept for interface compatibility)
const setUserStats = async (userId, stats) => {
    return stats;
};

// No-op invalidation (nothing cached)
const invalidateUserStats = async (userId) => {
    return true;
};

module.exports = { getUserStats, setUserStats, invalidateUserStats };
