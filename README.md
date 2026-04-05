# Finance Dashboard UI

Frontend-only finance dashboard built for the assignment brief. The project is now implemented with React, Vite, Tailwind CSS, and JavaScript, while still using mock data and no backend.

## What it includes

- Dashboard overview with summary cards for total balance, income, expenses, and savings rate
- Time-based visualization showing running balance across the transaction timeline
- Categorical visualization showing expense breakdown by category
- Transactions section with search, filtering, and sorting
- Simulated role-based UI:
  - `Viewer` can explore data only
  - `Admin` can add new transactions and edit existing ones
- Insights section with highest-spend category, month-over-month comparison, and savings posture
- Local state management with React hooks, a reducer-based store pattern, and `localStorage` persistence
- Responsive layout, empty states, richer motion, and a light/dark theme toggle

## Project structure

- `index.html`: Vite entry shell
- `vite.config.js`: Vite + React configuration
- `src/main.jsx`: React app bootstrap
- `src/App.jsx`: dashboard components, reducer state, charts, filtering, insights, and role-based behavior
- `src/index.css`: Tailwind import plus a small amount of global theming and animation CSS

## Run locally

1. Make sure Node.js is installed.
2. Start the app:

```bash
npm run dev
```

3. Open the local URL shown by Vite, typically `http://localhost:5173`

## Approach

The dashboard is built around a reducer-driven React state flow. Transactions, filters, theme, editor state, and the selected role all feed the same render path:

- Summary cards, charts, and insights derive from transaction state
- Filter controls affect the transaction table immediately
- Role switching changes which actions and panels are available
- Admin edits update the same local data source and instantly refresh all views
- Theme preference and transactions persist with `localStorage`

I chose React + Tailwind so the submission clearly demonstrates component-based frontend development, hook-driven state management, reusable UI structure, and responsive styling in a modern stack.

## Requirement mapping

- `Dashboard Overview`: summary cards plus trend and breakdown visualizations
- `Transactions Section`: date, amount, category, type, search, filter, sort
- `Basic Role Based UI`: dropdown role switcher with viewer and admin behavior
- `Insights Section`: top category, monthly comparison, savings observation
- `State Management`: reducer-based React state with persistence
- `UI/UX`: responsive layout, readable hierarchy, subtle animation, graceful empty states, and theme support

## Assumptions

- Mock personal finance data is sufficient for demonstrating interactions
- USD formatting is acceptable for this submission
- Role behavior is simulated on the frontend only; there is no authentication or backend enforcement
