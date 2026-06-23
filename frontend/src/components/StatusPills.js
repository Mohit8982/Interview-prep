import React from 'react';

export default function StatusPills() {
  return (
    <div className="flex flex-wrap items-center gap-2" data-testid="status-pills">
      <span className="status-pill" data-testid="pill-ai-client">
        <span className="status-dot" /> AI-Powered · Client-Side
      </span>
      <span className="status-pill" data-testid="pill-private-noserver">
        <span className="status-dot" style={{ background: 'hsl(142 76% 36%)', boxShadow: '0 0 8px hsl(142 76% 36% / 0.7)' }} />
        100% Private · No Server
      </span>
    </div>
  );
}
