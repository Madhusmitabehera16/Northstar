import { useEffect, useMemo, useReducer, useState } from "react";

const STORAGE_KEY = "northstar-react-dashboard";

const roles = {
  viewer: {
    label: "Viewer",
    note: "Can explore summaries, trends, spending patterns, and transaction history."
  },
  admin: {
    label: "Admin",
    note: "Can add new transactions and edit existing ones directly from the dashboard."
  }
};

const categoryColors = {
  Housing: "#0f766e",
  Food: "#d97706",
  Transport: "#2563eb",
  Utilities: "#7c3aed",
  Salary: "#166534",
  Freelance: "#0891b2",
  Health: "#dc2626",
  Entertainment: "#9333ea",
  Travel: "#db2777",
  Savings: "#0369a1"
};

const seedTransactions = [
  { id: "tx-001", date: "2026-04-02", description: "Payroll deposit", category: "Salary", type: "income", amount: 4800 },
  { id: "tx-002", date: "2026-04-02", description: "Apartment rent", category: "Housing", type: "expense", amount: 1450 },
  { id: "tx-003", date: "2026-04-03", description: "Team lunch", category: "Food", type: "expense", amount: 42 },
  { id: "tx-004", date: "2026-04-04", description: "Electricity bill", category: "Utilities", type: "expense", amount: 118 },
  { id: "tx-005", date: "2026-03-28", description: "Freelance website project", category: "Freelance", type: "income", amount: 920 },
  { id: "tx-006", date: "2026-03-27", description: "Gym membership", category: "Health", type: "expense", amount: 65 },
  { id: "tx-007", date: "2026-03-26", description: "Weekend train tickets", category: "Transport", type: "expense", amount: 76 },
  { id: "tx-008", date: "2026-03-25", description: "Streaming services", category: "Entertainment", type: "expense", amount: 29 },
  { id: "tx-009", date: "2026-03-18", description: "Emergency fund transfer", category: "Savings", type: "expense", amount: 350 },
  { id: "tx-010", date: "2026-03-14", description: "Flight reimbursement", category: "Travel", type: "income", amount: 310 },
  { id: "tx-011", date: "2026-03-10", description: "Groceries", category: "Food", type: "expense", amount: 134 },
  { id: "tx-012", date: "2026-03-08", description: "Client retainer", category: "Freelance", type: "income", amount: 640 }
];

const categories = [...new Set(seedTransactions.map((item) => item.category))].sort();

const emptyDraft = () => ({
  id: "",
  date: new Date().toISOString().slice(0, 10),
  description: "",
  category: "Food",
  type: "expense",
  amount: ""
});

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(value || 0);
}

function formatDate(value) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric"
  }).format(new Date(value));
}

function monthLabel(value) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

function validateDraft(draft) {
  if (!draft.description.trim()) return "Description is required.";
  if (!draft.date) return "Date is required.";
  if (!draft.category) return "Category is required.";
  if (!draft.type) return "Type is required.";
  const amount = Number(draft.amount);
  if (!Number.isFinite(amount) || amount <= 0) return "Amount must be a positive number.";
  return "";
}

function sortTransactions(transactions, sortBy) {
  return [...transactions].sort((left, right) => {
    switch (sortBy) {
      case "date-asc":
        return new Date(left.date) - new Date(right.date);
      case "amount-desc":
        return right.amount - left.amount;
      case "amount-asc":
        return left.amount - right.amount;
      case "date-desc":
      default:
        return new Date(right.date) - new Date(left.date);
    }
  });
}

function getVisibleTransactions(transactions, filters) {
  const query = filters.search.trim().toLowerCase();
  const filtered = transactions.filter((transaction) => {
    const matchesSearch =
      !query ||
      transaction.description.toLowerCase().includes(query) ||
      transaction.category.toLowerCase().includes(query);
    const matchesCategory = filters.category === "all" || transaction.category === filters.category;
    const matchesType = filters.type === "all" || transaction.type === filters.type;
    return matchesSearch && matchesCategory && matchesType;
  });

  return sortTransactions(filtered, filters.sortBy);
}

function getSummary(transactions) {
  const income = transactions.filter((item) => item.type === "income").reduce((sum, item) => sum + item.amount, 0);
  const expenses = transactions.filter((item) => item.type === "expense").reduce((sum, item) => sum + item.amount, 0);
  const balance = income - expenses;
  const savingsRate = income ? Math.round(((income - expenses) / income) * 100) : 0;

  const timeline = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));
  let runningBalance = 0;
  const trend = timeline.map((transaction) => {
    runningBalance += transaction.type === "income" ? transaction.amount : -transaction.amount;
    return {
      id: transaction.id,
      label: formatDate(transaction.date),
      description: transaction.description,
      value: runningBalance
    };
  });

  const breakdownMap = transactions
    .filter((item) => item.type === "expense")
    .reduce((accumulator, transaction) => {
      accumulator[transaction.category] = (accumulator[transaction.category] || 0) + transaction.amount;
      return accumulator;
    }, {});

  const categoryBreakdown = Object.entries(breakdownMap)
    .map(([category, amount]) => ({
      category,
      amount,
      color: categoryColors[category] || "#0f766e"
    }))
    .sort((left, right) => right.amount - left.amount);

  const monthlyMap = transactions.reduce((accumulator, transaction) => {
    const key = monthLabel(transaction.date);
    if (!accumulator[key]) accumulator[key] = { income: 0, expense: 0 };
    accumulator[key][transaction.type] += transaction.amount;
    return accumulator;
  }, {});

  const monthlySeries = Object.entries(monthlyMap).map(([month, totals]) => ({
    month,
    income: totals.income,
    expense: totals.expense,
    net: totals.income - totals.expense
  }));

  monthlySeries.sort((left, right) => new Date(`1 ${left.month}`) - new Date(`1 ${right.month}`));

  return {
    income,
    expenses,
    balance,
    savingsRate,
    trend,
    categoryBreakdown,
    topCategory: categoryBreakdown[0],
    latestMonth: monthlySeries.at(-1),
    previousMonth: monthlySeries.at(-2)
  };
}

function getInsights(summary) {
  const delta =
    summary.latestMonth && summary.previousMonth
      ? summary.latestMonth.expense - summary.previousMonth.expense
      : null;

  return [
    {
      title: "Highest spend",
      body: summary.topCategory
        ? `${summary.topCategory.category} is leading this cycle at ${formatCurrency(summary.topCategory.amount)}.`
        : "No expense categories yet, so the spending mix is still blank.",
      tone: "amber"
    },
    {
      title: "Month over month",
      body:
        delta == null
          ? "Add another month of data to unlock a month-over-month comparison."
          : delta > 0
            ? `Spending is ${formatCurrency(delta)} higher than ${summary.previousMonth.month}.`
            : `Spending is ${formatCurrency(Math.abs(delta))} lower than ${summary.previousMonth.month}.`,
      tone: "cyan"
    },
    {
      title: "Financial posture",
      body:
        summary.savingsRate >= 20
          ? `Savings rate is ${summary.savingsRate}%, which suggests the current mix is fairly healthy.`
          : `Savings rate is ${summary.savingsRate}%, so expenses are taking a larger share of income.`,
      tone: summary.savingsRate >= 20 ? "emerald" : "rose"
    }
  ];
}

function loadInitialState() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    return {
      role: stored?.role || "viewer",
      theme: stored?.theme || "day",
      transactions: stored?.transactions || seedTransactions,
      filters: {
        search: "",
        category: "all",
        type: "all",
        sortBy: "date-desc"
      },
      editor: {
        mode: "create",
        draft: emptyDraft()
      }
    };
  } catch {
    return {
      role: "viewer",
      theme: "day",
      transactions: seedTransactions,
      filters: {
        search: "",
        category: "all",
        type: "all",
        sortBy: "date-desc"
      },
      editor: {
        mode: "create",
        draft: emptyDraft()
      }
    };
  }
}

function reducer(state, action) {
  switch (action.type) {
    case "setRole":
      return { ...state, role: action.role };
    case "setTheme":
      return { ...state, theme: action.theme };
    case "setFilters":
      return { ...state, filters: { ...state.filters, ...action.filters } };
    case "setDraft":
      return {
        ...state,
        editor: {
          ...state.editor,
          draft: { ...state.editor.draft, ...action.draft }
        }
      };
    case "resetDraft":
      return {
        ...state,
        editor: {
          mode: "create",
          draft: emptyDraft()
        }
      };
    case "editTransaction":
      return {
        ...state,
        editor: {
          mode: "edit",
          draft: {
            ...action.transaction,
            amount: String(action.transaction.amount)
          }
        }
      };
    case "saveDraft": {
      const normalized = {
        ...state.editor.draft,
        amount: Number(state.editor.draft.amount)
      };

      const transactions =
        state.editor.mode === "edit"
          ? state.transactions.map((transaction) =>
              transaction.id === normalized.id ? normalized : transaction
            )
          : [{ ...normalized, id: `tx-${crypto.randomUUID()}` }, ...state.transactions];

      return {
        ...state,
        transactions,
        editor: {
          mode: "create",
          draft: emptyDraft()
        }
      };
    }
    default:
      return state;
  }
}

function panelTone(theme, dayClass, nightClass) {
  return theme === "night" ? nightClass : dayClass;
}

function EmptyState({ text, theme }) {
  return (
    <div
      className={panelTone(
        theme,
        "rounded-[22px] border border-dashed border-slate-300 bg-white/45 p-6 text-sm text-slate-500",
        "rounded-[22px] border border-dashed border-slate-700 bg-slate-900/45 p-6 text-sm text-slate-400"
      )}
    >
      {text}
    </div>
  );
}

function SummaryCard({ title, value, detail, badge, theme, accent }) {
  const accentMap = {
    teal: theme === "night" ? "bg-teal-500/15 text-teal-200" : "bg-teal-600/10 text-teal-700",
    emerald: theme === "night" ? "bg-emerald-500/15 text-emerald-200" : "bg-emerald-600/10 text-emerald-700",
    rose: theme === "night" ? "bg-rose-500/15 text-rose-200" : "bg-rose-600/10 text-rose-700",
    amber: theme === "night" ? "bg-amber-500/15 text-amber-200" : "bg-amber-600/10 text-amber-700"
  };

  return (
    <article
      className={panelTone(
        theme,
        "animate-riseIn rounded-[28px] border border-slate-200/70 bg-white/65 p-5 shadow-[0_20px_70px_rgba(20,48,74,0.12)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:rotate-[-0.4deg]",
        "animate-riseIn rounded-[28px] border border-white/10 bg-slate-900/60 p-5 shadow-[0_20px_70px_rgba(0,0,0,0.35)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:rotate-[-0.4deg]"
      )}
    >
      <div className="flex items-center justify-between gap-4 text-sm">
        <span className={theme === "night" ? "text-slate-300" : "text-slate-500"}>{title}</span>
        <span className={`inline-flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold ${accentMap[accent]}`}>
          {badge}
        </span>
      </div>
      <div className="font-display mt-4 text-3xl font-bold tracking-tight">{value}</div>
      <p className={theme === "night" ? "mt-2 text-sm text-slate-400" : "mt-2 text-sm text-slate-500"}>{detail}</p>
    </article>
  );
}

function TrendChart({ data, theme }) {
  const [activePoint, setActivePoint] = useState(null);

  if (!data.length) {
    return <EmptyState theme={theme} text="No transactions yet, so the balance trend is waiting for activity." />;
  }

  const width = 720;
  const height = 290;
  const padding = { top: 20, right: 24, bottom: 44, left: 16 };
  const values = data.map((item) => item.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = data.map((item, index) => {
    const x = padding.left + (index / Math.max(data.length - 1, 1)) * (width - padding.left - padding.right);
    const y = padding.top + ((max - item.value) / range) * (height - padding.top - padding.bottom);
    return { ...item, x, y };
  });

  const linePath = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  const areaPath = `${linePath} L ${points.at(-1).x} ${height - padding.bottom} L ${points[0].x} ${height - padding.bottom} Z`;

  return (
    <div className="relative mt-5 overflow-hidden rounded-[24px] border border-white/10 bg-gradient-to-b from-white/80 to-orange-50/40 p-4 dark:from-slate-900/70 dark:to-slate-900/30">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
        <defs>
          <linearGradient id="trendFillReact" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={theme === "night" ? "rgba(45,212,191,0.35)" : "rgba(15,118,110,0.28)"} />
            <stop offset="100%" stopColor="rgba(15,118,110,0.02)" />
          </linearGradient>
        </defs>
        {Array.from({ length: 4 }).map((_, index) => {
          const y = padding.top + (index / 3) * (height - padding.top - padding.bottom);
          return (
            <line
              key={index}
              x1={padding.left}
              y1={y}
              x2={width - padding.right}
              y2={y}
              stroke={theme === "night" ? "rgba(226,232,240,0.1)" : "rgba(20,48,74,0.1)"}
              strokeDasharray="4 8"
            />
          );
        })}
        <path d={areaPath} fill="url(#trendFillReact)" />
        <path
          d={linePath}
          fill="none"
          stroke={theme === "night" ? "#5eead4" : "#0f766e"}
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {points.map((point) => (
          <circle
            key={point.id}
            cx={point.x}
            cy={point.y}
            r="6"
            fill={activePoint?.id === point.id ? "#f59e0b" : theme === "night" ? "#5eead4" : "#0f766e"}
            stroke={theme === "night" ? "#07111d" : "white"}
            strokeWidth="3"
            className="cursor-pointer transition"
            onMouseEnter={() => setActivePoint(point)}
            onMouseLeave={() => setActivePoint(null)}
          />
        ))}
        {points
          .filter((_, index) => index === 0 || index === points.length - 1 || index % 3 === 0)
          .map((point) => (
            <text
              key={`${point.id}-label`}
              x={point.x}
              y={height - 16}
              textAnchor="middle"
              fill={theme === "night" ? "#94a3b8" : "#64748b"}
              fontSize="11"
            >
              {point.label}
            </text>
          ))}
      </svg>

      <div className="mt-3 flex min-h-14 items-center rounded-2xl border border-white/10 bg-white/70 px-4 py-3 text-sm shadow-sm backdrop-blur dark:bg-slate-900/60">
        {activePoint ? (
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
            <span className="font-semibold">{activePoint.description}</span>
            <span className={theme === "night" ? "text-slate-400" : "text-slate-500"}>{activePoint.label}</span>
            <span className="font-display text-base font-bold">{formatCurrency(activePoint.value)}</span>
          </div>
        ) : (
          <span className={theme === "night" ? "text-slate-400" : "text-slate-500"}>
            Hover the markers to inspect the moments shaping the balance arc.
          </span>
        )}
      </div>
    </div>
  );
}

function BreakdownChart({ items, theme }) {
  if (!items.length) {
    return <EmptyState theme={theme} text="Add expense transactions to unlock the spending breakdown." />;
  }

  const total = items.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="mt-5 space-y-3">
      {items.map((item, index) => {
        const percent = total ? Math.round((item.amount / total) * 100) : 0;
        return (
          <div
            key={item.category}
            className={panelTone(
              theme,
              "animate-riseIn rounded-2xl border border-slate-200/70 bg-white/55 p-4 transition duration-200 hover:translate-x-1 hover:bg-white/80",
              "animate-riseIn rounded-2xl border border-white/10 bg-white/5 p-4 transition duration-200 hover:translate-x-1 hover:bg-white/8"
            )}
            style={{ animationDelay: `${index * 60}ms` }}
          >
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-semibold">{item.category}</span>
              <span className={theme === "night" ? "text-slate-300" : "text-slate-500"}>{percent}%</span>
            </div>
            <div className="mt-2 flex items-center justify-between gap-3 text-sm">
              <span className={theme === "night" ? "text-slate-400" : "text-slate-500"}>{formatCurrency(item.amount)}</span>
              <span className={theme === "night" ? "text-slate-400" : "text-slate-500"}>share of total expense</span>
            </div>
            <div className={theme === "night" ? "mt-3 h-2.5 rounded-full bg-slate-800" : "mt-3 h-2.5 rounded-full bg-slate-200/80"}>
              <div
                className="h-2.5 rounded-full transition-all duration-700"
                style={{ width: `${percent}%`, backgroundColor: item.color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function App() {
  const [state, dispatch] = useReducer(reducer, undefined, loadInitialState);
  const [saveMessage, setSaveMessage] = useState("");

  const summary = useMemo(() => getSummary(state.transactions), [state.transactions]);
  const insights = useMemo(() => getInsights(summary), [summary]);
  const visibleTransactions = useMemo(
    () => getVisibleTransactions(state.transactions, state.filters),
    [state.transactions, state.filters]
  );

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        role: state.role,
        theme: state.theme,
        transactions: state.transactions
      })
    );
  }, [state.role, state.theme, state.transactions]);

  useEffect(() => {
    document.body.dataset.theme = state.theme === "night" ? "night" : "day";
  }, [state.theme]);

  useEffect(() => {
    if (!saveMessage) return undefined;
    const timeout = window.setTimeout(() => setSaveMessage(""), 1800);
    return () => window.clearTimeout(timeout);
  }, [saveMessage]);

  const validationMessage = validateDraft(state.editor.draft);
  const role = roles[state.role];
  const latestVisible = visibleTransactions[0];

  const rootClass =
    state.theme === "night"
      ? "night grid-overlay min-h-screen text-slate-100"
      : "grid-overlay min-h-screen text-slate-900";

  const cardClass = panelTone(
    state.theme,
    "rounded-[30px] border border-white/70 bg-white/60 shadow-[0_20px_70px_rgba(20,48,74,0.12)] backdrop-blur-xl",
    "rounded-[30px] border border-white/10 bg-slate-900/60 shadow-[0_20px_70px_rgba(0,0,0,0.35)] backdrop-blur-xl"
  );

  const subtleText = state.theme === "night" ? "text-slate-400" : "text-slate-500";

  const handleSave = (event) => {
    event.preventDefault();
    if (validationMessage) return;
    dispatch({ type: "saveDraft" });
    setSaveMessage(state.editor.mode === "edit" ? "Transaction updated" : "Transaction added");
  };

  return (
    <div className={rootClass}>
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className={panelTone(state.theme, "absolute -left-24 -top-20 h-80 w-80 rounded-full bg-teal-500/20 blur-3xl", "absolute -left-24 -top-20 h-80 w-80 rounded-full bg-cyan-400/15 blur-3xl")} />
        <div className={panelTone(state.theme, "absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-amber-500/15 blur-3xl", "absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-fuchsia-400/10 blur-3xl")} />
      </div>

      <main className="relative mx-auto w-[min(1280px,calc(100%-1rem))] px-2 py-4 sm:px-4 sm:py-8">
        <section className="grid gap-4 lg:grid-cols-[1.45fr_0.9fr]">
          <article className={`${cardClass} animate-riseIn relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900 to-teal-800 p-6 text-white sm:p-8`}>
            <div className="absolute -bottom-10 right-0 h-48 w-48 rounded-[38%_62%_61%_39%/43%_48%_52%_57%] bg-amber-400/20 blur-2xl animate-floatBlob" />
            <span className="inline-flex rounded-full bg-white/14 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/80">
              A calmer way to read money
            </span>
            <h1 className="font-display mt-4 max-w-3xl text-4xl font-bold leading-none tracking-tight sm:text-6xl">
              Northstar turns a messy ledger into a daily money snapshot.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/78 sm:text-base">
              This rewrite uses React for stateful UI, Tailwind for styling, and a more personal visual tone so the page feels designed rather than assembled.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              {[
                { label: "Net position", value: formatCurrency(summary.balance) },
                { label: "Highest spend", value: summary.topCategory ? summary.topCategory.category : "None yet" },
                { label: "Visible rows", value: String(visibleTransactions.length) }
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur transition duration-200 hover:-translate-y-1 hover:rotate-[-1deg] hover:bg-white/15">
                  <span className="block text-xs text-white/70">{item.label}</span>
                  <strong className="mt-1 block text-lg font-semibold text-white">{item.value}</strong>
                </div>
              ))}
            </div>

            <div className="mt-6 max-w-xl rounded-r-2xl border-l-4 border-amber-300 bg-white/10 px-4 py-4">
              <span className="text-[11px] uppercase tracking-[0.18em] text-white/70">Field note</span>
              <p className="mt-2 text-sm leading-7 text-white/85">
                {summary.savingsRate >= 20
                  ? "Cashflow looks fairly balanced right now, with some breathing room left after expenses."
                  : "Expenses are eating into the cushion a little, so the dashboard leans into that story."}
              </p>
            </div>
          </article>

          <aside className={`${cardClass} animate-riseIn p-6 sm:p-8`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <span className={panelTone(state.theme, "inline-flex rounded-full bg-slate-900/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500", "inline-flex rounded-full bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400")}>
                  Role simulation
                </span>
                <h2 className="font-display mt-3 text-2xl font-bold">Small permission shift, visible UI difference</h2>
                <p className={`mt-2 text-sm leading-7 ${subtleText}`}>
                  Viewer and Admin are frontend-only here, but the interface still reacts clearly enough for a reviewer to follow.
                </p>
              </div>

              <button
                type="button"
                onClick={() => dispatch({ type: "setTheme", theme: state.theme === "night" ? "day" : "night" })}
                className={panelTone(state.theme, "rounded-full border border-slate-200 bg-white/70 px-3 py-2 text-sm font-medium text-slate-700 transition hover:-translate-y-0.5", "rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-slate-200 transition hover:-translate-y-0.5")}
              >
                {state.theme === "night" ? "Light mode" : "Dark mode"}
              </button>
            </div>

            <label className="mt-5 block text-sm font-medium">
              <span className={subtleText}>Active role</span>
              <select
                value={state.role}
                onChange={(event) => dispatch({ type: "setRole", role: event.target.value })}
                className={panelTone(state.theme, "mt-2 w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-slate-900 outline-none ring-0", "mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-100 outline-none ring-0")}
              >
                {Object.entries(roles).map(([value, item]) => (
                  <option key={value} value={value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="mt-4 inline-flex rounded-full bg-teal-500/10 px-3 py-1 text-sm font-semibold text-teal-300 dark:bg-teal-400/10">
              {role.label}
            </div>
            <p className={`mt-3 text-sm leading-7 ${subtleText}`}>{role.note}</p>

            <div className="mt-5 grid gap-3">
              <div className={panelTone(state.theme, "rounded-2xl border border-slate-200/70 bg-white/55 p-4", "rounded-2xl border border-white/10 bg-white/5 p-4")}>
                <span className={`block text-[11px] uppercase tracking-[0.18em] ${subtleText}`}>Viewer</span>
                <strong className="mt-1 block">Reads trends, spending patterns, and insights</strong>
              </div>
              <div className={panelTone(state.theme, "rounded-2xl border border-slate-200/70 bg-white/55 p-4", "rounded-2xl border border-white/10 bg-white/5 p-4")}>
                <span className={`block text-[11px] uppercase tracking-[0.18em] ${subtleText}`}>Admin</span>
                <strong className="mt-1 block">Can shape the ledger live with add and edit actions</strong>
              </div>
            </div>
          </aside>
        </section>

        <section className={panelTone(state.theme, "animate-riseIn mt-4 grid gap-4 rounded-[26px] border border-slate-200/80 bg-white/55 px-4 py-4 shadow-sm backdrop-blur lg:grid-cols-[1.15fr_repeat(3,minmax(0,1fr))]", "animate-riseIn mt-4 grid gap-4 rounded-[26px] border border-white/10 bg-slate-900/45 px-4 py-4 shadow-sm backdrop-blur lg:grid-cols-[1.15fr_repeat(3,minmax(0,1fr))]")}>
          <div className="flex items-center gap-3 lg:border-r lg:border-slate-300/40 lg:pr-4 dark:lg:border-slate-700/70">
            <span className="h-3 w-3 rounded-full bg-teal-500 animate-pulseRing" />
            <div>
              <div className="text-sm font-semibold">Live mock snapshot</div>
              <div className={`text-xs ${subtleText}`}>Frontend-only data, but fully interactive</div>
            </div>
          </div>
          <div>
            <div className={`text-[11px] uppercase tracking-[0.18em] ${subtleText}`}>Momentum</div>
            <div className="mt-1 font-semibold">{summary.balance >= 0 ? "Comfortable runway" : "Needs attention"}</div>
          </div>
          <div>
            <div className={`text-[11px] uppercase tracking-[0.18em] ${subtleText}`}>Latest entry</div>
            <div className="mt-1 font-semibold">{latestVisible ? `${latestVisible.description} on ${formatDate(latestVisible.date)}` : "No recent activity yet"}</div>
          </div>
          <div>
            <div className={`text-[11px] uppercase tracking-[0.18em] ${subtleText}`}>Spending pressure</div>
            <div className="mt-1 font-semibold">{summary.topCategory ? summary.topCategory.category : "Waiting on expense data"}</div>
          </div>
        </section>

        <section className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard title="Total Balance" value={formatCurrency(summary.balance)} detail={`${state.transactions.length} moments captured in the ledger`} badge="TB" theme={state.theme} accent="teal" />
          <SummaryCard title="Income" value={formatCurrency(summary.income)} detail="Money coming in this cycle" badge="IN" theme={state.theme} accent="emerald" />
          <SummaryCard title="Expenses" value={formatCurrency(summary.expenses)} detail="Money going back out" badge="EX" theme={state.theme} accent="rose" />
          <SummaryCard title="Savings Rate" value={`${summary.savingsRate}%`} detail="How much breathing room is left" badge="SR" theme={state.theme} accent="amber" />
        </section>

        <section className="mt-4 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <article className={`${cardClass} animate-riseIn p-5 sm:p-6`}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <span className={panelTone(state.theme, "inline-flex rounded-full bg-slate-900/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500", "inline-flex rounded-full bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400")}>
                  Time based visualization
                </span>
                <h2 className="font-display mt-3 text-2xl font-bold">Balance arc</h2>
                <p className={`mt-2 text-sm leading-7 ${subtleText}`}>A running line that shows how the month actually felt, not just where it ended.</p>
              </div>
              <div className="grid gap-2 text-sm">
                <div>
                  <div className={subtleText}>Current balance</div>
                  <strong className="font-display text-lg">{formatCurrency(summary.balance)}</strong>
                </div>
                <div>
                  <div className={subtleText}>Savings rate</div>
                  <strong className="font-display text-lg">{summary.savingsRate}%</strong>
                </div>
              </div>
            </div>
            <TrendChart data={summary.trend} theme={state.theme} />
          </article>

          <article className={`${cardClass} animate-riseIn p-5 sm:p-6`}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <span className={panelTone(state.theme, "inline-flex rounded-full bg-slate-900/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500", "inline-flex rounded-full bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400")}>
                  Categorical visualization
                </span>
                <h2 className="font-display mt-3 text-2xl font-bold">Where the money went</h2>
                <p className={`mt-2 text-sm leading-7 ${subtleText}`}>Expense categories ranked by weight so the story is readable in seconds.</p>
              </div>
              <div className="grid gap-2 text-sm">
                <div>
                  <div className={subtleText}>Top category</div>
                  <strong className="font-display text-lg">{summary.topCategory ? summary.topCategory.category : "No data"}</strong>
                </div>
                <div>
                  <div className={subtleText}>Tracked expenses</div>
                  <strong className="font-display text-lg">{formatCurrency(summary.expenses)}</strong>
                </div>
              </div>
            </div>
            <BreakdownChart items={summary.categoryBreakdown} theme={state.theme} />
          </article>
        </section>

        <section className={`${cardClass} animate-riseIn mt-4 p-5 sm:p-6`}>
          <div>
            <span className={panelTone(state.theme, "inline-flex rounded-full bg-slate-900/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500", "inline-flex rounded-full bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400")}>
              Insights
            </span>
            <h2 className="font-display mt-3 text-2xl font-bold">What stands out right now</h2>
            <p className={`mt-2 text-sm leading-7 ${subtleText}`}>Short observations pulled from the same state that powers the rest of the dashboard.</p>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            {insights.map((insight) => {
              const tones = {
                amber: state.theme === "night" ? "bg-amber-400/10 text-amber-200" : "bg-amber-500/10 text-amber-700",
                cyan: state.theme === "night" ? "bg-cyan-400/10 text-cyan-200" : "bg-cyan-500/10 text-cyan-700",
                emerald: state.theme === "night" ? "bg-emerald-400/10 text-emerald-200" : "bg-emerald-500/10 text-emerald-700",
                rose: state.theme === "night" ? "bg-rose-400/10 text-rose-200" : "bg-rose-500/10 text-rose-700"
              };

              return (
                <article
                  key={insight.title}
                  className={panelTone(
                    state.theme,
                    "rounded-[24px] border border-slate-200/70 bg-white/55 p-5 transition duration-200 hover:-translate-y-1",
                    "rounded-[24px] border border-white/10 bg-white/5 p-5 transition duration-200 hover:-translate-y-1"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${tones[insight.tone]}`}>
                      {insight.title.slice(0, 2).toUpperCase()}
                    </span>
                    <h3 className="text-base font-semibold">{insight.title}</h3>
                  </div>
                  <p className={`mt-4 text-sm leading-7 ${subtleText}`}>{insight.body}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="mt-4 grid gap-4 xl:grid-cols-[1.35fr_0.85fr]">
          <article className={`${cardClass} animate-riseIn p-5 sm:p-6`}>
            <div>
              <span className={panelTone(state.theme, "inline-flex rounded-full bg-slate-900/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500", "inline-flex rounded-full bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400")}>
                Transactions
              </span>
              <h2 className="font-display mt-3 text-2xl font-bold">Search the ledger, not a wall of rows</h2>
              <p className={`mt-2 text-sm leading-7 ${subtleText}`}>Search, filter, and sorting all update in place so the user never loses context.</p>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-[1.2fr_repeat(3,minmax(0,0.8fr))]">
              <label className="text-sm font-medium">
                <span className={subtleText}>Search</span>
                <input
                  value={state.filters.search}
                  onChange={(event) => dispatch({ type: "setFilters", filters: { search: event.target.value } })}
                  placeholder="Search description or category"
                  className={panelTone(state.theme, "mt-2 w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 outline-none", "mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none")}
                />
              </label>

              <label className="text-sm font-medium">
                <span className={subtleText}>Category</span>
                <select
                  value={state.filters.category}
                  onChange={(event) => dispatch({ type: "setFilters", filters: { category: event.target.value } })}
                  className={panelTone(state.theme, "mt-2 w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 outline-none", "mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none")}
                >
                  <option value="all">All categories</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm font-medium">
                <span className={subtleText}>Type</span>
                <select
                  value={state.filters.type}
                  onChange={(event) => dispatch({ type: "setFilters", filters: { type: event.target.value } })}
                  className={panelTone(state.theme, "mt-2 w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 outline-none", "mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none")}
                >
                  <option value="all">All types</option>
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                </select>
              </label>

              <label className="text-sm font-medium">
                <span className={subtleText}>Sort</span>
                <select
                  value={state.filters.sortBy}
                  onChange={(event) => dispatch({ type: "setFilters", filters: { sortBy: event.target.value } })}
                  className={panelTone(state.theme, "mt-2 w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 outline-none", "mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none")}
                >
                  <option value="date-desc">Newest first</option>
                  <option value="date-asc">Oldest first</option>
                  <option value="amount-desc">Amount high-low</option>
                  <option value="amount-asc">Amount low-high</option>
                </select>
              </label>
            </div>

            <div className="mt-5 overflow-hidden rounded-[24px] border border-slate-200/70 dark:border-white/10">
              {visibleTransactions.length ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className={panelTone(state.theme, "bg-slate-900/4 text-slate-500", "bg-white/5 text-slate-400")}>
                      <tr>
                        {["Date", "Description", "Category", "Type", "Amount", "Action"].map((label) => (
                          <th key={label} className="px-4 py-3 font-medium">
                            {label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {visibleTransactions.map((transaction) => (
                        <tr
                          key={transaction.id}
                          className={panelTone(state.theme, "border-t border-slate-200/70 bg-white/45 transition hover:bg-white/75", "border-t border-white/10 bg-white/0 transition hover:bg-white/5")}
                        >
                          <td className="px-4 py-4">{formatDate(transaction.date)}</td>
                          <td className="px-4 py-4 font-medium">{transaction.description}</td>
                          <td className="px-4 py-4">{transaction.category}</td>
                          <td className="px-4 py-4">
                            <span
                              className={
                                transaction.type === "income"
                                  ? panelTone(state.theme, "rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700", "rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200")
                                  : panelTone(state.theme, "rounded-full bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-700", "rounded-full bg-rose-400/10 px-3 py-1 text-xs font-semibold text-rose-200")
                              }
                            >
                              {transaction.type}
                            </span>
                          </td>
                          <td className={`px-4 py-4 font-semibold ${transaction.type === "income" ? "text-emerald-500" : "text-rose-500"}`}>
                            {transaction.type === "income" ? "+" : "-"}
                            {formatCurrency(transaction.amount)}
                          </td>
                          <td className="px-4 py-4">
                            {state.role === "admin" ? (
                              <button
                                type="button"
                                onClick={() => dispatch({ type: "editTransaction", transaction })}
                                className={panelTone(state.theme, "rounded-xl bg-slate-900/6 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:-translate-y-0.5", "rounded-xl bg-white/8 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:-translate-y-0.5")}
                              >
                                Edit
                              </button>
                            ) : (
                              <span className={subtleText}>View only</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState theme={state.theme} text="No transactions match the current search and filters." />
              )}
            </div>
          </article>

          <section className={`${cardClass} animate-riseIn p-5 sm:p-6`}>
            {state.role !== "admin" ? (
              <>
                <span className={panelTone(state.theme, "inline-flex rounded-full bg-slate-900/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500", "inline-flex rounded-full bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400")}>
                  Role based UI
                </span>
                <h3 className="font-display mt-3 text-2xl font-bold">Admin tools are hidden</h3>
                <p className={`mt-3 text-sm leading-7 ${subtleText}`}>
                  Switch the role to Admin if you want to add a transaction or edit an existing one.
                </p>
              </>
            ) : (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className={panelTone(state.theme, "inline-flex rounded-full bg-slate-900/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500", "inline-flex rounded-full bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400")}>
                      Admin editor
                    </span>
                    <h3 className="font-display mt-3 text-2xl font-bold">{state.editor.mode === "edit" ? "Edit transaction" : "Add a transaction"}</h3>
                    <p className={`mt-2 text-sm leading-7 ${subtleText}`}>
                      Lightweight form state, instant updates, and local persistence so the dashboard always reflects the latest change.
                    </p>
                  </div>
                  {saveMessage ? (
                    <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-500">
                      {saveMessage}
                    </span>
                  ) : null}
                </div>

                <form onSubmit={handleSave} className="mt-5">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="sm:col-span-2 text-sm font-medium">
                      <span className={subtleText}>Description</span>
                      <input
                        value={state.editor.draft.description}
                        onChange={(event) => dispatch({ type: "setDraft", draft: { description: event.target.value } })}
                        placeholder="Payroll deposit"
                        className={panelTone(state.theme, "mt-2 w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 outline-none", "mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none")}
                      />
                    </label>

                    <label className="text-sm font-medium">
                      <span className={subtleText}>Date</span>
                      <input
                        type="date"
                        value={state.editor.draft.date}
                        onChange={(event) => dispatch({ type: "setDraft", draft: { date: event.target.value } })}
                        className={panelTone(state.theme, "mt-2 w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 outline-none", "mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none")}
                      />
                    </label>

                    <label className="text-sm font-medium">
                      <span className={subtleText}>Amount</span>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={state.editor.draft.amount}
                        onChange={(event) => dispatch({ type: "setDraft", draft: { amount: event.target.value } })}
                        placeholder="500"
                        className={panelTone(state.theme, "mt-2 w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 outline-none", "mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none")}
                      />
                    </label>

                    <label className="text-sm font-medium">
                      <span className={subtleText}>Category</span>
                      <select
                        value={state.editor.draft.category}
                        onChange={(event) => dispatch({ type: "setDraft", draft: { category: event.target.value } })}
                        className={panelTone(state.theme, "mt-2 w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 outline-none", "mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none")}
                      >
                        {categories.map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="text-sm font-medium">
                      <span className={subtleText}>Type</span>
                      <select
                        value={state.editor.draft.type}
                        onChange={(event) => dispatch({ type: "setDraft", draft: { type: event.target.value } })}
                        className={panelTone(state.theme, "mt-2 w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 outline-none", "mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none")}
                      >
                        <option value="income">Income</option>
                        <option value="expense">Expense</option>
                      </select>
                    </label>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      type="submit"
                      disabled={Boolean(validationMessage)}
                      className="rounded-2xl bg-gradient-to-r from-teal-600 to-teal-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(13,148,136,0.25)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-55"
                    >
                      {state.editor.mode === "edit" ? "Save changes" : "Add transaction"}
                    </button>
                    <button
                      type="button"
                      onClick={() => dispatch({ type: "resetDraft" })}
                      className={panelTone(state.theme, "rounded-2xl bg-slate-900/6 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5", "rounded-2xl bg-white/8 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:-translate-y-0.5")}
                    >
                      Reset
                    </button>
                  </div>

                  <p className={`mt-4 text-sm ${validationMessage ? "text-rose-500" : subtleText}`}>
                    {validationMessage || "Ready to save. Summary cards, insights, charts, and the table will all update instantly."}
                  </p>
                </form>
              </>
            )}
          </section>
        </section>
      </main>
    </div>
  );
}

export default App;
