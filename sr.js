/**
 * SM-2 Spaced Repetition Algorithm
 *
 * Calculates the next review schedule for a flashcard based on user rating.
 * Adapted from the SuperMemo SM-2 algorithm by Piotr Wozniak.
 *
 * @param {object} card - Current card state
 * @param {number} card.ease_factor   - Current ease factor (≥ 1.3)
 * @param {number} card.interval_days - Current interval in days
 * @param {number} card.repetitions   - Number of successful reviews
 * @param {number} rating - User's self-assessed recall quality (0–3)
 *   0 = Again  (complete failure, reset)
 *   1 = Hard   (recalled with significant difficulty)
 *   2 = Good   (recalled with some effort)
 *   3 = Easy   (recalled effortlessly)
 *
 * @returns {{ ease_factor: number, interval_days: number, repetitions: number, next_review: string }}
 */
function calculateNextReview(card, rating) {
  let { ease_factor, interval_days, repetitions } = card;

  // Clamp rating to valid range
  rating = Math.max(0, Math.min(3, Math.round(rating)));

  if (rating === 0) {
    // ── Again: complete reset ──────────────────────────────────────────────
    repetitions = 0;
    interval_days = 0;
    ease_factor = Math.max(1.3, ease_factor - 0.2);
  } else {
    // ── Successful recall ──────────────────────────────────────────────────
    if (repetitions === 0) {
      interval_days = 1;
    } else if (repetitions === 1) {
      interval_days = 3;
    } else {
      interval_days = Math.round(interval_days * ease_factor);
    }

    repetitions += 1;

    // Adjust ease factor based on rating
    // Rating 1 (Hard): decrease ease slightly
    // Rating 2 (Good): keep ease roughly the same
    // Rating 3 (Easy): increase ease
    const easeAdjustment = [0, -0.15, 0.0, 0.15];
    ease_factor = Math.max(1.3, ease_factor + easeAdjustment[rating]);
  }

  // Cap interval at 365 days to prevent runaway intervals
  interval_days = Math.min(interval_days, 365);

  // Calculate next review datetime
  const now = new Date();
  const next = new Date(now.getTime() + interval_days * 24 * 60 * 60 * 1000);
  const next_review = next.toISOString().replace('T', ' ').slice(0, 19);

  return {
    ease_factor: Math.round(ease_factor * 100) / 100,
    interval_days,
    repetitions,
    next_review,
  };
}

module.exports = { calculateNextReview };
