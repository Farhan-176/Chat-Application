import React, { useState, useEffect } from 'react';

interface RadarCommandPaletteProps {
  onSelectRoom: (id: string) => void;
}

export const RadarCommandPalette: React.FC<RadarCommandPaletteProps> = ({ onSelectRoom }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');

  const rooms = [
    { id: 'h1', name: 'Downtown Cyber-Café' },
    { id: 'h2', name: 'Central Station Node' },
    { id: 'h3', name: 'Neon Plaza Geofence' },
  ];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!isOpen) return null;

  const filteredRooms = rooms.filter(room => 
    room.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="radar-palette-overlay" onClick={() => setIsOpen(false)}>
      <div className="radar-palette" onClick={e => e.stopPropagation()}>
        <div className="palette-search">
          <span className="search-icon">⚡</span>
          <input 
            autoFocus
            type="text" 
            placeholder="Jump to nearby hub..." 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="palette-results">
          {filteredRooms.map(room => (
            <div 
              key={room.id} 
              className="palette-item"
              onClick={() => {
                onSelectRoom(room.id);
                setIsOpen(false);
              }}
            >
              <span className="item-name">{room.name}</span>
              <span className="item-hint">Jump</span>
            </div>
          ))}
          {filteredRooms.length === 0 && (
            <div className="palette-no-results">No hubs matching "{query}"</div>
          )}
        </div>
        <div className="palette-footer">
          <span>ESC to close</span>
          <span>ENTER to select</span>
        </div>
      </div>
    </div>
  );
};
