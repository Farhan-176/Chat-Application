/**
 * Geofenced Rooms Utilities
 * Handles location-based room visibility and proximity
 */

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface GeofencedRoom {
  id: string;
  name: string;
  description: string;
  location: GeoPoint;
  radius: number; // Meters (e.g., 500m, 1000m)
  creatorId: string;
  members: string[];
  maxMembers: number;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface NearbyRoom {
  room: GeofencedRoom;
  distance: number; // Meters
  bearing?: number; // Degrees (0-360) from user
}

/**
 * Calculate distance between two points using Haversine formula
 */
export function calculateDistance(from: GeoPoint, to: GeoPoint): number {
  const R = 6371000; // Earth's radius in meters
  const φ1 = (from.latitude * Math.PI) / 180;
  const φ2 = (to.latitude * Math.PI) / 180;
  const Δφ = ((to.latitude - from.latitude) * Math.PI) / 180;
  const Δλ = ((to.longitude - from.longitude) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

/**
 * Calculate bearing (direction) from one point to another
 */
export function calculateBearing(from: GeoPoint, to: GeoPoint): number {
  const φ1 = (from.latitude * Math.PI) / 180;
  const φ2 = (to.latitude * Math.PI) / 180;
  const Δλ = ((to.longitude - from.longitude) * Math.PI) / 180;

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) -
    Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const θ = Math.atan2(y, x);

  return ((θ * 180) / Math.PI + 360) % 360;
}

/**
 * Get bearing compass direction (N, NE, E, SE, S, SW, W, NW)
 */
export function getBearingDirection(bearing: number): string {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(bearing / 22.5) % 16;
  return directions[index];
}

/**
 * Check if user is within room's geofence
 */
export function isUserInGeofence(userLocation: GeoPoint, room: GeofencedRoom): boolean {
  const distance = calculateDistance(userLocation, room.location);
  return distance <= room.radius;
}

/**
 * Filter rooms by distance from user location
 */
export function filterRoomsByDistance(
  userLocation: GeoPoint,
  rooms: GeofencedRoom[],
  maxDistance: number
): NearbyRoom[] {
  return rooms
    .map(room => ({
      room,
      distance: calculateDistance(userLocation, room.location),
      bearing: calculateBearing(userLocation, room.location)
    }))
    .filter(nearby => nearby.distance <= maxDistance)
    .sort((a, b) => a.distance - b.distance);
}

/**
 * Format distance for display
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
}

/**
 * Validate geolocation coordinates
 */
export function isValidCoordinates(lat: number, lon: number): boolean {
  return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
}

/**
 * Format coordinates for display
 */
export function formatCoordinates(point: GeoPoint): string {
  return `${point.latitude.toFixed(4)}, ${point.longitude.toFixed(4)}`;
}

/**
 * Get geolocation using browser API
 */
export function getCurrentLocation(): Promise<GeoPoint> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      position => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
      },
      error => {
        reject(error);
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000 // Cache for 5 minutes
      }
    );
  });
}

/**
 * Watch user location for real-time updates
 */
export function watchLocation(
  onLocationChange: (location: GeoPoint) => void,
  onError?: (error: GeolocationPositionError) => void
): number {
  if (!navigator.geolocation) {
    throw new Error('Geolocation not supported');
  }

  return navigator.geolocation.watchPosition(
    position => {
      onLocationChange({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      });
    },
    onError,
    {
      enableHighAccuracy: false,
      timeout: 10000,
      maximumAge: 0
    }
  );
}

/**
 * Stop watching location
 */
export function stopWatchingLocation(watchId: number): void {
  navigator.geolocation.clearWatch(watchId);
}

/**
 * Check if location has changed significantly (> threshold meters)
 */
export function hasLocationChanged(
  oldLocation: GeoPoint,
  newLocation: GeoPoint,
  threshold: number = 100
): boolean {
  const distance = calculateDistance(oldLocation, newLocation);
  return distance > threshold;
}

/**
 * Radius suggestions for geofenced rooms
 */
export const RADIUS_OPTIONS = [
  { value: 100, label: '100 meters' },
  { value: 500, label: '500 meters (small cafe)' },
  { value: 1000, label: '1 km (city block)' },
  { value: 5000, label: '5 km (neighborhood)' },
  { value: 10000, label: '10 km (small town)' },
  { value: 50000, label: '50 km (large city)' }
];

/**
 * Search radius for nearby rooms
 */
export const SEARCH_RADIUS = {
  CLOSE: 1000, // 1 km
  NEAR: 5000, // 5 km
  FAR: 25000 // 25 km
};
