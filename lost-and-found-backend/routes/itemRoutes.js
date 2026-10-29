const express = require("express");
const requireAuth = require("../middleware/auth");
const requireAdmin = require("../middleware/admin");
const {
  reportItem,
  getAllItems,
  getMyItems,
  searchItems,
  getSmartMatches,
  getDashboardStats,
  getItemById,
} = require("../controllers/itemController");
const asyncHandler = require("../utils/asyncHandler");
const ensureDatabase = require("../middleware/ensureDatabase");

const router = express.Router();

router.post("/", requireAuth, ensureDatabase, asyncHandler(reportItem));
router.get("/mine", requireAuth, ensureDatabase, asyncHandler(getMyItems));
router.get("/search", ensureDatabase, asyncHandler(searchItems));
router.get("/matches", requireAuth, ensureDatabase, asyncHandler(getSmartMatches));
router.get("/dashboard-stats", requireAuth, ensureDatabase, asyncHandler(getDashboardStats));
router.get("/:id", ensureDatabase, asyncHandler(getItemById));
router.get("/", requireAuth, requireAdmin, ensureDatabase, asyncHandler(getAllItems));

module.exports = router;
