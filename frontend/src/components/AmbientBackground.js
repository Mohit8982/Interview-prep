import React from 'react';

export default function AmbientBackground() {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {/* Grid */}
      <div className="absolute inset-0 bg-grid opacity-60" />
      {/* Vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 0%, hsl(222.2 84% 4.9% / 0.65) 70%, hsl(222.2 84% 4.9%) 100%)',
        }}
      />
      {/* Ambient blobs */}
      <div
        className="ambient-blob blob-a"
        style={{
          top: '-10%',
          left: '-5%',
          width: '420px',
          height: '420px',
          background: 'hsl(38, 92%, 50%)',
        }}
      />
      <div
        className="ambient-blob blob-b"
        style={{
          bottom: '-8%',
          right: '-6%',
          width: '460px',
          height: '460px',
          background: 'hsl(217.2, 91%, 60%)',
        }}
      />
    </div>
  );
}
