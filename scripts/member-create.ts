// Usage: TABLE_NEW_PASSWORD='...' npm run member:create -- <householdId> <email> "<display name>"
// The password is read from the environment so it never lands in shell history or logs.
import pg from "pg";
import { createMember } from "../src/server/provision";

const [householdId, email, name] = process.argv.slice(2);
const password = process.env.TABLE_NEW_PASSWORD ?? "";
if (!householdId || !email || !name || !password) {
  console.error('usage: TABLE_NEW_PASSWORD=... npm run member:create -- <householdId> <email> "<display name>"');
  process.exit(2);
}
const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
await c.connect();
const m = await createMember(c, householdId, email, name, password);
console.log(`member ${m.memberId} created for ${email}`);
await c.end();
process.exit(0);
