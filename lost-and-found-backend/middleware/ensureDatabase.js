const connectDB = require("../config/db");

function ensureDatabase(req, res, next) {
  // A regular local server connects before listening. Vercel loads the Express
  // app as a function, so establish/reuse the connection when an API route runs.
  if (process.env.VERCEL !== "1") return next();

  connectDB().then(() => next(), next);
}

module.exports = ensureDatabase;
