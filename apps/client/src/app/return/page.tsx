"use client";

import {
  getCheckoutSessionStatus,
  getPaymentServiceUrl,
} from "@repo/api-client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import useCartStore from "@/stores/cartStore";

function ReturnContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<string>("processing");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const { clearCart } = useCartStore();

  useEffect(() => {
    const currentSessionId = searchParams.get("session_id");

    if (!currentSessionId) {
      setStatus("default");
      return;
    }

    getCheckoutSessionStatus(getPaymentServiceUrl(), currentSessionId)
      .then((response) => {
        setSessionId(response.data.sessionId);
        setPaymentIntentId(response.data.paymentIntentId);
        setStatus(response.data.paymentStatus);

        if (response.data.paymentStatus === "paid") {
          clearCart();
        }
      })
      .catch(() => {
        setStatus("default");
      });
  }, [clearCart, searchParams]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="mx-4 w-full max-w-xl rounded-lg bg-white p-8 shadow-md">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-semibold text-gray-800 break-words">
            Payment status: {status}
          </h2>
        </div>

        {(sessionId || paymentIntentId) && (
          <div className="mb-6 rounded-lg bg-gray-50 p-4">
            <div className="space-y-3">
              {sessionId && (
                <div className="flex flex-col gap-1 border-b border-gray-200 pb-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                  <span className="shrink-0 text-sm font-medium text-gray-600 sm:w-32">
                    Session
                  </span>
                  <span className="min-w-0 break-all font-mono text-sm text-gray-900 sm:text-right">
                    {sessionId}
                  </span>
                </div>
              )}
              {paymentIntentId && (
                <div className="flex flex-col gap-1 border-b border-gray-200 pb-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                  <span className="shrink-0 text-sm font-medium text-gray-600 sm:w-32">
                    Payment Intent
                  </span>
                  <span className="min-w-0 break-all font-mono text-sm text-gray-900 sm:text-right">
                    {paymentIntentId}
                  </span>
                </div>
              )}
              <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                <span className="shrink-0 text-sm font-medium text-gray-600 sm:w-32">
                  Status
                </span>
                <span className="min-w-0 break-words text-sm text-gray-900 sm:text-right">
                  {status}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <Link
            href="/"
            className="block w-full text-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
          >
            Continue Shopping
          </Link>
          {status !== "paid" && (
            <Link
              href="/cart"
              className="block w-full text-center px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
            >
              Return to Cart
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ReturnPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      }
    >
      <ReturnContent />
    </Suspense>
  );
}
