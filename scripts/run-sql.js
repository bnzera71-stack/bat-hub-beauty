// Roda um arquivo .sql qualquer direto no banco (mesmo motivo do apply-schema.js:
// só a porta 6543 responde nesta rede). Usado pro SQL manual que o Prisma não
// consegue representar no schema (ex: exclusion constraint).
// Uso: node scripts/run-sql.js <caminho-do-arquivo.sql>
require("dotenv").config();
const fs = require("fs");
const { Client } = require("pg");

const filePath = process.argv[2];
if (!filePath) {
  console.error("Uso: node scripts/run-sql.js <caminho-do-arquivo.sql>");
  process.exit(1);
}

const sql = fs.readFileSync(filePath, "utf8");

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
});

client
  .connect()
  .then(async () => {
    await client.query(sql);
    console.log("SQL aplicado:", filePath);
    await client.end();
  })
  .catch((err) => {
    console.error("FALHOU:", err.message);
    process.exit(1);
  });
