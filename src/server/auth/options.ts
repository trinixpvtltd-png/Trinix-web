import type { NextAuthConfig, Session, User } from "next-auth";
import type { JWT } from "next-auth/jwt";
import Credentials from "next-auth/providers/credentials";
import { compare, hashSync } from "bcryptjs";
import { z } from "zod";

const credentialsSchema = z.object({
  email: z.string({ required_error: "Email is required" }).email("Enter a valid email"),
  password: z.string({ required_error: "Password is required" }).min(1, "Password is required"),
});

function resolveEnvUser() {
  const email = process.env.ADMIN_EMAIL;
  const passwordHash = process.env.ADMIN_PASSWORD_HASH;
  const displayName = process.env.ADMIN_NAME ?? "Trinix Admin";
  const roles = (process.env.ADMIN_ROLES ?? "admin").split(",").map((role) => role.trim()).filter(Boolean);

  if (!email || !passwordHash) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "[Auth] ADMIN_EMAIL and ADMIN_PASSWORD_HASH environment variables must be configured before enabling admin access."
      );
    }

    const fallbackEmail = "admin@trinix.dev";
    const fallbackHash = hashSync("letmein", 10);
    console.warn(
      "[Auth] Falling back to development admin credentials. Define ADMIN_EMAIL and ADMIN_PASSWORD_HASH to override."
    );
    return {
      id: process.env.ADMIN_USER_ID ?? "admin",
      email: fallbackEmail,
      passwordHash: fallbackHash,
      name: displayName,
      roles,
    } satisfies User & { passwordHash: string; roles: string[] };
  }

  return {
    id: process.env.ADMIN_USER_ID ?? "admin",
    email,
    passwordHash,
    name: displayName,
    roles,
  } satisfies User & { passwordHash: string; roles: string[] };
}

async function verifyPassword(candidate: string, storedHash: string) {
  const looksHashed = storedHash.startsWith("$2a$") || storedHash.startsWith("$2b$") || storedHash.startsWith("$2y$");
  if (!looksHashed) {
    if (process.env.NODE_ENV === "production") {
      console.error("[Auth] Rejecting login attempt because admin password hash is not bcrypt.");
      return false;
    }
    return candidate === storedHash;
  }

  try {
    return await compare(candidate, storedHash);
  } catch {
    return false;
  }
}

export const authOptions: NextAuthConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/admin/login" },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials: Record<string, unknown> | undefined) {
        const adminUser = resolveEnvUser();
        const parsed = credentialsSchema.safeParse(credentials ?? {});

        if (!adminUser || !parsed.success) {
          return null;
        }

        const { email, password } = parsed.data;
        if (email.toLowerCase() !== adminUser.email.toLowerCase()) {
          return null;
        }

        const isValid = await verifyPassword(password, adminUser.passwordHash);
        if (!isValid) {
          return null;
        }

        return {
          id: adminUser.id,
          email: adminUser.email,
          name: adminUser.name,
          roles: adminUser.roles,
        } satisfies User & { roles: string[] };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }: { token: JWT; user?: User | null }) {
      if (user) {
        token.userId = user.id;
        token.roles = (user as unknown as { roles?: string[] }).roles ?? ["admin"];
      }
      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      const roles = (token.roles as string[]) ?? [];
      const nextSession: Session = {
        ...session,
        user: {
          ...session.user,
          id: token.userId as string | undefined,
          roles,
        },
        roles,
      } as Session & { roles: string[] };
      return nextSession;
    },
  },
};
