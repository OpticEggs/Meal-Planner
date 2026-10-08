// Usage: npm run household:create -- "<household name>" <IANA timezone>
// Creates an empty household with every setting unset. Add members with member:create.
import pg from "pg";
import { createHousehold } from "../src/server/provision";

const [name, tz] = process.argv.slice(2);
if (!name || !tz) {
  console.error('usage: npm run household:create -- "<name>" <timezone, e.g. America/Chicago>');
  process.exit(2);
}
const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
await c.connect();
const id = await createHousehold(c, name, tz);
console.log(`household ${id} created (settings unset)`);
await c.end();
process.exit(0);
