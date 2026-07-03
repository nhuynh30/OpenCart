"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud, X } from "lucide-react";
import Link from "next/link";

const CATEGORIES = [
  "Clothing", "Electronics", "Household", "Furniture", "Jewelry",
  "Books", "Food", "Sports", "Music", "Tools", "Beauty", "Toys", "Art", "Design",
];

export default function NewProductForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [priceStr, setPriceStr] = useState("");
  const [category, setCategory] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
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
    if (!name.trim()) { setError("Product name is required."); return; }
    const priceInCents = Math.round(parseFloat(priceStr || "0") * 100);
    if (isNaN(priceInCents) || priceInCents <= 0) { setError("Enter a valid price greater than $0."); return; }

    setSaving(true);
    setError("");

    let imageUrl: string | null = null;

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

    const res = await fetch("/api/products", {
      method: "POST",
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
      const d = await res.json();
      setError(d.error ?? "Something went wrong.");
      setSaving(false);
      return;
    }

    router.push("/seller/products");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid grid-cols-5 gap-6">

        {/* Left column — image */}
        <div className="col-span-2">
          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-5 py-4">
              <p className="text-sm font-semibold text-gray-900">Product image</p>
              <p className="mt-0.5 text-xs text-gray-400">Optional. PNG, JPG, WEBP · max 5 MB</p>
            </div>
            <div className="p-5">
              {imagePreview ? (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="preview"
                    className="h-56 w-full rounded-xl object-cover"
                  />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                  <p className="mt-2 truncate text-[11px] text-gray-400">
                    {imageFile?.name}
                  </p>
                </div>
              ) : (
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={() => setDragging(false)}
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex h-56 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed transition-colors ${
                    dragging
                      ? "border-indigo-400 bg-indigo-50"
                      : "border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-gray-100/60"
                  }`}
                >
                  <UploadCloud className={`h-8 w-8 ${dragging ? "text-indigo-400" : "text-gray-300"}`} />
                  <div className="text-center">
                    <p className="text-sm text-gray-500">
                      Drop here or{" "}
                      <span className="font-medium text-indigo-500">browse files</span>
                    </p>
                    <p className="mt-0.5 text-xs text-gray-400">PNG, JPG, WEBP up to 5 MB</p>
                  </div>
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
          </div>
        </div>

        {/* Right column — details */}
        <div className="col-span-3">
          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-5 py-4">
              <p className="text-sm font-semibold text-gray-900">Product details</p>
            </div>
            <div className="space-y-5 p-5">
              {/* Name */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-500">
                  Product name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Wireless Headphones"
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 outline-none placeholder:text-gray-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50"
                />
              </div>

              {/* Price + Category */}
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="mb-1.5 block text-xs font-medium text-gray-500">
                    Price (USD) <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-gray-400">$</span>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={priceStr}
                      onChange={(e) => setPriceStr(e.target.value)}
                      placeholder="0.00"
                      className="w-full rounded-xl border border-gray-200 py-2.5 pl-8 pr-3.5 text-sm text-gray-900 outline-none placeholder:text-gray-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50"
                    />
                  </div>
                </div>
                <div className="flex-1">
                  <label className="mb-1.5 block text-xs font-medium text-gray-500">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50"
                  >
                    <option value="">None</option>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c.toLowerCase()}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-500">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tell buyers what makes your product special…"
                  rows={5}
                  className="w-full resize-none rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 outline-none placeholder:text-gray-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50"
                />
              </div>

              {error && (
                <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-600">{error}</p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="mt-4 flex items-center justify-end gap-3">
            <Link
              href="/seller/products"
              className="rounded-xl px-4 py-2.5 text-sm text-gray-500 hover:bg-gray-200/60"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-black px-6 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60"
            >
              {uploading ? "Uploading…" : saving ? "Publishing…" : "Publish product"}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
