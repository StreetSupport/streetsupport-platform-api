import { z } from 'zod';

// Preprocessing helper for JSON strings
const preprocessJSON = (val: unknown) => {
  if (typeof val === 'string') {
    try {
      return JSON.parse(val);
    } catch {
      return val;
    }
  }
  return val;
};

// User creation schema for API backend
export const CreateUserSchema = z.object({
  Email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address')
    .toLowerCase()
    .trim(),
  UserName: z
    .string().optional(),
  AuthClaims: z.preprocess(
    preprocessJSON,
    z
      .array(z.string())
      .min(1, 'At least one role is required')
      .refine(
        (claims) => {
          // Ensure AuthClaims contains valid role formats
          const validFormats = /^(SuperAdmin|CityAdmin|CityAdminFor:.+|VolunteerAdmin|SwepAdmin|SwepAdminFor:.+|OrgAdmin|AdminFor:.+)$/;
          return claims.every(claim => validFormats.test(claim));
        },
        { message: 'Invalid role format in AuthClaims' }
      )
  ),
});

// User update schema (all fields optional)
export const UpdateUserSchema = z.object({
  Email: z
    .string()
    .email('Please enter a valid email address')
    .toLowerCase()
    .trim()
    .optional(),
  UserName: z
    .string()
    .optional(),
  AuthClaims: z.preprocess(
    preprocessJSON,
    z
      .array(z.string())
      .min(1, 'At least one role is required')
      .refine(
        (claims) => {
          const validFormats = /^(SuperAdmin|CityAdmin|CityAdminFor:.+|VolunteerAdmin|SwepAdmin|SwepAdminFor:.+|OrgAdmin|AdminFor:.+)$/;
          return claims.every(claim => validFormats.test(claim));
        },
        { message: 'Invalid role format in AuthClaims' }
      )
      .optional()
  ),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update',
});

export type CreateUserInput = z.infer<typeof CreateUserSchema>;
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;

// Validation functions
export function validateCreateUser(data: unknown): { success: boolean; data?: CreateUserInput; errors?: z.ZodError } {
  const result = CreateUserSchema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  return { success: false, errors: result.error };
}

export function validateUpdateUser(data: unknown): { success: boolean; data?: UpdateUserInput; errors?: z.ZodError } {
  const result = UpdateUserSchema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  return { success: false, errors: result.error };
}
