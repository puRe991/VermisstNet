/**
 * Legt einen Benutzer an (z. B. den ersten Administrator in Produktion).
 * Aufruf: npm run user:create -- --email admin@example.org --name "Ada" --role ADMINISTRATOR
 * Das Passwort wird interaktiv abgefragt (nicht als Argument → taucht nicht in der Shell-History auf).
 */
import { PrismaClient, Role } from "@prisma/client";
import { hash } from "@node-rs/argon2";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const email = arg("email")?.trim().toLowerCase();
  const displayName = arg("name")?.trim();
  const role = (arg("role") ?? "ADMINISTRATOR") as Role;
  if (!email || !displayName || !Object.values(Role).includes(role)) {
    console.error('Aufruf: npm run user:create -- --email <mail> --name "<Name>" [--role ADMINISTRATOR|EDITOR|MODERATOR|REPORTER]');
    process.exit(1);
  }
  const rl = createInterface({ input: stdin, output: stdout });
  const password = process.env.NEW_USER_PASSWORD ?? (await rl.question("Passwort (mind. 10 Zeichen): "));
  rl.close();
  if (password.length < 10) {
    console.error("Passwort zu kurz.");
    process.exit(1);
  }
  const prisma = new PrismaClient();
  const passwordHash = await hash(password, { memoryCost: 19456, timeCost: 2, parallelism: 1, algorithm: 2 });
  const user = await prisma.user.create({ data: { email, displayName, role, passwordHash } });
  await prisma.auditLog.create({
    data: {
      actorLabel: "System (CLI)",
      action: "user.create",
      entityType: "User",
      entityId: user.id,
      summary: `Benutzer ${displayName} mit Rolle ${role} per CLI angelegt`,
      newData: { email, displayName, role },
    },
  });
  console.log(`✔ ${role} ${email} angelegt.`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
