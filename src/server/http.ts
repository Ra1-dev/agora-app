// Small helpers for API route handlers.
import { NextResponse } from "next/server";
import { AccessError } from "@/lib/auth/current-user";

export function json<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

/** A user-facing error: `message` is shown in the UI as is. */
export function problem(status: number, message: string, field?: string) {
  return NextResponse.json({ error: { message, field } }, { status });
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const body: unknown = await request.json();
    return body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/** Wraps a handler so AccessError becomes a 403/404 with its message. */
export function handle<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (error) {
      if (error instanceof AccessError) return problem(error.status, error.message);
      console.error(error);
      return problem(500, "We couldn't do that. Try again.");
    }
  };
}

export const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
