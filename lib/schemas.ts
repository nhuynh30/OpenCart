import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["BUYER", "SELLER"]),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const productSchema = z.object({
  name: z.string().trim().min(1, "Product name is required"),
  description: z.string().trim().optional(),
  price: z
    .string()
    .min(1, "Price is required")
    .refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) > 0, "Enter a valid price greater than $0"),
  category: z.string().optional(),
});
export type ProductInput = z.infer<typeof productSchema>;

export const storeSchema = z.object({
  name: z.string().trim().min(1, "Store name is required").max(60, "Must be 60 characters or fewer"),
  description: z.string().trim().max(500, "Must be 500 characters or fewer").optional(),
});
export type StoreInput = z.infer<typeof storeSchema>;
