const express = require("express");
const { createClient } = require("redis");
const cors = require("cors");
const connectDB = require("./config.js/db.js");
const authService = require("./services/auth.service");
const taskController = require("./controllers/task.controller");
require("dotenv").config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Initialize and configure Redis
const redisClient = createClient();
redisClient.on("error", (err) => console.error("Redis Client Error", err));
redisClient.connect().then(async () => {
    console.log("Redis connected");
    try {
        // Configure Redis memory management
        await redisClient.configSet('maxmemory', '100mb');
        await redisClient.configSet('maxmemory-policy', 'allkeys-lru');
        console.log("Redis configured: 100MB max memory with LRU eviction");
    } catch (err) {
        console.error("Redis configuration error:", err);
    }
}).catch((err) => {
    console.error("Redis connection failed:", err);
});

// Connect to MongoDB
connectDB();


// Routes
app.get("/", (req, res) => res.send("Backend running (MongoDB)"));

// Serve badges.json for frontend
const path = require("path");
const fs = require("fs");
app.get("/api/badges", (req, res) => {
    const badgesPath = path.join(__dirname, "./badges.json");
    fs.readFile(badgesPath, "utf8", (err, data) => {
        if (err) return res.status(500).json({ message: "Could not load badges." });
        res.json(JSON.parse(data));
    });
});

app.post("/api/register", async (req, res) => {
    try {
        const { username, email, password } = req.body;
        if (!username || !email || !password) {
            return res.status(400).json({ message: "Missing fields" });
        }

        const userId = await authService.register(username, email, password);
        res.status(201).json({ message: "User registered", userId });
    } catch (err) {
        const status = err.message.includes("in use") ? 409 : 500;
        res.status(status).json({ message: err.message });
    }
});

app.post("/api/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: "Missing fields" });
        }

        const user = await authService.login(email, password);
        res.status(200).json({ message: "Login successful", user });
    } catch (err) {
        res.status(401).json({ message: err.message });
    }
});

// Get user by ID (to refresh user data including badges)
app.get("/api/users/:userId", async (req, res) => {
    try {
        const User = require("./models/user.model");
        const user = await User.findById(req.params.userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.status(200).json(user);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});


const userStatsRouter = require("./routes/userStats");
app.use("/api/user-stats", userStatsRouter);

// Import metrics tracker
const { getMetricsData } = require("./utils/metricsTracker");

app.use("/api/tasks", taskController);

// Expose metrics endpoint
app.get("/api/metrics", (req, res) => {
    const metricsData = getMetricsData();
    const totalHits = Object.values(metricsData.hits).reduce((a, b) => a + b, 0);
    const totalMisses = Object.values(metricsData.misses).reduce((a, b) => a + b, 0);
    const total = totalHits + totalMisses;
    
    const avgHitLatency = metricsData.latencies.hits.length > 0 ?
        Math.round(metricsData.latencies.hits.reduce((a, b) => a + b, 0) / metricsData.latencies.hits.length) : 0;
    const avgMissLatency = metricsData.latencies.misses.length > 0 ?
        Math.round(metricsData.latencies.misses.reduce((a, b) => a + b, 0) / metricsData.latencies.misses.length) : 0;
    
    res.json({
        totalHits,
        totalMisses,
        hitRatio: total > 0 ? Math.round((totalHits / total) * 100) : 0,
        avgHitLatency,
        avgMissLatency,
        latencyImprovement: avgMissLatency > 0 ? Math.round(((avgMissLatency - avgHitLatency) / avgMissLatency) * 100) : 0,
        breakdown: metricsData.hits,
        recentOperations: metricsData.operations.slice(-50),
        timestamp: new Date().toISOString()
    });
});

// Clear metrics endpoint
app.post("/api/metrics/clear", (req, res) => {
    const { resetMetrics } = require("./utils/metricsTracker");
    resetMetrics();
    res.json({ message: "Metrics cleared" });
});

// Leaderboard endpoint - Get top 3 users from Redis Sorted Set
app.get("/api/leaderboard", async (req, res) => {
    try {
        const { getTopUsers } = require("./utils/leaderboardCache");
        const topUsers = await getTopUsers();
        res.json({
            success: true,
            leaderboard: topUsers,
            count: topUsers.length,
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        console.error("Leaderboard API error:", err);
        res.status(500).json({ success: false, message: "Failed to fetch leaderboard" });
    }
});

// Serve metrics dashboard
app.get("/metrics-dashboard", (req, res) => {
    const dashboardPath = path.join(__dirname, "../../frontend/CacheMetrics.html");
    fs.readFile(dashboardPath, "utf8", (err, data) => {
        if (err) return res.status(500).json({ message: "Dashboard not found" });
        res.setHeader("Content-Type", "text/html");
        res.send(data);
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));