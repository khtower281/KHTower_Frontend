import { useEffect, useState, useCallback, useMemo } from "react";
import api from "../api/axios";
import toast from "react-hot-toast";
import Loader from "../components/Loader";
import Modal from "../components/Modal";
import ConfirmDialog from "../components/ConfirmDialog";
import useDebounce from "../hooks/useDebounce";

const emptyForm = { name: "", phone: "", description: "" };

export default function Contacts() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // Delete state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  /* ---------- FETCH ---------- */
  const fetchContacts = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
      const { data } = await api.get("/contacts", { params });
      setContacts(data.contacts || []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load contacts");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  /* ---------- CREATE / EDIT ---------- */
  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError("");
    setModalOpen(true);
  };

  const openEdit = (c) => {
    setEditing(c);
    setForm({
      name: c.name || "",
      phone: c.phone || "",
      description: c.description || "",
    });
    setFormError("");
    setModalOpen(true);
  };

  const handleChange = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
    if (formError) setFormError("");
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!form.name.trim()) return setFormError("Name is required");
    if (!form.phone.trim()) return setFormError("Phone number is required");

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        description: form.description.trim(),
      };

      if (editing) {
        await api.put(`/contacts/${editing._id}`, payload);
        toast.success("Contact updated");
      } else {
        await api.post("/contacts", payload);
        toast.success("Contact created");
      }
      setModalOpen(false);
      fetchContacts();
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to save contact";
      setFormError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  /* ---------- DELETE ---------- */
  const askDelete = (c) => {
    setDeleteTarget(c);
    setConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/contacts/${deleteTarget._id}`);
      toast.success(`Deleted "${deleteTarget.name}"`);
      setConfirmOpen(false);
      setDeleteTarget(null);
      fetchContacts();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  /* ---------- UTILS ---------- */
  const telHref = (phone) => `tel:${phone.replace(/[^0-9+]/g, "")}`;

  const initials = (name) => {
    if (!name) return "?";
    const parts = name.trim().split(" ").filter(Boolean);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (
      parts[0].charAt(0) + parts[parts.length - 1].charAt(0)
    ).toUpperCase();
  };

  const totalCount = useMemo(() => contacts.length, [contacts]);

  return (
    <div className="space-y-6 pb-24">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Contacts
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {totalCount} contact{totalCount === 1 ? "" : "s"} total
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary self-start">
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
          Add Contact
        </button>
      </div>

      {/* SEARCH */}
      <div className="card !p-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <svg
              className="w-5 h-5 text-gray-400"
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
            placeholder="Search by name, phone, or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-11 text-sm h-11"
          />
        </div>
      </div>

      {/* LIST */}
      {loading ? (
        <Loader message="Loading contacts..." />
      ) : contacts.length === 0 ? (
        <div className="card text-center py-16">
          <div className="text-5xl mb-4 opacity-60">📇</div>
          <h3 className="text-lg font-semibold text-gray-800">
            {search ? "No matching contacts" : "No contacts yet"}
          </h3>
          <p className="text-sm text-gray-500 mt-1 mb-5">
            {search
              ? "Try a different search term"
              : "Add your first contact to get started"}
          </p>
          {!search && (
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
              Add your first contact
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {contacts.map((c) => (
            <ContactCard
              key={c._id}
              contact={c}
              onEdit={() => openEdit(c)}
              onDelete={() => askDelete(c)}
              telHref={telHref}
              initials={initials}
            />
          ))}
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      <Modal
        isOpen={modalOpen}
        onClose={() => !saving && setModalOpen(false)}
        title={editing ? "Edit Contact" : "New Contact"}
        subtitle={
          editing ? "Update contact details" : "Add a new contact to your list"
        }
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSave} className="space-y-5">
          {formError && (
            <div className="flex items-start gap-2.5 p-3 bg-red-50 border border-red-200 rounded-lg">
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

          <div>
            <label className="label">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder="e.g. Ali Khan"
              className="input h-11"
              autoFocus
              disabled={saving}
              maxLength={80}
              required
            />
          </div>

          <div>
            <label className="label">
              Phone Number <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
              placeholder="e.g. 0300-1234567"
              className="input h-11 font-mono"
              disabled={saving}
              maxLength={30}
              required
            />
          </div>

          <div>
            <label className="label">Description (optional)</label>
            <textarea
              value={form.description}
              onChange={(e) => handleChange("description", e.target.value)}
              placeholder="e.g. Electrical contractor for ground floor"
              rows={3}
              className="input resize-none"
              disabled={saving}
              maxLength={300}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="btn-secondary"
              disabled={saving}
            >
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </>
              ) : editing ? (
                "Update"
              ) : (
                "Create"
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* DELETE CONFIRM */}
      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => !deleting && setConfirmOpen(false)}
        onConfirm={confirmDelete}
        title="Delete contact?"
        message={
          <>
            Are you sure you want to delete{" "}
            <span className="font-semibold text-gray-900">
              {deleteTarget?.name}
            </span>
            ? This cannot be undone.
          </>
        }
        loading={deleting}
      />
    </div>
  );
}

/* ============ CARD ============ */

function ContactCard({ contact, onEdit, onDelete, telHref, initials }) {
  return (
    <div className="card !p-5 group hover:shadow-md transition-shadow relative">
      {/* Actions */}
      <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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

      {/* Avatar */}
      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-primary-500/20 mb-4">
        {initials(contact.name)}
      </div>

      {/* Name */}
      <h3 className="font-bold text-gray-900 truncate pr-16">
        {contact.name}
      </h3>

      {/* Phone */}
      <a
        href={telHref(contact.phone)}
        className="inline-flex items-center gap-1.5 text-sm font-mono text-primary-600 hover:text-primary-700 mt-1.5"
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
            d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
          />
        </svg>
        {contact.phone}
      </a>

      {/* Description */}
      {contact.description && (
        <p className="text-xs text-gray-500 mt-3 line-clamp-2 min-h-[2rem]">
          {contact.description}
        </p>
      )}
    </div>
  );
}