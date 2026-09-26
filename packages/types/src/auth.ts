import z from "zod";

export interface CustomJwtSessionClaims {
  role?: "user" | "admin";
  metadata?: {
    role?: "user" | "admin";
  };
  publicMetadata?: {
    role?: "user" | "admin";
  };
  public_metadata?: {
    role?: "user" | "admin";
  };
}

export const UserFormSchema = z.object({
  firstName: z
    .string({ error: "First name is required!" })
    .min(2, { error: "First name must be at least 2 characters!" })
    .max(50),
  lastName: z
    .string({ error: "Last name is required!" })
    .min(2, { error: "Last name must be at least 2 characters!" })
    .max(50),
  username: z
    .string({ error: "Username is required!" })
    .min(2, { error: "Username must be at least 2 characters!" })
    .max(50),
  emailAddress: z.array(z.string({ error: "Email address is required!" })),
  password: z
    .string({ error: "Password is required!" })
    .min(8, { error: "Password must be at least 8 characters!" })
    .max(50),
});
