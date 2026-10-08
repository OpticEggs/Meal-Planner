import { migrate } from "../src/server/db/migrate";
const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");
const applied = await migrate(url);
console.log(applied.length ? `applied: ${applied.join(", ")}` : "schema up to date");
