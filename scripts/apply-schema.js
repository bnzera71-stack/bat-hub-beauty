// Aplica prisma/migrations/*/migration.sql direto via `pg`, sem passar pelo
// schema-engine do Prisma. Necessário porque a porta 5432 (session pooler / direct
// connection, que o `prisma migrate dev`/`db push` exige) é bloqueada nesta rede —
// só a porta 6543 (transaction pooler) responde, e o schema-engine trava tentando
// pegar advisory lock nela. Este script roda o SQL puro pela mesma porta que
// funciona, e registra a migration em _prisma_migrations manualmente.
//
// Uso: node scripts/apply-schema.js <nome_da_pasta_da_migration>
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { Client } = require("pg");

const migrationName = process.argv[2];
if (!migrationName) {
  console.error("Uso: node scripts/apply-schema.js <nome_da_pasta_da_migration>");
  process.exit(1);
}

const sqlPath = path.join(__dirname, "..", "prisma", "migrations", migrationName, "migration.sql");
const sql = fs.readFileSync(sqlPath, "utf8");
const checksum = crypto.createHash("sha256").update(sql).digest("hex");

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
});

async function run() {
  await client.connect();

  await client.query(sql);
  console.log("SQL da migration aplicado:", migrationName);

  await client.query(`
    CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
      id                      VARCHAR(36) PRIMARY KEY,
      checksum                VARCHAR(64) NOT NULL,
      finished_at             TIMESTAMPTZ,
      migration_name          VARCHAR(255) NOT NULL,
      logs                    TEXT,
      rolled_back_at          TIMESTAMPTZ,
      started_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
      applied_steps_count     INTEGER NOT NULL DEFAULT 0
    );
  `);

  await client.query(
    `INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, started_at, applied_steps_count)
     VALUES ($1, $2, now(), $3, now(), 1)`,
    [crypto.randomUUID(), checksum, migrationName]
  );
  console.log("Registrada em _prisma_migrations.");

  await client.end();
}

run().catch((err) => {
  console.error("FALHOU:", err.message);
  process.exit(1);
});
