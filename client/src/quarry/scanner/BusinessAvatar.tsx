'use client';

import React, { useState } from 'react';

interface BusinessAvatarProps {
  name: string;
  photoUrl?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function BusinessAvatar({ name, photoUrl, size = 'md' }: BusinessAvatarProps) {
  const [imgError, setImgError] = useState(false);

  const getMonogram = (str: string) => {
    const clean = str.replace(/[^a-zA-Z0-9\s]/g, '').trim();
    if (!clean) return 'Q';
    const parts = clean.split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return clean.slice(0, 2).toUpperCase();
  };

  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-lg'
  };

  // Deterministic gradient selection
  const gradients = [
    'from-emerald-600 to-teal-800',
    'from-indigo-600 to-violet-800',
    'from-sky-600 to-blue-800',
    'from-amber-600 to-orange-800',
    'from-rose-600 to-pink-800'
  ];
  const charCode = name.charCodeAt(0) || 0;
  const gradient = gradients[charCode % gradients.length];

  if (photoUrl && !imgError) {
    return (
      <img
        src={photoUrl}
        alt={name}
        onError={() => setImgError(true)}
        className={`${sizeClasses[size]} rounded-2xl object-cover border border-[#1c1c1c] shrink-0`}
      />
    );
  }

  return (
    <div
      className={`${sizeClasses[size]} rounded-2xl bg-gradient-to-br ${gradient} border border-[#242424] flex items-center justify-center font-bold tracking-tight text-white shrink-0 shadow-inner`}
    >
      {getMonogram(name)}
    </div>
  );
}
