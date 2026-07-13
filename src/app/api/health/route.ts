export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(
    {
      service: "forgotten-oracle",
      status: "ok",
      timestamp: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
