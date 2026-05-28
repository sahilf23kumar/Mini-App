const { Router } = require('express');
const { calculateNextReview } = require('../sr');
const router = Router();

// ── GET /api/study/:deckId ─────────────────────────────────────────────────────
// Get cards due for review in a deck, ordered by most overdue first.
router.get('/:deckId', (req, res) => {
  const db = req.app.locals.db;
  const deckId = Number(req.params.deckId);
  const limit = Math.min(parseInt(req.query.limit) || 20, 50);

  const deck = db.get('SELECT * FROM decks WHERE id = ?', [deckId]);
  if (!deck) {
    return res.status(404).json({ error: 'Deck not found' });
  }

  // Stats for the deck
  const stats = db.get(`
    SELECT
      COUNT(*) AS total_cards,
      SUM(CASE WHEN next_review <= datetime('now') THEN 1 ELSE 0 END) AS due_count,
      SUM(CASE WHEN repetitions = 0 THEN 1 ELSE 0 END) AS new_count,
      SUM(CASE WHEN repetitions > 0 AND next_review <= datetime('now') THEN 1 ELSE 0 END) AS review_count
    FROM cards
    WHERE deck_id = ?
  `, [deckId]);

  // Due cards, most overdue first
  const cards = db.all(`
    SELECT * FROM cards
    WHERE deck_id = ? AND next_review <= datetime('now')
    ORDER BY next_review ASC
    LIMIT ?
  `, [deckId, limit]);

  res.json({
    deck,
    stats: {
      total_cards: stats?.total_cards || 0,
      due_count: stats?.due_count || 0,
      new_count: stats?.new_count || 0,
      review_count: stats?.review_count || 0,
    },
    cards,
  });
});

// ── POST /api/study/:cardId/review ─────────────────────────────────────────────
// Submit a review rating for a card (0=Again, 1=Hard, 2=Good, 3=Easy).
router.post('/:cardId/review', (req, res) => {
  const db = req.app.locals.db;
  const cardId = Number(req.params.cardId);
  const { rating } = req.body;

  if (rating === undefined || rating === null) {
    return res.status(400).json({ error: 'Rating is required (0-3)' });
  }

  const numRating = Number(rating);
  if (isNaN(numRating) || numRating < 0 || numRating > 3) {
    return res.status(400).json({ error: 'Rating must be between 0 and 3' });
  }

  const card = db.get('SELECT * FROM cards WHERE id = ?', [cardId]);
  if (!card) {
    return res.status(404).json({ error: 'Card not found' });
  }

  const result = calculateNextReview(card, numRating);

  db.run(`
    UPDATE cards
    SET ease_factor = ?, interval_days = ?, repetitions = ?,
        next_review = ?, updated_at = datetime('now')
    WHERE id = ?
  `, [result.ease_factor, result.interval_days, result.repetitions, result.next_review, cardId]);

  const updated = db.get('SELECT * FROM cards WHERE id = ?', [cardId]);
  res.json(updated);
});

module.exports = router;
