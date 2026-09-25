import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { formatPKR, formatPKRCompact, formatDate, todayInPakistan, toDateInputValue } from "../utils/format";
import toast from "react-hot-toast";
import Loader from "../components/Loader";

// Preset date ranges
const PRESETS = [
  { label: "This Month", key: "thisMonth" },
  { label: "Last 30 Days", key: "last30" },
  { label: "This Year", key: "thisYear" },
  { label: "All Time", key: "all" },
];

const getRange = (key) => {
  const today = new Date();
  const y = today.getFullYear();
  const m = today.getMonth();

  switch (key) {
    case "thisMonth": {
      const start = new Date(y, m, 1);
      const end = new Date(y, m + 1, 0);
      return {
        startDate: toDateInputValue(start),
        endDate: toDateInputValue(end),
      };
    }
    case "last30": {
      const start = new Date(today);
      start.setDate(start.getDate() - 29);
      return {
        startDate: toDateInputValue(start),
        endDate: toDateInputValue(today),
      };
    }
    case "thisYear": {
      return {
        startDate: `${y}-01-01`,
        endDate: `${y}-12-31`,
      };
    }
    case "all":
    default:
      return { startDate: "", endDate: "" };
  }
};

export default function Dashboard() {
  const { user } = useAuth();
  const [preset, setPreset] = useState("thisMonth");
  const [range, setRange] = useState(getRange("thisMonth"));
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (range.startDate) params.startDate = range.startDate;
      if (range.endDate) params.endDate = range.endDate;

      const [summaryRes, recentRes] = await Promise.all([
        api.get("/transactions/stats/summary", { params }),
        api.get("/transactions", {
          params: { ...params, limit: 5, sortBy: "date", sortOrder: "desc" },
        }),
      ]);

      setStats(summaryRes.data);
      setRecent(recentRes.data.transactions || []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const applyPreset = (key) => {
    setPreset(key);
    setRange(getRange(key));
  };

  const handleCustomDate = (field, value) => {
    setPreset("custom");
    setRange((r) => ({ ...r, [field]: value }));
  };

  const overall = stats?.overall || { totalAmount: 0, count: 0 };
  const byCategory = stats?.byCategory || [];
  const byStatus = stats?.byStatus || [];
  const byPayment = stats?.byPayment || [];

  const pending = byStatus.find((s) => s._id === "Pending") || { total: 0, count: 0 };
  const completed = byStatus.find((s) => s._id === "Completed") || { total: 0, count: 0 };

  const maxCategoryTotal = byCategory[0]?.total || 1;
  const maxPaymentTotal = Math.max(...byPayment.map((p) => p.total), 1);

  const greeting = (() => {
    const hr = new Date().getHours();
    if (hr < 12) return "Good morning";
    if (hr < 17) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <div className="space-y-6">
      {/* ====== HEADER ====== */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            {greeting}, {user?.username || "Admin"} 👋
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Here's an overview of KH Tower's finances
          </p>
        </div>
        <Link to="/transactions" className="btn-primary self-start">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Transaction
        </Link>
      </div>

      {/* ====== DATE FILTERS ====== */}
      <div className="card !p-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.key}
                onClick={() => applyPreset(p.key)}
                className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                  preset === p.key
                    ? "bg-primary-600 text-white shadow-md shadow-primary-600/20"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 lg:ml-auto">
            <input
              type="date"
              value={range.startDate}
              max={range.endDate || todayInPakistan()}
              onChange={(e) => handleCustomDate("startDate", e.target.value)}
              className="input !w-auto text-sm"
            />
            <span className="text-gray-400 text-sm">to</span>
            <input
              type="date"
              value={range.endDate}
              min={range.startDate}
              max={todayInPakistan()}
              onChange={(e) => handleCustomDate("endDate", e.target.value)}
              className="input !w-auto text-sm"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <Loader message="Loading dashboard..." />
      ) : (
        <>
          {/* ====== SUMMARY CARDS ====== */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Total Spent"
              value={formatPKR(overall.totalAmount)}
              sub={`${overall.count} transaction${overall.count === 1 ? "" : "s"}`}
              gradient="from-blue-500 to-indigo-600"
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
            <StatCard
              label="Completed"
              value={formatPKR(completed.total)}
              sub={`${completed.count} transaction${completed.count === 1 ? "" : "s"}`}
              gradient="from-emerald-500 to-teal-600"
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
            <StatCard
              label="Pending"
              value={formatPKR(pending.total)}
              sub={`${pending.count} transaction${pending.count === 1 ? "" : "s"}`}
              gradient="from-amber-500 to-orange-600"
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
            <StatCard
              label="Categories Used"
              value={byCategory.length}
              sub="active in period"
              gradient="from-purple-500 to-pink-600"
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              }
            />
          </div>

          {/* ====== CATEGORY + PAYMENT ====== */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Category breakdown */}
            <div className="card lg:col-span-2">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    Spending by Category
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Where your money is going
                  </p>
                </div>
                <Link
                  to="/categories"
                  className="text-sm font-medium text-primary-600 hover:text-primary-700"
                >
                  Manage →
                </Link>
              </div>

              {byCategory.length === 0 ? (
                <EmptyState
                  icon="📊"
                  title="No data for this period"
                  text="Add a transaction to see category breakdown"
                />
              ) : (
                <div className="space-y-4">
                  {byCategory.map((c) => {
                    const percent = Math.round((c.total / overall.totalAmount) * 100);
                    const barWidth = (c.total / maxCategoryTotal) * 100;
                    return (
                      <div key={c.categoryId}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: c.color || "#6B7280" }}
                            />
                            <span className="text-sm font-medium text-gray-800 truncate">
                              {c.categoryName}
                            </span>
                            <span className="text-xs text-gray-400 flex-shrink-0">
                              {c.count} txn
                            </span>
                          </div>
                          <div className="text-right flex-shrink-0 ml-2">
                            <span className="text-sm font-bold text-gray-900">
                              {formatPKR(c.total)}
                            </span>
                            <span className="text-xs text-gray-400 ml-2">
                              {percent}%
                            </span>
                          </div>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${barWidth}%`,
                              backgroundColor: c.color || "#6B7280",
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Payment breakdown */}
            <div className="card">
              <h2 className="text-lg font-bold text-gray-900 mb-1">
                Payment Methods
              </h2>
              <p className="text-xs text-gray-500 mb-6">
                How you paid
              </p>

              {byPayment.length === 0 ? (
                <EmptyState icon="💳" title="No payments yet" />
              ) : (
                <div className="space-y-5">
                  {byPayment.map((p) => {
                    const colors = {
                      Card: "bg-blue-500",
                      Cash: "bg-emerald-500",
                      Check: "bg-amber-500",
                    };
                    const icons = {
                      Card: "💳",
                      Cash: "💵",
                      Check: "📝",
                    };
                    const barWidth = (p.total / maxPaymentTotal) * 100;
                    const percent = Math.round((p.total / overall.totalAmount) * 100);
                    return (
                      <div key={p._id}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{icons[p._id] || "💰"}</span>
                            <span className="text-sm font-medium text-gray-800">
                              {p._id}
                            </span>
                          </div>
                          <span className="text-xs font-semibold text-gray-500">
                            {percent}%
                          </span>
                        </div>
                        <div className="text-lg font-bold text-gray-900 mb-1.5">
                          {formatPKR(p.total)}
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${colors[p._id] || "bg-gray-400"} rounded-full transition-all duration-500`}
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                          {p.count} transaction{p.count === 1 ? "" : "s"}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ====== RECENT TRANSACTIONS ====== */}
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Recent Transactions
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Latest 5 in the selected period
                </p>
              </div>
              <Link
                to="/transactions"
                className="text-sm font-medium text-primary-600 hover:text-primary-700"
              >
                View all →
              </Link>
            </div>

            {recent.length === 0 ? (
              <EmptyState
                icon="🧾"
                title="No transactions yet"
                text="Start recording your first expense"
              />
            ) : (
              <div className="divide-y divide-gray-100">
                {recent.map((t) => (
                  <div
                    key={t._id}
                    className="flex items-center gap-4 py-3.5 hover:bg-gray-50 -mx-3 px-3 rounded-lg transition-colors"
                  >
                    {/* Category color dot */}
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{
                        backgroundColor: `${t.category?.color || "#6B7280"}20`,
                      }}
                    >
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: t.category?.color || "#6B7280" }}
                      />
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {t.description}
                        </p>
                        <StatusBadge status={t.status} />
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                        <span className="font-medium">
                          {t.category?.name || "—"}
                        </span>
                        <span>•</span>
                        <span>{formatDate(t.date)}</span>
                        <span>•</span>
                        <span>{t.paymentMethod}</span>
                      </div>
                    </div>

                    {/* Amount */}
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-gray-900">
                        {formatPKR(t.amountPKR)}
                      </p>
                      <p className="text-xs text-gray-400">#{t.serialNo}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/* ============ SUB-COMPONENTS ============ */

function StatCard({ label, value, sub, icon, gradient }) {
  return (
    <div className="card !p-5 relative overflow-hidden group hover:shadow-md transition-shadow">
      {/* Gradient blob */}
      <div
        className={`absolute -top-6 -right-6 w-24 h-24 rounded-full bg-gradient-to-br ${gradient} opacity-10 group-hover:opacity-20 transition-opacity`}
      />
      <div className="relative">
        <div className="flex items-start justify-between mb-3">
          <div
            className={`w-11 h-11 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white shadow-lg`}
          >
            {icon}
          </div>
        </div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          {label}
        </p>
        <p className="text-2xl font-bold text-gray-900 mt-1 break-words">
          {value}
        </p>
        <p className="text-xs text-gray-400 mt-1">{sub}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles =
    status === "Completed"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : "bg-amber-50 text-amber-700 border-amber-200";
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border ${styles}`}
    >
      {status}
    </span>
  );
}

function EmptyState({ icon = "📭", title, text }) {
  return (
    <div className="text-center py-10">
      <div className="text-4xl mb-3 opacity-60">{icon}</div>
      <p className="text-sm font-medium text-gray-700">{title}</p>
      {text && <p className="text-xs text-gray-400 mt-1">{text}</p>}
    </div>
  );
}