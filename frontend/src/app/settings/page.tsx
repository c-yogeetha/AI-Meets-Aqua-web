"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type AlertSettingsUpdate, ApiError } from "@/lib/api";
import { Bell, Mail, Save, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
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
        <span className="text-xs text-foam/60">Loading preferences...</span>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-white mb-2">Notification Settings</h1>
        <p className="text-foam/70 text-sm">
          Configure how caretakers are notified when high stress or acute behavioural anomalies occur.
        </p>
      </div>

      <form onSubmit={handleSave} className="glass-card p-6 sm:p-8 border-white/10 space-y-6">
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
        <div className="flex items-start justify-between gap-4 p-4 rounded-xl bg-white/5 border border-white/5">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-aqua/10 text-aqua mt-0.5">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="font-semibold text-white text-sm">Dashboard Pop-up Toasts</div>
              <div className="text-xs text-foam/60 mt-0.5">
                Display immediate warning toasts in the UI when a fish flags critical stress indicators.
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
            <div className="w-11 h-6 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-aqua" />
          </label>
        </div>

        {/* Email Alerts Toggle */}
        <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-gold/10 text-gold mt-0.5">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <div className="font-semibold text-white text-sm">Email Dispatch</div>
                <div className="text-xs text-foam/60 mt-0.5">
                  Generate email alert records (.eml file saved to outbox, or sent via SMTP) upon stress detection.
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
              <div className="w-11 h-6 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gold" />
            </label>
          </div>

          {emailEnabled && (
            <div className="pt-2 border-t border-white/5 animate-in fade-in">
              <label className="block text-xs font-semibold text-foam/80 mb-1">
                Recipient Email Address
              </label>
              <input
                type="email"
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
                placeholder="caretaker@aquarium.org"
                className="w-full px-3 py-2 rounded-xl bg-deep border border-white/15 text-white text-xs focus:outline-none focus:border-gold"
              />
            </div>
          )}
        </div>

        {/* Save button */}
        <button
          type="submit"
          data-testid="settings-save"
          disabled={updateMutation.isPending}
          className="btn-gold w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
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
    </div>
  );
}
