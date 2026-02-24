# Library/Reissue System

This project began as an exercise-book reissue application and has been extended to include a simple **Digital Library Management** module with the following features:

- **Book catalog** with details (ISBN, title, author, genre, publication date, copies)
- **Search** by title/author/ISBN/genre
- **Borrow & return** tracking with due dates and history
- **Inventory control** showing total/available copies
- **Overdue alerts** (client‑side)
- **Reporting summary** API
- **Admin tools** for student database (existing) and password management
- **Password‑protected login** for reissue page
- Static front‑end served via `express` backend

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the server:
   ```bash
   npm start
   ```
   or during development:
   ```bash
   npm run dev
   ```
3. Open a browser and navigate to `http://localhost:3000/reissue.html` for the reissue system or `library.html` for the library management interface.

Data is stored in `data.json` (students) and `books.json` (library books) located in the project root. These are simple JSON arrays and the server updates them automatically.

4. Use the **Library** link in the navigation bar to access the new features.

## Folder structure

- `server.js` – Express backend with student and book APIs
- `reissue.html`, `admin.html`, `resource.html`, `library.html` – front‑end pages
- `reissue.js`, `library.js`, `ds.js`, `demo.js` – client scripts
- `reissue.css` – shared CSS
- `data.json`, `books.json` – persistent storage

Feel free to extend further with a real database, user authentication, or barcode scanning as described in the project report.
