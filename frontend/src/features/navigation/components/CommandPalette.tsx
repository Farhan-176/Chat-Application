import { useEffect, useState, useRef } from 'react';
import './CommandPalette.css';

interface CommandPaletteProps {
  rooms: { id: string; name: string }[];
  onSelectRoom: (roomId: string) => void;
}

export const CommandPalette = ({ rooms, onSelectRoom }: CommandPaletteProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // 1. The Global Shortcut Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((open) => !open);
        setSearch('');
      }
      if (e.key === 'Escape') setIsOpen(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 2. Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const filteredRooms = rooms.filter((room) =>
    room.name.toLowerCase().includes(search.toLowerCase())
  );

  // 3. Keyboard Navigation within the Palette
  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % filteredRooms.length);
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredRooms.length) % filteredRooms.length);
    }
    if (e.key === 'Enter' && filteredRooms[selectedIndex]) {
      e.preventDefault();
      onSelectRoom(filteredRooms[selectedIndex].id);
      setIsOpen(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="palette-overlay" onClick={() => setIsOpen(false)}>
      <div className="palette-container" onClick={(e) => e.stopPropagation()}>
        <div className="palette-header">
          <input
            ref={inputRef}
            type="text"
            className="palette-input"
            placeholder="Jump to a room..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleInputKeyDown}
          />
          <div className="palette-badge">ESC</div>
        </div>
        
        <div className="palette-results">
          {filteredRooms.length === 0 ? (
            <div className="palette-empty">No rooms found.</div>
          ) : (
            filteredRooms.map((room, index) => (
              <div
                key={room.id}
                className={`palette-item ${index === selectedIndex ? 'selected' : ''}`}
                onMouseEnter={() => setSelectedIndex(index)}
                onClick={() => {
                  onSelectRoom(room.id);
                  setIsOpen(false);
                }}
              >
                <span className="palette-hash">#</span>
                {room.name}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
