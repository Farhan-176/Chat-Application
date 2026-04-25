import React, { useState, useEffect } from 'react';
import { Clock, AlertCircle } from 'lucide-react';
import { getTimeUntilExpiry, isRoomCritical } from '../utils/ephemeralUtils';
import './RoomExpiryBanner.css';

interface RoomExpiryBannerProps {
  expiresAt: Date | string | null | undefined;
}

/**
 * Banner displayed at top of ChatRoom when room is ephemeral
 * Shows countdown and warning when < 5 minutes remaining
 */
export const RoomExpiryBanner: React.FC<RoomExpiryBannerProps> = ({
  expiresAt
}) => {
  const [timeRemaining, setTimeRemaining] = useState<string>(getTimeUntilExpiry(expiresAt));
  const [isCritical, setIsCritical] = useState(false);

  // Update countdown every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = getTimeUntilExpiry(expiresAt);
      setTimeRemaining(remaining);
      setIsCritical(isRoomCritical(expiresAt));
    }, 5000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  // Set initial critical state
  useEffect(() => {
    setIsCritical(isRoomCritical(expiresAt));
  }, [expiresAt]);

  if (!expiresAt) return null;

  return (
    <div className={`room-expiry-banner ${isCritical ? 'critical' : ''}`}>
      <div className="expiry-content">
        {isCritical && (
          <AlertCircle size={18} className="expiry-icon warning" />
        )}
        {!isCritical && (
          <Clock size={18} className="expiry-icon" />
        )}
        
        <div className="expiry-text">
          <span className="expiry-label">
            {isCritical ? '⚠️ Room expires soon' : '⏱️ Ephemeral room'}
          </span>
          <span className="expiry-countdown">
            {timeRemaining} remaining
          </span>
        </div>
      </div>

      <div className="expiry-info">
        All messages will be deleted when this room expires.
      </div>
    </div>
  );
};

export default RoomExpiryBanner;
