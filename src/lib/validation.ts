import { z } from "zod";

// Input sanitization utilities
export const sanitizeInput = (input: string): string => {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove basic HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/data:/gi, ''); // Remove data: protocol
};

export const sanitizeEmail = (email: string): string => {
  return email.toLowerCase().trim();
};

export const sanitizeOrganizationSlug = (slug: string): string => {
  return slug
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, '') // Only allow lowercase letters, numbers, and hyphens
    .replace(/--+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
};

// Password validation
export const passwordSchema = z.string()
  .min(8, "Password must be at least 8 characters long")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[^a-zA-Z0-9]/, "Password must contain at least one special character");

export const getPasswordStrength = (password: string): {
  score: number;
  feedback: string[];
} => {
  const feedback: string[] = [];
  let score = 0;

  if (password.length >= 8) score += 1;
  else feedback.push("Use at least 8 characters");

  if (/[a-z]/.test(password)) score += 1;
  else feedback.push("Add lowercase letters");

  if (/[A-Z]/.test(password)) score += 1;
  else feedback.push("Add uppercase letters");

  if (/[0-9]/.test(password)) score += 1;
  else feedback.push("Add numbers");

  if (/[^a-zA-Z0-9]/.test(password)) score += 1;
  else feedback.push("Add special characters");

  return { score, feedback };
};

// Form validation schemas
export const emailSchema = z.string().email("Please enter a valid email address");

export const organizationNameSchema = z.string()
  .min(2, "Organization name must be at least 2 characters long")
  .max(50, "Organization name must be less than 50 characters")
  .regex(/^[a-zA-Z0-9\s-_]+$/, "Organization name can only contain letters, numbers, spaces, hyphens, and underscores");

export const bookingTitleSchema = z.string()
  .min(1, "Title is required")
  .max(100, "Title must be less than 100 characters");

export const bookingDescriptionSchema = z.string()
  .max(500, "Description must be less than 500 characters")
  .optional();

export const attendeesSchema = z.number()
  .int("Attendees must be a whole number")
  .min(1, "At least 1 attendee is required")
  .max(100, "Maximum 100 attendees allowed");