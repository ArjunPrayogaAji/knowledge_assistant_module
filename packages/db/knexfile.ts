import type { Knex } from "knex";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  // Knex CLI loads this at runtime; throwing here makes misconfig obvious.
  throw new Error("DATABASE_URL is required (e.g. postgres://postgres:postgres@localhost:5432/ac_dev)");
}

const config: Knex.Config = {
  client: "pg",
  connection: connectionString,
  migrations: {
    directory: "./migrations",
    extension: "ts"
  },
  seeds: {
    directory: "./seeds",
    extension: "ts"
  }
};

export default config;
