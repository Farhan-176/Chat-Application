import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';

export interface RadarRoom {
  id: string;
  name: string;
  type: 'public' | 'geofenced';
  participantCount: number;
  lastActivity?: any;
  photoURL?: string;
  distance?: string;
}

export const useRadarRooms = () => {
  const [rooms, setRooms] = useState<RadarRoom[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen for public or geofenced rooms
    const q = query(
      collection(db, 'rooms'),
      where('type', 'in', ['public', 'geofenced'])
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const roomList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as RadarRoom[];
      
      setRooms(roomList);
      setLoading(false);
    }, (error) => {
      console.error('Firestore Radar Rooms Error:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { rooms, loading };
};
