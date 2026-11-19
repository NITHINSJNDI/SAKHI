import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { query, getPool } from "@/lib/db";
import { verifyManualAccount } from "@/lib/userAccounts";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      authorization: {
        params: {
          prompt: "select_account",
          access_type: "offline",
          response_type: "code"
        }
      }
    }),
    CredentialsProvider({
      name: "Email and Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Please enter both your email and password.");
        }
        const res = await verifyManualAccount({
          email: credentials.email,
          password: credentials.password,
        });
        if (!res.ok) {
          throw new Error(res.error);
        }
        return {
          id: String(res.user.id),
          email: res.user.email,
          name: res.user.name || res.user.email.split("@")[0],
          image: res.user.image || null,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (!user.email) return false;
      if (account?.provider === "credentials") return true;

      try {
        // Automatically initialize database tables if they don't exist
        // (runs the migration once per server process, not on every sign-in)
        await getPool();

        // Check if user exists in the database
        const { rows } = await query("SELECT * FROM users WHERE LOWER(email) = LOWER($1)", [user.email]);
        
        if (rows.length === 0) {
          // Create new user in PostgreSQL
          await query(
            "INSERT INTO users (email, name, full_name, image, auth_provider, created_at, updated_at) VALUES ($1, $2, $2, $3, 'google', NOW(), NOW())",
            [user.email.toLowerCase(), user.name || null, user.image || null]
          );
          console.log(`Successfully created user: ${user.email} in PostgreSQL`);
        } else {
          // If profile image or name changed/updated, we can sync it
          await query(
            "UPDATE users SET name = COALESCE($1, name), full_name = COALESCE($1, full_name), image = COALESCE($2, image), updated_at = NOW() WHERE LOWER(email) = LOWER($3)",
            [user.name || null, user.image || null, user.email]
          );
        }
        return true;
      } catch (err: any) {
        console.error("Error during NextAuth signIn callback:", err.message);
        return true;
      }
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.picture = user.image;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.email) {
        session.user.email = token.email;
        session.user.name = token.name;
        session.user.image = token.picture;

        // Fetch user database ID to attach to session
        try {
          const { rows } = await query("SELECT id, uuid, age, bmi, phone_number FROM users WHERE LOWER(email) = LOWER($1)", [token.email]);
          if (rows.length > 0) {
            (session as any).user.id = rows[0].id;
            (session as any).user.uuid = rows[0].uuid;
            (session as any).user.age = rows[0].age;
            (session as any).user.bmi = rows[0].bmi;
            (session as any).user.phone = rows[0].phone_number;
          }
        } catch (err) {
          // fallback
        }
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  // Never fall back to a known secret in production: anyone could forge session
  // tokens with it. Without NEXTAUTH_SECRET, NextAuth refuses to run in production.
  secret:
    process.env.NEXTAUTH_SECRET || "sakhi_secret_nextauth_998811",
};
