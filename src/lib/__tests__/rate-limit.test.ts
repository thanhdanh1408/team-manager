import { describe, it, expect, beforeEach } from "@jest/globals";
import { rateLimit, rateLimitLogin } from "../rate-limit";

describe("Rate Limiter", () => {
  beforeEach(() => {
    // Note: In real scenario, we'd need to clear the internal buckets map
    // For now, we use different IPs per test to avoid conflicts
  });

  describe("rateLimit", () => {
    it("should allow requests under the limit", () => {
      const ip = "192.168.1.1";
      const result = rateLimit(ip);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeGreaterThanOrEqual(0);
    });

    it("should track multiple requests from same IP", () => {
      const ip = "192.168.1.2";
      const first = rateLimit(ip);
      const second = rateLimit(ip);
      
      expect(first.allowed).toBe(true);
      expect(second.allowed).toBe(true);
      expect(second.remaining).toBeLessThan(first.remaining);
    });

    it("should have resetAt timestamp", () => {
      const ip = "192.168.1.3";
      const result = rateLimit(ip);
      
      expect(result.resetAt).toBeGreaterThan(Date.now());
    });
  });

  describe("rateLimitLogin", () => {
    it("should have stricter limit for login", () => {
      const ip = "192.168.1.4";
      const result = rateLimitLogin(ip);
      
      expect(result.allowed).toBe(true);
      // Login limit (5) should be less than general API limit (100)
      expect(result.remaining).toBeLessThan(100);
    });

    it("should block after max login attempts", () => {
      const ip = "192.168.1.5";
      
      // Make 5 attempts (the max)
      for (let i = 0; i < 5; i++) {
        rateLimitLogin(ip);
      }
      
      // 6th attempt should be blocked
      const blocked = rateLimitLogin(ip);
      expect(blocked.allowed).toBe(false);
      expect(blocked.remaining).toBe(0);
    });
  });
});
