import React, { useState } from 'react';
import { X, AlertCircle, DollarSign, Users } from 'lucide-react';
import { validateChannelInput, PRICE_TIERS, MEMBER_LIMITS } from '../utils/channelUtils';
import './CreateChannelModal.css';

interface CreateChannelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateChannel: (channelData: {
    name: string;
    description: string;
    price: number;
    memberLimit: number;
  }) => Promise<void>;
}

/**
 * Modal for creating new paid channels
 */
export const CreateChannelModal: React.FC<CreateChannelModalProps> = ({
  isOpen,
  onClose,
  onCreateChannel
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState(999); // Default $9.99
  const [priceCustom, setPriceCustom] = useState(false);
  const [memberLimit, setMemberLimit] = useState(100);
  const [memberCustom, setMemberCustom] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);
    setSuccessMessage('');

    // Validate
    const validation = validateChannelInput({ name, description, price, memberLimit });
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    setIsLoading(true);
    try {
      await onCreateChannel({
        name: name.trim(),
        description: description.trim(),
        price,
        memberLimit
      });
      setSuccessMessage('✅ Channel created successfully!');
      
      // Reset form
      setTimeout(() => {
        setName('');
        setDescription('');
        setPrice(999);
        setPriceCustom(false);
        setMemberLimit(100);
        setMemberCustom(false);
        setSuccessMessage('');
        onClose();
      }, 2000);
    } catch (err) {
      setErrors([err instanceof Error ? err.message : 'Failed to create channel']);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const displayPrice = (price / 100).toFixed(2);

  return (
    <div className="create-channel-overlay">
      <div className="create-channel-modal">
        <div className="create-channel-header">
          <h2>Create Paid Channel</h2>
          <button
            className="create-channel-close"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="create-channel-form">
          {/* Channel Name */}
          <div className="form-group">
            <label htmlFor="channel-name">Channel Name</label>
            <input
              id="channel-name"
              type="text"
              placeholder="My Premium Channel"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50}
              disabled={isLoading}
              className="form-input"
            />
            <span className="char-count">{name.length}/50</span>
          </div>

          {/* Description */}
          <div className="form-group">
            <label htmlFor="channel-desc">Description</label>
            <textarea
              id="channel-desc"
              placeholder="What's this channel about? What will members get access to?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              disabled={isLoading}
              className="form-textarea"
              rows={4}
            />
            <span className="char-count">{description.length}/500</span>
          </div>

          {/* Price */}
          <div className="form-group">
            <label htmlFor="channel-price">Monthly Price</label>
            <div className="price-input-wrapper">
              <DollarSign size={18} className="price-icon" />
              {!priceCustom ? (
                <>
                  <select
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    disabled={isLoading}
                    className="form-select"
                  >
                    {PRICE_TIERS.map(tier => (
                      <option key={tier.amount} value={tier.amount}>
                        {tier.label}
                      </option>
                    ))}
                    <option value={0}>Custom price...</option>
                  </select>
                </>
              ) : (
                <input
                  type="number"
                  placeholder="0.99"
                  value={displayPrice}
                  onChange={(e) => setPrice(Math.round(parseFloat(e.target.value) * 100))}
                  step="0.01"
                  min="0.99"
                  max="999.99"
                  disabled={isLoading}
                  className="form-input"
                />
              )}
            </div>
            <button
              type="button"
              className="toggle-custom-btn"
              onClick={() => setPriceCustom(!priceCustom)}
              disabled={isLoading}
            >
              {priceCustom ? 'Use preset' : 'Custom price'}
            </button>
          </div>

          {/* Member Limit */}
          <div className="form-group">
            <label htmlFor="channel-limit">Member Limit</label>
            <div className="member-input-wrapper">
              <Users size={18} className="member-icon" />
              {!memberCustom ? (
                <>
                  <select
                    value={memberLimit}
                    onChange={(e) => setMemberLimit(Number(e.target.value))}
                    disabled={isLoading}
                    className="form-select"
                  >
                    {MEMBER_LIMITS.map(limit => (
                      <option key={limit.value} value={limit.value}>
                        {limit.label}
                      </option>
                    ))}
                    <option value={0}>Custom limit...</option>
                  </select>
                </>
              ) : (
                <input
                  type="number"
                  placeholder="100"
                  value={memberLimit}
                  onChange={(e) => setMemberLimit(Number(e.target.value))}
                  step="1"
                  min="1"
                  max="10000"
                  disabled={isLoading}
                  className="form-input"
                />
              )}
            </div>
            <button
              type="button"
              className="toggle-custom-btn"
              onClick={() => setMemberCustom(!memberCustom)}
              disabled={isLoading}
            >
              {memberCustom ? 'Use preset' : 'Custom limit'}
            </button>
          </div>

          {/* Errors */}
          {errors.length > 0 && (
            <div className="form-errors">
              {errors.map((error, i) => (
                <div key={i} className="error-item">
                  <AlertCircle size={16} />
                  {error}
                </div>
              ))}
            </div>
          )}

          {/* Success */}
          {successMessage && (
            <div className="form-success">
              {successMessage}
            </div>
          )}

          {/* Summary */}
          <div className="channel-summary">
            <div className="summary-row">
              <span>Monthly Price:</span>
              <strong>${displayPrice}</strong>
            </div>
            <div className="summary-row">
              <span>Member Limit:</span>
              <strong>{memberLimit} subscribers</strong>
            </div>
          </div>

          {/* Buttons */}
          <div className="form-buttons">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary"
            >
              {isLoading ? '⏳ Creating...' : '✅ Create Channel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateChannelModal;
