import React, { useState, useEffect } from 'react';
import { MapPin, Compass, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import {
  getCurrentLocation,
  GeoPoint,
  GeofencedRoom,
  filterRoomsByDistance,
  formatDistance,
  SEARCH_RADIUS,
  getBearingDirection
} from '../utils/geofenceUtils';
import './NearbyRooms.css';

interface NearbyRoomsProps {
  rooms: GeofencedRoom[];
  onRoomSelect: (roomId: string) => void;
  maxDistance?: number;
}

/**
 * Show nearby geofenced rooms based on user location
 */
export const NearbyRooms: React.FC<NearbyRoomsProps> = ({
  rooms,
  onRoomSelect,
  maxDistance = SEARCH_RADIUS.NEAR
}) => {
  const [userLocation, setUserLocation] = useState<GeoPoint | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nearbyRooms, setNearbyRooms] = useState<any[]>([]);
  const [selectedDistance, setSelectedDistance] = useState(maxDistance);

  // Get initial location
  useEffect(() => {
    requestUserLocation();
  }, []);

  // Filter rooms when location changes
  useEffect(() => {
    if (userLocation) {
      const nearby = filterRoomsByDistance(userLocation, rooms, selectedDistance);
      setNearbyRooms(nearby);
    }
  }, [userLocation, rooms, selectedDistance]);

  const requestUserLocation = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const location = await getCurrentLocation();
      setUserLocation(location);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to get your location. Please enable location permissions.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusClass = (distance: number) => {
    if (distance < 500) return 'very-close';
    if (distance < 2000) return 'close';
    if (distance < 5000) return 'medium';
    return 'far';
  };

  const getStatusLabel = (distance: number) => {
    if (distance < 500) return '🔴 Very Close';
    if (distance < 2000) return '🟠 Close By';
    if (distance < 5000) return '🟡 Nearby';
    return '⚪ Far Away';
  };

  return (
    <div className="nearby-rooms">
      <div className="nearby-header">
        <h2>
          <MapPin size={20} />
          Nearby Rooms
        </h2>
        <button
          className="refresh-btn"
          onClick={requestUserLocation}
          disabled={isLoading}
          title="Refresh location"
        >
          {isLoading ? <Loader2 className="spinner" size={16} /> : <RefreshCw size={16} />}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="nearby-error">
          <AlertCircle size={16} />
          <div>
            <strong>{error}</strong>
            <button onClick={requestUserLocation} className="retry-btn">
              Try again
            </button>
          </div>
        </div>
      )}

      {/* Location Status */}
      {userLocation && (
        <div className="location-status">
          <span className="location-badge">
            📍 Location: {userLocation.latitude.toFixed(4)}, {userLocation.longitude.toFixed(4)}
          </span>
        </div>
      )}

      {/* Distance Filter */}
      {userLocation && (
        <div className="distance-filter">
          <label>Show rooms within:</label>
          <div className="filter-buttons">
            <button
              className={`filter-btn ${selectedDistance === SEARCH_RADIUS.CLOSE ? 'active' : ''}`}
              onClick={() => setSelectedDistance(SEARCH_RADIUS.CLOSE)}
            >
              1 km
            </button>
            <button
              className={`filter-btn ${selectedDistance === SEARCH_RADIUS.NEAR ? 'active' : ''}`}
              onClick={() => setSelectedDistance(SEARCH_RADIUS.NEAR)}
            >
              5 km
            </button>
            <button
              className={`filter-btn ${selectedDistance === SEARCH_RADIUS.FAR ? 'active' : ''}`}
              onClick={() => setSelectedDistance(SEARCH_RADIUS.FAR)}
            >
              25 km
            </button>
          </div>
        </div>
      )}

      {/* Nearby Rooms List */}
      <div className="nearby-list">
        {isLoading && !userLocation ? (
          <div className="loading-state">
            <Loader2 className="spinner-large" size={32} />
            <p>Getting your location...</p>
          </div>
        ) : !userLocation ? (
          <div className="empty-state">
            <MapPin size={40} />
            <p>Enable location access to see nearby rooms</p>
            <button className="btn-primary" onClick={requestUserLocation}>
              Enable Location
            </button>
          </div>
        ) : nearbyRooms.length === 0 ? (
          <div className="empty-state">
            <MapPin size={40} />
            <p>No rooms found within {formatDistance(selectedDistance)}</p>
          </div>
        ) : (
          nearbyRooms.map(({ room, distance, bearing }) => (
            <div
              key={room.id}
              className={`nearby-room-card ${getStatusClass(distance)}`}
            >
              {/* Room Header */}
              <div className="room-card-header">
                <div>
                  <h3 className="room-name">{room.name}</h3>
                  <p className="room-description">{room.description}</p>
                </div>
                <div className={`distance-badge ${getStatusClass(distance)}`}>
                  {formatDistance(distance)}
                </div>
              </div>

              {/* Distance Info */}
              <div className="distance-info">
                <div className="distance-row">
                  <span className="label">{getStatusLabel(distance)}</span>
                  <span className="distance-value">{formatDistance(distance)} away</span>
                </div>
                {bearing !== undefined && (
                  <div className="distance-row">
                    <span className="label">
                      <Compass size={14} />
                      Direction
                    </span>
                    <span className="direction-value">
                      {getBearingDirection(bearing)} ({bearing.toFixed(0)}°)
                    </span>
                  </div>
                )}
              </div>

              {/* Room Stats */}
              <div className="room-stats">
                <span className="stat">
                  👥 {room.members.length}/{room.maxMembers} members
                </span>
                <span className="stat">
                  📍 Radius: {(room.radius / 1000).toFixed(1)}km
                </span>
              </div>

              {/* Action Button */}
              <button
                className="btn-join"
                onClick={() => onRoomSelect(room.id)}
              >
                Enter Room →
              </button>
            </div>
          ))
        )}
      </div>

      {/* Info Footer */}
      {userLocation && nearbyRooms.length > 0 && (
        <div className="nearby-info">
          <p>💡 Rooms shown are within your selected radius</p>
        </div>
      )}
    </div>
  );
};

export default NearbyRooms;
