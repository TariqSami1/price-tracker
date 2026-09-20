# INE Price Tracker

A full-stack web application that tracks product prices from INE's hosted mock storefront by automatically scraping product pages and storing their price & stock history over time.

This project was built as part of the **INE Software Engineer Intern Assignment**, with the primary focus on building a **reliable web scraper** rather than a complex UI.

---

## Features

- Search products from the INE mock store
- Track any product with one click
- Automatic price & stock scraping
- Price history stored in Supabase
- Per-product scrape audit logs
- Manual headed scraper for demonstration
- Retry mechanism for slow or failed page loads

---

## Tech Stack

| Layer | Technology |
|--------|------------|
| Frontend | React + Vite + Tailwind CSS |
| Backend | Node.js + Express |
| Scraping | Playwright |
| Database | Supabase (PostgreSQL) |
| Scheduling | cron-job.org |
| Deployment | Vercel + Render |

---

## Project Structure

```text
price-tracker/
│
├── frontend/
│   ├── src/
│   ├── App.jsx
│   └── package.json
│
├── backend/
│   ├── server.js
│   ├── package.json
│   └── .env
│
└── README.md
```

---

## How it Works

### 1. Search

The user searches for a product name. The backend opens the INE storefront using Playwright and returns matching products.

### 2. Track

When a product is selected, its **name** and **URL** are saved in the `products` table.

### 3. Scrape

A scheduled cron job calls the backend every **2 hours**.

For each tracked product:

1. Open the product page
2. Wait for dynamic content
3. Reveal the hidden price
4. Extract price & stock
5. Save history
6. Record the scrape result

### 4. Dashboard

The React dashboard displays:

- Tracked products
- Price history table
- Stock status
- Scrape audit logs

---

## Database Schema

### products

| Column | Type |
|---------|------|
| id | UUID |
| name | Text |
| url | Text |
| created_at | Timestamp |

### price_history

| Column | Type |
|---------|------|
| id | UUID |
| product_id | UUID |
| price | Numeric |
| stock_status | Text |
| scraped_at | Timestamp |

### scrape_logs

| Column | Type |
|---------|------|
| id | UUID |
| product_id | UUID |
| status | Text |
| error_message | Text |
| attempted_at | Timestamp |

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/search?q=` | Search products |
| POST | `/api/products` | Track a product |
| GET | `/api/dashboard` | Fetch dashboard data |
| POST | `/api/scrape/:id` | Manual scrape |
| GET | `/api/cron` | Scheduled scrape |

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/your-username/price-tracker.git
cd price-tracker
```

### 2. Backend setup

```bash
cd backend
npm install
```

Create a `.env` file:

```env
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
PORT=3001
```

Run the backend:

```bash
npm start
```

---

### 3. Frontend setup

```bash
cd frontend
npm install
npm run dev
```

Create `.env`:

```env
VITE_API_URL=http://localhost:3001
```

---

## Scheduling

The backend is designed for free-tier hosting, so it **does not run continuously**.

A cron service (cron-job.org) should trigger:

```text
GET https://your-render-url/api/cron
```

**Frequency:** Every 2 hours

---

## Reliability Decisions

The assignment prioritised scraper reliability over UI complexity.

The scraper includes:

- 3 retry attempts
- Graceful failure handling
- Honest failure logging
- Dynamic content waiting
- Automatic stock detection
- No incorrect data written on failed scrapes

Every scrape attempt is recorded as either:

- `SUCCESS`
- `FAILED`

No failures are hidden from the dashboard.

---

## Running in Headed Mode

For demonstration purposes, the scraper can also run with a visible browser window.

Example:

```text
POST /api/scrape/{product_id}?headed=true
```

This is useful for recording the required assignment video.

---

## Future Improvements

- Price drop notifications
- Email alerts
- Interactive price charts
- Multiple product dashboard analytics
- Page structure change detection
- Configurable scrape frequency
- GitHub Actions CI/CD

---

