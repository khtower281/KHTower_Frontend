import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import {
  formatPKR,
  formatDate,
  todayInPakistan,
  toDateInputValue,
} from "../utils/format";
import Loader from "../components/Loader";
import ConfirmDialog from "../components/ConfirmDialog";
import TransactionViewModal from "../components/TransactionViewModal";
import TransactionFormModal from "../components/TransactionFormModal";
import useDebounce from "../hooks/useDebounce";

const PAYMENT_METHODS = ["Card", "Cash", "Check"];
const STATUSES = ["Pending", "Completed"];

export default function Transactions() {
  const {} = useAuth();

  // Data
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    category: "",
    status: "",
    paymentMethod: "",
    search: "",
  });

  // Sorting
  const [sortBy, setSortBy] = useState("date");
  const [sortOrder, setSortOrder] = useState("desc");

  // Pagination
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Modals
  const [viewTx, setViewTx] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editTx, setEditTx] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Debounced search — prevents firing a request on every keystroke
  const debouncedSearch = useDebounce(filters.search, 400);

  // Ref to cancel in-flight requests when deps change
  const abortRef = useRef(null);

  /* ---------- FETCH CATEGORIES (once) ---------- */
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/categories", {
          params: { includeInactive: "true" },
        });
        setCategories(data.categories || []);
      } catch {
        // silent — filters will just show empty dropdown
      }
    })();
  }, []);

  /* ---------- FETCH TRANSACTIONS ---------- */
  const fetchTransactions = useCallback(async () => {
    // Cancel previous in-flight request
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    try {
      const params = { page, limit, sortBy, sortOrder };
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      if (filters.category) params.category = filters.category;
      if (filters.status) params.status = filters.status;
      if (filters.paymentMethod) params.paymentMethod = filters.paymentMethod;
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();

      const { data } = await api.get("/transactions", {
        params,
        signal: controller.signal,
      });
      setTransactions(data.transactions || []);
      setTotal(data.total || 0);
      setTotalPages(data.pages || 1);
    } catch (err) {
      // Ignore cancellations
      if (err.name === "CanceledError" || err.code === "ERR_CANCELED") return;
      toast.error(err.response?.data?.message || "Failed to load transactions");
    } finally {
      // Only flip loading off if this is still the latest request
      if (abortRef.current === controller) setLoading(false);
    }
  }, [
    page,
    limit,
    sortBy,
    sortOrder,
    filters.startDate,
    filters.endDate,
    filters.category,
    filters.status,
    filters.paymentMethod,
    debouncedSearch,
  ]);

  useEffect(() => {
    fetchTransactions();
    // Cleanup on unmount
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, [fetchTransactions]);

  /* ---------- RESET PAGE ON FILTER/SORT CHANGE ---------- */
  useEffect(() => {
    setPage(1);
  }, [
    filters.startDate,
    filters.endDate,
    filters.category,
    filters.status,
    filters.paymentMethod,
    debouncedSearch,
    sortBy,
    sortOrder,
  ]);

  /* ---------- CLEAR SELECTION ON FILTER/SORT/PAGE CHANGE ---------- */
  useEffect(() => {
    setSelectedIds(new Set());
  }, [
    filters.startDate,
    filters.endDate,
    filters.category,
    filters.status,
    filters.paymentMethod,
    debouncedSearch,
    sortBy,
    sortOrder,
    page,
  ]);

  /* ---------- HANDLERS ---------- */
  const handleFilterChange = (field, value) => {
    setFilters((f) => ({ ...f, [field]: value }));
  };

  const clearFilters = () => {
    setFilters({
      startDate: "",
      endDate: "",
      category: "",
      status: "",
      paymentMethod: "",
      search: "",
    });
  };

  const hasActiveFilters = useMemo(
    () => Object.values(filters).some((v) => v !== ""),
    [filters]
  );

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  const openView = (t) => setViewTx(t);

  const openCreate = () => {
    setEditTx(null);
    setFormOpen(true);
  };

  const openEdit = (t) => {
    setEditTx(t);
    setFormOpen(true);
  };

  const askDelete = (t) => {
    setDeleteTarget(t);
    setConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/transactions/${deleteTarget._id}`);
      toast.success(`Transaction #${deleteTarget.serialNo} deleted`);
      setConfirmOpen(false);
      setDeleteTarget(null);
      // If we deleted the last item on a page, go back one page
      if (transactions.length === 1 && page > 1) {
        setPage((p) => p - 1);
      } else {
        fetchTransactions();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  /* ---------- BULK SELECTION ---------- */
  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const allIds = transactions.map((t) => t._id);
    const allSelected = allIds.every((id) => selectedIds.has(id));
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allIds));
    }
  };

  const clearSelection = () => setSelectedIds(new Set());

  const allSelected =
    transactions.length > 0 &&
    transactions.every((t) => selectedIds.has(t._id));

  const someSelected = selectedIds.size > 0 && !allSelected;

  /* ---------- BULK DELETE ---------- */
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setBulkDeleting(true);
    const countAtStart = selectedIds.size;
    try {
      const { data } = await api.post("/transactions/bulk-delete", {
        ids: Array.from(selectedIds),
      });
      toast.success(data.message || "Transactions deleted");
      setBulkConfirmOpen(false);
      setSelectedIds(new Set());
      // If we deleted everything on this page, go back one page
      if (countAtStart >= transactions.length && page > 1) {
        setPage((p) => p - 1);
      } else {
        fetchTransactions();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete");
    } finally {
      setBulkDeleting(false);
    }
  };

  /* ---------- PDF EXPORT ---------- */
  const handleExport = async () => {
    setExporting(true);
    const toastId = toast.loading("Generating PDF...");
    try {
      const params = {};
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      if (filters.category) params.category = filters.category;
      if (filters.status) params.status = filters.status;
      if (filters.paymentMethod) params.paymentMethod = filters.paymentMethod;
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
      params.sortBy = sortBy;
      params.sortOrder = sortOrder;

      const response = await api.get("/export/pdf", {
        params,
        responseType: "blob",
      });

      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `KH-Tower-Transactions-${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success("PDF downloaded", { id: toastId });
    } catch (err) {
      let msg = "Failed to export PDF";
      if (err.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const parsed = JSON.parse(text);
          msg = parsed.message || msg;
        } catch {
          // ignore
        }
      } else if (err.response?.data?.message) {
        msg = err.response.data.message;
      }
      toast.error(msg, { id: toastId });
    } finally {
      setExporting(false);
    }
  };

  /* ---------- DATE PRESETS ---------- */
  const applyDatePreset = (key) => {
    const today = new Date();
    const y = today.getFullYear();
    const m = today.getMonth();

    if (key === "thisMonth") {
      setFilters((f) => ({
        ...f,
        startDate: toDateInputValue(new Date(y, m, 1)),
        endDate: toDateInputValue(new Date(y, m + 1, 0)),
      }));
    } else if (key === "last30") {
      const start = new Date(today);
      start.setDate(start.getDate() - 29);
      setFilters((f) => ({
        ...f,
        startDate: toDateInputValue(start),
        endDate: toDateInputValue(today),
      }));
    } else if (key === "thisYear") {
      setFilters((f) => ({
        ...f,
        startDate: `${y}-01-01`,
        endDate: `${y}-12-31`,
      }));
    }
  };

  return (
    <div className="space-y-6 pb-24">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Transactions
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {total} transaction{total === 1 ? "" : "s"} recorded
          </p>
        </div>
        <div className="flex gap-2 self-start">
          <button
            onClick={handleExport}
            disabled={exporting || total === 0}
            className="btn-secondary"
          >
            {exporting ? (
              <>
                <div className="w-4 h-4 border-2 border-gray-400/30 border-t-gray-600 rounded-full animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                Export PDF
              </>
            )}
          </button>
          <button onClick={openCreate} className="btn-primary">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add Transaction
          </button>
        </div>
      </div>

      {/* FILTERS */}
      <div className="card !p-4 space-y-3">
        {/* Row 1: Date + presets */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide mr-1">
            Date:
          </span>
          <button
            onClick={() => applyDatePreset("thisMonth")}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200"
          >
            This Month
          </button>
          <button
            onClick={() => applyDatePreset("last30")}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200"
          >
            Last 30 Days
          </button>
          <button
            onClick={() => applyDatePreset("thisYear")}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200"
          >
            This Year
          </button>
          <div className="flex items-center gap-2 ml-auto">
            <input
              type="date"
              value={filters.startDate}
              max={filters.endDate || todayInPakistan()}
              onChange={(e) => handleFilterChange("startDate", e.target.value)}
              className="input !w-auto text-xs"
            />
            <span className="text-gray-400 text-xs">to</span>
            <input
              type="date"
              value={filters.endDate}
              min={filters.startDate}
              max={todayInPakistan()}
              onChange={(e) => handleFilterChange("endDate", e.target.value)}
              className="input !w-auto text-xs"
            />
          </div>
        </div>

        {/* Row 2: Category, Status, Payment, Search */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          <select
            value={filters.category}
            onChange={(e) => handleFilterChange("category", e.target.value)}
            className="input text-sm"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={filters.status}
            onChange={(e) => handleFilterChange("status", e.target.value)}
            className="input text-sm"
          >
            <option value="">All Statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <select
            value={filters.paymentMethod}
            onChange={(e) =>
              handleFilterChange("paymentMethod", e.target.value)
            }
            className="input text-sm"
          >
            <option value="">All Payment Methods</option>
            {PAYMENT_METHODS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg
                className="w-4 h-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search description, check no..."
              value={filters.search}
              onChange={(e) => handleFilterChange("search", e.target.value)}
              className="input pl-9 text-sm"
            />
          </div>
        </div>

        {hasActiveFilters && (
          <div className="flex justify-end pt-1">
            <button
              onClick={clearFilters}
              className="text-xs font-medium text-primary-600 hover:text-primary-700 inline-flex items-center gap-1"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
              Clear filters
            </button>
          </div>
        )}
      </div>

      {/* TABLE */}
      {loading ? (
        <Loader message="Loading transactions..." />
      ) : transactions.length === 0 ? (
        <div className="card text-center py-16">
          <div className="text-5xl mb-4 opacity-60">🧾</div>
          <h3 className="text-lg font-semibold text-gray-800">
            {hasActiveFilters
              ? "No matching transactions"
              : "No transactions yet"}
          </h3>
          <p className="text-sm text-gray-500 mt-1 mb-5">
            {hasActiveFilters
              ? "Try adjusting or clearing your filters"
              : "Record your first expense to get started"}
          </p>
          {hasActiveFilters ? (
            <button onClick={clearFilters} className="btn-secondary">
              Clear filters
            </button>
          ) : (
            <button onClick={openCreate} className="btn-primary">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Add your first transaction
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block card !p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="pl-4 pr-2 py-3 w-10">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        ref={(el) => {
                          if (el) el.indeterminate = someSelected;
                        }}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                        aria-label="Select all"
                      />
                    </th>
                    <Th
                      label="S#"
                      field="serialNo"
                      sortBy={sortBy}
                      sortOrder={sortOrder}
                      onSort={handleSort}
                      align="center"
                    />
                    <Th
                      label="Date"
                      field="date"
                      sortBy={sortBy}
                      sortOrder={sortOrder}
                      onSort={handleSort}
                      align="center"
                    />
                    <Th label="Category" align="center" />
                    <Th label="Description" align="left" />
                    <Th label="Payment" align="center" />
                    <Th
                      label="Amount"
                      field="amountPKR"
                      sortBy={sortBy}
                      sortOrder={sortOrder}
                      onSort={handleSort}
                      align="center"
                    />
                    <Th label="Receipt" align="center" />
                    <Th label="Actions" align="center" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {transactions.map((t) => (
                    <tr
                      key={t._id}
                      className={`transition-colors ${
                        selectedIds.has(t._id)
                          ? "bg-primary-50"
                          : "hover:bg-gray-50"
                      }`}
                    >
                      <td className="pl-4 pr-2 py-3 w-10">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(t._id)}
                          onChange={() => toggleSelect(t._id)}
                          className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                          aria-label={`Select transaction ${t.serialNo}`}
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="font-mono text-xs font-semibold text-gray-500">
                          #{t.serialNo}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-sm text-gray-700">
                          {formatDate(t.date)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{
                              backgroundColor: t.category?.color || "#6B7280",
                            }}
                          />
                          <span className="text-sm font-medium text-gray-800 truncate max-w-[120px]">
                            {t.category?.name || "—"}
                          </span>
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-xs text-left">
                        <p className="text-sm text-gray-700 truncate">
                          {t.description}
                        </p>
                        {t.paymentMethod === "Check" && t.checkNo && (
                          <p className="text-xs text-gray-400 font-mono">
                            Check #{t.checkNo}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center px-2 py-1 rounded-md text-[11px] font-semibold bg-gray-100 text-gray-700">
                          {t.paymentMethod}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-sm font-bold text-gray-900">
                          {formatPKR(t.amountPKR)}
                        </span>
                        <div className="mt-0.5 flex justify-center">
                          <StatusDot status={t.status} />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {t.receiptUrl ? (
                          <button
                            onClick={() => openView(t)}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors mx-auto"
                            title="View receipt"
                          >
                            {t.receiptType === "image" ? (
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                />
                              </svg>
                            ) : (
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                                />
                              </svg>
                            )}
                          </button>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="inline-flex items-center gap-1 justify-center">
                          <RowActions
                            onView={() => openView(t)}
                            onEdit={() => openEdit(t)}
                            onDelete={() => askDelete(t)}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {transactions.map((t) => (
              <div
                key={t._id}
                className={`card !p-4 transition-colors ${
                  selectedIds.has(t._id)
                    ? "ring-2 ring-primary-500 bg-primary-50"
                    : ""
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(t._id)}
                      onChange={() => toggleSelect(t._id)}
                      className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer flex-shrink-0"
                      aria-label={`Select transaction ${t.serialNo}`}
                    />
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{
                        backgroundColor: t.category?.color || "#6B7280",
                      }}
                    />
                    <span className="text-xs font-semibold text-gray-500 font-mono">
                      #{t.serialNo}
                    </span>
                    <span className="text-xs text-gray-400">•</span>
                    <span className="text-xs text-gray-500">
                      {formatDate(t.date)}
                    </span>
                  </div>
                  <StatusDot status={t.status} />
                </div>

                <p className="text-sm font-medium text-gray-900 mb-1">
                  {t.description}
                </p>
                <p className="text-xs text-gray-500 mb-3">
                  {t.category?.name || "—"} • {t.paymentMethod}
                  {t.paymentMethod === "Check" && t.checkNo && (
                    <span className="font-mono"> #{t.checkNo}</span>
                  )}
                </p>

                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <span className="text-lg font-bold text-gray-900">
                    {formatPKR(t.amountPKR)}
                  </span>
                  <RowActions
                    onView={() => openView(t)}
                    onEdit={() => openEdit(t)}
                    onDelete={() => askDelete(t)}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* PAGINATION */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <p className="text-xs text-gray-500">
                Showing{" "}
                <span className="font-semibold text-gray-800">
                  {(page - 1) * limit + 1}
                </span>{" "}
                to{" "}
                <span className="font-semibold text-gray-800">
                  {Math.min(page * limit, total)}
                </span>{" "}
                of <span className="font-semibold text-gray-800">{total}</span>
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  disabled={page === 1}
                  className="btn-secondary !px-3"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                </button>
                {renderPageNumbers(page, totalPages, setPage)}
                <button
                  onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                  disabled={page === totalPages}
                  className="btn-secondary !px-3"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ============ BULK ACTION BAR ============ */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
          <div className="flex items-center gap-3 px-4 py-3 bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-700">
            <div className="flex items-center gap-2 pr-3 border-r border-slate-700">
              <div className="w-7 h-7 rounded-full bg-primary-600 flex items-center justify-center text-xs font-bold">
                {selectedIds.size}
              </div>
              <span className="text-sm font-medium whitespace-nowrap">
                selected
              </span>
            </div>

            <button
              onClick={clearSelection}
              className="text-sm font-medium text-slate-300 hover:text-white transition-colors whitespace-nowrap"
            >
              Clear
            </button>

            <button
              onClick={() => setBulkConfirmOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-sm font-semibold transition-colors whitespace-nowrap"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              Delete selected
            </button>
          </div>
        </div>
      )}

      {/* ============ MODALS ============ */}

      <TransactionViewModal
        isOpen={!!viewTx}
        onClose={() => setViewTx(null)}
        transaction={viewTx}
      />

      <TransactionFormModal
        isOpen={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditTx(null);
        }}
        editing={editTx}
        categories={categories}
        onSaved={() => {
          setFormOpen(false);
          setEditTx(null);
          fetchTransactions();
        }}
      />

      {/* Single delete confirm */}
      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => !deleting && setConfirmOpen(false)}
        onConfirm={confirmDelete}
        title="Delete transaction?"
        message={
          <>
            Are you sure you want to delete transaction{" "}
            <span className="font-semibold text-gray-900">
              #{deleteTarget?.serialNo}
            </span>{" "}
            ({formatPKR(deleteTarget?.amountPKR || 0)})? This cannot be undone.
          </>
        }
        loading={deleting}
      />

      {/* Bulk delete confirm */}
      <ConfirmDialog
        isOpen={bulkConfirmOpen}
        onClose={() => !bulkDeleting && setBulkConfirmOpen(false)}
        onConfirm={handleBulkDelete}
        title={`Delete ${selectedIds.size} transaction${
          selectedIds.size === 1 ? "" : "s"
        }?`}
        message={
          <>
            Are you sure you want to permanently delete{" "}
            <span className="font-semibold text-gray-900">
              {selectedIds.size} transaction
              {selectedIds.size === 1 ? "" : "s"}
            </span>
            ? This action cannot be undone.
          </>
        }
        confirmText={`Delete ${selectedIds.size}`}
        loading={bulkDeleting}
      />
    </div>
  );
}

/* ============ SUB-COMPONENTS ============ */

function Th({ label, field, sortBy, sortOrder, onSort, align = "left" }) {
  const sortable = !!field;
  const active = sortBy === field;

  // Tailwind needs literal class names — dynamic `text-${align}` won't work
  const alignClass = {
    left: "text-left",
    center: "text-center",
    right: "text-right",
  }[align] || "text-left";

  const justifyClass = {
    left: "justify-start",
    center: "justify-center",
    right: "justify-end",
  }[align] || "justify-start";

  return (
    <th
      className={`px-4 py-3 ${alignClass} text-[11px] font-semibold text-gray-500 uppercase tracking-wide ${
        sortable ? "cursor-pointer hover:text-gray-800 select-none" : ""
      }`}
      onClick={sortable ? () => onSort(field) : undefined}
    >
      <span className={`inline-flex items-center gap-1 ${justifyClass} w-full`}>
        {label}
        {sortable && (
          <span className={active ? "text-primary-600" : "text-gray-300"}>
            {active && sortOrder === "asc" ? (
              <svg
                className="w-3 h-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M5 15l7-7 7 7"
                />
              </svg>
            ) : (
              <svg
                className="w-3 h-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            )}
          </span>
        )}
      </span>
    </th>
  );
}

function StatusDot({ status }) {
  const isCompleted = status === "Completed";
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-semibold ${
        isCompleted ? "text-emerald-600" : "text-amber-600"
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          isCompleted ? "bg-emerald-500" : "bg-amber-500"
        }`}
      />
      {status}
    </span>
  );
}

function RowActions({ onView, onEdit, onDelete }) {
  return (
    <div className="inline-flex items-center gap-1">
      <button
        onClick={onView}
        className="p-1.5 rounded-lg text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition-colors"
        title="View"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
          />
        </svg>
      </button>
      <button
        onClick={onEdit}
        className="p-1.5 rounded-lg text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition-colors"
        title="Edit"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
          />
        </svg>
      </button>
      <button
        onClick={onDelete}
        className="p-1.5 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
        title="Delete"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
          />
        </svg>
      </button>
    </div>
  );
}

function renderPageNumbers(current, total, setPage) {
  const pages = [];
  const maxVisible = 5;

  let start = Math.max(1, current - Math.floor(maxVisible / 2));
  let end = Math.min(total, start + maxVisible - 1);
  if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1);

  if (start > 1) {
    pages.push(
      <button
        key={1}
        onClick={() => setPage(1)}
        className="w-9 h-9 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100"
      >
        1
      </button>
    );
    if (start > 2)
      pages.push(
        <span key="start-ellipsis" className="px-1 text-gray-400">
          …
        </span>
      );
  }

  for (let i = start; i <= end; i++) {
    pages.push(
      <button
        key={i}
        onClick={() => setPage(i)}
        className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
          i === current
            ? "bg-primary-600 text-white shadow-md shadow-primary-600/20"
            : "text-gray-600 hover:bg-gray-100"
        }`}
      >
        {i}
      </button>
    );
  }

  if (end < total) {
    if (end < total - 1)
      pages.push(
        <span key="end-ellipsis" className="px-1 text-gray-400">
          …
        </span>
      );
    pages.push(
      <button
        key={total}
        onClick={() => setPage(total)}
        className="w-9 h-9 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100"
      >
        {total}
      </button>
    );
  }

  return pages;
}