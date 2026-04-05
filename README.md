# Finance Dashboard UI

Frontend-only finance dashboard built for the assignment brief. The project uses plain JavaScript modules, SVG-based charts, and mock data so it can run without a backend or third-party libraries.

## What it includes

- Dashboard overview with summary cards for total balance, income, expenses, and savings rate
- Time-based visualization showing running balance across the transaction timeline
- Categorical visualization showing expense breakdown by category
- Transactions section with search, filtering, and sorting
- Simulated role-based UI:
  - `Viewer` can explore data only
  - `Admin` can add new transactions and edit existing ones
- Insights section with highest-spend category, month-over-month comparison, and savings posture
- Local state management with a small store module and `localStorage` persistence for role and transactions
- Responsive layout and empty-state handling

## Project structure

- `index.html`: app shell
- `styles.css`: responsive styling and motion
- `src/data.js`: seed data, role metadata, and categories
- `src/store.js`: application state and persistence
- `src/utils.js`: formatting, filtering, summaries, and insights
- `src/charts.js`: SVG chart rendering helpers
- `src/app.js`: UI rendering and event wiring
- `server.js`: minimal static file server

## Run locally

1. Make sure Node.js is installed.
2. Start the app:

```bash
npm run dev
```

3. Open `http://localhost:3000`

## Approach

The dashboard is built around a single shared frontend state object. Transactions, filters, and the selected role all feed the same render flow:

- Summary cards, charts, and insights derive from transaction state
- Filter controls affect the transaction table view
- Role switching changes which actions and panels are available
- Admin edits update the same local data source and instantly refresh all views

I chose a dependency-free implementation to keep the submission easy to review in an empty workspace while still showing modular structure, predictable state updates, and reusable helpers.

## Requirement mapping

- `Dashboard Overview`: summary cards plus trend and breakdown visualizations
- `Transactions Section`: date, amount, category, type, search, filter, sort
- `Basic Role Based UI`: dropdown role switcher with viewer and admin behavior
- `Insights Section`: top category, monthly comparison, savings observation
- `State Management`: centralized store with subscriptions and persistence
- `UI/UX`: responsive layout, readable hierarchy, subtle animation, graceful empty states

## Assumptions

- Mock personal finance data is sufficient for demonstrating interactions
- USD formatting is acceptable for this submission
- Role behavior is simulated on the frontend only; there is no authentication or backend enforcement
