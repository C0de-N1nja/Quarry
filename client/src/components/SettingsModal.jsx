import React, { useState, useEffect } from 'react';
import { 
  RiSettings3Line, 
  RiShieldCheckLine, 
  RiCheckboxCircleLine, 
  RiErrorWarningLine, 
  RiLoader4Line, 
  RiGlobalLine, 
  RiExternalLinkLine, 
  RiCompass3Line,
  RiDatabase2Line,
  RiUser3Line
} from '@remixicon/react';
import { Modal, ModalBody, ModalFooter } from '@/components/base/modal/modal';
import { CloseButton } from '@/components/base/buttons/close-button';
import { Button } from '@/components/base/buttons/button';
import { PillTabList, PillTab } from '@/components/base/tabs/pill-tab';
import { Switch } from '@/components/base/switch/switch';
import { toast } from '@/components/base/toast/toast';

export default function SettingsModal({ onClose, onOpenOnboarding }) {
  const [activeTab, setActiveTab] = useState('general'); // 'general' or 'osint'
  const [settings, setSettings] = useState({
    sender_name: 'Rehan',
    sender_email: '',
    my_portfolio: 'https://github.com',
    crawler_concurrency: '4',
    enable_mx_verification: 'true',
    enable_whatsapp_detection: 'true',
    enable_social_recon: 'true'
  });

  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.success && data.settings) {
        setSettings(prev => ({ ...prev, ...data.settings }));
      }
    } catch (err) {
      console.error('Failed to load settings', err);
    }
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSaveSuccess(false);

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      setSaveSuccess(true);
      toast.success('Settings updated successfully!');
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      onOpenChange={(open) => { if (!open) onClose(); }}
      size="lg"
      aria-label="Application Settings"
      className="p-0 gap-0 overflow-hidden flex flex-col max-h-[90vh] bg-background-primary-default border border-separator-border text-text-primary shadow-2xl rounded-3xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-separator-border bg-background-secondary-default shrink-0">
        <div className="flex items-center gap-2">
          <RiSettings3Line className="size-4 text-text-primary" />
          <h2 className="text-sm font-semibold text-text-primary">Quarry Preferences & Configuration</h2>
        </div>
        <CloseButton
          size="md"
          onClick={onClose}
          aria-label="Close Settings"
        />
      </div>

      {/* Tabs */}
      <div className="px-6 py-2 border-b border-separator-border bg-background-secondary-default shrink-0">
        <PillTabList className="w-full flex gap-1">
          <PillTab
            variant="blue"
            icon={RiUser3Line}
            isSelected={activeTab === 'general'}
            onSelect={() => setActiveTab('general')}
          >
            Outreach Profile
          </PillTab>
          <PillTab
            variant="blue"
            icon={RiShieldCheckLine}
            isSelected={activeTab === 'osint'}
            onSelect={() => setActiveTab('osint')}
          >
            OSINT & Crawlers
          </PillTab>
        </PillTabList>
      </div>

      <ModalBody className="p-6 gap-6 flex-1 overflow-y-auto bg-background-primary-default text-text-primary text-xs">
        {saveSuccess && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-500 flex items-center gap-2">
            <RiCheckboxCircleLine className="size-4 shrink-0" />
            <span>Settings updated and applied!</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-500 flex items-center gap-2">
            <RiErrorWarningLine className="size-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {activeTab === 'general' ? (
          <div className="space-y-5">
            {/* Outreach Sender Profile */}
            <div>
              <h3 className="font-semibold text-text-primary uppercase tracking-wider text-[11px] mb-3 flex items-center gap-1.5">
                <RiUser3Line className="size-3.5 text-text-tertiary" />
                <span>Outreach Sender Profile</span>
              </h3>
              <p className="text-text-secondary text-[11px] mb-4">
                These personal details populate your 1-click email and WhatsApp pitch messages.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-text-secondary mb-1 font-medium text-[11px]">Your Name / Brand</label>
                  <input
                    type="text"
                    value={settings.sender_name || ''}
                    onChange={(e) => setSettings({ ...settings, sender_name: e.target.value })}
                    placeholder="e.g. Rehan"
                    className="w-full px-3 py-2 rounded-xl bg-background-secondary-default border border-separator-border text-text-primary focus:border-text-primary focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-text-secondary mb-1 font-medium text-[11px]">Your Direct Email</label>
                  <input
                    type="email"
                    value={settings.sender_email || ''}
                    onChange={(e) => setSettings({ ...settings, sender_email: e.target.value })}
                    placeholder="you@domain.com"
                    className="w-full px-3 py-2 rounded-xl bg-background-secondary-default border border-separator-border text-text-primary focus:border-text-primary focus:outline-none transition-colors"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-text-secondary mb-1 font-medium text-[11px]">Portfolio / Agency Website URL</label>
                  <input
                    type="url"
                    value={settings.my_portfolio || ''}
                    onChange={(e) => setSettings({ ...settings, my_portfolio: e.target.value })}
                    placeholder="https://youragency.com"
                    className="w-full px-3 py-2 rounded-xl bg-background-secondary-default border border-separator-border text-text-primary font-mono text-[11px] focus:border-text-primary focus:outline-none transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Quick Actions / Reset */}
            <div className="pt-4 border-t border-separator-border">
              <h3 className="font-semibold text-text-primary uppercase tracking-wider text-[11px] mb-2 flex items-center gap-1.5">
                <RiCompass3Line className="size-3.5 text-text-tertiary" />
                <span>Onboarding & Wizard</span>
              </h3>
              <p className="text-text-secondary text-[11px] mb-3">
                Need to re-run the initial interactive setup wizard or change your target city and niche?
              </p>
              <Button
                variant="secondary"
                size="small"
                leadingIcon={RiCompass3Line}
                onClick={() => {
                  onClose();
                  if (onOpenOnboarding) onOpenOnboarding();
                }}
              >
                Re-launch Discovery Setup Wizard
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {/* OSINT Enrichment Engine */}
            <div>
              <h3 className="font-semibold text-text-primary uppercase tracking-wider text-[11px] mb-3 flex items-center gap-1.5">
                <RiShieldCheckLine className="size-3.5 text-text-tertiary" />
                <span>OSINT Verification Engines</span>
              </h3>
              <div className="space-y-3 bg-background-secondary-default p-4 rounded-2xl border border-separator-border">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-text-primary">DNS & MX Deliverability Checks</div>
                    <div className="text-[11px] text-text-secondary">Verify mail exchanges and catch-all flags before displaying email tags.</div>
                  </div>
                  <Switch
                    isSelected={settings.enable_mx_verification !== 'false'}
                    onChange={(val) => setSettings({ ...settings, enable_mx_verification: String(val) })}
                  />
                </div>

                <div className="h-px bg-separator-border/60" />

                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-text-primary">E.164 Phone Normalization & WhatsApp Verification</div>
                    <div className="text-[11px] text-text-secondary">Validate mobile prefixes and format international numbers for 1-click wa.me links.</div>
                  </div>
                  <Switch
                    isSelected={settings.enable_whatsapp_detection !== 'false'}
                    onChange={(val) => setSettings({ ...settings, enable_whatsapp_detection: String(val) })}
                  />
                </div>

                <div className="h-px bg-separator-border/60" />

                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-text-primary">Social Presence & Identity Recon</div>
                    <div className="text-[11px] text-text-secondary">Extract LinkedIn, Instagram, Facebook, and Twitter accounts during deep audits.</div>
                  </div>
                  <Switch
                    isSelected={settings.enable_social_recon !== 'false'}
                    onChange={(val) => setSettings({ ...settings, enable_social_recon: String(val) })}
                  />
                </div>
              </div>
            </div>

            {/* Scraper Performance */}
            <div>
              <h3 className="font-semibold text-text-primary uppercase tracking-wider text-[11px] mb-2">
                Crawler Concurrency
              </h3>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={settings.crawler_concurrency || '4'}
                  onChange={(e) => setSettings({ ...settings, crawler_concurrency: e.target.value })}
                  className="w-20 px-3 py-1.5 rounded-xl bg-background-secondary-default border border-separator-border text-text-primary font-mono text-center focus:border-text-primary focus:outline-none"
                />
                <span className="text-[11px] text-text-secondary">
                  Simultaneous browser threads for Google Maps scraping (recommended: 3-5).
                </span>
              </div>
            </div>
          </div>
        )}
      </ModalBody>

      {/* Footer */}
      <ModalFooter className="px-6 py-3 border-t border-separator-border bg-background-secondary-default flex items-center justify-end gap-2 shrink-0">
        <Button variant="ghost" size="small" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="primary"
          size="small"
          disabled={loading}
          onClick={handleSave}
          leadingIcon={loading ? RiLoader4Line : RiCheckboxCircleLine}
        >
          {loading ? 'Saving...' : 'Save Preferences'}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
