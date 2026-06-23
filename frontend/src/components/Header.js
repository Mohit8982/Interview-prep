import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Brain, ClockCounterClockwise, House } from '@phosphor-icons/react';

export default function Header() {
  const loc = useLocation();
  const isHistory = loc.pathname.startsWith('/history');

  return (
    <header
      className="relative z-10 border-b border-border/60 backdrop-blur-md bg-background/40"
      data-testid="app-header"
    >
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group" data-testid="header-logo">
          <div className="w-9 h-9 rounded-md bg-primary/10 border border-primary/40 flex items-center justify-center">
            <Brain size={20} weight="duotone" className="text-primary" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-bold tracking-tight">INTERVUE.AI</span>
            <span className="micro-label">Resume Intelligence v1</span>
          </div>
        </Link>

        <nav className="flex items-center gap-2">
          <Link
            to="/"
            className="px-3 py-2 rounded-md text-xs font-medium text-foreground/70 hover:text-foreground hover:bg-muted/40 transition-colors flex items-center gap-2"
            data-testid="nav-home"
          >
            <House size={14} /> New
          </Link>
          <Link
            to="/history"
            className={`px-3 py-2 rounded-md text-xs font-medium transition-colors flex items-center gap-2 ${
              isHistory ? 'bg-primary/10 text-primary border border-primary/40' : 'text-foreground/70 hover:text-foreground hover:bg-muted/40'
            }`}
            data-testid="nav-history"
          >
            <ClockCounterClockwise size={14} /> History
          </Link>
        </nav>
      </div>
    </header>
  );
}
