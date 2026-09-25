import { useEffect, useState, useMemo } from "react";
import api from "../api/axios";
import toast from "react-hot-toast";
import Modal from "../components/Modal";
import ConfirmDialog from "../components/ConfirmDialog";
import ColorPicker from "../components/ColorPicker";
import Loader from "../components/Loader";

const emptyForm = { name: "", description: "", color: "#3B82F6" };

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null); // null = create, obj = edit
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // Delete state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/categories", {
        params: showInactive ? { includeInactive: "true" } : {},
      });
      setCategories(data.categories || []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load categories");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
    // eslint-disable-next-line
  }, [showInactive]);

  const filtered = useMemo(() => {
    if (!search.trim()) return categories;
    const q = search.toLowerCase();
    return categories.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.description || "").toLowerCase().includes(q)
    );
  }, [categories, search]);

  /* ---------- CREATE / EDIT ---------- */

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError("");
    setModalOpen(true);
  };

  const openEdit = (cat) => {
    setEditing(cat);
    setForm({
      name: cat.name,
      description: cat.description || "",
      color: cat.color || "#3B82F6",
    });
    setFormError("");
    setModalOpen(true);
  };

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    if (formError) setFormError("");
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!form.name.trim()) {
      setFormError("Category name is required");
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        await api.put(`/categories/${editing._id}`, {
          name: form.name.trim(),
          description: form.description.trim(),
          color: form.color,
        });
        toast.success("Category updated");
      } else {
        await api.post("/categories", {
          name: form.name.trim(),
          description: form.description.trim(),
          color: form.color,
        });
        toast.success("Category created");
      }
      setModalOpen(false);
      fetchCategories();
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to save category";
      setFormError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  /* ---------- TOGGLE ACTIVE ---------- */

  const handleToggleActive = async (cat) => {
    try {
      await api.put(`/categories/${cat._id}`, { isActive: !cat.isActive });
      toast.success(cat.isActive ? "Category deactivated" : "Category activated");
      fetchCategories();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update");
    }
  };

  /* ---------- DELETE ---------- */

  const askDelete = (cat) => {
    setDeleteTarget(cat);
    setConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/categories/${deleteTarget._id}`);
      toast.success("Category deleted");
      setConfirmOpen(false);
      setDeleteTarget(null);
      fetchCategories();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Categories
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Organize your expenses with custom categories
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary self-start">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Category
        </button>
      </div>

      {/* FILTERS */}
      <div className="card !p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search categories..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-11"
            />
          </div>
          <label className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 cursor-pointer hover:bg-gray-50 text-sm text-gray-700 font-medium select-none">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
            />
            Show inactive
          </label>
        </div>
      </div>

      {/* GRID */}
      {loading ? (
        <Loader message="Loading categories..." />
      ) : filtered.length === 0 ? (
        <div className="card text-center py-16">
          <div className="text-5xl mb-4 opacity-60">🏷️</div>
          <h3 className="text-lg font-semibold text-gray-800">
            {search ? "No matching categories" : "No categories yet"}
          </h3>
          <p className="text-sm text-gray-500 mt-1 mb-5">
            {search
              ? "Try a different search term"
              : "Create your first category to start organizing expenses"}
          </p>
          {!search && (
            <button onClick={openCreate} className="btn-primary">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add your first category
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((cat) => (
            <CategoryCard
              key={cat._id}
              category={cat}
              onEdit={() => openEdit(cat)}
              onDelete={() => askDelete(cat)}
              onToggle={() => handleToggleActive(cat)}
            />
          ))}
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      <Modal
        isOpen={modalOpen}
        onClose={() => !saving && setModalOpen(false)}
        title={editing ? "Edit Category" : "New Category"}
        subtitle={
          editing
            ? "Update category details"
            : "Add a new expense category"
        }
      >
        <form onSubmit={handleSave} className="space-y-5">
          {formError && (
            <div className="flex items-start gap-2.5 p-3 bg-red-50 border border-red-200 rounded-lg">
              <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-red-700">{formError}</p>
            </div>
          )}

          <div>
            <label className="label">Category Name *</label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="e.g. Electricity Bill"
              className="input"
              autoFocus
              disabled={saving}
              maxLength={50}
            />
          </div>

          <div>
            <label className="label">Description (optional)</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Short note about this category"
              rows={2}
              className="input resize-none"
              disabled={saving}
              maxLength={200}
            />
          </div>

          <div>
            <label className="label">Color</label>
            <ColorPicker
              value={form.color}
              onChange={(c) => setForm((f) => ({ ...f, color: c }))}
            />
          </div>

          {/* Preview */}
          <div className="pt-2">
            <p className="text-xs font-medium text-gray-500 mb-2">Preview</p>
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-100">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: form.color }}
              />
              <span className="text-sm font-medium text-gray-800">
                {form.name.trim() || "Category Name"}
              </span>
            </div>
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
        title="Delete category?"
        message={
          <>
            Are you sure you want to delete{" "}
            <span className="font-semibold text-gray-900">
              {deleteTarget?.name}
            </span>
            ? This cannot be undone. Categories in use by transactions cannot be
            deleted — deactivate them instead.
          </>
        }
        loading={deleting}
      />
    </div>
  );
}

/* ============ CATEGORY CARD ============ */

function CategoryCard({ category, onEdit, onDelete, onToggle }) {
  const inactive = !category.isActive;

  return (
    <div
      className={`card !p-5 relative group transition-all hover:shadow-md ${
        inactive ? "opacity-60" : ""
      }`}
    >
      {/* Color accent bar */}
      <div
        className="absolute top-0 left-0 right-0 h-1 rounded-t-xl"
        style={{ backgroundColor: category.color || "#6B7280" }}
      />

      {/* Actions */}
      <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={onToggle}
          className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
          title={inactive ? "Activate" : "Deactivate"}
        >
          {inactive ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
            </svg>
          )}
        </button>
        <button
          onClick={onEdit}
          className="p-1.5 rounded-lg text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition-colors"
          title="Edit"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
          title="Delete"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      {/* Icon */}
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
        style={{ backgroundColor: `${category.color}20` }}
      >
        <div
          className="w-5 h-5 rounded-full"
          style={{ backgroundColor: category.color || "#6B7280" }}
        />
      </div>

      {/* Content */}
      <h3 className="font-bold text-gray-900 truncate pr-20">
        {category.name}
      </h3>
      <p className="text-xs text-gray-500 mt-1 line-clamp-2 min-h-[2rem]">
        {category.description || "No description"}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
            inactive
              ? "bg-gray-100 text-gray-600"
              : "bg-emerald-50 text-emerald-700"
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              inactive ? "bg-gray-400" : "bg-emerald-500"
            }`}
          />
          {inactive ? "Inactive" : "Active"}
        </span>
        <span className="text-[10px] text-gray-400 font-mono">
          {category.color}
        </span>
      </div>
    </div>
  );
}