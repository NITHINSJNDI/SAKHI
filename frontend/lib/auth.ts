import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { query, initDatabase } from "@/lib/db";

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
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!user.email) return false;

      try {
        // Automatically initialize database tables if they don't exist
        await initDatabase();

        // Check if user exists in the database
        const { rows } = await query("SELECT * FROM users WHERE email = $1", [user.email]);
        
        if (rows.length === 0) {
          // Create new user in PostgreSQL
          await query(
            "INSERT INTO users (email, name, image) VALUES ($1, $2, $3)",
            [user.email, user.name || null, user.image || null]
          );
          console.log(`Successfully created user: ${user.email} in PostgreSQL`);
        } else {
          // If profile image or name changed/updated, we can sync it
          await query(
            "UPDATE users SET name = COALESCE($1, name), image = COALESCE($2, image) WHERE email = $3",
            [user.name || null, user.image || null, user.email]
          );
        }
        return true;
      } catch (err: any) {
        console.error("Error during NextAuth signIn callback:", err.message);
        // Return true to allow fallback mode even if DB connection fails
        return true;
      }
    },
    async jwt({ token, user }) {
      if (user) {
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
          const { rows } = await query("SELECT id, age, bmi FROM users WHERE email = $1", [token.email]);
          if (rows.length > 0) {
            (session as any).user.id = rows[0].id;
            (session as any).user.age = rows[0].age;
            (session as any).user.bmi = rows[0].bmi;
          } else {
            // Fallback for mock mode if user wasn't stored
            (session as any).user.id = 999;
          }
        } catch (err) {
          (session as any).user.id = 999;
        }
      }
      return session;
    },
  },
  pages: {
    signIn: "/onboarding", // redirect to onboarding flow
  },
  secret: process.env.NEXTAUTH_SECRET || "sakhi_secret_nextauth_998811",
};
