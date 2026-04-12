"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/stores/useAppStore";
import { useWallets } from "@/hooks/useTrades";
import { useVoice } from "@/hooks/useVoice";
import { cn, shortenAddress } from "@/lib/utils";
import type { Wallet } from "@/lib/supabase/types";
import {
  Wallet as WalletIcon,
  Brain,
  Mic,
  Volume2,
  RefreshCw,
  Save,
  CheckCircle,
  AlertCircle,
  Settings,
  Plus,
  Trash2,
  RotateCcw,
} from "lucide-react";

const supabase = createClient();

function Section({ title, icon: Icon, children }: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="hl-card p-6 space-y-5">
      <div className="flex items-center gap-3 pb-4 border-b border-hl-border">
        <div className="w-8 h-8 rounded-lg bg-hl-primary/10 flex items-center justify-center">
          <Icon className="w-4 h-4 text-hl-primary" />
        </div>
        <h2 className="font-semibold text-hl-text">{title}</h2>
      </div>
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const { profile, setProfile } = useAppStore();
  const { data: wallets = [], syncWallet, syncing, syncingAddress, removeWallet, wipeWallet } = useWallets();

  const [newAddress, setNewAddress] = useState("");
  const [addressError, setAddressError] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState(profile?.display_name ?? "");
  const [voiceModeEnabled, setVoiceModeEnabled] = useState(profile?.voice_mode_enabled ?? true);
  const [voiceRate, setVoiceRate] = useState(profile?.voice_rate ?? 1.0);
  const [voicePitch, setVoicePitch] = useState(profile?.voice_pitch ?? 1.0);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState(profile?.preferred_voice_uri ?? "");

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [testSpeaking, setTestSpeaking] = useState(false);
  const [confirmWipe, setConfirmWipe] = useState<"all" | string | null>(null);

  const voice = useVoice({ rate: voiceRate, pitch: voicePitch, voiceURI: selectedVoiceURI || null });

  const validateAddress = (addr: string) => /^0x[0-9a-fA-F]{40}$/.test(addr);

  const handleAddWallet = () => {
    if (!validateAddress(newAddress)) {
      setAddressError("Must be 0x followed by 40 hex characters.");
      return;
    }
    syncWallet(newAddress);
    setNewAddress("");
    setAddressError(null);
  };

  const handleConfirmWipe = () => {
    if (confirmWipe === "all") wipeWallet(undefined);
    else if (confirmWipe) removeWallet(confirmWipe);
    setConfirmWipe(null);
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    setSaveError(null);

    const updates = {
      display_name: displayName,
      voice_mode_enabled: voiceModeEnabled,
      voice_rate: voiceRate,
      voice_pitch: voicePitch,
      preferred_voice_uri: selectedVoiceURI || null,
    };

    const { data, error } = await (supabase.from("profiles") as any)
      .update(updates)
      .eq("id", profile!.id)
      .select()
      .single();

    setSaving(false);

    if (error) {
      setSaveError(error.message);
      return;
    }

    if (data) setProfile(data);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const statusColor = (s: Wallet["sync_status"]) =>
    s === "syncing" ? "text-hl-yellow" : s === "error" ? "text-hl-red" : "text-hl-green";
  const statusDot = (s: Wallet["sync_status"]) =>
    s === "syncing" ? "bg-hl-yellow animate-pulse" : s === "error" ? "bg-hl-red" : "bg-hl-green";

  const handleTestVoice = async () => {
    setTestSpeaking(true);
    await voice.speak(
      "Hello! This is your HyperJournal AI trading coach. I'm ready to help you analyze your trading psychology and improve your performance."
    );
    setTestSpeaking(false);
  };

  // Group voices by language
  const englishVoices = voice.availableVoices.filter((v) => v.lang.startsWith("en"));

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-hl-text">Settings</h1>
        <p className="text-hl-text-muted text-sm mt-0.5">
          Manage your account, wallet, and AI coach preferences
        </p>
      </div>

      {/* Profile */}
      <Section title="Profile" icon={Settings}>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-hl-text-muted mb-1.5">Display name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full bg-hl-bg border border-hl-border rounded-lg px-3 py-2.5 text-sm text-hl-text focus:outline-none focus:border-hl-primary"
            />
          </div>
          <div>
            <label className="block text-xs text-hl-text-muted mb-1.5">Email</label>
            <input
              type="email"
              value={profile?.email ?? ""}
              disabled
              className="w-full bg-hl-bg/50 border border-hl-border/50 rounded-lg px-3 py-2.5 text-sm text-hl-text-dim cursor-not-allowed"
            />
          </div>
        </div>
      </Section>

      {/* Wallets */}
      <Section title="Hyperliquid Wallets" icon={WalletIcon}>
        <div className="space-y-4">
          <p className="text-sm text-hl-text-muted">
            Add one or more Hyperliquid wallet addresses (read-only) to sync trade history.
          </p>

          {/* Add wallet */}
          <div>
            <label className="block text-xs text-hl-text-muted mb-1.5">Add wallet address</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newAddress}
                onChange={(e) => { setNewAddress(e.target.value); setAddressError(null); }}
                onKeyDown={(e) => e.key === "Enter" && handleAddWallet()}
                placeholder="0x742d35Cc6634C0532925a3b8D4C1..."
                className={cn(
                  "flex-1 bg-hl-bg border rounded-lg px-3 py-2.5 text-sm font-mono text-hl-text focus:outline-none transition-colors",
                  addressError ? "border-hl-red" : "border-hl-border focus:border-hl-primary"
                )}
              />
              <button
                onClick={handleAddWallet}
                disabled={!newAddress || syncing}
                className="px-4 py-2.5 rounded-lg text-sm bg-hl-primary text-hl-bg hover:bg-hl-secondary disabled:opacity-40 transition-all flex items-center gap-2 font-medium"
              >
                <Plus className="w-4 h-4" />
                Add & Sync
              </button>
            </div>
            {addressError && (
              <p className="text-xs text-hl-red mt-1.5 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> {addressError}
              </p>
            )}
          </div>

          {/* Wallet list */}
          {wallets.length > 0 && (
            <div className="space-y-2">
              {wallets.map((w) => (
                <div
                  key={w.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-hl-bg border border-hl-border"
                >
                  <div className={cn("w-2 h-2 rounded-full flex-shrink-0", statusDot(w.sync_status))} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-mono text-hl-text truncate">{w.address}</p>
                    <p className={cn("text-xs mt-0.5", statusColor(w.sync_status))}>
                      {w.sync_status === "syncing" && "Syncing…"}
                      {w.sync_status === "error" && (w.error_message ?? "Error")}
                      {w.sync_status === "idle" && w.last_synced
                        ? `${w.total_trades_synced} trades · last synced ${new Date(w.last_synced).toLocaleDateString()}`
                        : w.sync_status === "idle" ? "Never synced" : ""}
                    </p>
                  </div>
                  <button
                    onClick={() => syncWallet(w.address)}
                    disabled={syncing && syncingAddress === w.address}
                    title="Sync"
                    className="p-1.5 rounded-md text-hl-text-muted hover:text-hl-primary hover:bg-hl-primary/10 disabled:opacity-40 transition-all"
                  >
                    <RefreshCw className={cn("w-4 h-4", syncing && syncingAddress === w.address && "animate-spin")} />
                  </button>
                  <button
                    onClick={() => setConfirmWipe(w.address)}
                    title="Remove wallet & its trades"
                    className="p-1.5 rounded-md text-hl-text-muted hover:text-hl-red hover:bg-hl-red/10 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Wipe all */}
          {wallets.length > 0 && (
            <div className="pt-2 border-t border-hl-border">
              <button
                onClick={() => setConfirmWipe("all")}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-hl-red border border-hl-red/20 hover:bg-hl-red/10 transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                Wipe all trade data
              </button>
              <p className="text-xs text-hl-text-dim mt-1.5">
                Deletes all synced trades and resets sync cursors. Wallets stay connected — re-sync to restore.
              </p>
            </div>
          )}

          {/* Confirm dialog */}
          {confirmWipe && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="hl-card p-6 w-full max-w-sm space-y-4">
                <h3 className="font-semibold text-hl-text">
                  {confirmWipe === "all" ? "Wipe all trade data?" : "Remove wallet?"}
                </h3>
                <p className="text-sm text-hl-text-muted">
                  {confirmWipe === "all"
                    ? "This deletes all synced trades across all wallets. Wallets remain connected and you can re-sync."
                    : `This removes ${shortenAddress(confirmWipe, 6)} and deletes its synced trades. This cannot be undone.`}
                </p>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setConfirmWipe(null)}
                    className="px-4 py-2 rounded-lg text-sm border border-hl-border text-hl-text-muted hover:border-hl-primary transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmWipe}
                    className="px-4 py-2 rounded-lg text-sm bg-hl-red text-white hover:opacity-90 transition-all font-medium"
                  >
                    {confirmWipe === "all" ? "Wipe all" : "Remove"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </Section>

      {/* AI Coach */}
      <Section title="AI Coach" icon={Brain}>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg bg-hl-bg-2 border border-hl-border">
            <div>
              <p className="text-sm font-medium text-hl-text">Voice coaching sessions</p>
              <p className="text-xs text-hl-text-muted mt-0.5">
                Voice mode on by default. Coach speaks responses aloud and listens to your input.
              </p>
            </div>
            <button
              onClick={() => setVoiceModeEnabled(!voiceModeEnabled)}
              className={cn(
                "relative w-12 h-6 rounded-full transition-all duration-200",
                voiceModeEnabled ? "bg-hl-primary" : "bg-hl-border"
              )}
            >
              <div
                className={cn(
                  "absolute w-5 h-5 bg-white rounded-full top-0.5 transition-all duration-200",
                  voiceModeEnabled ? "left-6" : "left-0.5"
                )}
              />
            </button>
          </div>

          {profile?.last_coaching_session && (
            <div className="text-xs text-hl-text-muted">
              Last coaching session:{" "}
              <span className="text-hl-text">
                {new Date(profile.last_coaching_session).toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          )}
        </div>
      </Section>

      {/* Voice Settings */}
      <Section title="Voice Settings" icon={Mic} >
        <div id="voice" className="space-y-5">
          {!voice.isSupported && (
            <div className="text-xs text-hl-yellow bg-hl-yellow/5 border border-hl-yellow/20 rounded-lg px-3 py-2">
              ⚠️ Speech recognition is not supported in this browser. Use Chrome or Edge for voice features.
            </div>
          )}

          {/* Speech rate */}
          <div>
            <div className="flex justify-between mb-2">
              <label className="text-sm text-hl-text-muted">Speech rate</label>
              <span className="text-sm font-mono text-hl-primary">{voiceRate.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min={0.5}
              max={2.0}
              step={0.1}
              value={voiceRate}
              onChange={(e) => setVoiceRate(parseFloat(e.target.value))}
              className="w-full accent-hl-primary"
            />
            <div className="flex justify-between text-[10px] text-hl-text-dim mt-1">
              <span>Slow (0.5x)</span>
              <span>Normal (1.0x)</span>
              <span>Fast (2.0x)</span>
            </div>
          </div>

          {/* Speech pitch */}
          <div>
            <div className="flex justify-between mb-2">
              <label className="text-sm text-hl-text-muted">Speech pitch</label>
              <span className="text-sm font-mono text-hl-primary">{voicePitch.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min={0.5}
              max={1.5}
              step={0.1}
              value={voicePitch}
              onChange={(e) => setVoicePitch(parseFloat(e.target.value))}
              className="w-full accent-hl-primary"
            />
          </div>

          {/* Voice selection */}
          {englishVoices.length > 0 && (
            <div>
              <label className="block text-sm text-hl-text-muted mb-1.5">Coach voice</label>
              <select
                value={selectedVoiceURI}
                onChange={(e) => setSelectedVoiceURI(e.target.value)}
                className="w-full bg-hl-bg border border-hl-border rounded-lg px-3 py-2.5 text-sm text-hl-text focus:outline-none focus:border-hl-primary"
              >
                <option value="">Auto (system default)</option>
                {englishVoices.map((v) => (
                  <option key={v.voiceURI} value={v.voiceURI}>
                    {v.name} ({v.lang})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Test voice */}
          {voice.isSpeechSynthesisSupported && (
            <button
              onClick={handleTestVoice}
              disabled={testSpeaking}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm border border-hl-primary/30 text-hl-primary hover:bg-hl-primary/10 transition-all disabled:opacity-50"
            >
              <Volume2 className={cn("w-4 h-4", testSpeaking && "animate-pulse")} />
              {testSpeaking ? "Speaking..." : "Test voice"}
            </button>
          )}
        </div>
      </Section>

      {/* Save button */}
      <div className="flex items-center justify-end gap-4">
        {saveSuccess && (
          <div className="flex items-center gap-2 text-sm text-hl-green animate-fade-in">
            <CheckCircle className="w-4 h-4" />
            Settings saved
          </div>
        )}
        {saveError && (
          <div className="flex items-center gap-2 text-sm text-hl-red">
            <AlertCircle className="w-4 h-4" />
            {saveError}
          </div>
        )}
        <button
          onClick={handleSaveProfile}
          disabled={saving}
          className={cn(
            "flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all",
            "bg-hl-primary text-hl-bg hover:bg-hl-secondary shadow-hl",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          <Save className="w-4 h-4" />
          {saving ? "Saving..." : "Save settings"}
        </button>
      </div>
    </div>
  );
}
