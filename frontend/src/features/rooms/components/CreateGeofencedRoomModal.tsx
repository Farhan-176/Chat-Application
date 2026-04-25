import React, { useState } from 'react';
import { MapPin, AlertCircle, Loader2 } from 'lucide-react';
import { getCurrentLocation, GeoPoint, RADIUS_OPTIONS } from '../utils/geofenceUtils';
import './CreateGeofencedRoomModal.css';

interface CreateGeofencedRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateRoom: (roomData: {
    name: string;
    description: string;
    location: GeoPoint;
    radius: number;
    maxMembers: number;
  }) => Promise<void>;
}

/**
 * Modal for creating geofenced rooms
 */
export const CreateGeofencedRoomModal: React.FC<CreateGeofencedRoomModalProps> = ({
  isOpen,
  onClose,
  onCreateRoom
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState<GeoPoint | null>(null);
  const [radius, setRadius] = useState(1000);
  const [maxMembers, setMaxMembers] = useState(50);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [success, setSuccess] = useState('');

  const handleGetLocation = async () => {
    setIsLoadingLocation(true);
    setErrors([]);

    try {
      const loc = await getCurrentLocation();
      setLocation(loc);
    } catch (err) {
      setErrors([err instanceof Error ? err.message : 'Failed to get location']);
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);
    setSuccess('');

    // Validate
    if (!name.trim()) {
      setErrors(['Room name is required']);
      return;
    }
    if (!description.trim()) {
      setErrors(['Room description is required']);
      return;
    }
    if (!location) {
      setErrors(['Location is required. Please enable location access.']);
      return;
    }
    if (maxMembers < 1) {
      setErrors(['Member limit must be at least 1']);
      return;
    }

    setIsSubmitting(true);
    try {
      await onCreateRoom({
        name: name.trim(),
        description: description.trim(),
        location,
        radius,
        maxMembers
      });

      setSuccess('✅ Geofenced room created!');
      setTimeout(() => {
        setName('');
        setDescription('');
        setLocation(null);
        setRadius(1000);
        setMaxMembers(50);
        setSuccess('');
        onClose();
      }, 2000);
    } catch (err) {
      setErrors([err instanceof Error ? err.message : 'Failed to create room']);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="geofence-overlay">
      <div className="geofence-modal">
        <div className="geofence-header">
          <h2>
            <MapPin size={20} />
            Create Geofenced Room
          </h2>
          <button className="geofence-close" onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="geofence-form">
          {/* Room Name */}
          <div className="form-group">
            <label>Room Name</label>
            <input
              type="text"
              placeholder="e.g., Coffee Shop Chat"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50}
              disabled={isSubmitting}
              className="form-input"
            />
            <span className="char-count">{name.length}/50</span>
          </div>

          {/* Description */}
          <div className="form-group">
            <label>Description</label>
            <textarea
              placeholder="What's this room about?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={200}
              disabled={isSubmitting}
              className="form-textarea"
              rows={3}
            />
            <span className="char-count">{description.length}/200</span>
          </div>

          {/* Location */}
          <div className="form-group">
            <label>Location</label>
            {location ? (
              <div className="location-display">
                <span className="location-badge">
                  📍 {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                </span>
                <button
                  type="button"
                  className="location-change-btn"
                  onClick={handleGetLocation}
                  disabled={isLoadingLocation || isSubmitting}
                >
                  {isLoadingLocation ? '⏳ Getting location...' : 'Update location'}
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="btn-get-location"
                onClick={handleGetLocation}
                disabled={isLoadingLocation || isSubmitting}
              >
                {isLoadingLocation ? (
                  <>
                    <Loader2 className="spinner" size={16} />
                    Getting location...
                  </>
                ) : (
                  <>
                    <MapPin size={16} />
                    Get My Location
                  </>
                )}
              </button>
            )}
          </div>

          {/* Radius */}
          <div className="form-group">
            <label>Visibility Radius</label>
            <select
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              disabled={isSubmitting}
              className="form-select"
            >
              {RADIUS_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="help-text">Room is visible to people within this distance</p>
          </div>

          {/* Max Members */}
          <div className="form-group">
            <label>Maximum Members</label>
            <input
              type="number"
              value={maxMembers}
              onChange={(e) => setMaxMembers(Number(e.target.value))}
              min="1"
              max="1000"
              disabled={isSubmitting}
              className="form-input"
            />
            <p className="help-text">Max people who can join this room</p>
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
          {success && (
            <div className="form-success">
              {success}
            </div>
          )}

          {/* Summary */}
          {location && (
            <div className="room-summary">
              <div className="summary-row">
                <span>Radius:</span>
                <strong>{(radius / 1000).toFixed(1)} km</strong>
              </div>
              <div className="summary-row">
                <span>Max Members:</span>
                <strong>{maxMembers}</strong>
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="form-buttons">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !location}
              className="btn btn-primary"
            >
              {isSubmitting ? '⏳ Creating...' : '✅ Create Room'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateGeofencedRoomModal;
