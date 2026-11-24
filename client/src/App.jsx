import React from 'react';
import { QuarryProvider } from './quarry/context/QuarryContext';
import { AppRoot } from './quarry/AppRoot';

export default function App() {
  return (
    <QuarryProvider>
      <div className="min-h-screen quarry-grid-bg transition-colors duration-200">
        <AppRoot />
      </div>
    </QuarryProvider>
  );
}
