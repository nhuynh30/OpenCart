"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { storeSchema, StoreInput } from "@/lib/schemas";

export default function EditStoreForm({
  storeId,
  initialName,
  initialDescription,
}: {
  storeId: string;
  initialName: string;
  initialDescription: string;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<StoreInput>({
    resolver: zodResolver(storeSchema),
    defaultValues: { name: initialName, description: initialDescription },
  });
  const name = watch("name");
  const description = watch("description");

  async function onSubmit(values: StoreInput) {
    setSaving(true);
    setError("");

    const res = await fetch("/api/store", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(data.error ?? "Failed to save");
      return;
    }

    toast.success("Store updated");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700">Store name</label>
        <input
          type="text"
          {...register("name")}
          maxLength={60}
          className="mt-1.5 block w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
          placeholder="My Store"
        />
        {errors.name ? (
          <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>
        ) : (
          <p className="mt-1 text-xs text-gray-400">{(name ?? "").length}/60 characters</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          About your store
          <span className="ml-1.5 font-normal text-gray-400">(optional)</span>
        </label>
        <p className="mt-0.5 text-xs text-gray-400">
          Buyers see this on your public store page. Tell them who you are and what you sell.
        </p>
        <textarea
          {...register("description")}
          rows={5}
          maxLength={500}
          className="mt-1.5 block w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
          placeholder="e.g. We sell handmade jewelry crafted from sustainable materials. Every piece is unique and made to order..."
        />
        {errors.description ? (
          <p className="mt-1 text-xs text-red-600">{errors.description.message}</p>
        ) : (
          <p className="mt-1 text-xs text-gray-400">{(description ?? "").length}/500 characters</p>
        )}
      </div>

      <div className="flex items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-black px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>

        <a
          href={`/stores/${storeId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto text-sm text-gray-400 hover:text-gray-700 underline"
        >
          Preview your store →
        </a>
      </div>
    </form>
  );
}
