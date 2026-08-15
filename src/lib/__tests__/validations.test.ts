import { describe, it, expect } from "@jest/globals";
import {
  loginSchema,
  userCreateSchema,
  taskCreateSchema,
  evaluationSchema,
} from "../validations";

describe("Validation Schemas", () => {
  describe("loginSchema", () => {
    it("should validate correct login data", () => {
      const data = {
        email: "test@example.com",
        password: "password123",
      };
      expect(() => loginSchema.parse(data)).not.toThrow();
    });

    it("should reject invalid email", () => {
      const data = {
        email: "invalid-email",
        password: "password123",
      };
      expect(() => loginSchema.parse(data)).toThrow();
    });

    it("should reject empty password", () => {
      const data = {
        email: "test@example.com",
        password: "",
      };
      expect(() => loginSchema.parse(data)).toThrow();
    });
  });

  describe("userCreateSchema", () => {
    it("should validate correct user data", () => {
      const data = {
        name: "John Doe",
        email: "john@example.com",
        password: "Password123!",
        position: "Developer",
        phone: "0987654321",
        role: "member" as const,
        isActive: true,
      };
      expect(() => userCreateSchema.parse(data)).not.toThrow();
    });

    it("should reject weak password", () => {
      const data = {
        name: "John Doe",
        email: "john@example.com",
        password: "weak",
        position: "Developer",
      };
      expect(() => userCreateSchema.parse(data)).toThrow();
    });

    it("should reject invalid Vietnamese phone number", () => {
      const data = {
        name: "John Doe",
        email: "john@example.com",
        password: "Password123!",
        position: "Developer",
        phone: "1234567890", // Invalid format
      };
      expect(() => userCreateSchema.parse(data)).toThrow();
    });

    it("should accept valid Vietnamese phone number", () => {
      const data = {
        name: "John Doe",
        email: "john@example.com",
        password: "Password123!",
        position: "Developer",
        phone: "0987654321",
      };
      expect(() => userCreateSchema.parse(data)).not.toThrow();
    });
  });

  describe("taskCreateSchema", () => {
    it("should validate correct task data", () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const data = {
        title: "Test Task",
        description: "Test description",
        assigneeId: "user-123",
        priority: "high" as const,
        dueDate: tomorrow.toISOString(),
      };
      expect(() => taskCreateSchema.parse(data)).not.toThrow();
    });

    it("should reject past due date", () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const data = {
        title: "Test Task",
        dueDate: yesterday.toISOString(),
      };
      expect(() => taskCreateSchema.parse(data)).toThrow();
    });

    it("should accept today as due date", () => {
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      
      const data = {
        title: "Test Task",
        assigneeId: "user-123",
        dueDate: today.toISOString(),
      };
      expect(() => taskCreateSchema.parse(data)).not.toThrow();
    });
  });

  describe("evaluationSchema", () => {
    it("should validate correct evaluation data", () => {
      const data = {
        memberId: "user-123",
        taskId: "task-123",
        rating: 4,
        comment: "Good work!",
      };
      expect(() => evaluationSchema.parse(data)).not.toThrow();
    });

    it("should reject rating below 1", () => {
      const data = {
        memberId: "user-123",
        rating: 0,
        comment: "Poor",
      };
      expect(() => evaluationSchema.parse(data)).toThrow();
    });

    it("should reject rating above 5", () => {
      const data = {
        memberId: "user-123",
        rating: 6,
        comment: "Excellent",
      };
      expect(() => evaluationSchema.parse(data)).toThrow();
    });

    it("should reject empty comment", () => {
      const data = {
        memberId: "user-123",
        rating: 4,
        comment: "",
      };
      expect(() => evaluationSchema.parse(data)).toThrow();
    });
  });
});
