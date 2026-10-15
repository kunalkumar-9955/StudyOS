"use client";

import React, { useState } from "react";
import {
  Compass,
  Plus,
  Trash2,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  Bot,
  MessageSquare,
  FileCode,
  Globe,
} from "lucide-react";

interface ResourcesModuleProps {
  resources: any[];
  subjects: any[];
  onAddResource: (resource: any) => void;
  onToggleApproval: (id: number) => void;
  onToggleFocus: (id: number) => void;
  onDeleteResource: (id: number) => void;
}

export default function ResourcesModule({
  resources,
  subjects,
  onAddResource,
  onToggleApproval,
  onToggleFocus,
  onDeleteResource,
}: ResourcesModuleProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  // Form state
  const [name, setName] = useState("");
  const [category, setCategory] = useState("AI_TOOL");
  const [url, setUrl] = useState("");
  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const categories = [
    { id: "ALL", label: "All Categories", icon: Globe },
    { id: "AI_TOOL", label: "AI Study Tools", icon: Bot },
    { id: "COMMUNICATION", label: "Study Groups & WhatsApp", icon: MessageSquare },
    { id: "LEARNING_RESOURCE", label: "Documentation & Tutorials", icon: FileCode },
    { id: "CUSTOM", label: "Custom Links", icon: Compass },
  ];

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const cleanUrl = url.trim();
    if (!cleanUrl) {
      setValidationError("Please enter a resource URL.");
      return;
    }

    const lower = cleanUrl.toLowerCase();
    if (
      lower.startsWith("javascript:") ||
      lower.startsWith("data:") ||
      lower.startsWith("vbscript:") ||
      lower.startsWith("file:")
    ) {
      setValidationError("Dangerous navigation protocol detected. Only HTTP/HTTPS URLs are permitted.");
      return;
    }

    let normalized = cleanUrl;
    if (!normalized.startsWith("http://") && !normalized.startsWith("https://")) {
      normalized = "https://" + normalized;
    }

    onAddResource({
      id: Date.now(),
      name: name.trim() || normalized,
      category,
      url: normalized,
      subject_id: subjectId,
      is_approved: true,
      is_enabled_for_focus: true,
    });

    setName("");
    setUrl("");
    setIsAdding(false);
  };

  const filteredResources = resources.filter((r) => {
    if (selectedCategory === "ALL") return true;
    return r.category === selectedCategory;
  });

  return (
    <div className="space-y-6 pb-20">
      {/* Module Header */}
      <div className="glass-panel rounded-2xl p-4 sm:p-6 theme-border flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-500 mb-1">
            <Compass className="w-4 h-4" />
            <span>APPROVED STUDY ENVIRONMENT</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black theme-text-primary tracking-tight">
            Approved Study Resources
          </h2>
          <p className="text-xs theme-text-muted mt-1">
            Manage your AI tools, WhatsApp study groups, documentation, and reference links accessible during focus mode.
          </p>
        </div>

        <button
          onClick={() => setIsAdding(true)}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-indigo-600/25 transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          Add Study Resource
        </button>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const active = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all border cursor-pointer ${
                active
                  ? "bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/25"
                  : "theme-card theme-text-muted hover:theme-text-primary theme-border"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Add Resource Form Modal */}
      {isAdding && (
        <form
          onSubmit={handleSave}
          className="glass-panel-elevated rounded-2xl p-4 sm:p-6 theme-border space-y-4 max-w-xl"
        >
          <div className="flex items-center justify-between border-b theme-border pb-3">
            <h3 className="font-bold text-sm theme-text-primary flex items-center gap-2">
              <Plus className="w-4 h-4 text-indigo-500" />
              Add Study Resource / Tool
            </h3>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="theme-text-muted hover:theme-text-primary text-xs cursor-pointer"
            >
              Cancel
            </button>
          </div>

          {validationError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          <div className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold theme-text-secondary mb-1">
                Resource Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. ChatGPT, Gemini, WhatsApp Study Group, DevDocs"
                className="w-full px-3.5 py-2 rounded-xl theme-input text-xs"
                required
              />
            </div>

            <div>
              <label className="block font-semibold theme-text-secondary mb-1">
                Resource URL (HTTP / HTTPS)
              </label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://chatgpt.com or https://web.whatsapp.com"
                className="w-full px-3.5 py-2 rounded-xl theme-input text-xs"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold theme-text-secondary mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl theme-input text-xs"
                >
                  <option value="AI_TOOL">AI Study Tool</option>
                  <option value="COMMUNICATION">Study Group / WhatsApp</option>
                  <option value="LEARNING_RESOURCE">Documentation / Tutorials</option>
                  <option value="CUSTOM">Custom Resource</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold theme-text-secondary mb-1">
                  Subject Association (Optional)
                </label>
                <select
                  value={subjectId || ""}
                  onChange={(e) => setSubjectId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full px-3.5 py-2 rounded-xl theme-input text-xs"
                >
                  <option value="">-- General / Multi-Subject --</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/25 cursor-pointer"
            >
              Save Resource
            </button>
          </div>
        </form>
      )}

      {/* Resources Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredResources.map((res) => (
          <div
            key={res.id}
            className="glass-panel rounded-2xl p-5 theme-border space-y-4 flex flex-col justify-between transition-all"
          >
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-bold text-base theme-text-primary truncate">
                    {res.name}
                  </h3>
                  <p className="text-xs theme-text-muted font-mono truncate">{res.url}</p>
                </div>

                <a
                  href={res.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg theme-card border theme-border theme-text-secondary hover:text-indigo-500 transition-colors shrink-0"
                  title="Open resource"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded theme-card-subtle theme-border border text-indigo-500">
                  {res.category}
                </span>

                {res.is_approved ? (
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Approved
                  </span>
                ) : (
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3" /> Under Review
                  </span>
                )}
              </div>
            </div>

            {/* Controls Bar */}
            <div className="pt-3 border-t theme-border flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onToggleApproval(res.id)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer text-xs ${
                    res.is_approved
                      ? "theme-card theme-border border theme-text-muted hover:theme-text-primary"
                      : "bg-emerald-600 text-white hover:bg-emerald-500"
                  }`}
                >
                  {res.is_approved ? "Revoke Approval" : "Approve"}
                </button>

                <button
                  onClick={() => onToggleFocus(res.id)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer text-xs ${
                    res.is_enabled_for_focus
                      ? "bg-indigo-500/15 text-indigo-500 border border-indigo-500/30"
                      : "theme-card theme-border border theme-text-dim"
                  }`}
                >
                  {res.is_enabled_for_focus ? "Focus Mode: Active" : "Focus Mode: Muted"}
                </button>
              </div>

              <button
                onClick={() => onDeleteResource(res.id)}
                className="p-1.5 rounded theme-text-muted hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                title="Delete Resource"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Security and External Site Limitations Notice */}
      <div className="p-4 rounded-xl theme-card border theme-border text-xs theme-text-muted space-y-1">
        <p className="font-bold theme-text-secondary">Technical Note on External Study Tools:</p>
        <p>
          External sites like ChatGPT, Gemini, and WhatsApp Web enforce strict CSP and X-Frame-Options headers that prevent embedding. Clicking "Open" launches them safely in an external tab while your StudyOS focus session and timer continue tracking accurately.
        </p>
      </div>
    </div>
  );
}
