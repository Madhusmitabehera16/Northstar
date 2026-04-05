import { CATEGORIES, ROLES } from "./data.js";
import {
  getState,
  resetDraft,
  saveDraft,
  startEditing,
  subscribe,
  updateDraft,
  updateFilters,
  updateRole
} from "./store.js";
import { renderBarChart, renderTrendChart } from "./charts.js";
import { buildInsights, buildSummary, formatCurrency, formatDate, getVisibleTransactions, validateDraft } from "./utils.js";

const app = document.querySelector("#app");

function roleTone(role) {
  return role === "admin" ? "pill-positive" : "pill-neutral";
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

function renderSummaryCards(summary, transactionCount) {
  const cards = [
    { label: "Total Balance", value: formatCurrency(summary.balance), detail: `${transactionCount} moments captured in the ledger`, icon: "TB", tone: "tone-neutral" },
    { label: "Income", value: formatCurrency(summary.income), detail: "Money coming in this cycle", icon: "IN", tone: "tone-positive" },
    { label: "Expenses", value: formatCurrency(summary.expenses), detail: "Money going back out", icon: "EX", tone: "tone-negative" },
    { label: "Savings Rate", value: `${summary.savingsRate}%`, detail: "How much breathing room is left", icon: "SR", tone: "tone-warning" }
  ];

  return cards
    .map(
      (card, index) => `
        <article class="summary-card panel fade-in delay-${Math.min(index, 3)} ${card.tone}">
          <div class="card-label">
            <span>${card.label}</span>
            <span class="card-icon">${card.icon}</span>
          </div>
          <div class="card-value">${card.value}</div>
          <div class="card-detail">${card.detail}</div>
        </article>
      `
    )
    .join("");
}

function renderPulseStrip(summary, visibleTransactions) {
  const latest = visibleTransactions[0];
  const momentum = summary.balance >= 0 ? "Comfortable runway" : "Needs attention";
  const latestText = latest
    ? `${escapeHtml(latest.description)} on ${formatDate(latest.date)}`
    : "No recent activity yet";

  return `
    <div class="pulse-strip fade-in delay-2">
      <div class="pulse-chip">
        <span class="pulse-dot"></span>
        <span>Live mock snapshot</span>
      </div>
      <div class="pulse-stat">
        <small>Momentum</small>
        <strong>${momentum}</strong>
      </div>
      <div class="pulse-stat">
        <small>Latest entry</small>
        <strong>${latestText}</strong>
      </div>
      <div class="pulse-stat">
        <small>Spending pressure</small>
        <strong>${summary.topCategory ? escapeHtml(summary.topCategory.category) : "Waiting on expense data"}</strong>
      </div>
    </div>
  `;
}

function renderTransactionsTable(state, visibleTransactions) {
  if (!visibleTransactions.length) {
    return `<div class="empty-state"><p>No transactions match the current filters. Try clearing search or changing category/type.</p></div>`;
  }

  return `
    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Description</th>
            <th>Category</th>
            <th>Type</th>
            <th>Amount</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          ${visibleTransactions
            .map(
              (transaction) => `
                <tr>
                  <td>${formatDate(transaction.date)}</td>
                  <td>${escapeHtml(transaction.description)}</td>
                  <td>${escapeHtml(transaction.category)}</td>
                  <td><span class="badge ${transaction.type === "income" ? "badge-income" : "badge-expense"}">${transaction.type}</span></td>
                  <td class="${transaction.type === "income" ? "amount-positive" : "amount-negative"}">${transaction.type === "income" ? "+" : "-"}${formatCurrency(transaction.amount)}</td>
                  <td>${state.role === "admin" ? `<button class="icon-button" type="button" data-action="edit" data-id="${transaction.id}">Edit</button>` : `<span class="helper-copy">View only</span>`}</td>
                </tr>
              `
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderEditor(state) {
  if (state.role !== "admin") {
    return `
      <section class="editor-panel panel">
        <span class="section-kicker">Role based UI</span>
        <h3>Admin tools are hidden</h3>
        <p class="helper-copy">Switch the role to Admin to add a transaction or edit one from the table.</p>
      </section>
    `;
  }

  const draft = state.editor.draft;
  const validationMessage = validateDraft(draft);

  return `
    <section class="editor-panel panel">
      <span class="section-kicker">Admin editor</span>
      <h3>${state.editor.mode === "edit" ? "Edit transaction" : "Add a transaction"}</h3>
      <p class="helper-copy">This stays intentionally lightweight: a small form, instant feedback, and changes reflected everywhere right away.</p>
      <form id="transaction-form">
        <div class="editor-grid">
          <div class="field span-2">
            <label for="description">Description</label>
            <input id="description" name="description" value="${escapeHtml(draft.description)}" placeholder="Payroll deposit" />
          </div>
          <div class="field">
            <label for="date">Date</label>
            <input id="date" name="date" type="date" value="${draft.date}" />
          </div>
          <div class="field">
            <label for="amount">Amount</label>
            <input id="amount" name="amount" type="number" min="1" step="1" value="${draft.amount}" placeholder="500" />
          </div>
          <div class="field">
            <label for="category">Category</label>
            <select id="category" name="category">
              ${CATEGORIES.map((category) => `<option value="${category}" ${draft.category === category ? "selected" : ""}>${category}</option>`).join("")}
            </select>
          </div>
          <div class="field">
            <label for="type">Type</label>
            <select id="type" name="type">
              <option value="income" ${draft.type === "income" ? "selected" : ""}>Income</option>
              <option value="expense" ${draft.type === "expense" ? "selected" : ""}>Expense</option>
            </select>
          </div>
        </div>
        <div class="editor-actions">
          <button class="button" type="submit" ${validationMessage ? `title="${validationMessage}"` : ""}>${state.editor.mode === "edit" ? "Save changes" : "Add transaction"}</button>
          <button class="ghost-button" type="button" data-action="reset-draft">Reset</button>
        </div>
        <p class="helper-copy" style="margin-top:0.75rem;">${validationMessage || "Ready to save. The new data will instantly update cards, insights, and charts."}</p>
      </form>
    </section>
  `;
}

function render(state) {
  const visibleTransactions = getVisibleTransactions(state.transactions, state.filters);
  const summary = buildSummary(state.transactions);
  const insights = buildInsights(summary);
  const role = ROLES[state.role];

  app.innerHTML = `
    <div class="dashboard">
      <section class="hero">
        <article class="hero-copy panel fade-in">
          <span class="eyebrow">A calmer way to read money</span>
          <h1>Northstar turns a messy ledger into a daily money snapshot.</h1>
          <p>Instead of feeling like a spreadsheet wearing a dashboard costume, this version tries to feel more personal: softer language, a clearer visual rhythm, and just enough motion to make the page feel alive.</p>
          <div class="hero-metrics">
            <div class="hero-metric"><span>Net position</span><strong>${formatCurrency(summary.balance)}</strong></div>
            <div class="hero-metric"><span>Highest spend</span><strong>${summary.topCategory ? escapeHtml(summary.topCategory.category) : "None"}</strong></div>
            <div class="hero-metric"><span>Visible rows</span><strong>${visibleTransactions.length}</strong></div>
          </div>
          <div class="hero-note">
            <span class="hero-note-mark">Field note</span>
            <p>${summary.savingsRate >= 20 ? "Cashflow looks fairly balanced right now, with a healthy cushion after expenses." : "Spending is eating into the cushion a bit, so the page leans into that story."}</p>
          </div>
        </article>
        <aside class="hero-aside panel fade-in delay-1">
          <div class="section-header">
            <div>
              <span class="section-kicker">Role simulation</span>
              <h2 class="section-title">Small permission shift, visible UI difference</h2>
              <p class="section-copy">No backend auth here, just a front-end demo that makes the role change obvious and easy to review.</p>
            </div>
          </div>
          <div class="role-switcher">
            <label for="role-select">Active role</label>
            <select id="role-select">
              ${Object.entries(ROLES).map(([value, item]) => `<option value="${value}" ${value === state.role ? "selected" : ""}>${item.label}</option>`).join("")}
            </select>
          </div>
          <span class="role-pill ${roleTone(state.role)}">${role.label}</span>
          <p class="role-note">${role.note}</p>
          <div class="mini-storyboard">
            <div class="story-item">
              <span>Viewer</span>
              <strong>Reads trends and insights</strong>
            </div>
            <div class="story-item">
              <span>Admin</span>
              <strong>Can shape the ledger live</strong>
            </div>
          </div>
        </aside>
      </section>

      ${renderPulseStrip(summary, visibleTransactions)}

      <section class="summary-grid">${renderSummaryCards(summary, state.transactions.length)}</section>

      <section class="content-grid">
        <article class="chart-panel panel fade-in delay-1">
          <div class="section-header">
            <div>
              <span class="section-kicker">Time based visualization</span>
              <h2 class="section-title">Balance arc</h2>
              <p class="section-copy">A running line that shows how the month actually felt, not just where it ended.</p>
            </div>
          </div>
          <div class="chart-meta">
            <div class="metric-inline">Current balance<br /><strong>${formatCurrency(summary.balance)}</strong></div>
            <div class="metric-inline">Savings rate<br /><strong>${summary.savingsRate}%</strong></div>
          </div>
          <div class="chart-frame">${renderTrendChart(summary.trend)}</div>
        </article>

        <article class="breakdown-panel panel fade-in delay-2">
          <div class="section-header">
            <div>
              <span class="section-kicker">Categorical visualization</span>
              <h2 class="section-title">Where the money went</h2>
              <p class="section-copy">Expense categories ranked by weight so the story is readable in seconds.</p>
            </div>
          </div>
          <div class="breakdown-meta">
            <div class="metric-inline">Top category<br /><strong>${summary.topCategory ? escapeHtml(summary.topCategory.category) : "No data"}</strong></div>
            <div class="metric-inline">Tracked expenses<br /><strong>${formatCurrency(summary.expenses)}</strong></div>
          </div>
          <div class="breakdown-list">${renderBarChart(summary.categoryBreakdown)}</div>
        </article>
      </section>

      <section class="insights-panel panel fade-in delay-2" style="margin-bottom:1rem;">
        <div class="section-header">
          <div>
            <span class="section-kicker">Insights</span>
            <h2 class="section-title">What stands out right now</h2>
            <p class="section-copy">Short observations pulled from the same state that powers the rest of the page.</p>
          </div>
        </div>
        <div class="insights-grid">
          ${insights.map((insight) => `<article class="insight-card"><div class="insight-head"><span class="insight-icon pill-${insight.tone}">${insight.icon}</span><h3>${insight.title}</h3></div><p>${insight.body}</p></article>`).join("")}
        </div>
      </section>

      <section class="lower-grid">
        <article class="transactions-panel panel fade-in delay-3">
          <div class="section-header">
            <div>
              <span class="section-kicker">Transactions</span>
              <h2 class="section-title">Search the ledger, not a wall of rows</h2>
              <p class="section-copy">Filtering stays quick and visible so the user never loses the context of what changed.</p>
            </div>
          </div>
          <div class="toolbar">
            <div class="filter-group">
              <label for="search">Search</label>
              <input id="search" name="search" value="${escapeHtml(state.filters.search)}" placeholder="Search description or category" />
            </div>
            <div class="filter-group">
              <label for="category-filter">Category</label>
              <select id="category-filter" name="category">
                <option value="all">All categories</option>
                ${CATEGORIES.map((category) => `<option value="${category}" ${state.filters.category === category ? "selected" : ""}>${category}</option>`).join("")}
              </select>
            </div>
            <div class="filter-group">
              <label for="type-filter">Type</label>
              <select id="type-filter" name="type">
                <option value="all">All types</option>
                <option value="income" ${state.filters.type === "income" ? "selected" : ""}>Income</option>
                <option value="expense" ${state.filters.type === "expense" ? "selected" : ""}>Expense</option>
              </select>
            </div>
            <div class="filter-group">
              <label for="sort-filter">Sort</label>
              <select id="sort-filter" name="sortBy">
                <option value="date-desc" ${state.filters.sortBy === "date-desc" ? "selected" : ""}>Newest first</option>
                <option value="date-asc" ${state.filters.sortBy === "date-asc" ? "selected" : ""}>Oldest first</option>
                <option value="amount-desc" ${state.filters.sortBy === "amount-desc" ? "selected" : ""}>Amount high-low</option>
                <option value="amount-asc" ${state.filters.sortBy === "amount-asc" ? "selected" : ""}>Amount low-high</option>
              </select>
            </div>
          </div>
          ${renderTransactionsTable(state, visibleTransactions)}
        </article>
        ${renderEditor(state)}
      </section>
    </div>
  `;

  bindEvents(state);
}

function bindEvents(state) {
  document.querySelector("#role-select")?.addEventListener("change", (event) => updateRole(event.target.value));

  ["search", "category-filter", "type-filter", "sort-filter"].forEach((id) => {
    const element = document.querySelector(`#${id}`);
    element?.addEventListener("input", handleFilterChange);
    element?.addEventListener("change", handleFilterChange);
  });

  document.querySelectorAll('[data-action="edit"]').forEach((button) => {
    button.addEventListener("click", () => {
      const transaction = state.transactions.find((item) => item.id === button.dataset.id);
      if (transaction) startEditing(transaction);
    });
  });

  document.querySelector('[data-action="reset-draft"]')?.addEventListener("click", () => resetDraft());

  document.querySelector("#transaction-form")?.addEventListener("input", (event) => {
    if (event.target.name) updateDraft({ [event.target.name]: event.target.value });
  });

  document.querySelector("#transaction-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const validationMessage = validateDraft(getState().editor.draft);
    if (validationMessage) {
      alert(validationMessage);
      return;
    }
    saveDraft();
  });
}

function handleFilterChange(event) {
  const keyMap = { search: "search", "category-filter": "category", "type-filter": "type", "sort-filter": "sortBy" };
  const key = keyMap[event.target.id];
  if (key) updateFilters({ [key]: event.target.value });
}

subscribe(render);
