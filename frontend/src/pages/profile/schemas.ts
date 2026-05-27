import * as z from "zod";

export const profileSchema = z.object({
    firstName: z.string().min(2, "Tối thiểu 2 ký tự").max(100),
    lastName: z.string().max(100).optional().or(z.literal("")),
    phone: z
        .string()
        .max(20)
        .regex(/^[0-9+\-\s()]*$/, "Số điện thoại không hợp lệ")
        .optional()
        .or(z.literal("")),
    bio: z.string().max(500, "Tối đa 500 ký tự").optional().or(z.literal("")),
});

export const passwordSchema = z
    .object({
        currentPassword: z.string().min(1, "Nhập mật khẩu hiện tại"),
        newPassword: z.string().min(8, "Tối thiểu 8 ký tự").max(100),
        confirmPassword: z.string().min(1, "Xác nhận mật khẩu"),
    })
    .refine((d) => d.newPassword === d.confirmPassword, {
        message: "Mật khẩu xác nhận không khớp",
        path: ["confirmPassword"],
    });

export type ProfileFormValues = z.infer<typeof profileSchema>;
export type PasswordFormValues = z.infer<typeof passwordSchema>;
