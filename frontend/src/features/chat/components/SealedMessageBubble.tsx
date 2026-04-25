import React, { useState, useEffect } from 'react';
import { Lock } from 'lucide-react';
import { getTimeRemaining, formatUnsealTime } from '../utils/sealUtils';
import './SealedMessageBubble.css';

interface SealedMessageBubbleProps {
  text: string;
  senderName: string;
  sealedUntil: Date | string;
  isOwn: boolean;
}

/**
 * Displays a sealed message with blur effect and countdown timer
 * When countdown reaches zero, transitions to unsealing state
 */
export const SealedMessageBubble: React.FC<SealedMessageBubbleProps> = ({
  text,
  senderName,
  sealedUntil,
  isOwn,
}) => {
  const [timeRemaining, setTimeRemaining] = useState<string>(getTimeRemaining(sealedUntil));
  const [isUnsealing, setIsUnsealing] = useState(false);

  // Update countdown every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = getTimeRemaining(sealedUntil);
      
      if (remaining === 'Unsealing...') {
        setIsUnsealing(true);
        // Message will be re-rendered by parent component when sealedUntil check fails
      }
      
      setTimeRemaining(remaining);
    }, 10000); // Update every 10 seconds for performance

    return () => clearInterval(interval);
  }, [sealedUntil]);

  const unsealDate = formatUnsealTime(sealedUntil);

  return (
    <div className={`sealed-message-container ${isOwn ? 'own' : 'other'}`}>
      <div className="sealed-message-bubble">
        {/* Blurred content */}
        <div className="sealed-message-content">
          <div className="sealed-blur">
            <p className="sealed-text-preview">{text.substring(0, 50)}...</p>
          </div>
          
          {/* Lock icon and seal info */}
          <div className="seal-info">
            <Lock size={20} className="lock-icon" />
            <div className="seal-text">
              <p className="seal-header">Message sealed</p>
              <p className="seal-date">Until {unsealDate}</p>
              <p className="seal-countdown">
                <span className="countdown-timer">{timeRemaining}</span> remaining
              </p>
            </div>
          </div>
        </div>
        
        {/* Optional: Show sender name for sealed messages from others */}
        {!isOwn && (
          <span className="message-sender">{senderName}</span>
        )}
      </div>
      
      {/* Unsealing animation state */}
      {isUnsealing && (
        <div className="unsealing-animation">
          <div className="unsealing-particles"></div>
        </div>
      )}
    </div>
  );
};

export default SealedMessageBubble;
