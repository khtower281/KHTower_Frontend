import { useEffect, useRef, useState } from "react";
import Modal from "./Modal";
import api from "../api/axios";
import toast from "react-hot-toast";
import { uploadToCloudinary } from "../utils/cloudinary";
import { toDateInputValue, todayInPakistan, formatPKR } from "../utils/format";

const PAYMENT_METHODS = [
  { value: "Cash", icon: "💵", label: "Cash" },
  { value: "Card", icon: "💳", label: "Card" },
  { value: "Check", icon: "📝", label: "Check" },
];

const emptyForm = {
  date: todayInPakistan(),
  description: "",
  checkNo: "",
  receiptUrl: "",
  receiptType: "",
  paymentMethod: "Cash",
  amountPKR: "",
  category: "",
  status: "Completed",
};

export default function TransactionFormModal({
  isOpen,
  onClose,
  editing,
  categories,
  onSaved,
}) {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    if (editing) {
      setForm({
        date: toDateInputValue(editing.date),
        description: editing.description || "",
        checkNo: editing.checkNo || "",
        receiptUrl: editing.receiptUrl || "",
        receiptType: editing.receiptType || "",
        paymentMethod: editing.paymentMethod || "Cash",
        amountPKR: editing.amountPKR ?? "",
        category: editing.category?._id || editing.category || "",
        status: editing.status || "Completed",
      });
    } else {
      setForm(emptyForm);
    }
    setFormError("");
    setUploadProgress(0);
    setUploading(false);
    setDragging(false);
  }, [isOpen, editing]);

  const handleChange = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
    if (formError) setFormError("");
  };

  /* ---------- Upload ---------- */
  const handleFile = async (file) => {
    if (!file) return;

    const isImage = file.type.startsWith("image/");
    const isPdf = file.type === "application/pdf";
    if (!isImage && !isPdf) {
      toast.error("Only images and PDF files are allowed");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File too large. Maximum size is 10 MB");
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    try {
      const result = await uploadToCloudinary(file, (percent) =>
        setUploadProgress(percent)
      );
      setForm((f) => ({
        ...f,
        receiptUrl: result.url,
        receiptType: result.type,
      }));
      toast.success("Receipt uploaded");
    } catch (err) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };
  const handleDragOver = (e) => {
    e.preventDefault();
    setDragging(true);
  };
  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragging(false);
  };
  const handleBrowse = () => fileInputRef.current?.click();
  const handleRemoveReceipt = () =>
    setForm((f) => ({ ...f, receiptUrl: "", receiptType: "" }));

  /* ---------- Submit ---------- */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!form.date) return setFormError("Date is required");
    if (!form.description.trim())
      return setFormError("Description is required");
    if (!form.amountPKR || Number(form.amountPKR) <= 0)
      return setFormError("Amount must be greater than 0");
    if (!form.category) return setFormError("Please select a category");
    if (form.paymentMethod === "Check" && !form.checkNo.trim())
      return setFormError("Check No is required for Check payments");

    const payload = {
      date: form.date,
      description: form.description.trim(),
      checkNo: form.checkNo.trim(),
      receiptUrl: form.receiptUrl,
      receiptType: form.receiptType,
      paymentMethod: form.paymentMethod,
      amountPKR: Number(form.amountPKR),
      category: form.category,
      status: form.status,
    };

    setSaving(true);
    try {
      if (editing) {
        await api.put(`/transactions/${editing._id}`, payload);
        toast.success(`Transaction #${editing.serialNo} updated`);
      } else {
        const { data } = await api.post("/transactions", payload);
        toast.success(`Transaction #${data.transaction.serialNo} created`);
      }
      onSaved?.();
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to save transaction";
      setFormError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const isCheck = form.paymentMethod === "Check";
  const selectedCategory = categories.find((c) => c._id === form.category);
  const busy = saving || uploading;

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !busy && onClose()}
      title={editing ? `Edit Transaction #${editing.serialNo}` : "New Transaction"}
      subtitle={
        editing
          ? "Update the transaction details"
          : "Record a new expense for KH Tower"
      }
      maxWidth="max-w-xl"
      noPadding
    >
      <form onSubmit={handleSubmit}>
        {/* ============ SCROLLABLE BODY ============ */}
        <div className="px-6 py-5 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Error */}
          {formError && (
            <div className="flex items-start gap-3 p-3.5 bg-red-50 border border-red-200 rounded-xl">
              <svg
                className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-sm text-red-700">{formError}</p>
            </div>
          )}

          {/* ============ SECTION: Basic Info ============ */}
          <Section title="Basic Information">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Date */}
              <Field label="Date" required>
                <input
                  type="date"
                  value={form.date}
                  max={todayInPakistan()}
                  onChange={(e) => handleChange("date", e.target.value)}
                  className="w-full h-11 px-3.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                  disabled={busy}
                  required
                />
              </Field>

              {/* Amount */}
              <Field
                label="Amount"
                required
                hint={
                  form.amountPKR > 0
                    ? formatPKR(form.amountPKR)
                    : undefined
                }
              >
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-sm font-semibold text-gray-500 pointer-events-none">
                    Rs
                  </span>
                  <input
                    type="number"
                    value={form.amountPKR}
                    onChange={(e) => handleChange("amountPKR", e.target.value)}
                    placeholder="0.00"
                    min="0.01"
                    step="0.01"
                    className="w-full h-11 pl-11 pr-3.5 border border-gray-300 rounded-lg text-sm font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    disabled={busy}
                    required
                  />
                </div>
              </Field>
            </div>

            {/* Description */}
            <Field label="Description" required>
              <input
                type="text"
                value={form.description}
                onChange={(e) => handleChange("description", e.target.value)}
                placeholder="e.g. January electricity bill"
                className="w-full h-11 px-3.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                disabled={busy}
                maxLength={200}
                required
              />
            </Field>
          </Section>

          {/* ============ SECTION: Classification ============ */}
          <Section title="Classification">
            {/* Category — full width for breathing room */}
            <Field label="Category" required>
              <div className="relative">
                <select
                  value={form.category}
                  onChange={(e) => handleChange("category", e.target.value)}
                  className="w-full h-11 pl-3.5 pr-20 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent appearance-none cursor-pointer transition-all"
                  disabled={busy}
                  required
                >
                  <option value="">Select a category</option>
                  {categories.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                      {c.isActive === false ? " (inactive)" : ""}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center gap-2 pointer-events-none">
                  {selectedCategory && (
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: selectedCategory.color }}
                    />
                  )}
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
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </div>
            </Field>

            {/* Status */}
            <Field label="Status" required>
              <div className="grid grid-cols-2 gap-3">
                <StatusButton
                  active={form.status === "Pending"}
                  onClick={() => handleChange("status", "Pending")}
                  disabled={busy}
                  color="amber"
                  label="Pending"
                />
                <StatusButton
                  active={form.status === "Completed"}
                  onClick={() => handleChange("status", "Completed")}
                  disabled={busy}
                  color="emerald"
                  label="Completed"
                />
              </div>
            </Field>

            {/* Payment Method */}
            <Field label="Payment Method" required>
              <div className="grid grid-cols-3 gap-3">
                {PAYMENT_METHODS.map((p) => {
                  const active = form.paymentMethod === p.value;
                  return (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => handleChange("paymentMethod", p.value)}
                      disabled={busy}
                      className={`h-11 rounded-lg text-sm font-medium border transition-all flex items-center justify-center gap-1.5 ${
                        active
                          ? "bg-primary-50 border-primary-500 text-primary-700 ring-2 ring-primary-100"
                          : "bg-white border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50"
                      }`}
                    >
                      <span className="text-base leading-none">{p.icon}</span>
                      <span>{p.label}</span>
                    </button>
                  );
                })}
              </div>
            </Field>

            {/* Check No (conditional) */}
            {isCheck && (
              <Field label="Check No" required hint="Required for check payments">
                <input
                  type="text"
                  value={form.checkNo}
                  onChange={(e) => handleChange("checkNo", e.target.value)}
                  placeholder="e.g. 123456789"
                  className="w-full h-11 px-3.5 border border-gray-300 rounded-lg text-sm font-mono bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all animate-[fadeIn_0.2s_ease-out]"
                  disabled={busy}
                  maxLength={30}
                  required
                />
              </Field>
            )}
          </Section>

          {/* ============ SECTION: Receipt ============ */}
          <Section title="Receipt" subtitle="Optional — attach an image or PDF">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                e.target.value = "";
              }}
              className="hidden"
            />

            {form.receiptUrl ? (
              /* ---------- Preview ---------- */
              <div className="rounded-xl border border-gray-200 overflow-hidden bg-white">
                {form.receiptType === "image" ? (
                  <div className="bg-gray-50 flex items-center justify-center">
                    <img
                      src={form.receiptUrl}
                      alt="Receipt preview"
                      className="max-h-72 w-auto object-contain"
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-3 p-5 bg-gray-50">
                    <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                      <svg
                        className="w-6 h-6 text-red-600"
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
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">
                        PDF Receipt
                      </p>
                      <p className="text-xs text-gray-500 truncate mt-0.5">
                        {form.receiptUrl.split("/").pop()}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-white">
                  <a
                    href={form.receiptUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-medium text-primary-600 hover:text-primary-700 inline-flex items-center gap-1.5"
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
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                    Open in new tab
                  </a>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleBrowse}
                      disabled={busy}
                      className="text-xs font-medium text-gray-600 hover:text-gray-900 transition-colors"
                    >
                      Replace
                    </button>
                    <button
                      type="button"
                      onClick={handleRemoveReceipt}
                      disabled={busy}
                      className="text-xs font-medium text-red-600 hover:text-red-700 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ) : uploading ? (
              /* ---------- Progress ---------- */
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-8 text-center">
                <div className="w-14 h-14 mx-auto mb-4 relative">
                  <div className="absolute inset-0 rounded-full border-4 border-primary-100"></div>
                  <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary-600 animate-spin"></div>
                </div>
                <p className="text-sm font-semibold text-gray-800 mb-3">
                  Uploading… {uploadProgress}%
                </p>
                <div className="max-w-xs mx-auto h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary-600 rounded-full transition-all duration-200"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            ) : (
              /* ---------- Dropzone ---------- */
              <div
                onClick={handleBrowse}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`cursor-pointer rounded-xl border-2 border-dashed transition-all ${
                  dragging
                    ? "border-primary-500 bg-primary-50"
                    : "border-gray-300 bg-gray-50 hover:border-primary-400 hover:bg-primary-50/40"
                }`}
              >
                <div className="flex flex-col items-center justify-center text-center px-6 py-10">
                  <div
                    className={`w-14 h-14 mb-4 rounded-full flex items-center justify-center transition-colors ${
                      dragging
                        ? "bg-primary-100 text-primary-600"
                        : "bg-white text-gray-400 border border-gray-200 shadow-sm"
                    }`}
                  >
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.8}
                        d="M7 16a4 4 0 01-.755-7.929 4.5 4.5 0 018.556-1.652A5.5 5.5 0 0119 11.5a3.5 3.5 0 01-3.5 3.5H7z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.8}
                        d="M12 12v9m0-9l-3 3m3-3l3 3"
                      />
                    </svg>
                  </div>

                  <p className="text-sm font-semibold text-gray-800 mb-1">
                    {dragging ? "Drop file here" : "Drag & drop receipt"}
                  </p>

                  <p className="text-xs text-gray-500">
                    or{" "}
                    <span className="text-primary-600 font-semibold underline-offset-2 hover:underline">
                      browse files
                    </span>
                  </p>

                  <p className="text-[11px] text-gray-400 mt-4">
                    Images (JPG, PNG, WEBP) or PDF • Max 10 MB
                  </p>
                </div>
              </div>
            )}
          </Section>
        </div>

        {/* ============ FOOTER ============ */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/70">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary"
            disabled={busy}
          >
            Cancel
          </button>
          <button type="submit" disabled={busy} className="btn-primary">
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving...
              </>
            ) : uploading ? (
              "Wait for upload..."
            ) : editing ? (
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
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Update
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
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Create Transaction
              </>
            )}
          </button>
        </div>
      </form>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </Modal>
  );
}

/* ============ REUSABLE SUB-COMPONENTS ============ */

function Section({ title, subtitle, children }) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
          {title}
        </h3>
        {subtitle && (
          <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
        )}
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, required, hint, children }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
        {hint && (
          <span className="text-[11px] text-gray-400 font-medium">{hint}</span>
        )}
      </div>
      {children}
    </div>
  );
}

function StatusButton({ active, onClick, disabled, color, label }) {
  const palette =
    color === "emerald"
      ? {
          active: "bg-emerald-50 border-emerald-500 text-emerald-700 ring-2 ring-emerald-100",
          dot: "bg-emerald-500",
        }
      : {
          active: "bg-amber-50 border-amber-500 text-amber-700 ring-2 ring-amber-100",
          dot: "bg-amber-500",
        };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`h-11 rounded-lg text-sm font-medium border transition-all flex items-center justify-center gap-2 ${
        active
          ? palette.active
          : "bg-white border-gray-300 text-gray-600 hover:border-gray-400 hover:bg-gray-50"
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${palette.dot}`} />
      {label}
    </button>
  );
}