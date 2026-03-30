import { NextResponse } from "next/server";
import { createHash, randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { IdempotencyStore } from "@consentchain/idempotency";
import { evaluatePolicy } from "@consentchain/policy-engine";
import { canonicalJson, hmacSha256Hex, sha256Hex } from "@consentchain/ledger";
import { createGoogleExecutor } from "@consentchain/google-executor";
import { jwtVerify } from "jose";

type ActionBody = {
  actionId: string;
  service: string;
  operation: string;
  scopes: string[];
  payload: unknown;
  stepUpProofJwt?: string;
};

export async function POST(req: Request) {
  const agentKey = req.headers.get("x-agent-key");
  if (!agentKey) return NextResponse.json({ error: "missing x-agent-key" }, { status: 401 });

  let body: ActionBody;
  try {
    body = (await req.json()) as ActionBody;
  } catch {
    return NextResponse.json({ error: "invalid json body" }, { status: 400 });
  }

  if (!body?.actionId || !body?.service || !body?.operation || !Array.isArray(body?.scopes)) {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }

  // 1) Agent validation
  const apiKeyHash = sha256Hex(agentKey);
  const agent = await prisma.agent.findUnique({ where: { apiKeyHash } });
  if (!agent) return NextResponse.json({ error: "invalid agent key" }, { status: 401 });
  if (agent.status !== "ACTIVE") return NextResponse.json({ error: "agent disabled" }, { status: 403 });
  if (!serviceAllowed(agent.allowedServices, body.service)) {
    return NextResponse.json({ error: "service not allowed" }, { status: 403 });
  }

  // canonical request + hash used for idempotency + ledger
  const requestCanon = canonicalJson({
    actionId: body.actionId,
    service: body.service,
    operation: body.operation,
    scopes: body.scopes,
    payload: body.payload,
  });
  const requestHash = sha256Hex(requestCanon);

  // 2) Idempotency check + reserve
  const idem = new IdempotencyStore(prisma);
  const reserveResult = await idem.reserve(body.actionId, agent.id, requestHash);
  if (reserveResult.kind === "hit") {
    const headers = new Headers({
      "x-idempotent-replay": "true",
      "content-type": "application/json",
    });
    return new NextResponse(reserveResult.responseJson ?? "null", { status: 200, headers });
  }
  if (reserveResult.kind === "reserved") {
    return NextResponse.json({ error: "action already in progress" }, { status: 409 });
  }

  // 3) Revocation check
  const revoked = await prisma.revocationState.findFirst({
    where: { agentId: agent.id, service: body.service },
  });
  if (revoked) return NextResponse.json({ error: "service revoked" }, { status: 403 });

  // 4) Policy evaluation
  const decision = evaluatePolicy({
    service: body.service,
    operation: body.operation,
    scopes: body.scopes,
  });

  // 5) Step-up handling
  if (!decision.allowed && decision.stepUpRequired) {
    const stepSecret = process.env["STEP_UP_SECRET"];
    if (!stepSecret) return NextResponse.json({ error: "STEP_UP_SECRET not set" }, { status: 500 });

    if (!body.stepUpProofJwt) {
      const challengeId = `ch_${randomUUID()}`;
      await prisma.stepUpChallenge.create({ data: { challengeId, actionId: body.actionId } });
      return NextResponse.json({ error: "step-up required", challengeId }, { status: 401 });
    }

    try {
      const { payload } = await jwtVerify(body.stepUpProofJwt, new TextEncoder().encode(stepSecret));
      const actionId = String(payload["actionId"] ?? "");
      const challengeId = String(payload["challengeId"] ?? "");
      if (actionId !== body.actionId) throw new Error("actionId mismatch");

      const ch = await prisma.stepUpChallenge.findUnique({ where: { challengeId } });
      if (!ch) throw new Error("challenge not found");
      if (ch.usedAt) throw new Error("challenge already used");
      if (ch.actionId !== body.actionId) throw new Error("challenge action mismatch");

      await prisma.stepUpChallenge.update({
        where: { challengeId },
        data: { usedAt: new Date() },
      });
    } catch {
      return NextResponse.json({ error: "invalid step-up proof" }, { status: 401 });
    }
  } else if (!decision.allowed) {
    return NextResponse.json({ error: decision.reason }, { status: 403 });
  }

  // 6) Token retrieval (MVP: deterministic mock)
  const accessToken = mockAccessToken(agent.id, body.service);

  // 7) Execution (MVP: google executor mock)
  const executor = createGoogleExecutor();
  let execResult: unknown;
  if (body.service !== "google") {
    return NextResponse.json({ error: "unsupported service" }, { status: 400 });
  }

  if (body.operation === "listEvents") execResult = await executor.listEvents({ accessToken });
  else if (body.operation === "createEvent")
    execResult = await executor.createEvent({ accessToken, event: body.payload });
  else if (body.operation === "deleteAllEvents") execResult = await executor.deleteAllEvents({ accessToken });
  else return NextResponse.json({ error: "unsupported operation" }, { status: 400 });

  // 8) Ledger write
  const responseCanon = canonicalJson(execResult);
  const responseHash = sha256Hex(responseCanon);
  const ledgerSecret = process.env["LEDGER_HMAC_SECRET"];
  if (!ledgerSecret) return NextResponse.json({ error: "LEDGER_HMAC_SECRET not set" }, { status: 500 });
  const signature = hmacSha256Hex(ledgerSecret, `${requestHash}.${responseHash}`);

  await prisma.ledgerEntry.create({
    data: {
      actionId: body.actionId,
      agentId: agent.id,
      service: body.service,
      operation: body.operation,
      requestCanon,
      requestHash,
      responseCanon,
      responseHash,
      signature,
    },
  });

  // 9) Response return (+ idempotency completion)
  const responseJson = JSON.stringify(execResult);
  await idem.complete(body.actionId, responseJson);
  return new NextResponse(responseJson, { status: 200, headers: { "content-type": "application/json" } });
}

function serviceAllowed(allowedServicesCsv: string, service: string): boolean {
  const allowed = allowedServicesCsv
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return allowed.includes(service);
}

function mockAccessToken(agentId: string, service: string): string {
  const h = createHash("sha256").update(`${agentId}:${service}`).digest("hex");
  return `mock_${h.slice(0, 32)}`;
}

