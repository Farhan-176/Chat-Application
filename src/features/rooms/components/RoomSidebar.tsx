import { useState, useEffect } from 'react'
import { ChatRoom as ChatRoomType, UserPresence } from '../../../shared/types'
import { fetchRooms, createRoom } from '../../../shared/api'
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore'
import { db } from '../../../shared/config'
import './RoomSidebar.css'

interface RoomSidebarProps {
    activeRoomId: string
    onSelectRoom: (roomId: string) => void
    userPhotoURL: string | null
    userDisplayName: string | null
    onLogout: () => void
}

export const RoomSidebar = ({
    activeRoomId,
    onSelectRoom,
    userPhotoURL,
    userDisplayName,
    onLogout,
}: RoomSidebarProps) => {
    const [rooms, setRooms] = useState<ChatRoomType[]>([])
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [newRoomName, setNewRoomName] = useState('')
    const [newRoomDesc, setNewRoomDesc] = useState('')
    const [creating, setCreating] = useState(false)
    const [collapsed, setCollapsed] = useState(false)
    const [presences, setPresences] = useState<UserPresence[]>([])

    // Real-time listener for rooms
    useEffect(() => {
        const roomsRef = collection(db, 'chatRooms')
        const q = query(roomsRef, orderBy('createdAt', 'desc'))

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const roomsData: ChatRoomType[] = snapshot.docs.map((doc) => ({
                id: doc.id,
                name: doc.data().name || doc.id,
                description: doc.data().description || '',
                createdAt: doc.data().createdAt?.toDate?.() || new Date(),
                createdBy: doc.data().createdBy,
                createdByName: doc.data().createdByName,
                memberCount: doc.data().memberCount || 0,
            }))
            setRooms(roomsData)
        }, (error) => {
            console.error('Error listening to rooms:', error)
            // Fallback: fetch via API
            fetchRooms()
                .then((data) => setRooms(data.rooms || []))
                .catch(console.error)
        })

        return () => unsubscribe()
    }, [])

    // Real-time listener for current room's presence
    useEffect(() => {
        if (!activeRoomId) return

        const presenceRef = collection(db, 'chatRooms', activeRoomId, 'presence')
        const q = query(presenceRef)

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const presenceData: UserPresence[] = snapshot.docs
                .map(doc => {
                    const data = doc.data()
                    return {
                        uid: doc.id,
                        displayName: data.displayName || 'Anonymous',
                        photoURL: data.photoURL || null,
                        online: data.online ?? false,
                        spatialX: data.spatialX ?? 0.5,
                        spatialY: data.spatialY ?? 0.5,
                        lastSeen: data.lastSeen?.toDate?.() || new Date(),
                    } as UserPresence
                })
                .filter(p => p.online)

            setPresences(presenceData)
        })

        return () => unsubscribe()
    }, [activeRoomId])

    const handleCreateRoom = async () => {
        if (!newRoomName.trim()) return

        try {
            setCreating(true)
            const result = await createRoom(newRoomName.trim(), newRoomDesc.trim())
            onSelectRoom(result.id)
            setShowCreateModal(false)
            setNewRoomName('')
            setNewRoomDesc('')
        } catch (error: any) {
            alert(error.message || 'Failed to create room')
        } finally {
            setCreating(false)
        }
    }

    return (
        <aside className={`room-sidebar ${collapsed ? 'collapsed' : ''}`}>
            {/* Collapse toggle */}
            <button className="sidebar-toggle" onClick={() => setCollapsed(!collapsed)} title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    {collapsed ? (
                        <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                    ) : (
                        <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                    )}
                </svg>
            </button>

            {!collapsed && (
                <>
                    {/* Header */}
                    <div className="sidebar-header">
                        <h2 className="sidebar-title">
                            <span className="title-icon">💬</span>
                            Rooms
                        </h2>
                        <button
                            className="create-room-btn"
                            onClick={() => setShowCreateModal(true)}
                            title="Create new room"
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                            </svg>
                        </button>
                    </div>

                    {/* Room List */}
                    <div className="room-list">
                        {rooms.length === 0 ? (
                            <div className="room-empty">
                                <p>No rooms yet</p>
                                <button onClick={() => setShowCreateModal(true)}>Create one</button>
                            </div>
                        ) : (
                            rooms.map((room: ChatRoomType) => (
                                <button
                                    key={room.id}
                                    className={`room-item ${room.id === activeRoomId ? 'active' : ''}`}
                                    onClick={() => onSelectRoom(room.id)}
                                >
                                    <div className="room-item-icon">#</div>
                                    <div className="room-item-info">
                                        <span className="room-item-name">{room.name}</span>
                                        {room.description && (
                                            <span className="room-item-desc">{room.description}</span>
                                        )}
                                    </div>
                                </button>
                            ))
                        )}
                        {/* Presence List */}
                        {presences.length > 0 && (
                            <div className="presence-section">
                                <h3 className="sidebar-subtitle">Members Online</h3>
                                <div className="presence-list">
                                    {presences.map((p: UserPresence) => (
                                        <div key={p.uid} className="presence-item">
                                            <div className="presence-avatar-container">
                                                {p.photoURL ? (
                                                    <img src={p.photoURL} alt="" className="presence-avatar" referrerPolicy="no-referrer" />
                                                ) : (
                                                    <div className="presence-avatar-placeholder">{p.displayName[0]}</div>
                                                )}
                                                <div className="online-indicator"></div>
                                            </div>
                                            <span className="presence-name">{p.displayName}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* User section at bottom */}
                    <div className="sidebar-user">
                        <div className="sidebar-user-info">
                            {userPhotoURL && <img src={userPhotoURL} alt="" className="sidebar-user-avatar" referrerPolicy="no-referrer" />}
                            <span className="sidebar-user-name">{userDisplayName || 'User'}</span>
                        </div>
                        <button className="sidebar-logout-btn" onClick={onLogout} title="Logout">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </button>
                    </div>

                    {/* Create Room Modal */}
                    {showCreateModal && (
                        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
                            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                                <h3>Create New Room</h3>
                                <input
                                    type="text"
                                    placeholder="Room name"
                                    value={newRoomName}
                                    onChange={(e) => setNewRoomName(e.target.value)}
                                    maxLength={50}
                                    autoFocus
                                    onKeyDown={(e) => e.key === 'Enter' && handleCreateRoom()}
                                />
                                <textarea
                                    placeholder="Description (optional)"
                                    value={newRoomDesc}
                                    onChange={(e) => setNewRoomDesc(e.target.value)}
                                    rows={2}
                                />
                                <div className="modal-actions">
                                    <button className="modal-cancel" onClick={() => setShowCreateModal(false)}>
                                        Cancel
                                    </button>
                                    <button
                                        className="modal-create"
                                        onClick={handleCreateRoom}
                                        disabled={!newRoomName.trim() || creating}
                                    >
                                        {creating ? 'Creating...' : 'Create'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </aside>
    )
}
