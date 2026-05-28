const { Router } = require('express');
const router = Router();

// ── GET /api/cards?deck_id=:deckId ─────────────────────────────────────────────
// List all cards, optionally filtered by deck.
router.get('/', (req, res) => {
  const db = req.app.locals.db;
  const { deck_id } = req.query;

  let cards;
  if (deck_id) {
    const deck = db.get('SELECT id FROM decks WHERE id = ?', [Number(deck_id)]);
    if (!deck) {
      return res.status(404).json({ error: 'Deck not found' });
    }
    cards = db.all(
      'SELECT * FROM cards WHERE deck_id = ? ORDER BY created_at DESC',
      [Number(deck_id)]
    );
  } else {
    cards = db.all('SELECT * FROM cards ORDER BY created_at DESC');
  }

  res.json(cards);
});

// ── GET /api/cards/:id ─────────────────────────────────────────────────────────
router.get('/:id', (req, res) => {
  const db = req.app.locals.db;
  const card = db.get('SELECT * FROM cards WHERE id = ?', [Number(req.params.id)]);

  if (!card) {
    return res.status(404).json({ error: 'Card not found' });
  }
  res.json(card);
});

// ── POST /api/cards ────────────────────────────────────────────────────────────
// Create a new card in a deck.
router.post('/', (req, res) => {
  const db = req.app.locals.db;
  const { deck_id, front, back } = req.body;

  if (!deck_id) {
    return res.status(400).json({ error: 'deck_id is required' });
  }
  if (!front || !front.trim()) {
    return res.status(400).json({ error: 'Card front text is required' });
  }
  if (!back || !back.trim()) {
    return res.status(400).json({ error: 'Card back text is required' });
  }

  const deck = db.get('SELECT id FROM decks WHERE id = ?', [Number(deck_id)]);
  if (!deck) {
    return res.status(404).json({ error: 'Deck not found' });
  }

  const result = db.run(
    'INSERT INTO cards (deck_id, front, back) VALUES (?, ?, ?)',
    [Number(deck_id), front.trim(), back.trim()]
  );

  // Update deck's updated_at timestamp
  db.run("UPDATE decks SET updated_at = datetime('now') WHERE id = ?", [Number(deck_id)]);

  const card = db.get('SELECT * FROM cards WHERE id = ?', [result.lastInsertRowid]);
  res.status(201).json(card);
});

// ── PUT /api/cards/:id ─────────────────────────────────────────────────────────
// Update a card's front/back text. Does NOT reset spaced repetition state.
router.put('/:id', (req, res) => {
  const db = req.app.locals.db;
  const id = Number(req.params.id);
  const { front, back } = req.body;

  const existing = db.get('SELECT * FROM cards WHERE id = ?', [id]);
  if (!existing) {
    return res.status(404).json({ error: 'Card not found' });
  }

  const newFront = front !== undefined ? front.trim() : existing.front;
  const newBack = back !== undefined ? back.trim() : existing.back;

  if (!newFront) {
    return res.status(400).json({ error: 'Card front text cannot be empty' });
  }
  if (!newBack) {
    return res.status(400).json({ error: 'Card back text cannot be empty' });
  }

  db.run(
    "UPDATE cards SET front = ?, back = ?, updated_at = datetime('now') WHERE id = ?",
    [newFront, newBack, id]
  );

  const card = db.get('SELECT * FROM cards WHERE id = ?', [id]);
  res.json(card);
});

// ── DELETE /api/cards/:id ──────────────────────────────────────────────────────
router.delete('/:id', (req, res) => {
  const db = req.app.locals.db;
  const id = Number(req.params.id);

  const existing = db.get('SELECT * FROM cards WHERE id = ?', [id]);
  if (!existing) {
    return res.status(404).json({ error: 'Card not found' });
  }

  db.run('DELETE FROM cards WHERE id = ?', [id]);
  res.status(204).end();
});

module.exports = router;
