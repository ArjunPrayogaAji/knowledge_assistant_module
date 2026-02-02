export type UserRole = "admin" | "member";

export type UserRow = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  password_hash: string;
  created_at: Date;
};

export type SessionRow = {
  id: string;
  user_id: string;
  expires_at: Date;
  created_at: Date;
};

export type ProjectStatus = "active" | "paused" | "archived";

export type ProjectRow = {
  id: string;
  name: string;
  status: ProjectStatus;
  created_at: Date;
};

export type EntityStatus = "open" | "closed" | "pending";

export type EntityRow = {
  id: string;
  name: string;
  email_or_key: string;
  status: EntityStatus;
  created_at: Date;
};

export type ActivityLogRow = {
  id: string;
  actor_user_id: string | null;
  action: string;
  metadata_json: unknown;
  created_at: Date;
};

export type FeatureFlagRow = {
  id: string;
  key: string;
  enabled: boolean;
};

export type ApiKeyRow = {
  id: string;
  name: string;
  last4: string;
  created_at: Date;
};

export type KnowledgeItemType =
  | "docs"
  | "policies"
  | "api_reference"
  | "changelog"
  | "incidents"
  | "support"
  | "feature_flags"
  | "analytics_events"
  | "playbooks";

export type KnowledgeItemRow = {
  id: string;
  type: KnowledgeItemType;
  title: string;
  category: string;
  body: string;
  metadata_json: Record<string, unknown>;
  tags: string[];
  owner_id: string | null;
  created_at: Date;
  updated_at: Date;
};
