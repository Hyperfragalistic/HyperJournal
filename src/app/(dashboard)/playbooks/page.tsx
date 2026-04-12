"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/stores/useAppStore";
import { formatCurrency, cn } from "@/lib/utils";
import { Plus, Edit2, Trash2, CheckCircle, XCircle, Brain, Target } from "lucide-react";
import type { Playbook } from "@/lib/supabase/types";

const supabase = createClient();

const COLORS = ["#97FCE4", "#50E3C2", "#22C55E", "#EAB308", "#A855F7", "#F97316", "#3B82F6"];

function PlaybookModal({
  playbook,
  onClose,
  onSave,
}: {
  playbook: Partial<Playbook> | null;
  onClose: () => void;
  onSave: (data: Partial<Playbook>) => void;
}) {
  const [form, setForm] = useState<Partial<Playbook>>({
    name: "",
    description: "",
    setup_rules: "",
    entry_rules: "",
    exit_rules: "",
    risk_rules: "",
    color: COLORS[0],
    is_active: true,
    ...playbook,
  });

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="hl-card w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        <h2 className="text-lg font-semibold text-hl-text mb-5">
          {playbook?.id ? "Edit Playbook" : "New Playbook"}
        </h2>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-hl-text-muted mb-1.5">Name *</label>
              <input
                type="text"
                value={form.name ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Breakout Long"
                className="w-full bg-hl-bg border border-hl-border rounded-lg px-3 py-2 text-sm text-hl-text focus:outline-none focus:border-hl-primary"
              />
            </div>
            <div>
              <label className="block text-xs text-hl-text-muted mb-1.5">Color</label>
              <div className="flex gap-2 flex-wrap">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setForm((f) => ({ ...f, color: c }))}
                    className={cn(
                      "w-6 h-6 rounded-full border-2 transition-all",
                      form.color === c ? "border-white scale-110" : "border-transparent"
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs text-hl-text-muted mb-1.5">Description</label>
            <textarea
              value={form.description ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={2}
              placeholder="Brief overview of this strategy..."
              className="w-full bg-hl-bg border border-hl-border rounded-lg px-3 py-2 text-sm text-hl-text focus:outline-none focus:border-hl-primary resize-none"
            />
          </div>

          {[
            { field: "setup_rules" as const, label: "Setup Rules", placeholder: "What conditions must be met before considering entry?" },
            { field: "entry_rules" as const, label: "Entry Rules", placeholder: "What triggers your entry? Price action, indicators, etc." },
            { field: "exit_rules" as const, label: "Exit Rules", placeholder: "When do you exit? TP/SL levels, trailing stops, etc." },
            { field: "risk_rules" as const, label: "Risk Management", placeholder: "Position sizing, max loss per trade, daily loss limit, etc." },
          ].map(({ field, label, placeholder }) => (
            <div key={field}>
              <label className="block text-xs text-hl-text-muted mb-1.5">{label}</label>
              <textarea
                value={(form[field] as string) ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
                rows={3}
                placeholder={placeholder}
                className="w-full bg-hl-bg border border-hl-border rounded-lg px-3 py-2 text-sm text-hl-text focus:outline-none focus:border-hl-primary resize-none"
              />
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-hl-text-muted border border-hl-border hover:border-hl-primary hover:text-hl-primary transition-all"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(form)}
            disabled={!form.name?.trim()}
            className="px-4 py-2 rounded-lg text-sm bg-hl-primary text-hl-bg font-medium hover:bg-hl-secondary transition-all disabled:opacity-40"
          >
            Save Playbook
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PlaybooksPage() {
  const { userId } = useAppStore();
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingPlaybook, setEditingPlaybook] = useState<Playbook | null>(null);

  const { data: playbooks = [], isLoading } = useQuery({
    queryKey: ["playbooks", userId],
    queryFn: async () => {
      const { data, error } = await (supabase.from("playbooks") as any)
        .select("*")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Playbook[];
    },
    enabled: !!userId,
  });

  const { mutate: savePlaybook } = useMutation({
    mutationFn: async (data: Partial<Playbook>) => {
      if (data.id) {
        const { error } = await (supabase.from("playbooks") as any).update(data).eq("id", data.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase.from("playbooks") as any).insert({ ...data, user_id: userId! });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["playbooks"] });
      setShowModal(false);
      setEditingPlaybook(null);
    },
  });

  const { mutate: deletePlaybook } = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from("playbooks") as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["playbooks"] }),
  });

  const handleEdit = (pb: Playbook) => {
    setEditingPlaybook(pb);
    setShowModal(true);
  };

  const handleNew = () => {
    setEditingPlaybook(null);
    setShowModal(true);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-hl-text">Playbooks</h1>
          <p className="text-hl-text-muted text-sm mt-0.5">
            Document your trading strategies and track their performance
          </p>
        </div>
        <button
          onClick={handleNew}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-hl-primary text-hl-bg hover:bg-hl-secondary transition-all shadow-hl"
        >
          <Plus className="w-4 h-4" />
          New Playbook
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="hl-card p-5 space-y-3">
              <div className="skeleton h-5 rounded w-2/3" />
              <div className="skeleton h-3 rounded w-full" />
              <div className="skeleton h-3 rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : playbooks.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-hl-primary/10 border border-hl-primary/20 flex items-center justify-center mx-auto mb-4">
            <Target className="w-8 h-8 text-hl-primary" />
          </div>
          <h3 className="font-semibold text-hl-text mb-2">No playbooks yet</h3>
          <p className="text-sm text-hl-text-muted max-w-sm mx-auto mb-6">
            Document your trading strategies to track which setups are most profitable.
          </p>
          <button
            onClick={handleNew}
            className="px-5 py-2.5 rounded-lg text-sm font-medium bg-hl-primary text-hl-bg hover:bg-hl-secondary transition-all"
          >
            Create your first playbook
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {playbooks.map((pb) => (
            <div
              key={pb.id}
              className="hl-card p-5 flex flex-col gap-4 hover:border-hl-border-2 transition-all"
              style={{ borderLeft: `3px solid ${pb.color ?? "#97FCE4"}` }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-hl-text">{pb.name}</h3>
                    {pb.is_active ? (
                      <CheckCircle className="w-4 h-4 text-hl-green" />
                    ) : (
                      <XCircle className="w-4 h-4 text-hl-text-dim" />
                    )}
                  </div>
                  {pb.description && (
                    <p className="text-xs text-hl-text-muted mt-1 line-clamp-2">{pb.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 ml-2">
                  <button
                    onClick={() => handleEdit(pb)}
                    className="p-1.5 rounded-lg text-hl-text-dim hover:text-hl-primary hover:bg-hl-primary/10 transition-all"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm("Delete this playbook?")) deletePlaybook(pb.id);
                    }}
                    className="p-1.5 rounded-lg text-hl-text-dim hover:text-hl-red hover:bg-hl-red/10 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Trades", value: pb.trade_count ?? 0 },
                  { label: "Win Rate", value: pb.win_rate ? `${pb.win_rate.toFixed(1)}%` : "—" },
                  { label: "P&L", value: pb.total_pnl ? formatCurrency(pb.total_pnl) : "—" },
                ].map((s) => (
                  <div key={s.label} className="bg-hl-bg-2 rounded-lg p-2 text-center">
                    <p className="text-[10px] text-hl-text-dim mb-0.5">{s.label}</p>
                    <p className="text-xs font-mono font-medium text-hl-text">{String(s.value)}</p>
                  </div>
                ))}
              </div>

              {/* Rules preview */}
              {pb.setup_rules && (
                <div className="text-xs text-hl-text-muted">
                  <span className="text-hl-text-dim uppercase tracking-wider text-[10px]">Setup: </span>
                  <span className="line-clamp-2">{pb.setup_rules}</span>
                </div>
              )}

              <div className="flex gap-2 pt-1 border-t border-hl-border/50">
                <a
                  href={`/coach?playbook=${pb.id}`}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs text-hl-primary border border-hl-primary/20 hover:bg-hl-primary/10 transition-all"
                >
                  <Brain className="w-3.5 h-3.5" />
                  Coach Analysis
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <PlaybookModal
          playbook={editingPlaybook}
          onClose={() => { setShowModal(false); setEditingPlaybook(null); }}
          onSave={(data) => savePlaybook({ ...data, id: editingPlaybook?.id })}
        />
      )}
    </div>
  );
}
