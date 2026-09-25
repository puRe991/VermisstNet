import { execSync } from "node:child_process";

/** Wendet die Migrationen auf die Test-Datenbank an (nicht destruktiv). */
export default function setup() {
  const url =
    process.env.TEST_DATABASE_URL ?? "postgresql://vermisst:vermisst@localhost:5432/vermisstatlas_test?schema=public";
  if (!/_test\b|test/.test(new URL(url).pathname)) {
    throw new Error("Die Test-Datenbank muss 'test' im Namen tragen (Schutz vor Datenverlust).");
  }
  execSync("npx prisma migrate deploy", { stdio: "inherit", env: { ...process.env, DATABASE_URL: url } });
}
