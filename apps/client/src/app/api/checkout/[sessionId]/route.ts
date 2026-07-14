import { auth } from "@clerk/nextjs/server";
import {
  ApiClientError,
  getCheckoutSessionStatus,
  getPaymentServiceServerUrl,
} from "@repo/api-client";
import { checkoutSessionStatusQuerySchema } from "@repo/types";

type RouteContext = {
  params: Promise<{ sessionId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { getToken, userId } = await auth();

  if (!userId) {
    return Response.json(
      { message: "Sign in to verify this checkout." },
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

  const parsed = checkoutSessionStatusQuerySchema.safeParse(
    await context.params,
  );

  if (!parsed.success) {
    return Response.json(
      { message: "Invalid checkout session." },
      { status: 400 },
    );
  }

  try {
    const status = await getCheckoutSessionStatus(
      getPaymentServiceServerUrl(),
      parsed.data.sessionId,
      token,
    );

    return Response.json(status, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const status = error instanceof ApiClientError ? error.status : 502;
    const message =
      error instanceof ApiClientError && status < 500
        ? error.message
        : "Payment verification is temporarily unavailable. Please try again.";

    return Response.json({ message }, { status });
  }
}
