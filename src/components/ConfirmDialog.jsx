import Modal from "./Modal";

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = "Are you sure?",
  message,
  confirmText = "Delete",
  cancelText = "Cancel",
  variant = "danger",
  loading = false,
}) {
  const btnClass =
    variant === "danger"
      ? "bg-red-600 hover:bg-red-700 text-white"
      : "bg-primary-600 hover:bg-primary-700 text-white";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="max-w-md">
      <div className="flex items-start gap-4">
        <div
          className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 ${
            variant === "danger" ? "bg-red-100" : "bg-primary-100"
          }`}
        >
          <svg
            className={`w-6 h-6 ${variant === "danger" ? "text-red-600" : "text-primary-600"}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4a2 2 0 00-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z"
            />
          </svg>
        </div>
        <p className="text-sm text-gray-600 leading-relaxed pt-1.5">{message}</p>
      </div>

      <div className="flex justify-end gap-2 mt-6">
        <button onClick={onClose} className="btn-secondary" disabled={loading}>
          {cancelText}
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className={`btn ${btnClass} shadow-md`}
        >
          {loading ? "Please wait..." : confirmText}
        </button>
      </div>
    </Modal>
  );
}