import React from 'react';

interface VoiceParticipant {
  id: string;
  alias: string;
  avatar: string;
  isSpeaking: boolean;
}

export const RadarVoiceBar: React.FC<{ isConnected: boolean; onDisconnect: () => void }> = ({ isConnected, onDisconnect }) => {
  if (!isConnected) return null;

  const participants: VoiceParticipant[] = [
    { id: '1', alias: 'NeonGhost', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=NeonGhost', isSpeaking: true },
    { id: '2', alias: 'SignalNode', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=SignalNode', isSpeaking: false },
    { id: '3', alias: 'CyberRunner', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=CyberRunner', isSpeaking: false },
  ];

  return (
    <div className="radar-voice-bar">
      <div className="voice-status">
        <span className="live-dot"></span>
        Spatial Audio Active
      </div>
      <div className="voice-participants">
        {participants.map(p => (
          <div key={p.id} className={`voice-user ${p.isSpeaking ? 'speaking' : ''}`}>
            <img src={p.avatar} alt={p.alias} />
            <span className="voice-alias">{p.alias}</span>
          </div>
        ))}
      </div>
      <button className="voice-exit-btn" onClick={onDisconnect}>Leave Voice</button>
    </div>
  );
};
