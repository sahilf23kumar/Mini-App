# Mini-App
A persistent CRUD app to manage items across sessions — built with full create, view, update, and delete support, persistent local storage, and a smart search/filter feature. Includes clean code, a one-command setup, and detailed ANSWERS.md covering stack decisions, edge cases, and AI usage.

# Study Flashcards ✦

A beautiful, high-performance web application for creating flashcards and studying them using the **SM-2 Spaced Repetition Algorithm**. Built with a sleek dark glassmorphism design system, this application is optimized for visual excellence, responsiveness, and zero-dependency portability.

---

## Features

### 1. Decks Management (CRUD)
- Create, edit, and delete flashcard decks.
- Assign custom colors to decks for visual organization.
- View real-time statistics including total card count and active "due for review" counts.
- Cascade deletes — deleting a deck safely removes all its child cards.

### 2. Flashcards Management (CRUD)
- View a detailed list of all cards in a deck.
- Create, edit, and delete individual cards with distinct front (question) and back (answer) text.
- View real-time review intervals and ease factor metrics per card.

### 3. Spaced Repetition Study Mode (Beyond CRUD)
- **3D Card Flip**: Double-sided cards featuring smooth 3D CSS transforms and glassmorphic blur.
- **Recall Ratings**: Self-assess recall using 4 ratings:
  - **Again (0)**: Resets repetitions/intervals and decreases the ease factor. The card goes back to the end of the session queue so you can try it again.
  - **Hard (1)**: schedules a short interval and decreases the ease factor slightly.
  - **Good (2)**: normal interval increase.
  - **Easy (3)**: large interval increase and increases the ease factor.
- **Keyboard Navigation**: Use keyboard shortcuts to speed up study sessions:
  - `Space` to flip the card and reveal the answer.
  - `1`, `2`, `3`, `4` to submit ratings (Again, Hard, Good, Easy).
- **Session Complete Screen**: Shows summary analytics after completing reviews.

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Server** | **Node.js + Express.js** | Lightweight web server serving static files and API endpoints. |
| **Database** | **SQLite (via `sql.js`)** | Zero-dependency, pure-JS SQLite compilation. Loads and saves the database file (`flashcards.db`) to disk synchronously on updates, making it highly portable across systems without requiring native C++ build tools. |
| **Frontend** | **Vanilla HTML / CSS / JS** | Multi-view single-page application (SPA) with hash-based routing (`#/`), custom CSS variables, and zero frontend framework dependencies. |

---

## File Structure

```text
d:\Mini App\
├── package.json        # Node dependency manifest
├── server.js           # Express app entry point
├── flashcards.db       # SQLite database file (auto-generated)
├── src/
│   ├── db.js           # SQL.js wrapper & schema initialization
│   ├── sr.js           # SM-2 Spaced Repetition implementation
│   └── routes/
│       ├── decks.js    # Deck management API endpoints
│       ├── cards.js    # Card management API endpoints
│       └── study.js    # Study session & rating submission endpoints
└── public/
    ├── index.html      # SPA entry page
    ├── css/
    │   └── style.css   # Dark glassmorphic stylesheet
    └── js/
        ├── app.js      # Hash-based SPA Router & Bootstrapper
        ├── api.js      # Central API Client
        ├── components/
        │   ├── modal.js   # Reusable overlays (deck/card editor, confirm)
        │   └── toast.js   # Notification toast popups
        └── views/
            ├── deckList.js   # Deck grid view
            ├── deckDetail.js # Card list & CRUD view
            └── studyMode.js  # Card study interface
```

---

## Getting Started

### Prerequisites
- Node.js 18+ installed on your local machine.

### Installation
1. Navigate to the project root directory:
   ```bash
   cd "d:\Mini App"
   ```
2. Install dependencies:
   ```bash
   npm install
   ```

### Running the Application
Start the development server:
```bash
npm run dev
```
The application will boot and print:
```text
  ✦ Study Flashcards running at http://localhost:3000
```
Open [http://localhost:3000](http://localhost:3000) in your browser to start studying!

---

## Spaced Repetition (SM-2 Algorithm) Details

This app implements the SuperMemo-2 (SM-2) algorithm. The next review interval is calculated using:
- **Ease Factor (EF)**: Defaults to `2.5`. It measures how easy the card is.
- **Repetitions (n)**: The number of consecutive successful recalls.
- **Interval (I)**: The number of days until the card is shown again.

#### Calculation Logic:
- If **Again (0)**: Repetitions = `0`, Interval = `0` days, Ease Factor = `max(1.3, EF - 0.2)`.
- If **Successful Recall** (rating ≥ 1):
  - Repetitions = `n + 1`
  - If `n == 0` (First review): Interval = `1` day
  - If `n == 1` (Second review): Interval = `3` days
  - If `n > 1` (Subsequent reviews): Interval = `Interval * EF`
  - Adjust EF: `EF = max(1.3, EF + adjustment)`
    - Hard (1): `-0.15`
    - Good (2): `0.00`
    - Easy (3): `+0.15`
- The interval is capped at 365 days to ensure cards are reviewed at least once a year.
