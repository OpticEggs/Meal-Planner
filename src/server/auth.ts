import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { pool } from "./db/pool";
import { authSecret, tableEnv } from "./env";

// Maintained server-side auth (Better Auth, pinned in package.json).
// Email+password sessions stored in PostgreSQL. Public sign-up is disabled:
// household members are provisioned by `npm run member:create`.
// Built lazily so configuration is validated at runtime, not at build time.
function build() {
  const baseURL = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
  return betterAuth({
    database: pool(),
    secret: authSecret(),
    baseURL,
    trustedOrigins: [baseURL],
    emailAndPassword: { enabled: true, disableSignUp: true, minPasswordLength: 10 },
    session: { expiresIn: 60 * 60 * 24 * 30, updateAge: 60 * 60 * 24 },
    // Default sign-in rate limiting stays on everywhere except the disposable test
    // environment, where two browser contexts sign in from 127.0.0.1 for every test.
    rateLimit: { enabled: tableEnv() !== "test" },
    advanced: { useSecureCookies: tableEnv() === "production" },
    plugins: [nextCookies()],
  });
}

type Auth = ReturnType<typeof build>;
const g = globalThis as unknown as { __tableAuth?: Auth };

export function getAuth(): Auth {
  if (!g.__tableAuth) g.__tableAuth = build();
  return g.__tableAuth;
}
