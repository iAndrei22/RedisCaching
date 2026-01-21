const express = require("express");
const router = express.Router();
const taskService = require("../services/task.service");
const { recordCacheHit, recordCacheMiss } = require("../utils/metricsTracker");

// Redis client (reuse from app.js if possible, else create here)
const { createClient } = require("redis");
const redisClient = createClient();
redisClient.connect();

// Create task
router.post("/", async (req, res) => {
    try {
        const { userId, title, description, points } = req.body;
        const task = await taskService.createTask(userId, title, description, points);
        // Write-through: update cache immediately
        if (userId) {
            const cacheKey = `user_tasks_${userId}`;
            let cached = await redisClient.get(cacheKey);
            let tasks = [];
            if (cached) {
                tasks = JSON.parse(cached);
            } else {
                tasks = await taskService.getUserTasks(userId);
            }
            tasks.unshift(task);
            await redisClient.set(cacheKey, JSON.stringify(tasks), { EX: 180 });
        }
        res.status(201).json(task);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.get("/:userId", async (req, res) => {
    const start = Date.now();
    try {
        const userId = req.params.userId;
        const cacheKey = `user_tasks_${userId}`;
        // Try to get from Redis cache first
        const cached = await redisClient.get(cacheKey);
        if (cached) {
            const latency = Date.now() - start;
            console.log(`[CACHE HIT] userId=${userId} latency=${latency}ms`);
            recordCacheHit('user_tasks', latency);
            return res.status(200).json(JSON.parse(cached));
        }
        // If not cached, fetch from DB
        const tasks = await taskService.getUserTasks(userId);
        // Store in cache for 60 seconds
        await redisClient.set(cacheKey, JSON.stringify(tasks), { EX: 180 });
        const latency = Date.now() - start;
        console.log(`[CACHE MISS] userId=${userId} latency=${latency}ms`);
        recordCacheMiss('user_tasks', latency);
        res.status(200).json(tasks);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Delete task
router.delete("/:taskId", async (req, res) => {
    try {
        const result = await taskService.deleteTask(req.params.taskId);
        if (!result) {
            return res.status(404).json({ message: "Task not found" });
        }
        // Invalidate user tasks cache
        if (result.userId) {
            const cacheKey = `user_tasks_${result.userId}`;
            await redisClient.del(cacheKey);
        }
        res.status(200).json({ message: "Task deleted" });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Toggle task completion
router.put("/:taskId", async (req, res) => {
    try {
        const { isCompleted } = req.body;
        const updated = await taskService.toggleTaskCompletion(
            req.params.taskId,
            isCompleted
        );
        // Invalidate user tasks cache
        if (updated && updated.userId) {
            const cacheKey = `user_tasks_${updated.userId}`;
            await redisClient.del(cacheKey);
        }
        res.status(200).json(updated);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Edit task (update any field)
router.patch("/:taskId", async (req, res) => {
    try {
        const updated = await taskService.editTask(req.params.taskId, req.body);
        if (!updated) return res.status(404).json({ message: "Task not found" });
        // Invalidate user tasks cache
        if (updated && updated.userId) {
            const cacheKey = `user_tasks_${updated.userId}`;
            await redisClient.del(cacheKey);
        }
        res.status(200).json(updated);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

module.exports = router;
