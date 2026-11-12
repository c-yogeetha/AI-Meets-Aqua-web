"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type AlertSettingsUpdate, ApiError } from "@/lib/api";
import {
  Bell,
  Mail,
  Save,
  CheckCircle,
  AlertCircle,
  Loader2,
  Server,
  Clock,
} from "lucide-react";
import { showToast } from "@/lib/toast";

export default function SettingsPage() {
  const queryClient = useQueryClient();

  const [dashboardPopup, setDashboardPopup] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [emailTo, setEmailTo] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const { data: settings, isLoading } = useQuery({
    queryKey: ["alert-settings"],
    queryFn: () => api.getAlertSettings(),
  });

  const { data: systemStatus } = useQuery({
    queryKey: ["system-status"],
    queryFn: () => api.getSystemStatus(),
  });

  useEffect(() => {
    if (settings) {
      setDashboardPopup(settings.dashboard_popup);
      setEmailEnabled(settings.email_enabled);
      setEmailTo(settings.email_to || "");
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: (update: AlertSettingsUpdate) => api.updateAlertSettings(update),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alert-settings"] });
      setSaveSuccess(true);
      setSaveError(null);
      showToast("Alert preferences updated", "success");
      setTimeout(() => setSaveSuccess(false), 3000);
    },
    onError: (err: unknown) => {
      setSaveError(err instanceof ApiError ? err.message : "Failed to update alert settings");
    },
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    updateMutation.mutate({
      dashboard_popup: dashboardPopup,
      email_enabled: emailEnabled,
      email_to: emailEnabled ? emailTo.trim() || null : null,
    });
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-aqua mx-auto mb-2" />
        <span className="text-xs text-foam/60 font-mono">Loading settings...</span>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Title */}
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-foam">
          Settings & Diagnostics
        </h1>
        <p className="text-xs text-foam/60 font-mono mt-0.5">
          Notification dispatch preferences, retention policies, and computer vision engine status
        </p>
      </div>

      {/* Alert Preferences Form */}
      <form onSubmit={handleSave} className="glass-card p-6 sm:p-8 border-border/40 space-y-6">
        <h2 className="text-sm font-semibold text-foam font-mono uppercase tracking-wider">
          Alert & Notification Channels
        </h2>

        {saveSuccess && (
          <div className="p-3.5 rounded-xl bg-ok/10 border border-ok/30 text-ok text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span>Preferences saved successfully.</span>
          </div>
        )}

        {saveError && (
          <div className="p-3.5 rounded-xl bg-danger/10 border border-danger/30 text-danger text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{saveError}</span>
          </div>
        )}

        {/* Dashboard Popup Toggle */}
        <div className="flex items-start justify-between gap-4 p-4 rounded-xl bg-abyss border border-border/40">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-lagoon/50 text-aqua mt-0.5">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="font-semibold text-foam text-xs">Dashboard Pop-up Toasts</div>
              <div className="text-[11px] text-foam/60 mt-0.5">
                Display immediate warning toasts in the UI when an analysis detects elevated or critical stress.
              </div>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer mt-1">
            <input
              type="checkbox"
              data-testid="settings-popup"
              checked={dashboardPopup}
              onChange={(e) => setDashboardPopup(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-abyss border border-border/60 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-aqua" />
          </label>
        </div>

        {/* Email Alerts Toggle */}
        <div className="p-4 rounded-xl bg-abyss border border-border/40 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-gold/10 text-gold mt-0.5 border border-gold/20">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <div className="font-semibold text-foam text-xs">Email Outbox Dispatch</div>
                <div className="text-[11px] text-foam/60 mt-0.5">
                  Generate email alert records (.eml file saved to disk outbox, or sent via SMTP) upon stress events.
                </div>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer mt-1">
              <input
                type="checkbox"
                data-testid="settings-email"
                checked={emailEnabled}
                onChange={(e) => setEmailEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-abyss border border-border/60 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gold" />
            </label>
          </div>

          {emailEnabled && (
            <div className="pt-3 border-t border-border/30">
              <label className="block text-xs font-semibold text-foam/80 mb-1">
                Recipient Email Address
              </label>
              <input
                type="email"
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
                placeholder="aquarist@facility.org"
                className="w-full px-3 py-2 rounded-xl bg-abyss border border-border/60 text-foam text-xs focus:outline-none focus:border-gold"
              />
            </div>
          )}
        </div>

        {/* Save button */}
        <button
          type="submit"
          data-testid="settings-save"
          disabled={updateMutation.isPending}
          className="btn-gold w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2"
        >
          {updateMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Saving Preferences...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Save Alert Preferences</span>
            </>
          )}
        </button>
      </form>

      {/* System Diagnostics & Engine Status Panel */}
      <div className="glass-card p-6 sm:p-8 border-border/40 space-y-4">
        <h2 className="text-sm font-semibold text-foam font-mono uppercase tracking-wider flex items-center gap-2">
          <Server className="w-4 h-4 text-aqua" />
          <span>System Status & Analysis Diagnostics</span>
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-mono">
          <div className="p-3 rounded-lg bg-abyss border border-border/40">
            <span className="text-foam/40 block text-[10px] uppercase">Analyzer Mode</span>
            <span className="text-foam font-bold capitalize">
              {systemStatus?.mode || "classical"}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-abyss border border-border/40">
            <span className="text-foam/40 block text-[10px] uppercase">Engine Version</span>
            <span className="text-foam font-bold">
              {systemStatus?.version || "0.9.0"}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-abyss border border-border/40">
            <span className="text-foam/40 block text-[10px] uppercase">Max Upload Size</span>
            <span className="text-foam font-bold">
              {systemStatus?.limits?.max_upload_mb ? `${systemStatus.limits.max_upload_mb} MB` : "200 MB"}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-abyss border border-border/40">
            <span className="text-foam/40 block text-[10px] uppercase">Max Clip Duration</span>
            <span className="text-foam font-bold">
              {systemStatus?.limits?.max_duration_s ? `${systemStatus.limits.max_duration_s}s` : "120s"}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-abyss border border-border/40">
            <span className="text-foam/40 block text-[10px] uppercase">Queue Backlog</span>
            <span className="text-foam font-bold">
              {systemStatus?.queue_length ?? 0} jobs
            </span>
          </div>

          <div className="p-3 rounded-lg bg-abyss border border-border/40">
            <span className="text-foam/40 block text-[10px] uppercase">Storage Free</span>
            <span className="text-ok font-bold">
              {systemStatus?.disk_free_mb ? `${(systemStatus.disk_free_mb / 1024).toFixed(1)} GB` : "Available"}
            </span>
          </div>
        </div>

        {/* Detectors list if present */}
        {systemStatus?.detectors && (
          <div className="pt-2">
            <span className="text-[10px] font-mono uppercase text-foam/40 block mb-1">
              Registered Detectors:
            </span>
            <div className="flex flex-wrap gap-2">
              {Object.entries(systemStatus.detectors).map(([key, available]) => (
                <span
                  key={key}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                    available
                      ? "bg-ok/10 border-ok/30 text-ok"
                      : "bg-abyss border-border/40 text-foam/40"
                  }`}
                >
                  {key}: {available ? "ready" : "not configured"}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Data Retention Explanation & Observational Disclaimer */}
      <div className="glass-card p-6 border-border/40 space-y-4">
        <h2 className="text-sm font-semibold text-foam font-mono uppercase tracking-wider flex items-center gap-2">
          <Clock className="w-4 h-4 text-gold" />
          <span>Data Retention Policy & Protocols</span>
        </h2>

        <div className="text-xs text-foam/70 space-y-2 leading-relaxed">
          <p>
            <strong>Recycle Bin Policy:</strong> When an analysis is deleted, it is safely moved to the Recycle Bin for 7 days.
            During this retention window, the complete video trajectory, timeline, and PDF report can be restored at any time.
            After 7 days, deleted items and associated media files are permanently purged from server disk storage.
          </p>
          <p className="text-[11px] text-foam/50 pt-2 border-t border-border/30">
            <strong>Observational Disclaimer:</strong> Matsya is a computer-vision decision support system designed to assist
            aquarists in monitoring welfare. Scores reflect observable physical movements and do not substitute for direct
            chemical water testing or specialized professional evaluation.
          </p>
        </div>
      </div>
    </div>
  );
}
