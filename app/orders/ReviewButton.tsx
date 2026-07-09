"use client";

import { useState } from "react";
import { Star } from "lucide-react";

type Props = {
  orderId: string;
  productName: string;
  existingReview?: { rating: number; comment: string | null } | null;
};

export default function ReviewButton({ orderId, productName, existingReview }: Props) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(existingReview?.rating ?? 0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState(existingReview?.comment ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(!!existingReview);
  const [error, setError] = useState("");

  if (done) {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((s) => (
          <Star
            key={s}
            className={`h-3.5 w-3.5 ${s <= (existingReview?.rating ?? rating) ? "fill-amber-400 text-amber-400" : "text-gray-200"}`}
          />
        ))}
        <span className="ml-1 text-xs text-gray-400">Reviewed</span>
      </div>
    );
  }

  async function submit() {
    if (rating === 0) { setError("Please select a rating"); return; }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, rating, comment }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to submit review");
        return;
      }
      setDone(true);
      setOpen(false);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:border-gray-300 hover:bg-gray-50 transition-colors"
      >
        <Star className="h-3 w-3" />
        Leave a review
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
            {/* Header */}
            <div className="border-b border-gray-100 px-6 py-5">
              <h2 className="text-base font-semibold text-gray-900">Leave a review</h2>
              <p className="mt-0.5 text-sm text-gray-400 truncate">{productName}</p>
            </div>

            <div className="px-6 py-5 space-y-5">
              {/* Star picker */}
              <div>
                <p className="mb-2 text-sm font-medium text-gray-700">Your rating</p>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      onMouseEnter={() => setHovered(s)}
                      onMouseLeave={() => setHovered(0)}
                      onClick={() => setRating(s)}
                      className="p-0.5 transition-transform hover:scale-110"
                    >
                      <Star
                        className={`h-7 w-7 transition-colors ${
                          s <= (hovered || rating)
                            ? "fill-amber-400 text-amber-400"
                            : "text-gray-200"
                        }`}
                      />
                    </button>
                  ))}
                  {rating > 0 && (
                    <span className="ml-2 text-sm text-gray-500">
                      {["", "Poor", "Fair", "Good", "Very good", "Excellent"][rating]}
                    </span>
                  )}
                </div>
              </div>

              {/* Comment */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Comment <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  maxLength={1000}
                  rows={3}
                  placeholder="Share your experience with this product…"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 resize-none"
                />
                <p className="mt-1 text-right text-[11px] text-gray-400">{comment.length}/1000</p>
              </div>

              {error && <p className="text-sm text-red-500">{error}</p>}
            </div>

            <div className="border-t border-gray-100 px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => { setOpen(false); setError(""); }}
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={submitting || rating === 0}
                className="rounded-xl bg-indigo-500 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? "Submitting…" : "Submit review"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
