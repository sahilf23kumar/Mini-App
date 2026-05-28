const { Router } = require('express');
const router = Router();

// ── GET /api/decks ─────────────────────────────────────────────────────────────
// List all decks with card count and due card count.
router.get('/', (req, res) => {
  const db = req.app.locals.db;

  const decks = db.all(`
    SELECT
      d.*,
      COUNT(c.id) AS card_count,
      SUM(CASE WHEN c.next_review <= datetime('now') THEN 1 ELSE 0 END) AS due_count
    FROM decks d
    LEFT JOIN cards c ON c.deck_id = d.id
    GROUP BY d.id
    ORDER BY d.updated_at DESC
  `);

  res.json(decks);
});

// ── GET /api/decks/:id ─────────────────────────────────────────────────────────
// Get a single deck by ID.
router.get('/:id', (req, res) => {
  const db = req.app.locals.db;
  const { id } = req.params;

  const deck = db.get(`
    SELECT
      d.*,
      COUNT(c.id) AS card_count,
      SUM(CASE WHEN c.next_review <= datetime('now') THEN 1 ELSE 0 END) AS due_count
    FROM decks d
    LEFT JOIN cards c ON c.deck_id = d.id
    WHERE d.id = ?
    GROUP BY d.id
  `, [Number(id)]);

  if (!deck) {
    return res.status(404).json({ error: 'Deck not found' });
  }
  res.json(deck);
});

// ── POST /api/decks ────────────────────────────────────────────────────────────
// Create a new deck.
router.post('/', (req, res) => {
  const db = req.app.locals.db;
  const { name, description, color } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Deck name is required' });
  }

  const result = db.run(
    `INSERT INTO decks (name, description, color) VALUES (?, ?, ?)`,
    [name.trim(), (description || '').trim(), color || '#6366f1']
  );

  const deck = db.get('SELECT * FROM decks WHERE id = ?', [result.lastInsertRowid]);
  res.status(201).json(deck);
});

// ── PUT /api/decks/:id ─────────────────────────────────────────────────────────
// Update a deck.
router.put('/:id', (req, res) => {
  const db = req.app.locals.db;
  const id = Number(req.params.id);
  const { name, description, color } = req.body;

  const existing = db.get('SELECT * FROM decks WHERE id = ?', [id]);
  if (!existing) {
    return res.status(404).json({ error: 'Deck not found' });
  }

  if (name !== undefined && (!name || !name.trim())) {
    return res.status(400).json({ error: 'Deck name cannot be empty' });
  }

  db.run(
    `UPDATE decks SET name = ?, description = ?, color = ?, updated_at = datetime('now') WHERE id = ?`,
    [
      (name || existing.name).trim(),
      (description !== undefined ? description : existing.description).trim(),
      color || existing.color,
      id
    ]
  );

  const deck = db.get('SELECT * FROM decks WHERE id = ?', [id]);
  res.json(deck);
});

// ── DELETE /api/decks/:id ──────────────────────────────────────────────────────
// Delete a deck and all its cards (cascading).
router.delete('/:id', (req, res) => {
  const db = req.app.locals.db;
  const id = Number(req.params.id);

  const existing = db.get('SELECT * FROM decks WHERE id = ?', [id]);
  if (!existing) {
    return res.status(404).json({ error: 'Deck not found' });
  }

  // Manual cascade since sql.js FK cascade can be unreliable
  db.run('DELETE FROM cards WHERE deck_id = ?', [id]);
  db.run('DELETE FROM decks WHERE id = ?', [id]);
  res.status(204).end();
});

module.exports = router;
