import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";
import {
  createWorkspace,
  session,
  rateLimit,
  mutate,
  operation,
  present,
  ApiError,
  hash,
} from "@/src/server/service";
import { receiptHtml } from "@/src/domain/report";
export const runtime = "nodejs";
async function handle(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const requestId = crypto.randomUUID();
  try {
    const { path } = await params;
    const unsafe = req.method !== "GET";
    if (unsafe) {
      const expected =
        process.env.APP_ORIGIN ||
        (process.env.VERCEL_PROJECT_PRODUCTION_URL
          ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
          : "http://127.0.0.1:3010");
      if (req.headers.get("origin") !== expected)
        throw new ApiError(403, "Cross-origin request rejected.");
      if (Number(req.headers.get("content-length") || 0) > 2200000)
        throw new ApiError(413, "Request exceeds 2 MiB.");
    }
    if (path.join("/") === "workspaces" && unsafe) {
      await rateLimit(
        "create:" + hash(req.headers.get("x-forwarded-for") || "local"),
        10,
      );
      if (!req.headers.get("idempotency-key"))
        throw new ApiError(400, "Idempotency-Key required");
      const b = z
        .object({ mode: z.enum(["synthetic", "uploaded"]) })
        .parse(await req.json());
      const w = await createWorkspace(
        b.mode,
        req.headers.get("idempotency-key")!,
      );
      const response = NextResponse.json(present(w.state));
      response.cookies.set("flowproof_session", w.token, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 14 * 86400,
        path: "/",
      });
      return response;
    }
    const w = await session(req.cookies.get("flowproof_session")?.value);
    await rateLimit(w.id + ":" + (unsafe ? "write" : "read"), unsafe ? 10 : 60);
    if (unsafe) {
      if (path[0] === "imports") await rateLimit(w.id + ":imports", 3);
      const raw = await req.text();
      if (new TextEncoder().encode(raw).length > 2200000)
        throw new ApiError(413, "Request exceeds 2 MiB");
      const body = JSON.parse(raw || "{}");
      const result = await mutate(
        w.id,
        req.headers.get("idempotency-key") || undefined,
        hash(req.url + raw + req.headers.get("if-match")),
        (state) => operation(state, path, body, req.headers.get("if-match")),
      );
      return NextResponse.json(result);
    }
    if (path[0] === "state") return NextResponse.json(present(w.state));
    if (path[0] === "meters") return NextResponse.json(w.state.meters);
    if (path[0] === "readings") return NextResponse.json(w.state.readings);
    if (path[0] === "cases") {
      const cases = present(w.state).cases;
      if (path[1]) {
        const c = cases.find((c) => c.id === path[1]);
        if (!c) throw new ApiError(404, "Case not found");
        return NextResponse.json(c);
      }
      return NextResponse.json(cases);
    }
    if (path[0] === "reports") {
      const r = w.state.reports.find((r) => r.id === path[1]);
      if (!r) throw new ApiError(404, "Report not found");
      const superseded =
        w.state.cases.find((c) => c.id === r.caseId)?.revision !== r.revision;
      if (req.nextUrl.searchParams.get("format") === "html")
        return new NextResponse(receiptHtml(r.snapshot, r.hash, superseded), {
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Content-Disposition": `attachment; filename="flowproof-${r.id}.html"`,
            "Content-Security-Policy":
              "default-src 'none'; style-src 'unsafe-inline'",
          },
        });
      return NextResponse.json(
        { ...r, superseded },
        {
          headers: {
            "Content-Disposition": `attachment; filename="flowproof-${r.id}.json"`,
          },
        },
      );
    }
    throw new ApiError(404, "Not found");
  } catch (e) {
    const status =
      e instanceof ApiError
        ? e.status
        : e instanceof ZodError
          ? 422
          : e instanceof SyntaxError
            ? 400
            : 500;
    const message =
      e instanceof ZodError
        ? e.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")
        : status === 500
          ? "Unable to save right now. Your inputs are preserved; retry with the same request."
          : (e as Error).message;
    if (status === 500)
      console.error({
        requestId,
        code: "INTERNAL_ERROR",
        error: (e as Error).message,
      });
    return NextResponse.json(
      { error: { code: `HTTP_${status}`, message, requestId } },
      { status },
    );
  }
}
export const GET = handle;
export const POST = handle;
