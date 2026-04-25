import React from 'react';
import { Lock, Users, DollarSign, CheckCircle } from 'lucide-react';
import { Channel, formatPrice } from '../utils/channelUtils';
import './ChannelCard.css';

interface ChannelCardProps {
  channel: Channel;
  userId?: string;
  isMember?: boolean;
  onSubscribe?: () => void;
  onCancel?: () => void;
  isLoading?: boolean;
}

/**
 * Channel card component for displaying channel info
 */
export const ChannelCard: React.FC<ChannelCardProps> = ({
  channel,
  userId,
  isMember,
  onSubscribe,
  onCancel,
  isLoading = false
}) => {
  const isCreator = userId === channel.creatorId;
  const isFull = channel.members.length >= channel.memberLimit;

  return (
    <div className="channel-card">
      {/* Header with creator badge */}
      <div className="channel-card-header">
        <div>
          <h3 className="channel-name">{channel.name}</h3>
          <p className="channel-creator">By {channel.creatorName}</p>
        </div>
        {isCreator && (
          <div className="creator-badge">
            <Lock size={12} />
            Creator
          </div>
        )}
        {isMember && !isCreator && (
          <div className="member-badge">
            <CheckCircle size={12} />
            Subscribed
          </div>
        )}
      </div>

      {/* Description */}
      <p className="channel-description">{channel.description}</p>

      {/* Stats */}
      <div className="channel-stats">
        <div className="stat">
          <DollarSign size={14} />
          <span>{formatPrice(channel.price)}/month</span>
        </div>
        <div className="stat">
          <Users size={14} />
          <span>{channel.members.length}/{channel.memberLimit}</span>
        </div>
        {isFull && (
          <div className="stat full-badge">
            <span>Full</span>
          </div>
        )}
      </div>

      {/* Action Button */}
      <div className="channel-card-footer">
        {isCreator ? (
          <div className="creator-controls">
            <button className="btn-icon" title="Manage channel">
              ⚙️ Manage
            </button>
          </div>
        ) : isMember ? (
          <button
            className="btn-secondary"
            onClick={onCancel}
            disabled={isLoading}
          >
            {isLoading ? '⏳ Cancelling...' : 'Cancel Subscription'}
          </button>
        ) : (
          <button
            className={`btn-primary ${isFull ? 'disabled' : ''}`}
            onClick={onSubscribe}
            disabled={isFull || isLoading}
          >
            {isFull ? '❌ Channel Full' : isLoading ? '⏳ Subscribing...' : '✅ Subscribe'}
          </button>
        )}
      </div>

      {/* Full status indicator */}
      {isFull && (
        <div className="full-indicator">
          This channel is at capacity. Check back later for availability.
        </div>
      )}
    </div>
  );
};

export default ChannelCard;
