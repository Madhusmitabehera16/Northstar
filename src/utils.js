import { CATEGORY_COLORS } from "./data.js";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0
});

const monthFormatter = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" });
const dayFormatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

export function formatCurrency(value) {
  return currencyFormatter.format(value || 0);
}

export function formatDate(value) {
  return dayFormatter.format(new Date(value));
}

function sortTransactions(transactions, sortBy) {
  const sorted = [...transactions];
  sorted.sort((left, right) => {
    switch (sortBy) {
      case "amount-desc":
        return right.amount - left.amount;
      case "amount-asc":
        return left.amount - right.amount;
      case "date-asc":
        return new Date(left.date) - new Date(right.date);
      case "date-desc":
      default:
        return new Date(right.date) - new Date(left.date);
    }
  });
  return sorted;
}

export function getVisibleTransactions(transactions, filters) {
  const query = filters.search.trim().toLowerCase();
  const filtered = transactions.filter((transaction) => {
    const matchesQuery =
      !query ||
      transaction.description.toLowerCase().includes(query) ||
      transaction.category.toLowerCase().includes(query);
    const matchesCategory = filters.category === "all" || transaction.category === filters.category;
    const matchesType = filters.type === "all" || transaction.type === filters.type;
    return matchesQuery && matchesCategory && matchesType;
  });
  return sortTransactions(filtered, filters.sortBy);
}

export function buildSummary(transactions) {
  const income = transactions.filter((item) => item.type === "income").reduce((sum, item) => sum + item.amount, 0);
  const expenses = transactions.filter((item) => item.type === "expense").reduce((sum, item) => sum + item.amount, 0);
  const balance = income - expenses;
  const savingsRate = income ? Math.round(((income - expenses) / income) * 100) : 0;

  const recentTransactions = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));
  let runningBalance = 0;
  const trend = recentTransactions.map((transaction) => {
    runningBalance += transaction.type === "income" ? transaction.amount : -transaction.amount;
    return { label: formatDate(transaction.date), value: runningBalance };
  });

  const expenseCategories = transactions
    .filter((item) => item.type === "expense")
    .reduce((accumulator, transaction) => {
      accumulator[transaction.category] = (accumulator[transaction.category] || 0) + transaction.amount;
      return accumulator;
    }, {});

  const categoryBreakdown = Object.entries(expenseCategories)
    .map(([category, amount]) => ({
      category,
      amount,
      color: CATEGORY_COLORS[category] || "#0f766e"
    }))
    .sort((left, right) => right.amount - left.amount);

  const monthGroups = transactions.reduce((accumulator, transaction) => {
    const key = monthFormatter.format(new Date(transaction.date));
    if (!accumulator[key]) accumulator[key] = { income: 0, expense: 0 };
    accumulator[key][transaction.type] += transaction.amount;
    return accumulator;
  }, {});

  const monthlySeries = Object.entries(monthGroups)
    .map(([month, totals]) => ({ month, ...totals, net: totals.income - totals.expense }))
    .sort((left, right) => new Date(`1 ${left.month}`) - new Date(`1 ${right.month}`));

  return {
    income,
    expenses,
    balance,
    savingsRate,
    trend,
    categoryBreakdown,
    monthlySeries,
    topCategory: categoryBreakdown[0],
    latestMonth: monthlySeries.at(-1),
    previousMonth: monthlySeries.at(-2)
  };
}

export function buildInsights(summary) {
  const comparison =
    summary.latestMonth && summary.previousMonth
      ? summary.latestMonth.expense - summary.previousMonth.expense
      : 0;

  const comparisonText =
    !summary.latestMonth || !summary.previousMonth
      ? "Add another month of mock activity to unlock month-over-month insight."
      : comparison > 0
        ? `Spending is ${formatCurrency(comparison)} higher than ${summary.previousMonth.month}.`
        : `Spending is ${formatCurrency(Math.abs(comparison))} lower than ${summary.previousMonth.month}.`;

  return [
    {
      title: "Highest spend",
      icon: "01",
      tone: "warning",
      body: summary.topCategory
        ? `${summary.topCategory.category} leads spending at ${formatCurrency(summary.topCategory.amount)}.`
        : "No expense data yet, so every category is still under control."
    },
    {
      title: "Monthly signal",
      icon: "02",
      tone: "neutral",
      body: comparisonText
    },
    {
      title: "Financial posture",
      icon: "03",
      tone: summary.savingsRate >= 20 ? "positive" : "negative",
      body:
        summary.savingsRate >= 20
          ? `Savings rate is ${summary.savingsRate}%, which suggests healthy room after spending.`
          : `Savings rate is ${summary.savingsRate}%, so expenses are taking a larger share of income.`
    }
  ];
}

export function validateDraft(draft) {
  if (!draft.description.trim()) return "Description is required.";
  if (!draft.date) return "Date is required.";
  if (!draft.category) return "Category is required.";
  if (!draft.type) return "Type is required.";
  const amount = Number(draft.amount);
  if (!Number.isFinite(amount) || amount <= 0) return "Amount should be a positive number.";
  return "";
}
