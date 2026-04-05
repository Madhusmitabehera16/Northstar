import { DEFAULT_TRANSACTIONS, EMPTY_FORM } from "./data.js";

const STORAGE_KEY = "northstar-finance-dashboard-state";

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

const persisted = loadState();

const state = {
  role: persisted?.role || "viewer",
  transactions: persisted?.transactions || DEFAULT_TRANSACTIONS,
  filters: {
    search: "",
    category: "all",
    type: "all",
    sortBy: "date-desc"
  },
  editor: {
    mode: "create",
    draft: {
      ...EMPTY_FORM,
      date: new Date().toISOString().slice(0, 10)
    }
  }
};

const subscribers = new Set();

function persist() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      role: state.role,
      transactions: state.transactions
    })
  );
}

function emit() {
  persist();
  subscribers.forEach((listener) => listener(getState()));
}

export function getState() {
  return structuredClone(state);
}

export function subscribe(listener) {
  subscribers.add(listener);
  listener(getState());
  return () => subscribers.delete(listener);
}

export function updateRole(role) {
  state.role = role;
  emit();
}

export function updateFilters(nextFilters) {
  state.filters = { ...state.filters, ...nextFilters };
  emit();
}

export function updateDraft(changes) {
  state.editor.draft = { ...state.editor.draft, ...changes };
  emit();
}

export function startEditing(transaction) {
  state.editor.mode = "edit";
  state.editor.draft = { ...transaction, amount: String(transaction.amount) };
  emit();
}

export function resetDraft() {
  state.editor.mode = "create";
  state.editor.draft = {
    ...EMPTY_FORM,
    date: new Date().toISOString().slice(0, 10)
  };
  emit();
}

export function saveDraft() {
  const normalized = {
    ...state.editor.draft,
    amount: Number(state.editor.draft.amount)
  };

  if (state.editor.mode === "edit") {
    state.transactions = state.transactions.map((transaction) =>
      transaction.id === normalized.id ? normalized : transaction
    );
  } else {
    state.transactions = [{ ...normalized, id: `tx-${crypto.randomUUID()}` }, ...state.transactions];
  }

  resetDraft();
}
