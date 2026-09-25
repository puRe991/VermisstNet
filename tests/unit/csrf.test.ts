import { describe, expect, it } from "vitest";
import { isSameOriginRequest } from "@/lib/csrf";

const allowedOrigins = ["https://vermisstatlas.example"];

describe("CSRF-Origin-Prüfung", () => {
  it("erlaubt lesende Anfragen", () => {
    expect(isSameOriginRequest({ method: "GET", origin: "https://evil.example", referer: null, allowedOrigins })).toBe(true);
  });
  it("erlaubt gleiche Origin", () => {
    expect(isSameOriginRequest({ method: "POST", origin: "https://vermisstatlas.example", referer: null, allowedOrigins })).toBe(true);
  });
  it("blockiert fremde Origin", () => {
    expect(isSameOriginRequest({ method: "POST", origin: "https://evil.example", referer: null, allowedOrigins })).toBe(false);
    expect(isSameOriginRequest({ method: "PATCH", origin: "https://vermisstatlas.example.evil.example", referer: null, allowedOrigins })).toBe(false);
  });
  it("blockiert fehlende Origin/Referer bei mutierenden Anfragen", () => {
    expect(isSameOriginRequest({ method: "DELETE", origin: null, referer: null, allowedOrigins })).toBe(false);
    expect(isSameOriginRequest({ method: "POST", origin: "null", referer: null, allowedOrigins })).toBe(false);
  });
  it("nutzt Referer als Fallback", () => {
    expect(isSameOriginRequest({ method: "POST", origin: null, referer: "https://vermisstatlas.example/melden", allowedOrigins })).toBe(true);
  });
});
