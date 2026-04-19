const headers = {
  "Cache-Control": "no-store, max-age=0",
};

export function GET() {
  return Response.json(
    {
      ok: true,
      service: "admin",
      timestamp: new Date().toISOString(),
    },
    {
      headers,
    },
  );
}
