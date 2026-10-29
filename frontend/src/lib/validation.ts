// BẢN DỰNG LẠI TẠM THỜI (không phải bản gốc của tác giả frontend).
// Thư mục src/lib/ từng bị .gitignore ("lib/") loại khỏi repo nên CI không build được. Dựng lại từ cách các trang dùng
// và src/test/format.test.ts để CI chạy được. Tác giả frontend: hãy thay bằng bản gốc của bạn.
import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().min(1, "required").email("email"),
  password: z.string().min(1, "required"),
});

export const registerSchema = z.object({
  organizationName: z.string().min(1, "required"),
  taxCode: z.string().regex(/^(\d{10}|\d{13})$/, "taxCode"),
  fullName: z.string().min(1, "required"),
  email: z.string().min(1, "required").email("email"),
  password: z
    .string()
    .min(8, "passwordMin")
    .refine((v) => /[A-Za-z]/.test(v) && /\d/.test(v), "passwordLetterDigit"),
  acceptTerms: z.boolean().refine((v) => v === true, "acceptTerms"),
});

export type LoginForm = z.infer<typeof loginSchema>;
export type RegisterForm = z.infer<typeof registerSchema>;
