import Modal from "./Modal";
import { formatPKR, formatDate } from "../utils/format";

export default function TransactionViewModal({ isOpen, onClose, transaction }) {
  if (!transaction) return null;

  const t = transaction;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Transaction #${t.serialNo}`}
      subtitle={formatDate(t.date)}
      maxWidth="max-w-2xl"
    >
      <div className="space-y-5">
        {/* Amount Hero */}
        <div className="rounded-xl p-5 bg-gradient-to-br from-primary-600 to-indigo-700 text-white">
          <p className="text-xs uppercase tracking-wide opacity-80 mb-1">
            Amount
          </p>
          <p className="text-3xl font-bold">{formatPKR(t.amountPKR)}</p>
          <div className="flex items-center gap-2 mt-3">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                t.status === "Completed"
                  ? "bg-emerald-400/20 text-emerald-100 border border-emerald-300/30"
                  : "bg-amber-400/20 text-amber-100 border border-amber-300/30"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  t.status === "Completed" ? "bg-emerald-300" : "bg-amber-300"
                }`}
              />
              {t.status}
            </span>
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white/15 border border-white/20">
              {t.paymentMethod}
            </span>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Detail label="Serial No" value={`#${t.serialNo}`} mono />
          <Detail label="Date" value={formatDate(t.date)} />
          <Detail
            label="Category"
            value={
              <span className="inline-flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: t.category?.color || "#6B7280" }}
                />
                <span className="font-medium text-gray-800">
                  {t.category?.name || "—"}
                </span>
              </span>
            }
          />
          <Detail label="Payment Method" value={t.paymentMethod} />
          {t.paymentMethod === "Check" && (
            <Detail
              label="Check No"
              value={t.checkNo || "—"}
              mono
              className="sm:col-span-2"
            />
          )}
          <Detail
            label="Description"
            value={t.description || "—"}
            className="sm:col-span-2"
          />
        </div>

        {/* Receipt */}
        {t.receiptUrl ? (
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Receipt
            </p>
            {t.receiptType === "image" ? (
              <a
                href={t.receiptUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block group"
              >
                <div className="rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
                  <img
                    src={t.receiptUrl}
                    alt="Receipt"
                    className="w-full max-h-96 object-contain bg-white group-hover:opacity-95 transition-opacity"
                  />
                </div>
                <p className="text-xs text-primary-600 mt-2 text-center group-hover:underline">
                  Click to open full size ↗
                </p>
              </a>
            ) : (
              <a
                href={t.receiptUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="w-11 h-11 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">
                    PDF Receipt
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {t.receiptUrl.split("/").pop()}
                  </p>
                </div>
                <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            )}
          </div>
        ) : (
          <div className="p-4 rounded-xl border border-dashed border-gray-200 text-center">
            <p className="text-xs text-gray-400">No receipt attached</p>
          </div>
        )}
      </div>
    </Modal>
  );
}

function Detail({ label, value, mono, className = "" }) {
  return (
    <div className={className}>
      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">
        {label}
      </p>
      <p
        className={`text-sm text-gray-800 ${
          mono ? "font-mono font-medium" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}