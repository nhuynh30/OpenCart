"use client";

import { useEffect } from "react";
import { toast } from "sonner";

export default function PurchaseSuccessToast({ show }: { show: boolean }) {
  useEffect(() => {
    if (show) toast.success("Payment successful! Your order has been placed.");
  }, [show]);

  return null;
}
