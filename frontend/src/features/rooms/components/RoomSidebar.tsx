import { useEffect, useMemo, useState } from 'react'
import { Hash, LogOut, ChevronLeft, ChevronRight, Plus, Search, Wifi, Mail, Timer } from 'lucide-react'
import { ChatRoom as ChatRoomType, VibeType } from '../../../core/shared/types'
import { createRoom, fetchRooms, fetchNearbyRooms } from '../../../core/shared/api'
import { featureFlags } from '../../../core/shared/config/featureFlags'
import { MapPin, Navigation } from 'lucide-react'
import { trackAnalyticsEvent } from '../../../core/shared/api'
import { VibePicker } from '../../chat/components/VibePicker'
import {
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore'
import { auth, db } from '../../../core/shared/config'
import './RoomSidebar.css'

interface RoomSidebarProps {
  activeRoomId: string
  onSelectRoom: (roomId: string) => void
  userPhotoURL: string | null
  userDisplayName: string | null
  onLogout: () => void
  onOpenProfile: () => void
  onRoomVibeChange?: (vibe: VibeType, expiresAt: Date | null) => void
}


export const RoomSidebar = ({
  activeRoomId,
  onSelectRoom,
  userPhotoURL,
  userDisplayName,
  onLogout,
  onOpenProfile,
  onRoomVibeChange,
}: RoomSidebarProps) => {

  const [rooms, setRooms] = useState<ChatRoomType[]>([])
  const [roomMeta, setRoomMeta] = useState<Record<string, { unreadCount: number; onlineCount: number; lastMessageAt: Date }>>({})
  const [collapsed, setCollapsed] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [roomName, setRoomName] = useState('')
  const [roomDescription, setRoomDescription] = useState('')
  const [visibility, setVisibility] = useState<'public' | 'private'>('public')
  const [selectedVibe, setSelectedVibe] = useState<VibeType>('default')
  const [ephemeralDuration, setEphemeralDuration] = useState<number | null>(null) // hours
  const [formError, setFormError] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [lastReadMap, setLastReadMap] = useState<Record<string, string>>({})
  const [roomMembershipMap, setRoomMembershipMap] = useState<Record<string, boolean>>({})

  const [managedRoom, setManagedRoom] = useState<(ChatRoomType & { visibility?: 'public' | 'private' }) | null>(null)
  const [roomMembers, setRoomMembers] = useState<Array<{ uid: string; displayName: string; email: string; role: string }>>([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [adminError, setAdminError] = useState('')
  const [isInviting, setIsInviting] = useState(false)
  const [isDeletingRoom, setIsDeletingRoom] = useState(false)
  const [isGeofenceEnabled, setIsGeofenceEnabled] = useState(false)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [nearbyRooms, setNearbyRooms] = useState<any[]>([])
  const [isLoadingNearby, setIsLoadingNearby] = useState(false)
  const [discoveryRadius, setDiscoveryRadius] = useState(5) // km

  const currentUserId = auth.currentUser?.uid || ''
  useEffect(() => {
    if (!currentUserId) {
      setLastReadMap({})
      return
    }

    const readsRef = collection(db, 'users', currentUserId, 'roomReads')
    const unsubscribe = onSnapshot(readsRef, (snapshot) => {
      const nextMap: Record<string, string> = {}
      snapshot.docs.forEach((docSnap) => {
        const lastReadAt = docSnap.data().lastReadAt?.toDate?.()
        if (lastReadAt) {
          nextMap[docSnap.id] = lastReadAt.toISOString()
        }
      })
      setLastReadMap(nextMap)
    })

    return () => unsubscribe()
  }, [currentUserId])

  useEffect(() => {
    if (!currentUserId) {
      setRoomMembershipMap({})
      return
    }

    const membershipsQuery = query(collectionGroup(db, 'members'), where('uid', '==', currentUserId))
    const unsubscribe = onSnapshot(membershipsQuery, (snapshot) => {
      const nextMap: Record<string, boolean> = {}
      snapshot.docs.forEach((docSnap) => {
        const roomId = docSnap.ref.parent.parent?.id
        if (roomId) {
          nextMap[roomId] = true
        }
      })
      setRoomMembershipMap(nextMap)
    })

    return () => unsubscribe()
  }, [currentUserId])

  const markRoomAsRead = async (roomId: string) => {
    if (!currentUserId) {
      return
    }

    const readAt = new Date().toISOString()
    const nextMap = {
      ...lastReadMap,
      [roomId]: readAt,
    }
    setLastReadMap(nextMap)

    try {
      await setDoc(
        doc(db, 'users', currentUserId, 'roomReads', roomId),
        {
          roomId,
          lastReadAt: serverTimestamp(),
        },
        { merge: true }
      )
    } catch (error) {
      console.error('Failed to persist read state:', error)
    }
  }

  useEffect(() => {
    const syncCollapsedState = () => {
      setCollapsed(window.innerWidth <= 1024)
    }
    syncCollapsedState()
    window.addEventListener('resize', syncCollapsedState)
    return () => window.removeEventListener('resize', syncCollapsedState)
  }, [])

  const handleFetchNearby = async () => {
    if (!navigator.geolocation || !featureFlags.geofencing) return

    setIsLoadingNearby(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        setUserLocation({ lat: latitude, lng: longitude })
        try {
          const response = await fetchNearbyRooms(latitude, longitude, discoveryRadius)
          setNearbyRooms(response.rooms || [])
        } catch (error) {
          console.error('Nearby fetch failed:', error)
        } finally {
          setIsLoadingNearby(false)
        }
      },
      (err) => {
        console.error('Geolocation failed:', err)
        setIsLoadingNearby(false)
      }
    )
  }

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition((pos) => {
      setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
      setIsGeofenceEnabled(true)
    })
  }

  useEffect(() => {
    const roomsRef = collection(db, 'chatRooms')
    let unsubscribeRooms = () => {}
    let unsubscribeMetaListeners: Array<() => void> = []

    const clearMetaListeners = () => {
      unsubscribeMetaListeners.forEach((unsubscribe) => unsubscribe())
      unsubscribeMetaListeners = []
    }

    const attachRoomMetaListeners = (roomsData: ChatRoomType[]) => {
      clearMetaListeners()

      roomsData.forEach((room) => {
        const presenceRef = collection(db, 'chatRooms', room.id, 'presence')
        const presenceUnsubscribe = onSnapshot(
          presenceRef,
          (presenceSnapshot) => {
            setRoomMeta((prev) => ({
              ...prev,
              [room.id]: {
                unreadCount: prev[room.id]?.unreadCount || 0,
                lastMessageAt: prev[room.id]?.lastMessageAt || room.createdAt,
                onlineCount: presenceSnapshot.size,
              },
            }))
          },
          () => {
            setRoomMeta((prev) => ({
              ...prev,
              [room.id]: {
                unreadCount: prev[room.id]?.unreadCount || 0,
                lastMessageAt: prev[room.id]?.lastMessageAt || room.createdAt,
                onlineCount: 0,
              },
            }))
          }
        )

        const messagesRef = collection(db, 'chatRooms', room.id, 'messages')
        const messagesQuery = query(messagesRef, orderBy('createdAt', 'desc'), limit(120))
        const messagesUnsubscribe = onSnapshot(
          messagesQuery,
          (messagesSnapshot) => {
            const lastReadAt = lastReadMap[room.id] ? new Date(lastReadMap[room.id]) : new Date(0)
            let unread = 0
            let mostRecent = room.createdAt

            messagesSnapshot.docs.forEach((docSnap, index) => {
              const data = docSnap.data()
              const createdAt = data.createdAt?.toDate?.() || room.createdAt

              if (index === 0) {
                mostRecent = createdAt
              }

              if (data.uid !== currentUserId && createdAt > lastReadAt) {
                unread += 1
              }
            })

            setRoomMeta((prev) => ({
              ...prev,
              [room.id]: {
                unreadCount: unread,
                onlineCount: prev[room.id]?.onlineCount || 0,
                lastMessageAt: mostRecent,
              },
            }))
          },
          () => {
            setRoomMeta((prev) => ({
              ...prev,
              [room.id]: {
                unreadCount: prev[room.id]?.unreadCount || 0,
                onlineCount: prev[room.id]?.onlineCount || 0,
                lastMessageAt: prev[room.id]?.lastMessageAt || room.createdAt,
              },
            }))
          }
        )

        unsubscribeMetaListeners.push(presenceUnsubscribe, messagesUnsubscribe)
      })
    }

    const mapRoomSnapshot = (snapshot: any) => {
      const roomsData: ChatRoomType[] = snapshot.docs.map((docSnap: any) => ({
        id: docSnap.id,
        name: docSnap.data().name || docSnap.id,
        description: docSnap.data().description || '',
        createdAt: docSnap.data().createdAt?.toDate?.() || new Date(),
        createdBy: docSnap.data().createdBy,
        createdByName: docSnap.data().createdByName,
        memberCount: docSnap.data().memberCount || 0,
        visibility: docSnap.data().visibility || 'public',
        vibe: docSnap.data().vibe || 'default',
        expiresAt: docSnap.data().expiresAt?.toDate?.() || null,
        workspaceId: docSnap.data().workspaceId || '',
      }))

      setRooms(roomsData)
      attachRoomMetaListeners(roomsData)
    }

    const primaryQuery = query(roomsRef, orderBy('lastMessageAt', 'desc'))
    unsubscribeRooms = onSnapshot(
      primaryQuery,
      mapRoomSnapshot,
      (error) => {
        console.warn('lastMessageAt ordering unavailable, falling back to createdAt:', error)

        unsubscribeRooms()
        const fallbackQuery = query(roomsRef, orderBy('createdAt', 'desc'))
        unsubscribeRooms = onSnapshot(
          fallbackQuery,
          mapRoomSnapshot,
          (fallbackError) => {
            console.error('Error listening to rooms:', fallbackError)
            fetchRooms().then((data) => setRooms(data.rooms || [])).catch(console.error)
          }
        )
      }
    )

    return () => {
      unsubscribeRooms()
      clearMetaListeners()
    }
  }, [currentUserId, lastReadMap])

  const roomsWithMeta = useMemo(() => {
    return rooms
      .map((room) => {
        const meta = roomMeta[room.id]
        return {
          ...room,
          unreadCount: meta?.unreadCount || 0,
          onlineCount: meta?.onlineCount || 0,
          lastMessageAt: meta?.lastMessageAt || room.createdAt,
          visibility: (room as ChatRoomType & { visibility?: 'public' | 'private' }).visibility || 'public',
        }
      })
      .filter((room) => room.visibility !== 'private' || room.createdBy === currentUserId || !!roomMembershipMap[room.id])
      .sort((a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime())
  }, [currentUserId, roomMembershipMap, roomMeta, rooms])

  // Notify parent when active room changes vibe/expiresAt
  useEffect(() => {
    const activeRoom = roomsWithMeta.find((r) => r.id === activeRoomId)
    if (activeRoom && onRoomVibeChange) {
      onRoomVibeChange(
        (activeRoom as any).vibe || 'default',
        (activeRoom as any).expiresAt || null,
      )
    }
  }, [activeRoomId, roomsWithMeta, onRoomVibeChange])


  const filteredRooms = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase()
    if (!normalized) {
      return roomsWithMeta
    }

    return roomsWithMeta.filter((room) => room.name.toLowerCase().includes(normalized))
  }, [roomsWithMeta, searchTerm])

  const handleCreateRoom = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const name = roomName.trim()
    if (name.length < 2) {
      setFormError('Room name must be at least 2 characters.')
      return
    }

    setIsCreating(true)
    setFormError('')

    try {
      const expiresAt = ephemeralDuration
        ? new Date(Date.now() + ephemeralDuration * 3600 * 1000)
        : null

      const created = await createRoom(name, roomDescription.trim(), undefined, {
        visibility,
        vibe: selectedVibe,
        expiresAt: expiresAt ? expiresAt.toISOString() : null,
        location: isGeofenceEnabled ? userLocation : null,
        radius: isGeofenceEnabled ? 1000 : undefined,
      })

      await trackAnalyticsEvent('room_created', {
        visibility,
        vibe: selectedVibe,
        ephemeral: !!ephemeralDuration,
        room_id: created?.id || 'unknown',
      })

      setRoomName('')
      setRoomDescription('')
      setVisibility('public')
      setSelectedVibe('default')
      setEphemeralDuration(null)
      setIsCreateOpen(false)
      if (created?.id) {
        onSelectRoom(created.id)
      }
    } catch (error) {
      console.error('Failed to create room:', error)
      setFormError('Unable to create room. Please try again.')
    } finally {
      setIsCreating(false)
    }
  }

  useEffect(() => {
    if (!managedRoom) {
      setRoomMembers([])
      return
    }

    const membersRef = collection(db, 'chatRooms', managedRoom.id, 'members')
    const unsubscribe = onSnapshot(membersRef, (snapshot) => {
      const members = snapshot.docs.map((docSnap) => ({
        uid: docSnap.id,
        displayName: docSnap.data().displayName || 'Unknown User',
        email: docSnap.data().email || '',
        role: docSnap.data().role || 'member',
      }))
      setRoomMembers(members)
    })

    return () => unsubscribe()
  }, [managedRoom])

  const handleInviteMember = async () => {
    if (!managedRoom || !currentUserId) {
      return
    }

    if (managedRoom.createdBy !== currentUserId) {
      setAdminError('Only the room creator can invite members.')
      return
    }

    const normalizedEmail = inviteEmail.trim().toLowerCase()
    if (!normalizedEmail) {
      setAdminError('Email is required.')
      return
    }

    setIsInviting(true)
    setAdminError('')
    try {
      const usersQuery = query(collection(db, 'users'), where('email', '==', normalizedEmail), limit(1))
      const userSnapshot = await getDocs(usersQuery)
      if (userSnapshot.empty) {
        setAdminError('No user found with that email.')
        setIsInviting(false)
        return
      }

      const invitee = userSnapshot.docs[0]
      await setDoc(
        doc(db, 'chatRooms', managedRoom.id, 'members', invitee.id),
        {
          uid: invitee.id,
          email: invitee.data().email || normalizedEmail,
          displayName: invitee.data().displayName || invitee.data().email || 'User',
          role: 'member',
          invitedBy: currentUserId,
          joinedAt: serverTimestamp(),
        },
        { merge: true }
      )

      setInviteEmail('')
    } catch (error) {
      console.error('Failed to invite member:', error)
      setAdminError('Could not invite member. Please try again.')
    } finally {
      setIsInviting(false)
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    if (!managedRoom || !currentUserId) {
      return
    }

    if (managedRoom.createdBy !== currentUserId) {
      setAdminError('Only the room creator can remove members.')
      return
    }

    if (memberId === currentUserId) {
      setAdminError('The room creator cannot be removed.')
      return
    }

    try {
      await deleteDoc(doc(db, 'chatRooms', managedRoom.id, 'members', memberId))
    } catch (error) {
      console.error('Failed to remove member:', error)
      setAdminError('Could not remove member. Please try again.')
    }
  }

  const handleDeleteRoom = async () => {
    if (!managedRoom || !currentUserId) {
      return
    }

    if (managedRoom.createdBy !== currentUserId) {
      setAdminError('Only the room creator can delete this room.')
      return
    }

    setIsDeletingRoom(true)
    setAdminError('')
    try {
      const subcollections = ['members', 'messages', 'presence', 'typing']
      for (const subcollectionName of subcollections) {
        const subcollectionRef = collection(db, 'chatRooms', managedRoom.id, subcollectionName)
        const snapshot = await getDocs(subcollectionRef)
        await Promise.all(snapshot.docs.map((docSnap) => deleteDoc(docSnap.ref)))
      }

      await deleteDoc(doc(db, 'chatRooms', managedRoom.id))

      if (activeRoomId === managedRoom.id) {
        onSelectRoom('general')
      }

      setManagedRoom(null)
    } catch (error) {
      console.error('Failed to delete room:', error)
      setAdminError('Room deletion failed. Please try again.')
    } finally {
      setIsDeletingRoom(false)
    }
  }

  return (
    <>
      <aside className={`room-sidebar ${collapsed ? 'collapsed' : ''}`}>
        <button
          className="sidebar-toggle"
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        {!collapsed && (
          <>
            <div className="sidebar-header">
              <h2 className="sidebar-title">Channels</h2>
              <button
                type="button"
                className="create-room-btn"
                title="Create room"
                onClick={() => {
                  setFormError('')
                  setIsCreateOpen(true)
                }}
              >
                <Plus size={14} />
                <span>Create room</span>
              </button>
            </div>

            <div className="room-list">
              <div className="room-search">
                <Search size={14} />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search rooms"
                  aria-label="Search rooms"
                />
              </div>

              <div className="sidebar-subtitle-row">
                <span className="sidebar-subtitle">Rooms</span>
                <span className="sidebar-subtitle-meta">{filteredRooms.length}</span>
              </div>
              
              {filteredRooms.map((room) => (
                <button
                  key={room.id}
                  className={`room-item ${room.id === activeRoomId ? 'active' : ''}`}
                  onClick={async () => {
                    await markRoomAsRead(room.id)
                    onSelectRoom(room.id)
                  }}
                >
                  <div className="room-item-icon">
                    {(room as any).vibe && (room as any).vibe !== 'default'
                      ? <span style={{ fontSize: 13 }}>
                          {(room as any).vibe === 'lofi' ? '🌙' : (room as any).vibe === 'hype' ? '⚡' : (room as any).vibe === 'focus' ? '🔥' : (room as any).vibe === 'chill' ? '🌿' : '🌌'}
                        </span>
                      : <Hash size={14} />}
                  </div>
                  <div className="room-item-info">
                    <span className="room-item-name">{room.name}</span>
                    {room.visibility === 'private' && <span className="room-private-badge">Private</span>}
                    {(room as any).expiresAt && (
                      <span className="room-ephemeral-badge"><Timer size={9} /> Ephemeral</span>
                    )}
                    {room.description && (
                      <span className="room-item-desc">{room.description}</span>
                    )}
                  </div>
                  <div className="room-item-meta">
                    <span className="room-online-count" title="Online count">
                      <Wifi size={12} />
                      {room.onlineCount}
                    </span>
                    {room.unreadCount > 0 && (
                      <span className="room-unread-badge" title="Unread messages">
                        <Mail size={10} />
                        {room.unreadCount > 99 ? '99+' : room.unreadCount}
                      </span>
                    )}
                  </div>

                  {room.visibility === 'private' && (room.createdBy === currentUserId || roomMembershipMap[room.id]) && (
                    <button
                      type="button"
                      className="room-admin-btn"
                      onClick={(event) => {
                        event.stopPropagation()
                        setAdminError('')
                        setInviteEmail('')
                        setManagedRoom(room as ChatRoomType & { visibility?: 'public' | 'private' })
                      }}
                    >
                      Manage
                    </button>
                  )}
                </button>
              ))}

              {featureFlags.geofencing && (
                <div className="nearby-discovery">
                  <div className="sidebar-subtitle-row">
                    <span className="sidebar-subtitle">Nearby Discovery</span>
                    <button 
                      type="button" 
                      className="refresh-nearby-btn"
                      onClick={handleFetchNearby}
                      disabled={isLoadingNearby}
                    >
                      <Navigation size={12} className={isLoadingNearby ? 'spinning' : ''} />
                    </button>
                  </div>
                  
                  {nearbyRooms.length === 0 ? (
                    <p className="nearby-empty">
                      {isLoadingNearby ? 'Searching...' : 'Scan for nearby rooms'}
                    </p>
                  ) : (
                    <div className="nearby-list">
                      {nearbyRooms.map((room) => (
                        <button
                          key={room.id}
                          className={`room-item nearby-item ${room.id === activeRoomId ? 'active' : ''}`}
                          onClick={() => {
                            if (roomMembershipMap[room.id] || room.visibility !== 'private') {
                              onSelectRoom(room.id)
                            } else {
                              // Maybe show a request access UI
                              onSelectRoom(room.id)
                            }
                          }}
                        >
                          <div className="room-item-icon">
                            <MapPin size={12} color="var(--vibe-accent)" />
                          </div>
                          <div className="room-item-info">
                            <span className="room-item-name">{room.name}</span>
                            <span className="room-item-dist">
                              {room.distance < 1 ? `${Math.round(room.distance * 1000)}m` : `${room.distance.toFixed(1)}km`} away
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="sidebar-user">
              <button className="sidebar-user-info" type="button" onClick={onOpenProfile}>
                {userPhotoURL ? (
                  <img src={userPhotoURL} alt="" className="sidebar-user-avatar" />
                ) : (
                  <div className="presence-avatar-placeholder" style={{ width: 32, height: 32 }}>
                    {(userDisplayName || 'U')[0]}
                  </div>
                )}
                <div className="sidebar-user-details">
                  <span className="sidebar-user-name">{userDisplayName || 'User'}</span>
                  <span className="pro-badge">Pro Plan</span>
                </div>
              </button>
              <button className="sidebar-logout-btn" onClick={onLogout} title="Logout">
                <LogOut size={16} />
              </button>
            </div>
          </>
        )}
      </aside>

      {isCreateOpen && (
        <div className="create-room-overlay" role="presentation" onClick={() => setIsCreateOpen(false)}>
          <div
            className="create-room-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Create room"
            onClick={(event) => event.stopPropagation()}
          >
            <h3>Create Room</h3>
            <p>Choose a unique room name and set visibility.</p>

            <form onSubmit={handleCreateRoom} className="create-room-form" noValidate>
              <label htmlFor="newRoomName">Room Name</label>
              <input
                id="newRoomName"
                value={roomName}
                onChange={(event) => setRoomName(event.target.value)}
                placeholder="Product updates"
              />

              <label htmlFor="newRoomDescription">Description</label>
              <textarea
                id="newRoomDescription"
                value={roomDescription}
                onChange={(event) => setRoomDescription(event.target.value)}
                placeholder="What is this room for?"
                rows={2}
              />

              <fieldset className="visibility-toggle">
                <legend>Visibility</legend>
                <label>
                  <input
                    type="radio"
                    name="visibility"
                    value="public"
                    checked={visibility === 'public'}
                    onChange={() => setVisibility('public')}
                  />
                  Public
                </label>
                <label>
                  <input
                    type="radio"
                    name="visibility"
                    value="private"
                    checked={visibility === 'private'}
                    onChange={() => setVisibility('private')}
                  />
                  Private
                </label>
              </fieldset>

              <fieldset className="vibe-picker">
                <legend>Room Vibe</legend>
                <VibePicker 
                  selectedVibe={selectedVibe}
                  onVibeSelect={setSelectedVibe}
                  showPreview={true}
                />
              </fieldset>

              <fieldset className="ephemeral-toggle">
                <legend><Timer size={12} /> Self-Destruct (optional)</legend>
                <div className="ephemeral-options">
                  {[null, 1, 6, 24, 48].map((h) => (
                    <button
                      key={h ?? 'never'}
                      type="button"
                      className={`ephemeral-btn${ephemeralDuration === h ? ' selected' : ''}`}
                      onClick={() => setEphemeralDuration(h)}
                    >
                      {h === null ? 'Never' : h === 1 ? '1h' : h === 6 ? '6h' : h === 24 ? '24h' : '48h'}
                    </button>
                  ))}
                </div>
              </fieldset>

              {featureFlags.geofencing && (
                <fieldset className="geofence-toggle">
                  <legend><MapPin size={12} /> Geofencing</legend>
                  <div className="geofence-controls">
                    <button
                      type="button"
                      className={`ephemeral-btn${isGeofenceEnabled ? ' selected' : ''}`}
                      onClick={handleGetCurrentLocation}
                    >
                      {isGeofenceEnabled ? 'Location Tagged ✅' : 'Tag My Location'}
                    </button>
                    {isGeofenceEnabled && userLocation && (
                      <span className="location-preview">
                        {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
                      </span>
                    )}
                  </div>
                </fieldset>
              )}

              {formError && <p className="create-room-error">{formError}</p>}

              <div className="create-room-actions">
                <button type="button" className="btn-cancel" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-submit" disabled={isCreating}>
                  {isCreating ? 'Creating...' : 'Create room'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {managedRoom && (
        <div className="create-room-overlay" role="presentation" onClick={() => setManagedRoom(null)}>
          <div
            className="create-room-modal room-admin-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Manage private room"
            onClick={(event) => event.stopPropagation()}
          >
            <h3>Manage: {managedRoom.name}</h3>
            <p>Invite members and manage private room access.</p>

            <div className="room-admin-member-list">
              {roomMembers.length === 0 ? (
                <p className="room-admin-empty">No members yet.</p>
              ) : (
                roomMembers.map((member) => (
                  <div key={member.uid} className="room-admin-member-row">
                    <div>
                      <strong>{member.displayName}</strong>
                      <span>{member.email}</span>
                    </div>
                    {managedRoom.createdBy === currentUserId && member.uid !== currentUserId && (
                      <button type="button" onClick={() => handleRemoveMember(member.uid)}>
                        Remove
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>

            {managedRoom.createdBy === currentUserId && (
              <div className="room-admin-invite">
                <label htmlFor="inviteEmail">Invite by email</label>
                <div className="room-admin-invite-row">
                  <input
                    id="inviteEmail"
                    type="email"
                    value={inviteEmail}
                    onChange={(event) => setInviteEmail(event.target.value)}
                    placeholder="teammate@company.com"
                  />
                  <button type="button" className="btn-submit" onClick={handleInviteMember} disabled={isInviting}>
                    {isInviting ? 'Inviting...' : 'Invite'}
                  </button>
                </div>
              </div>
            )}

            {adminError && <p className="create-room-error">{adminError}</p>}

            <div className="create-room-actions room-admin-actions">
              <button type="button" className="btn-cancel" onClick={() => setManagedRoom(null)}>
                Close
              </button>
              {managedRoom.createdBy === currentUserId && (
                <button type="button" className="btn-danger" onClick={handleDeleteRoom} disabled={isDeletingRoom}>
                  {isDeletingRoom ? 'Deleting...' : 'Delete room'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

