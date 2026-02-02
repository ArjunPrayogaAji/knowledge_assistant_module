import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("knowledge_items", (t) => {
    t.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    t.text("type").notNullable(); // docs, policies, api_reference, changelog, incidents, support, feature_flags, analytics_events, playbooks
    t.text("title").notNullable();
    t.text("category").notNullable();
    t.text("body").notNullable(); // markdown content
    t.jsonb("metadata_json").notNullable().defaultTo("{}"); // structured data per type
    t.specificType("tags", "text[]").notNullable().defaultTo("{}");
    t.uuid("owner_id").nullable().references("id").inTable("users").onDelete("set null");
    t.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    // Indexes for filtering
    t.index(["type"]);
    t.index(["category"]);
    t.index(["updated_at"]);
    t.index(["type", "category"]);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("knowledge_items");
}
