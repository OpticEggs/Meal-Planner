// Prints the SQL Better Auth needs, so it can be committed as an explicit migration.
import { getMigrations } from "better-auth/db/migration";
import { getAuth } from "../src/server/auth";
const { compileMigrations } = await getMigrations(getAuth().options);
console.log(await compileMigrations());
process.exit(0);
