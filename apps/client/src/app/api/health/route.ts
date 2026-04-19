const headers = {
  "Cache-Control": "no-store, max-age=0",
};

export function GET() {
  return Response.json(
    {
      ok: true,
      service: "client",
      timestamp: new Date().toISOString(),
    },
    {
      headers,
    },
  );
}
