
const Task = require('../models/task.model');
const User = require('../models/user.model');
const path = require('path');
const fs = require('fs');

// Load badges config
const badgesPath = path.join(__dirname, '../badges.json');
const BADGES = JSON.parse(fs.readFileSync(badgesPath, 'utf8'));

// Helper: Check and assign badges to user
async function checkAndAssignBadges(userId) {
    const user = await User.findById(userId);
    if (!user) return;

    // Get user stats from MongoDB
    const { getUserStats } = require("../utils/userStatsCache");
    let stats = await getUserStats(userId);
    let tasks, completedTasks, totalPoints;
    if (stats) {
        completedTasks = Array(stats.completedTasksCount).fill({}); // dummy array for badge logic
        totalPoints = stats.totalPoints;
    } else {
        tasks = await Task.find({ userId });
        completedTasks = tasks.filter(t => t.isCompleted);
        totalPoints = completedTasks.reduce((sum, t) => sum + (t.points || 0), 0);
        await setUserStats(userId, { totalPoints, completedTasksCount: completedTasks.length });
    }

    // Early Bird: complete at least one task before 8:00
    const hasEarlyBird = completedTasks.some(t => {
        if (!t.updatedAt) return false;
        const date = new Date(t.updatedAt);
        return date.getHours() < 8;
    });

    // Build badge checks
    const earned = [];
    BADGES.forEach(badge => {
        if (user.badges.includes(badge.id)) return;
        if (badge.type === 'points' && totalPoints >= badge.milestone) earned.push(badge.id);
        if (badge.type === 'tasks_completed' && completedTasks.length >= badge.milestone) earned.push(badge.id);
        if (badge.type === 'early_task' && hasEarlyBird) earned.push(badge.id);
    });

    if (earned.length > 0) {
        user.badges.push(...earned);
        await user.save();
    }
}

// Service to handle Task logic

// 1. Create a new task
const createTask = async (userId, title, description, points) => {
    // Validation: Ensure required fields are present
    if (!userId) throw new Error("User ID is required.");
    if (!title || title.trim() === "") throw new Error("Task title cannot be empty.");
    if (!description || description.trim() === "") throw new Error("Task description cannot be empty.");


    // Create and save to MongoDB
    const task = await Task.create({
        userId,
        title,
        description,
        points: points || 10,
        isCompleted: false
    });
    // Invalidate user stats cache (new task not completed, no leaderboard impact)
    const { invalidateUserStats } = require("../utils/userStatsCache");
    await invalidateUserStats(userId);
    return task;
};

// 2. Get all tasks for a specific user
const getUserTasks = async (userId) => {
    if (!userId) {
        throw new Error("User ID is required to fetch tasks.");
    }

    // Find tasks by userId and sort by newest first
    const tasks = await Task.find({ userId }).sort({ createdAt: -1 });
    return tasks;
};

// 3. Delete a task
const deleteTask = async (taskId) => {
    if (!taskId) {
        throw new Error("Task ID is required.");
    }
    const task = await Task.findByIdAndDelete(taskId);
    if (task && task.userId) {
        const { invalidateUserStats } = require("../utils/userStatsCache");
        const { updateLeaderboardIfChanged } = require("../utils/leaderboardCache");
        await invalidateUserStats(task.userId);
        // Only check leaderboard if this was a completed task
        if (task.isCompleted) {
            await updateLeaderboardIfChanged(task.userId);
        }
    }
    return task;
};

// 4. Update task status (Completed/Not Completed)

const toggleTaskCompletion = async (taskId, isCompleted) => {
    if (!taskId) {
        throw new Error("Task ID is required.");
    }
    // Update task
    const updatedTask = await Task.findByIdAndUpdate(
        taskId,
        { isCompleted },
        { new: true }
    );
    // Update caches: invalidate leaderboard only if rank positions change
    if (updatedTask && updatedTask.userId) {
        const { invalidateUserStats } = require("../utils/userStatsCache");
        const { updateLeaderboardIfChanged } = require("../utils/leaderboardCache");
        await invalidateUserStats(updatedTask.userId);
        // Check if top 3 rank order changed
        await updateLeaderboardIfChanged(updatedTask.userId);
    }
    // If completed, check for badges
    if (updatedTask && isCompleted) {
        await checkAndAssignBadges(updatedTask.userId);
    }
    return updatedTask;
};


// 5. Edit task (update any field)
const editTask = async (taskId, updateFields) => {
    if (!taskId) throw new Error("Task ID is required.");
    return await Task.findByIdAndUpdate(taskId, updateFields, { new: true });
};

// 6. Get a single task by ID
const getTaskById = async (taskId) => {
    if (!taskId) throw new Error("Task ID is required.");
    return await Task.findById(taskId);
};

module.exports = {
    createTask,
    getUserTasks,
    deleteTask,
    toggleTaskCompletion,
    editTask,
    getTaskById
};