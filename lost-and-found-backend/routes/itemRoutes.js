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

const router = express.Router();

router.post("/", requireAuth, asyncHandler(reportItem));
router.get("/mine", requireAuth, asyncHandler(getMyItems));
router.get("/search", asyncHandler(searchItems));
router.get("/matches", requireAuth, asyncHandler(getSmartMatches));
router.get("/dashboard-stats", requireAuth, asyncHandler(getDashboardStats));
router.get("/:id", asyncHandler(getItemById));
router.get("/", requireAuth, requireAdmin, asyncHandler(getAllItems));

module.exports = router;
