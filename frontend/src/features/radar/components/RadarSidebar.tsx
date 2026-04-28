import React from 'react';

interface Hub {
  id: string;
  name: string;
  distance: string;
  users: number;
  icon: string;
}

export const RadarSidebar: React.FC<{ activeRoomId: string | null; onSelectRoom: (id: string) => void }> = ({ activeRoomId, onSelectRoom }) => {
  // Mock data for hubs
  const hubs: Hub[] = [
    { id: 'h1', name: 'Downtown Cyber-Café', distance: '0.2 km', users: 12, icon: '☕' },
    { id: 'h2', name: 'Central Station Node', distance: '0.8 km', users: 45, icon: '🚉' },
    { id: 'h3', name: 'Neon Plaza Geofence', distance: '1.5 km', users: 8, icon: '🏢' },
  ];

  return (
    <div className="hub-list">
      {hubs.map((hub) => (
        <div 
          key={hub.id} 
          className={`hub-item ${activeRoomId === hub.id ? 'active' : ''}`}
          onClick={() => onSelectRoom(hub.id)}
        >
          <div className="hub-icon">{hub.icon}</div>
          <div className="hub-info">
            <h3>{hub.name}</h3>
            <span>{hub.distance} · {hub.users} drifters</span>
          </div>
        </div>
      ))}
    </div>
  );

};
