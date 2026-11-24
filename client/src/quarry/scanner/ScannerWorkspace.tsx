'use client';

import React from 'react';

import { ScannerHeader } from './ScannerHeader';
import { ProfileLinkBar } from './ProfileLinkBar';
import { TargetSpaceCard } from './TargetSpaceCard';
import { BusinessListSidebar } from './BusinessListSidebar';
import { BusinessDetailPanel } from './BusinessDetailPanel';

import MapView from './MapView';

export function ScannerWorkspace() {
  return (
    <div className="min-h-screen flex flex-col bg-[#050505]">
      {/* 1. Header (Sticky) */}
      <ScannerHeader />

      {/* 2. Direct Profile Link & Phone Bar */}
      <ProfileLinkBar />

      {/* 3. Current Target Space Card */}
      <TargetSpaceCard />

      {/* 4. Main 12-Column Layout Wireframe (max-w-[1600px]) */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 py-4 grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left Sidebar (lg:col-span-4 xl:col-span-3, max-h-[calc(100vh-145px)]) */}
        <section className="lg:col-span-4 xl:col-span-3 h-[calc(100vh-155px)] sticky top-[140px]">
          <BusinessListSidebar />
        </section>

        {/* Right Canvas (lg:col-span-8 xl:col-span-9) */}
        <section className="lg:col-span-8 xl:col-span-9 space-y-4">
          {/* Map View (h-[290px]) */}
          <MapView />

          {/* Business Detail Panel */}
          <BusinessDetailPanel />
        </section>
      </main>
    </div>
  );
}
