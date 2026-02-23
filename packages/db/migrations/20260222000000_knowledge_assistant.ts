import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
    // conversations — one per user session of chatting
    await knex.schema.createTable("conversations", (t) => {
        t.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
        t.uuid("user_id").notNullable().references("id").inTable("users").onDelete("cascade");
        t.text("name").notNullable().defaultTo("New Conversation");
        t.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
        t.index(["user_id"]);
        t.index(["created_at"]);
    });

    // messages — individual chat turns within a conversation
    await knex.schema.createTable("messages", (t) => {
        t.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
        t.uuid("conversation_id")
            .notNullable()
            .references("id")
            .inTable("conversations")
            .onDelete("cascade");
        t.text("role").notNullable(); // 'user' | 'assistant'
        t.text("content").notNullable();
        t.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
        t.index(["conversation_id"]);
        t.index(["created_at"]);
    });

    // message_sources — Qdrant chunk references for an assistant message
    await knex.schema.createTable("message_sources", (t) => {
        t.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
        t.uuid("message_id")
            .notNullable()
            .references("id")
            .inTable("messages")
            .onDelete("cascade");
        t.text("qdrant_chunk_id").notNullable();
        t.jsonb("metadata").notNullable().defaultTo("{}");
        t.index(["message_id"]);
    });

    // ingestion_jobs — tracks JSONL upload lifecycle
    await knex.schema.createTable("ingestion_jobs", (t) => {
        t.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
        t.text("filename").notNullable();
        t.text("status").notNullable().defaultTo("pending"); // pending | running | succeeded | failed
        t.jsonb("error_details").nullable().defaultTo(null);
        t.integer("inserted").notNullable().defaultTo(0);
        t.integer("updated").notNullable().defaultTo(0);
        t.integer("skipped").notNullable().defaultTo(0);
        t.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
        t.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
        t.index(["status"]);
        t.index(["created_at"]);
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists("message_sources");
    await knex.schema.dropTableIfExists("messages");
    await knex.schema.dropTableIfExists("conversations");
    await knex.schema.dropTableIfExists("ingestion_jobs");
}
