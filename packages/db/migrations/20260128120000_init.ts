import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.raw('create extension if not exists "pgcrypto"');

  await knex.schema.createTable("users", (t) => {
    t.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    t.text("email").notNullable().unique();
    t.text("name").notNullable();
    t.text("role").notNullable(); // 'admin' | 'member'
    t.text("password_hash").notNullable();
    t.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable("sessions", (t) => {
    t.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    t.uuid("user_id").notNullable().references("id").inTable("users").onDelete("cascade");
    t.timestamp("expires_at", { useTz: true }).notNullable();
    t.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.index(["user_id"]);
    t.index(["expires_at"]);
  });

  await knex.schema.createTable("projects", (t) => {
    t.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    t.text("name").notNullable();
    t.text("status").notNullable(); // 'active' | 'paused' | 'archived'
    t.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.index(["status"]);
  });

  await knex.schema.createTable("entities", (t) => {
    t.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    t.text("name").notNullable();
    t.text("email_or_key").notNullable();
    t.text("status").notNullable(); // 'open' | 'closed' | 'pending'
    t.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.index(["status"]);
    t.index(["created_at"]);
  });

  await knex.schema.createTable("activity_log", (t) => {
    t.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    t.uuid("actor_user_id").nullable().references("id").inTable("users").onDelete("set null");
    t.text("action").notNullable();
    t.jsonb("metadata_json").notNullable().defaultTo("{}");
    t.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.index(["created_at"]);
    t.index(["actor_user_id"]);
  });

  await knex.schema.createTable("feature_flags", (t) => {
    t.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    t.text("key").notNullable().unique();
    t.boolean("enabled").notNullable().defaultTo(false);
  });

  await knex.schema.createTable("api_keys", (t) => {
    t.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    t.text("name").notNullable();
    t.text("last4").notNullable();
    t.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("api_keys");
  await knex.schema.dropTableIfExists("feature_flags");
  await knex.schema.dropTableIfExists("activity_log");
  await knex.schema.dropTableIfExists("entities");
  await knex.schema.dropTableIfExists("projects");
  await knex.schema.dropTableIfExists("sessions");
  await knex.schema.dropTableIfExists("users");
}
