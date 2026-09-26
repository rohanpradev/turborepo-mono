/** @internal Exported for regression tests. */
export const CHECKOUT_REQUEST_MAX_BODY_SIZE_BYTES = 64 * 1024;

/** The cookie-authenticated checkout endpoint accepts same-origin JSON requests. */
export const getCheckoutRequestError = (headers: Headers) => {
  const site = headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none") {
    return { status: 403, message: "Checkout must be started from this store." } as const;
  }

  const mediaType = headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
  // Requiring JSON also blocks cross-origin HTML form submissions in browsers
  // without Fetch Metadata support. This endpoint does not enable CORS.
  if (mediaType !== "application/json") {
    return { status: 415, message: "Checkout requires a JSON request." } as const;
  }

  return null;
};

/** Enforce the limit while reading, including requests without Content-Length. */
export const readCheckoutPayload = async (request: Request) => {
  const contentLength = Number(request.headers.get("content-length"));
  if (contentLength > CHECKOUT_REQUEST_MAX_BODY_SIZE_BYTES) {
    void request.body?.cancel().catch(() => {});
    return { kind: "too_large" } as const;
  }

  if (!request.body) return { kind: "invalid" } as const;

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let bytesRead = 0;
  let text = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytesRead += value.byteLength;
      if (bytesRead > CHECKOUT_REQUEST_MAX_BODY_SIZE_BYTES) {
        void reader.cancel().catch(() => {});
        return { kind: "too_large" } as const;
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    return { kind: "ok", data: JSON.parse(text) as unknown } as const;
  } catch {
    return { kind: "invalid" } as const;
  } finally {
    reader.releaseLock();
  }
};
