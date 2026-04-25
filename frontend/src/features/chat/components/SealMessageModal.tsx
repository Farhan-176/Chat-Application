import React, { useState } from 'react';
import { Calendar, Clock, X } from 'lucide-react';
import { SEAL_DURATIONS, calculateSealDate, formatUnsealTime } from '../utils/sealUtils';
import './SealMessageModal.css';

interface SealMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSeal: (sealedUntil: Date) => void;
}

/**
 * Modal for selecting when to seal a message
 * Shows predefined durations (1 day, 1 week, 1 month) and custom date/time picker
 */
export const SealMessageModal: React.FC<SealMessageModalProps> = ({
  isOpen,
  onClose,
  onSeal
}) => {
  const [selectedDuration, setSelectedDuration] = useState<number | 'custom' | null>(null);
  const [customDate, setCustomDate] = useState<string>('');
  const [customTime, setCustomTime] = useState<string>('');

  const handleSelectDuration = (hours: number | 'custom') => {
    if (hours !== 'custom') {
      const sealDate = calculateSealDate(hours);
      onSeal(sealDate);
      setSelectedDuration(null);
      onClose();
    } else {
      setSelectedDuration('custom');
    }
  };

  const handleCustomSeal = () => {
    if (!customDate || !customTime) {
      alert('Please select both date and time');
      return;
    }

    const dateTime = new Date(`${customDate}T${customTime}`);
    if (dateTime <= new Date()) {
      alert('Please select a future date and time');
      return;
    }

    onSeal(dateTime);
    setCustomDate('');
    setCustomTime('');
    setSelectedDuration(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="seal-modal-overlay" onClick={onClose}>
      <div className="seal-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="seal-modal-header">
          <h2>🔒 Seal Message</h2>
          <button className="seal-modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="seal-modal-content">
          {selectedDuration === 'custom' ? (
            // Custom date/time picker
            <div className="custom-seal-picker">
              <p className="custom-label">Choose when to unseal this message</p>
              
              <div className="date-time-inputs">
                <div className="input-group">
                  <label htmlFor="seal-date">Date</label>
                  <div className="input-wrapper">
                    <Calendar size={18} />
                    <input
                      id="seal-date"
                      type="date"
                      value={customDate}
                      onChange={(e) => setCustomDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                </div>

                <div className="input-group">
                  <label htmlFor="seal-time">Time</label>
                  <div className="input-wrapper">
                    <Clock size={18} />
                    <input
                      id="seal-time"
                      type="time"
                      value={customTime}
                      onChange={(e) => setCustomTime(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {customDate && customTime && (
                <div className="seal-preview">
                  <p className="preview-label">Message will unseal:</p>
                  <p className="preview-date">
                    {formatUnsealTime(new Date(`${customDate}T${customTime}`))}
                  </p>
                </div>
              )}

              <div className="custom-actions">
                <button
                  className="btn-cancel"
                  onClick={() => {
                    setSelectedDuration(null);
                    setCustomDate('');
                    setCustomTime('');
                  }}
                >
                  Back
                </button>
                <button
                  className="btn-seal-custom"
                  onClick={handleCustomSeal}
                  disabled={!customDate || !customTime}
                >
                  Seal Until {customTime}
                </button>
              </div>
            </div>
          ) : (
            // Predefined duration options
            <div className="seal-durations">
              <p className="durations-label">Quick seal options:</p>
              
              <div className="duration-buttons">
                {SEAL_DURATIONS.map((duration) => {
                  const sealDate = typeof duration.hours === 'number'
                    ? calculateSealDate(duration.hours)
                    : null;

                  return (
                    <button
                      key={duration.label}
                      className="duration-btn"
                      onClick={() => handleSelectDuration(duration.hours)}
                    >
                      <span className="duration-emoji">{duration.emoji}</span>
                      <span className="duration-label">{duration.label}</span>
                      {sealDate && (
                        <span className="duration-time">
                          {formatUnsealTime(sealDate)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="seal-info-text">
                <p>
                  🔒 Your message will be hidden from everyone until the selected date.
                  <br />
                  Only you can see when it will unseal.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="seal-modal-footer">
          <button className="btn-cancel-main" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default SealMessageModal;
