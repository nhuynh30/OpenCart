"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Pencil, Trash2, Eye, EyeOff, UploadCloud, X } from "lucide-react";

type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  category: string | null;
  active: boolean;
};

type EditState = { open: false } | { open: true; product: Product };

const CATEGORIES = [
  "Clothing", "Electronics", "Household", "Furniture", "Jewelry",
  "Books", "Food", "Sports", "Music", "Tools", "Beauty", "Toys", "Art", "Design",
];

export default function ProductsClient({ products: initial }: { products: Product[] }) {
  const router = useRouter();
  const [products, setProducts] = useState(initial);
  const [edit, setEdit] = useState<EditState>({ open: false });
  const [deleting, setDeleting] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleToggle(product: Product) {
    setToggling(product.id);
    await fetch(`/api/products/${product.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !product.active }),
    });
    setProducts((prev) =>
      prev.map((p) => (p.id === product.id ? { ...p, active: !p.active } : p))
    );
    setToggling(null);
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this product from your store?")) return;
    setDeleting(id);
    const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.message === "hidden") {
      // Has orders — API hid it instead of deleting
      setProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, active: false } : p))
      );
      setNotice(data.reason);
      setTimeout(() => setNotice(null), 6000);
    } else if (data.message === "deleted") {
      setProducts((prev) => prev.filter((p) => p.id !== id));
    }
    setDeleting(null);
  }

  function handleSaved(updated: Product) {
    setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    setEdit({ open: false });
    router.refresh();
  }

  const active = products.filter((p) => p.active).length;
  const hidden = products.filter((p) => !p.active).length;

  return (
    <>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Products</h1>
          <p className="mt-0.5 text-sm text-gray-400">
            {active} live · {hidden} hidden
          </p>
        </div>
        <Link
          href="/seller/products/new"
          className="flex items-center gap-1.5 rounded-xl bg-black px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
        >
          <Plus className="h-4 w-4" />
          Add product
        </Link>
      </div>

      {notice && (
        <div className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <span>{notice}</span>
          <button onClick={() => setNotice(null)} className="shrink-0 text-amber-400 hover:text-amber-700">✕</button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        {products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-base font-medium text-gray-500">No products yet</p>
            <p className="mt-1 text-sm text-gray-400">Add your first product to start selling.</p>
            <Link
              href="/seller/products/new"
              className="mt-5 flex items-center gap-1.5 rounded-xl bg-black px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
            >
              <Plus className="h-4 w-4" />
              Add product
            </Link>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-400">Product</th>
                <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-400">Category</th>
                <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-400">Price</th>
                <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-400">Status</th>
                <th className="px-5 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {products.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50/50">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gray-100">
                        {product.imageUrl && (product.imageUrl.startsWith("/uploads/") || product.imageUrl.startsWith("http")) ? (
                          <img src={product.imageUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-sm font-semibold text-gray-400">
                            {product.name[0].toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{product.name}</p>
                        {product.description && (
                          <p className="mt-0.5 max-w-[220px] truncate text-xs text-gray-400">
                            {product.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    {product.category ? (
                      <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs capitalize text-gray-600">
                        {product.category}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-sm font-semibold text-gray-900">
                    ${(product.price / 100).toFixed(2)}
                  </td>
                  <td className="px-5 py-3.5">
                    <button
                      onClick={() => handleToggle(product)}
                      disabled={toggling === product.id}
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors disabled:opacity-50 ${
                        product.active
                          ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                          : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                      }`}
                    >
                      {product.active
                        ? <><Eye className="h-3 w-3" /> Live</>
                        : <><EyeOff className="h-3 w-3" /> Hidden</>
                      }
                    </button>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setEdit({ open: true, product })}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(product.id)}
                        disabled={deleting === product.id}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Edit modal (only for editing existing products) */}
      {edit.open && (
        <EditModal
          product={edit.product}
          onClose={() => setEdit({ open: false })}
          onSaved={handleSaved}
        />
      )}
    </>
  );
}

function EditModal({
  product,
  onClose,
  onSaved,
}: {
  product: Product;
  onClose: () => void;
  onSaved: (p: Product) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(product.name);
  const [description, setDescription] = useState(product.description ?? "");
  const [priceStr, setPriceStr] = useState((product.price / 100).toFixed(2));
  const [category, setCategory] = useState(product.category ?? "");
  const [imagePreview, setImagePreview] = useState<string | null>(product.imageUrl);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function handleFile(file: File) {
    if (!file.type.startsWith("image/")) { setError("Please select an image file."); return; }
    if (file.size > 5 * 1024 * 1024) { setError("Image must be under 5 MB."); return; }
    setError("");
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target?.result as string);
    reader.readAsDataURL(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  function removeImage() {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    if (!name.trim()) { setError("Name is required."); return; }
    const priceInCents = Math.round(parseFloat(priceStr || "0") * 100);
    if (isNaN(priceInCents) || priceInCents <= 0) { setError("Enter a valid price."); return; }

    setSaving(true);
    setError("");

    let imageUrl = imagePreview === null ? null : product.imageUrl;

    if (imageFile) {
      setUploading(true);
      const form = new FormData();
      form.append("file", imageFile);
      const uploadRes = await fetch("/api/upload", { method: "POST", body: form });
      setUploading(false);
      if (!uploadRes.ok) {
        const d = await uploadRes.json();
        setError(d.error ?? "Image upload failed.");
        setSaving(false);
        return;
      }
      imageUrl = (await uploadRes.json()).url;
    }

    const res = await fetch(`/api/products/${product.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        description: description.trim() || null,
        price: priceInCents,
        imageUrl,
        category: category || null,
      }),
    });

    if (!res.ok) {
      setError((await res.json()).error ?? "Something went wrong.");
      setSaving(false);
      return;
    }

    onSaved((await res.json()).product);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-sm font-semibold text-gray-900">Edit product</h2>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100">✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 px-6 py-5">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-500">Product image</label>
              {imagePreview ? (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt=""
                    className="h-32 w-full rounded-xl object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={() => setDragging(false)}
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex h-32 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed transition-colors ${
                    dragging
                      ? "border-indigo-400 bg-indigo-50"
                      : "border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-gray-100/60"
                  }`}
                >
                  <UploadCloud className={`h-6 w-6 ${dragging ? "text-indigo-400" : "text-gray-300"}`} />
                  <p className="text-xs text-gray-500">
                    Drop here or <span className="font-medium text-indigo-500">browse files</span>
                  </p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-500">Name <span className="text-red-400">*</span></label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50" />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="mb-1.5 block text-xs font-medium text-gray-500">Price <span className="text-red-400">*</span></label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-gray-400">$</span>
                  <input type="number" min="0.01" step="0.01" value={priceStr} onChange={(e) => setPriceStr(e.target.value)} className="w-full rounded-xl border border-gray-200 py-2.5 pl-8 pr-3.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50" />
                </div>
              </div>
              <div className="flex-1">
                <label className="mb-1.5 block text-xs font-medium text-gray-500">Category</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50">
                  <option value="">None</option>
                  {CATEGORIES.map((c) => <option key={c} value={c.toLowerCase()}>{c}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-500">Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full resize-none rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none placeholder:text-gray-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50" />
            </div>
            {error && <p className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>}
          </div>
          <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-6 py-4">
            <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm text-gray-500 hover:bg-gray-100">Cancel</button>
            <button type="submit" disabled={saving} className="rounded-xl bg-black px-5 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60">
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
