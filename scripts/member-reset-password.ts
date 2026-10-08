// Usage: TABLE_NEW_PASSWORD='...' npm run member:reset-password -- <email>
// Account recovery (there is no email-based reset): sets a new password for one household member and
// signs that member out everywhere. The password is read from the environment so it never lands in
// shell history or logs; tell the member the new password in person, not by chat or email.
import pg from "pg";
import { resetMemberPassword } from "../src/server/provision";

const [email] = process.argv.slice(2);
const password = process.env.TABLE_NEW_PASSWORD ?? "";
if (!email || !password) {
  console.error("usage: TABLE_NEW_PASSWORD=... npm run member:reset-password -- <email>");
  process.exit(2);
}
const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
await c.connect();
await resetMemberPassword(c, email, password);
console.log(`password reset for ${email}; that member's sessions were ended`);
await c.end();
process.exit(0);
