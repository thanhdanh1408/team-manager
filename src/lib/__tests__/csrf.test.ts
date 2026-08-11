import { describe, it, expect } from "@jest/globals";
import { generateCsrfToken, validateRequestOrigin } from "../csrf";

describe("CSRF Protection", () => {
  describe("generateCsrfToken", () => {
    it("should generate a valid token", () => {
      const token = generateCsrfToken();
      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
      expect(token.length).toBeGreaterThan(0);
    });

    it("should generate unique tokens", () => {
      const token1 = generateCsrfToken();
      const token2 = generateCsrfToken();
      expect(token1).not.toBe(token2);
    });

    it("should generate hex string", () => {
      const token = generateCsrfToken();
      expect(token).toMatch(/^[0-9a-f]+$/);
    });
  });

  describe("validateRequestOrigin", () => {
    it("should allow GET requests", () => {
      const req = new Request("http://localhost:3000/api/test", {
        method: "GET",
      });
      expect(validateRequestOrigin(req)).toBe(true);
    });

    it("should allow HEAD requests", () => {
      const req = new Request("http://localhost:3000/api/test", {
        method: "HEAD",
      });
      expect(validateRequestOrigin(req)).toBe(true);
    });

    it("should allow same-origin POST with matching origin", () => {
      const req = new Request("http://localhost:3000/api/test", {
        method: "POST",
        headers: {
          origin: "http://localhost:3000",
          host: "localhost:3000",
        },
      });
      expect(validateRequestOrigin(req)).toBe(true);
    });

    it("should reject cross-origin POST", () => {
      const req = new Request("http://localhost:3000/api/test", {
        method: "POST",
        headers: {
          origin: "http://evil.com",
          host: "localhost:3000",
        },
      });
      expect(validateRequestOrigin(req)).toBe(false);
    });

    it("should validate using referer if origin is missing", () => {
      const req = new Request("http://localhost:3000/api/test", {
        method: "POST",
        headers: {
          referer: "http://localhost:3000/page",
          host: "localhost:3000",
        },
      });
      expect(validateRequestOrigin(req)).toBe(true);
    });
  });
});
