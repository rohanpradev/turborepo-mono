import { auth } from "@clerk/nextjs/server";
import { ApiClientError, createCheckoutSession } from "@repo/api-client";
import { getPaymentServiceServerUrl } from "@repo/api-client/server";
import { checkoutSessionPayloadSchema } from "@repo/types";
import { getCheckoutRequestError, readCheckoutPayload } from "@/lib/checkout-payload";

export async function POST(request: Request) {
  const requestError = getCheckoutRequestError(request.headers);
  if (requestError) {
    return Response.json({ message: requestError.message }, { status: requestError.status });
  }

  const { getToken, userId } = await auth();

  if (!userId) {
    return Response.json(
      { message: "Sign in to continue to checkout." },
      { status: 401 },
    );
  }

  const token = await getToken();

  if (!token) {
    return Response.json(
      { message: "Your session could not be verified. Please sign in again." },
      { status: 401 },
    );
  }

  const requestPayload = await readCheckoutPayload(request);

  if (requestPayload.kind === "too_large") {
    return Response.json(
      { message: "Checkout request is too large." },
      { status: 413 },
    );
  }

  if (requestPayload.kind === "invalid") {
    return Response.json(
      { message: "Invalid checkout details." },
      { status: 400 },
    );
  }

  const parsedPayload = checkoutSessionPayloadSchema.safeParse(
    requestPayload.data,
  );

  if (!parsedPayload.success) {
    return Response.json(
      { message: "Invalid checkout details." },
      { status: 400 },
    );
  }

  try {
    const checkout = await createCheckoutSession(
      getPaymentServiceServerUrl(),
      parsedPayload.data,
      token,
    );

    return Response.json(checkout, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const status = error instanceof ApiClientError ? error.status : 502;
    const message =
      error instanceof ApiClientError && status < 500
        ? error.message
        : "Checkout is temporarily unavailable. Please try again.";

    return Response.json({ message }, { status });
  }
}
