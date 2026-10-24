/**
 * Smart Match Service for Lost & Found items
 * Calculates deterministic, explainable match scores between lost and found items.
 */

// Helper to normalize and tokenize text into significant words
function tokenize(text) {
  if (!text || typeof text !== "string") return [];
  // Common stop words to ignore in similarity checks
  const stopWords = new Set([
    "a", "an", "the", "and", "or", "in", "on", "at", "to", "for", "with", "of",
    "by", "from", "is", "was", "it", "my", "near", "near by", "around", "has", "have"
  ]);

  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !stopWords.has(w));
}

// Jaccard token similarity score between 0 and 1
function tokenSimilarity(tokens1, tokens2) {
  if (tokens1.length === 0 || tokens2.length === 0) return 0;
  const set1 = new Set(tokens1);
  const set2 = new Set(tokens2);

  let intersection = 0;
  for (const token of set1) {
    if (set2.has(token)) {
      intersection++;
    }
  }

  const union = new Set([...set1, ...set2]).size;
  return union === 0 ? 0 : intersection / union;
}

// Substring or token overlap score
function textOverlapScore(text1, text2) {
  if (!text1 || !text2) return 0;
  const t1 = text1.toLowerCase().trim();
  const t2 = text2.toLowerCase().trim();

  if (t1 === t2) return 1.0;
  if (t1.includes(t2) || t2.includes(t1)) return 0.85;

  const tokens1 = tokenize(text1);
  const tokens2 = tokenize(text2);
  return tokenSimilarity(tokens1, tokens2);
}

/**
 * Calculates match score between two items (one lost, one found)
 * Returns { matchScore (0-100), reasons: string[] }
 */
function calculateMatch(itemA, itemB) {
  let score = 0;
  const reasons = [];

  // 1. Category comparison (Weight: 30 points)
  if (itemA.category && itemB.category) {
    if (itemA.category.toLowerCase() === itemB.category.toLowerCase()) {
      score += 30;
      reasons.push(`Matching category: ${itemA.category}`);
    }
  }

  // 2. Item Name comparison (Weight: 25 points)
  const nameScore = textOverlapScore(itemA.itemName, itemB.itemName);
  if (nameScore > 0.8) {
    score += 25;
    reasons.push(`Strong name similarity: "${itemA.itemName}" & "${itemB.itemName}"`);
  } else if (nameScore > 0.3) {
    const points = Math.round(nameScore * 25);
    score += points;
    reasons.push(`Similar item name: "${itemA.itemName}" & "${itemB.itemName}"`);
  }

  // 3. Description comparison (Weight: 15 points)
  const descScore = textOverlapScore(itemA.description, itemB.description);
  if (descScore > 0.2) {
    const points = Math.round(descScore * 15);
    score += points;
    reasons.push(`Matching description keywords`);
  }

  // 4. Location comparison (Weight: 20 points)
  const locScore = textOverlapScore(itemA.location, itemB.location);
  if (locScore > 0.7) {
    score += 20;
    reasons.push(`Same location: ${itemA.location}`);
  } else if (locScore > 0.2) {
    const points = Math.round(locScore * 20);
    score += points;
    reasons.push(`Nearby location: "${itemA.location}" & "${itemB.location}"`);
  }

  // 5. Date proximity comparison (Weight: 10 points)
  if (itemA.createdAt && itemB.createdAt) {
    const dateA = new Date(itemA.createdAt).getTime();
    const dateB = new Date(itemB.createdAt).getTime();
    const diffDays = Math.abs(dateA - dateB) / (1000 * 60 * 60 * 24);

    if (diffDays <= 2) {
      score += 10;
      reasons.push("Reported around the same time (within 48 hours)");
    } else if (diffDays <= 7) {
      score += 7;
      reasons.push("Reported within the same week");
    } else if (diffDays <= 14) {
      score += 4;
      reasons.push("Reported within 2 weeks");
    }
  }

  // Cap score at 100
  const matchScore = Math.min(100, Math.round(score));
  return { matchScore, reasons };
}

/**
 * Finds candidate matches for an array of user items against all target items
 * @param {Array} userItems - items reported by current user
 * @param {Array} candidateItems - items of opposite type
 * @param {number} minThreshold - minimum score percentage to qualify as a match (default 30)
 */
function findMatchesForUserItems(userItems, candidateItems, minThreshold = 30) {
  const matches = [];

  for (const myItem of userItems) {
    for (const candidate of candidateItems) {
      // Must be opposite types (lost vs found)
      if (myItem.type === candidate.type) continue;
      // Skip if reporter is the same email
      if (myItem.reporterEmail && candidate.reporterEmail && myItem.reporterEmail === candidate.reporterEmail) continue;

      const { matchScore, reasons } = calculateMatch(myItem, candidate);

      if (matchScore >= minThreshold) {
        matches.push({
          myItem: {
            _id: myItem._id,
            itemName: myItem.itemName,
            type: myItem.type,
            category: myItem.category,
            location: myItem.location,
            createdAt: myItem.createdAt,
          },
          matchedItem: {
            _id: candidate._id,
            itemName: candidate.itemName,
            type: candidate.type,
            category: candidate.category,
            location: candidate.location,
            roomNumber: candidate.roomNumber,
            description: candidate.description,
            createdAt: candidate.createdAt,
          },
          matchScore,
          reasons,
        });
      }
    }
  }

  // Sort by highest matchScore first
  matches.sort((a, b) => b.matchScore - a.matchScore);
  return matches;
}

module.exports = {
  tokenize,
  tokenSimilarity,
  textOverlapScore,
  calculateMatch,
  findMatchesForUserItems,
};
