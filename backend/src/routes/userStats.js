// API endpoint to get user stats (total points, completed tasks) from MongoDB
const express = require("express");
const router = express.Router();
const { getUserStats } = require("../utils/userStatsCache");

// GET /api/user-stats/:userId
router.get("/:userId", async (req, res) => {
    const userId = req.params.userId;
    try {
        const stats = await getUserStats(userId);
        res.json(stats);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
