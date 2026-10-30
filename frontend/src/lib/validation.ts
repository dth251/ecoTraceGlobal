import { z } from "zod";

// Thông điệp lỗi là khóa i18n trong nhóm `validation.*`
export const loginSchema = z.object({
  email: z.string().min(1, "required").email("email"),
  password: z.string().min(1, "required"),
});
export type LoginForm = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  organizationName: z.string().trim().min(1, "required"),
  taxCode: z
    .string()
    .trim()
    .refine((v) => v === "" || /^\d{10}(\d{3})?$/.test(v), "taxCode")
    .optional(),
  fullName: z.string().trim().min(1, "required"),
  email: z.string().min(1, "required").email("email"),
  password: z
    .string()
    .min(8, "passwordMin")
    .refine((v) => /[A-Za-z]/.test(v) && /\d/.test(v), "passwordLetterDigit"),
  acceptTerms: z.boolean().refine((v) => v, "acceptTerms"),
});
export type RegisterForm = z.infer<typeof registerSchema>;
