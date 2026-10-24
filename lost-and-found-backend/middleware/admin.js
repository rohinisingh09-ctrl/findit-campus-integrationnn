function requireAdmin(req, res, next) {
  if (!req.user || req.user.email.toLowerCase() !== (process.env.ADMIN_EMAIL || "").toLowerCase()) {
    return res.status(403).json({ message: "Not authorized to view this" });
  }
  next();
}

module.exports = requireAdmin;
