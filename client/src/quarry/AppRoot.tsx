'use client';

import React from 'react';
import { useQuarry } from './context/QuarryContext';
import { ScannerWorkspace } from './scanner/ScannerWorkspace';
import { LeadsWorkspace } from './leads/LeadsWorkspace';
import { OutreachLoggerModal } from './modals/OutreachLoggerModal';
import { EmailSignatureModal } from './modals/EmailSignatureModal';
import { SettingsModal } from './modals/SettingsModal';

export function AppRoot() {
  const { activeWorkspace } = useQuarry();

  return (
    <>
      {activeWorkspace === 'scanner' ? <ScannerWorkspace /> : <LeadsWorkspace />}
      <OutreachLoggerModal />
      <EmailSignatureModal />
      <SettingsModal />
    </>
  );
}
