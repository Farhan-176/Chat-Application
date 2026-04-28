import React from 'react';
import './AppLayout.css';

interface AppLayoutProps {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ sidebar, children }) => {
  return (
    <div className="whatsapp-container">
      <aside className="left-sidebar">
        {sidebar}
      </aside>
      <main className="main-chat-canvas">
        {children}
      </main>
    </div>
  );
};
