import React from 'react';
import { useRadarIdentity } from '../../core/app/RadarIdentityContext';
import { RadarRoomChat } from './components/RadarRoomChat';
import { RadarCommandPalette } from './components/RadarCommandPalette';
import './RadarEnvironment.css';

interface RadarEnvironmentProps {
  activeRoomId: string | null;
  onSelectRoom: (id: string) => void;
}

const ADJECTIVES = ['Silent', 'Neon', 'Cyber', 'Ghost', 'Void', 'Electric', 'Nova', 'Shadow'];
const NOUNS = ['Runner', 'Drifter', 'Phantom', 'Signal', 'Pulse', 'Node', 'Vortex', 'Echo'];

export const RadarEnvironment: React.FC<RadarEnvironmentProps> = ({ activeRoomId, onSelectRoom }) => {
  const { anonymousAlias, setIdentity } = useRadarIdentity();

  const generateBurnerProfile = () => {
    const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
    const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
    const num = Math.floor(1000 + Math.random() * 9000);
    const alias = `${adj}${noun}_${num}`;
    const avatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${alias}`;
    
    setIdentity({
      anonymousAlias: alias,
      avatarUrl: avatar,
      walletAddress: `0x${Math.random().toString(16).slice(2, 12)}...`,
    });
  };

  if (!anonymousAlias) {
    return (
      <div className="radar-onboarding">
        <div className="onboarding-card">
          <div className="radar-logo-neon">RADAR</div>
          <h1>Initialize Anonymous Node</h1>
          <p>You are entering a proximity-based geofenced zone. No real identity data will be transmitted.</p>
          <button className="burner-btn" onClick={generateBurnerProfile}>
            Generate Burner Profile
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="radar-main-fill">
      <RadarCommandPalette onSelectRoom={onSelectRoom} />
      {activeRoomId ? (
        <RadarRoomChat roomId={activeRoomId} />
      ) : (
        <div className="radar-empty-state">
          <div className="pulse-circle"></div>
          <h2>Scanning for nearby hubs...</h2>
          <p>Select a geofenced room to join the local signal.</p>
        </div>
      )}
    </div>
  );
};
