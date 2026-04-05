export const ROLES = {
  viewer: {
    label: "Viewer",
    note: "Can explore summaries, insights, and transaction history."
  },
  admin: {
    label: "Admin",
    note: "Can add new transactions and edit existing ones for demos."
  }
};

export const CATEGORY_COLORS = {
  Housing: "#0f766e",
  Food: "#b45309",
  Transport: "#2563eb",
  Utilities: "#7c3aed",
  Salary: "#166534",
  Freelance: "#0f766e",
  Health: "#dc2626",
  Entertainment: "#9333ea",
  Travel: "#db2777",
  Savings: "#0369a1"
};

export const DEFAULT_TRANSACTIONS = [
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

export const CATEGORIES = [...new Set(DEFAULT_TRANSACTIONS.map((item) => item.category))].sort();

export const EMPTY_FORM = {
  id: "",
  date: "",
  description: "",
  category: "Food",
  type: "expense",
  amount: ""
};
