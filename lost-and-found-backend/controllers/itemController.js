const { PUBLIC_ITEM_FIELDS, publicItem } = require("../utils/publicItem");
const Item = require("../models/Item");
const { findMatchesForUserItems, calculateMatch } = require("../utils/matchService");

// POST /api/items (logged in user reports a lost or found item)
async function reportItem(req, res) {
  const { type, itemName, description, category, location, contactNumber, roomNumber } = req.body;

  if (!type || !["lost", "found"].includes(type)) {
    return res.status(400).json({ message: "type must be 'lost' or 'found'" });
  }
  if (!itemName || !description) {
    return res.status(400).json({ message: "itemName and description are required" });
  }

  const itemData = {
    type,
    itemName: itemName.trim(),
    description: description.trim(),
    category: category ? category.trim() : "",
    location: location ? location.trim() : "",
    contactNumber: contactNumber ? contactNumber.trim() : "",
    reporterEmail: req.user.email,
  };

  if (type === "found" && roomNumber) {
    itemData.roomNumber = roomNumber.trim();
  }

  const item = await Item.create(itemData);

  return res.status(201).json({ message: "Report submitted", item });
}

// GET /api/items (admin only - sees every report)
async function getAllItems(req, res) {
  const items = await Item.find().sort({ createdAt: -1 });
  return res.status(200).json({ count: items.length, items });
}

// GET /api/items/mine (a user's own submitted reports)
async function getMyItems(req, res) {
  const items = await Item.find({ reporterEmail: req.user.email }).sort({ createdAt: -1 });
  return res.status(200).json({ count: items.length, items });
}

// GET /api/items/search (search lost & found items with filters)
async function searchItems(req, res) {
  const { q, type, category, location } = req.query;

  const query = {};

  if (type && (type === "lost" || type === "found")) {
    query.type = type;
  }

  if (category && category.trim() !== "") {
    query.category = { $regex: new RegExp(`^${category.trim()}$`, "i") };
  }

  if (location && location.trim() !== "") {
    query.location = { $regex: location.trim(), $options: "i" };
  }

  if (q && q.trim() !== "") {
    const searchRegex = { $regex: q.trim(), $options: "i" };
    query.$or = [{ itemName: searchRegex }, { description: searchRegex }];
  }

  const items = await Item.find(query).select(PUBLIC_ITEM_FIELDS).sort({ createdAt: -1 });
  return res.status(200).json({ count: items.length, items: items.map(publicItem) });
}

// GET /api/items/matches (calculate smart matches for logged-in user's reported items)
async function getSmartMatches(req, res) {
  const userEmail = req.user.email;
  const userItems = await Item.find({ reporterEmail: userEmail, status: "pending" });

  if (userItems.length === 0) {
    return res.status(200).json({ count: 0, matches: [] });
  }

  // Find candidate opposite items not reported by this user
  const candidateItems = await Item.find({
    reporterEmail: { $ne: userEmail },
    status: "pending",
  });

  const matches = findMatchesForUserItems(userItems, candidateItems, 30);

  return res.status(200).json({ count: matches.length, matches });
}

// GET /api/items/dashboard-stats (aggregated statistics for dashboard)
async function getDashboardStats(req, res) {
  const userEmail = req.user.email;

  const userItems = await Item.find({ reporterEmail: userEmail });
  const totalReports = userItems.length;
  const lostCount = userItems.filter((it) => it.type === "lost").length;
  const foundCount = userItems.filter((it) => it.type === "found").length;
  const resolvedCount = userItems.filter((it) => it.status === "resolved").length;

  const activeUserItems = userItems.filter((it) => it.status === "pending");
  let matchesCount = 0;
  let topMatches = [];

  if (activeUserItems.length > 0) {
    const candidateItems = await Item.find({
      reporterEmail: { $ne: userEmail },
      status: "pending",
    });
    const matches = findMatchesForUserItems(activeUserItems, candidateItems, 30);
    matchesCount = matches.length;
    topMatches = matches.slice(0, 5);
  }

  return res.status(200).json({
    totalReports,
    lostCount,
    foundCount,
    matchesCount,
    resolvedCount,
    topMatches,
  });
}

// GET /api/items/:id (get single item details)
async function getItemById(req, res) {
  const { id } = req.params;
  const item = await Item.findById(id).select(PUBLIC_ITEM_FIELDS);

  if (!item) {
    return res.status(404).json({ message: "Item not found" });
  }

  return res.status(200).json({ item: publicItem(item) });
}

module.exports = {
  reportItem,
  getAllItems,
  getMyItems,
  searchItems,
  getSmartMatches,
  getDashboardStats,
  getItemById,
};
