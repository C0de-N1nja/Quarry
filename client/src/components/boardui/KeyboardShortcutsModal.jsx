import React from 'react';
import { RiKeyboardLine } from '@remixicon/react';
import { Modal, ModalBody, ModalFooter } from '@/components/base/modal/modal';
import { Button } from '@/components/base/buttons/button';
import { Kbd } from '@/components/base/kbd/kbd';

export default function KeyboardShortcutsModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const shortcutGroups = [
    {
      title: 'Navigation & Triage',
      items: [
        { keys: ['J', '↓'], desc: 'Move focus to next lead row' },
        { keys: ['K', '↑'], desc: 'Move focus to previous lead row' },
        { keys: ['Space'], desc: 'Toggle select currently focused lead' },
        { keys: ['↵'], desc: 'Open Lead Drawer for focused lead' },
        { keys: ['Esc'], desc: 'Close drawer / Clear lead selections' }
      ]
    },
    {
      title: 'Lead Actions',
      items: [
        { keys: ['A'], desc: 'Open full Website Audit page' },
        { keys: ['E'], desc: 'Verify email deliverability' },
        { keys: ['O'], desc: 'Find owner & contact details' }
      ]
    },
    {
      title: 'Global Quick Commands',
      items: [
        { keys: ['⌘', 'K'], desc: 'Open universal Command Palette' },
        { keys: ['?'], desc: 'Show keyboard shortcuts cheatsheet' }
      ]
    }
  ];

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(open) => { if (!open) onClose(); }}
      size="md"
      aria-label="Keyboard Shortcuts Cheatsheet"
      className="p-0 overflow-hidden"
    >
      <div className="p-4 sm:p-5 border-b border-separator-border bg-background-secondary-default flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-xl bg-accent-600/10 text-accent-600">
          <RiKeyboardLine className="size-5" />
        </div>
        <div>
          <h3 className="text-body-medium font-semibold text-text-primary">Keyboard Shortcuts</h3>
          <p className="text-caption-1-regular text-text-secondary">Accelerate lead triage and navigation without a mouse</p>
        </div>
      </div>

      <ModalBody className="p-4 sm:p-5 space-y-5 max-h-[60vh] overflow-y-auto">
        {shortcutGroups.map((group) => (
          <div key={group.title} className="space-y-2">
            <h4 className="text-caption-2-medium uppercase tracking-wider text-text-tertiary font-mono">
              {group.title}
            </h4>
            <div className="divide-y divide-separator-border rounded-xl border border-separator-border bg-background-secondary-default/40 overflow-hidden">
              {group.items.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between px-3 py-2 text-body-small">
                  <span className="text-text-secondary">{item.desc}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    {item.keys.map((k, kidx) => (
                      <Kbd key={kidx} className="min-w-6 text-center text-caption-1-semibold">
                        {k}
                      </Kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </ModalBody>

      <ModalFooter className="p-3 bg-background-secondary-default/50 border-t border-separator-border flex justify-end">
        <Button size="small" variant="secondary" onClick={onClose}>
          Got it
        </Button>
      </ModalFooter>
    </Modal>
  );
}
