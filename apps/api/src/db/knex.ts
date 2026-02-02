import knex, { type Knex } from "knex";

export function createKnex(): Knex {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is required");

  return knex({
    client: "pg",
    connection: connectionString,
    pool: { min: 0, max: 10 }
  });
}
