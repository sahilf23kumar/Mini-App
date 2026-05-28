const express = require('express');
const path = require('path');
const { initDatabase } = require('./src/db');
const deckRoutes = require('./src/routes/decks');
const cardRoutes = require('./src/routes/cards');
const studyRoutes = require('./src/routes/study');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ──────────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── API Routes ─────────────────────────────────────────────────────────────────
app.use('/api/decks', deckRoutes);
app.use('/api/cards', cardRoutes);
app.use('/api/study', studyRoutes);

// ── SPA Fallback ───────────────────────────────────────────────────────────────
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Global Error Handler ───────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// ── Start ──────────────────────────────────────────────────────────────────────
(async () => {
  const db = await initDatabase();
  app.locals.db = db;

  app.listen(PORT, () => {
    console.log(`\n  ✦ Study Flashcards running at http://localhost:${PORT}\n`);
  });

  // Graceful shutdown
  process.on('SIGINT', () => {
    db.close();
    process.exit(0);
  });
})();
