import type { Knex } from "knex";
import crypto from "node:crypto";

function hashPassword(password: string): string {
  const salt = process.env.PASSWORD_SALT ?? "dev_salt_change_me";
  // Simple, deterministic hash for interview scaffold (not bcrypt).
  return crypto.createHash("sha256").update(`${salt}:${password}`).digest("hex");
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function sampleNormalish(min: number, max: number): number {
  // Cheap "normal-ish" distribution using the mean of 3 uniforms.
  const u = (Math.random() + Math.random() + Math.random()) / 3;
  return min + u * (max - min);
}

function randomDateWithinDays(daysBack: number): Date {
  const days = clamp(daysBack, 1, 3650);
  const now = Date.now();
  const deltaMs = Math.floor(Math.random() * days * 24 * 60 * 60 * 1000);
  return new Date(now - deltaMs);
}

function slugifyEmailLocal(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "")
    .slice(0, 40);
}

export async function seed(knex: Knex): Promise<void> {
  // Clean in dependency order
  await knex("sessions").del();
  await knex("activity_log").del();
  await knex("entities").del();
  await knex("projects").del();
  await knex("api_keys").del();
  await knex("feature_flags").del();
  await knex("users").del();

  // Demo login must remain stable for the assignment README.
  const users = [
    { email: "admin@ac.local", name: "Avery Kim (RevOps Admin)", role: "admin" as const },
    { email: "member1@ac.local", name: "Jordan Lee (AE - Enterprise)", role: "member" as const },
    { email: "member2@ac.local", name: "Sam Patel (AE - Mid Market)", role: "member" as const },
    { email: "member3@ac.local", name: "Casey Nguyen (SDR)", role: "member" as const },
    { email: "member4@ac.local", name: "Drew Garcia (Sales Ops)", role: "member" as const }
  ];

  const insertedUsers = await knex("users")
    .insert(
      users.map((u) => ({
        ...u,
        password_hash: hashPassword("password")
      }))
    )
    .returning(["id", "email", "name", "role"]);

  const adminUser = insertedUsers.find((u) => u.role === "admin") ?? insertedUsers[0]!;

  // Projects are positioned as sales/revops initiatives (still using the existing status values).
  const projects = [
    { name: "Territory & Quota Planning (Q1)", status: "active" },
    { name: "Pipeline Hygiene Dashboard", status: "active" },
    { name: "Renewals Risk Scoring", status: "paused" },
    { name: "Outbound Experiment: FinTech ICP", status: "archived" }
  ];
  const insertedProjects = await knex("projects").insert(projects).returning(["id", "name", "status"]);

  // Entities are "accounts/leads" for a sales org. We keep the same schema + status enum.
  const accountNames = [
    "Northwind Traders",
    "Contoso",
    "Fabrikam",
    "Adventure Works",
    "Tailspin Toys",
    "Woodgrove Bank",
    "Litware",
    "Coho Winery",
    "Wide World Importers",
    "Fourth Coffee",
    "Proseware",
    "A. Datum Corporation",
    "Blue Yonder Airlines",
    "Lucerne Publishing",
    "Consolidated Messenger",
    "Graphic Design Institute",
    "Humongous Insurance",
    "Trey Research",
    "Lamna Healthcare",
    "Alpine Ski House",
    "Margie's Travel",
    "City Power & Light"
  ];
  const personas = ["vp.sales", "revops", "it", "procurement", "finance", "growth"] as const;
  const domains = [
    "northwind.example",
    "contoso.example",
    "fabrikam.example",
    "adventure-works.example",
    "tailspin.example",
    "woodgrove.example",
    "litware.example",
    "coho.example",
    "wideworldimporters.example",
    "fourthcoffee.example"
  ];
  const statuses = ["open", "pending", "closed"] as const;

  const entitiesToInsert = Array.from({ length: 50 }).map((_, i) => {
    const company = pick(accountNames);
    const domain = pick(domains);
    const persona = pick([...personas]);

    // Make the list look like a mix of accounts + inbound leads.
    const isLead = Math.random() < 0.35;
    const name = isLead ? `${company} (Inbound Lead)` : company;

    // Use reserved .example domains; keep "Contact" column readable.
    const local = slugifyEmailLocal(`${persona}.${company}.${i + 1}`);
    const emailOrKey = `${local}@${domain}`;

    // Bias toward open/pending so lists and filters are interesting.
    const r = Math.random();
    const status = r < 0.55 ? "open" : r < 0.9 ? "pending" : "closed";

    return { name, email_or_key: emailOrKey, status };
  });
  const insertedEntities = await knex("entities").insert(entitiesToInsert).returning(["id"]);

  await knex("feature_flags").insert([
    { key: "forecasting_v2", enabled: true },
    { key: "pipeline_quality_rules", enabled: true },
    { key: "territory_rebalancer_beta", enabled: false }
  ]);

  await knex("api_keys").insert([
    { name: "Salesforce Connector", last4: "4a1c" },
    { name: "Warehouse (Read-only)", last4: "9f0c" }
  ]);

  const salesActions = [
    "user.login",
    "account.created",
    "lead.routed",
    "deal.created",
    "deal.stage_changed",
    "demo.scheduled",
    "proposal.sent",
    "deal.won",
    "deal.lost",
    "forecast.updated",
    "settings.updated"
  ] as const;

  const regions = ["NA", "EMEA", "APAC"] as const;
  const sources = ["outbound", "inbound", "partner", "expansion"] as const;
  const stages = ["prospecting", "qualified", "demo", "proposal", "negotiation"] as const;
  const lossReasons = ["no_budget", "no_fit", "lost_to_competitor", "timing", "no_decision"] as const;

  const activityRows = Array.from({ length: 200 }).map(() => {
    const actor = pick(insertedUsers);
    const project = pick(insertedProjects);
    const entity = pick(insertedEntities);
    const action = pick([...salesActions]);

    const amountUsd =
      action === "deal.won" || action === "deal.lost" || action === "proposal.sent" || action === "deal.stage_changed" || action === "deal.created"
        ? Math.round(sampleNormalish(5000, 250000))
        : undefined;

    const stageFrom = action === "deal.stage_changed" ? pick([...stages]) : undefined;
    const stageTo = action === "deal.stage_changed" ? pick([...stages]) : undefined;

    return {
      actor_user_id: actor.id,
      action,
      // Make the feed look like real historical analytics, not "all now".
      created_at: randomDateWithinDays(60),
      metadata_json: {
        // Preserve these for existing UI patterns (project detail recent activity, etc.).
        projectId: project.id,
        entityId: entity.id,

        // Sales analytics context (extra fields are safe; UI prints JSON).
        region: pick([...regions]),
        source: pick([...sources]),
        owner: actor.email,
        amountUsd,
        stageFrom: stageFrom === stageTo ? undefined : stageFrom,
        stageTo: stageFrom === stageTo ? undefined : stageTo,
        lossReason: action === "deal.lost" ? pick([...lossReasons]) : undefined
      }
    };
  });

  // Chunk insert to keep query sizes reasonable
  const chunkSize = 50;
  for (let i = 0; i < activityRows.length; i += chunkSize) {
    await knex("activity_log").insert(activityRows.slice(i, i + chunkSize));
  }

  // Create a sample session for the admin (optional convenience for local testing)
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await knex("sessions").insert({
    user_id: adminUser.id,
    expires_at: expiresAt
  });
}
