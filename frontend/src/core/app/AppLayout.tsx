import React from 'react';
import './AppLayout.css';

interface AppLayoutProps {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ sidebar, children }) => {
  return (
    <div className="app-viewport">
      <div className="side-nav-placeholder" /> {/* 72px wide - Always visible placeholder */}
      {sidebar}                              {/* 280px wide - Collapsible RoomSidebar */}
      <main className="chat-canvas">
        {children}
      </main>
      <div className="context-panel-placeholder" /> {/* 0px wide - Optional Right Sidebar */}
    </div>
  );
};
