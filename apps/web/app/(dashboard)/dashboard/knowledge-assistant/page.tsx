"use client";

import { useEffect, useState } from "react";
import { Page } from "../../../../components/layout/Page";
import { apiFetch } from "../../../../lib/apiClient";
import type { MeUser } from "../../../../components/auth/RequireAuth";

// ─── Tab types ────────────────────────────────────────────────
type Tab = "chatbot" | "uploader";

// ─── Helpers ──────────────────────────────────────────────────
function cx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

// ─── Sub-components ───────────────────────────────────────────

function ForbiddenPanel() {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
      <div className="h-12 w-12 rounded-full bg-red-50 flex items-center justify-center">
        <span className="text-2xl">🔒</span>
      </div>
      <div>
        <div className="text-base font-semibold text-slate-900">Access Denied</div>
        <div className="mt-1 text-sm text-slate-500">
          The Knowledge Uploader is only available to admins.
          <br />
          Contact your administrator to request access.
        </div>
      </div>
      <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-xs font-medium text-red-700">
        403 — Forbidden
      </div>
    </div>
  );
}

function ChatbotPanel() {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4 text-center text-slate-500">
      <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center text-2xl">
        💬
      </div>
      <div>
        <div className="text-base font-semibold text-slate-700">Knowledge Chatbot</div>
        <div className="mt-1 text-sm text-slate-400">
          Chat UI coming in Milestone 6. Backend wiring in Milestone 5.
        </div>
      </div>
    </div>
  );
}

function UploaderPanel() {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4 text-center text-slate-500">
      <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center text-2xl">
        📤
      </div>
      <div>
        <div className="text-base font-semibold text-slate-700">Knowledge Uploader</div>
        <div className="mt-1 text-sm text-slate-400">
          Upload UI coming in Milestone 7. Backend wiring in Milestone 5.
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────
export default function KnowledgeAssistantPage() {
  const [activeTab, setActiveTab] = useState<Tab>("chatbot");
  const [user, setUser] = useState<MeUser | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  useEffect(() => {
    apiFetch<{ user: MeUser }>("/auth/me")
      .then((data) => setUser(data.user))
      .catch(() => {
        // RequireAuth in layout will handle the redirect; nothing to do here
      })
      .finally(() => setLoadingUser(false));
  }, []);

  const tabs: { key: Tab; label: string }[] = [
    { key: "chatbot", label: "Chatbot" },
    { key: "uploader", label: "Knowledge Uploader" },
  ];

  function renderTabContent() {
    if (activeTab === "chatbot") {
      return <ChatbotPanel />;
    }

    // Knowledge Uploader — admin only
    if (loadingUser) {
      return (
        <div className="flex items-center justify-center py-24 text-sm text-slate-500">
          Loading…
        </div>
      );
    }

    if (user?.role !== "admin") {
      return <ForbiddenPanel />;
    }

    return <UploaderPanel />;
  }

  return (
    <Page
      title="Knowledge Assistant"
      breadcrumbs="Dashboard / Knowledge Assistant"
    >
      {/* Tab bar */}
      <div className="border-b border-slate-200 mb-4">
        <nav className="-mb-px flex gap-1" aria-label="Tabs">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={cx(
                  "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                  isActive
                    ? "border-slate-900 text-slate-900"
                    : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab content */}
      <div className="rounded-lg border border-slate-200 bg-white">
        {renderTabContent()}
      </div>
    </Page>
  );
}
