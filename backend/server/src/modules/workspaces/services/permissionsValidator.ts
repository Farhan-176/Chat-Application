/**
 * Backend permission validation utilities
 * Ensures role-based access control is enforced server-side
 */

export type UserRole = 'owner' | 'admin' | 'moderator' | 'member'

/**
 * Define permissions for each role
 */
const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  owner: [
    'manage_members',
    'manage_roles',
    'delete_workspace',
    'create_rooms',
    'manage_settings',
    'view_analytics',
    'manage_messages',
  ],
  admin: [
    'manage_members',
    'create_rooms',
    'manage_settings',
    'view_analytics',
    'manage_messages',
  ],
  moderator: ['create_rooms', 'manage_messages', 'monitor_activity'],
  member: ['send_messages', 'create_rooms'],
}

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: UserRole, permission: string): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false
}

/**
 * Check if a user can manage another member
 * Owner can manage everyone
 * Admin can manage members and moderators, but not admins or owner
 * Moderator and member cannot manage anyone
 */
export function canManageMember(userRole: UserRole, targetRole: UserRole): boolean {
  if (userRole === 'owner') return targetRole !== 'owner'
  if (userRole === 'admin') return ['member', 'moderator'].includes(targetRole)
  return false
}

/**
 * Check if a user can change another member's role
 * Only owner can elevate to admin
 * Admin can change member/moderator roles (but not to admin or owner)
 */
export function canChangeRole(
  userRole: UserRole,
  currentRole: UserRole,
  newRole?: UserRole
): boolean {
  if (userRole === 'owner') {
    // Owner can change any role (except make someone owner, that's manual)
    return currentRole !== 'owner'
  }

  if (userRole === 'admin') {
    // Admin can only change member/moderator
    if (!['member', 'moderator'].includes(currentRole)) return false
    // Admin can't promote to admin
    if (newRole === 'admin' || newRole === 'owner') return false
    return true
  }

  return false
}

/**
 * Check if a user can remove another member
 * Owner can remove everyone except themselves
 * Admin can remove members and moderators, but not admins or owner
 */
export function canRemoveMember(userRole: UserRole, targetRole: UserRole): boolean {
  if (userRole === 'owner') return targetRole !== 'owner'
  if (userRole === 'admin') return ['member', 'moderator'].includes(targetRole)
  return false
}

/**
 * Check if a user can view member management (pending invites, members list)
 * Owner and admin can view
 * Moderator and member cannot
 */
export function canManageMembers(role: UserRole): boolean {
  return ['owner', 'admin'].includes(role)
}

/**
 * Check if a user can delete a workspace
 * Only owner can delete
 */
export function canDeleteWorkspace(role: UserRole): boolean {
  return role === 'owner'
}

/**
 * Check if a user can create rooms
 * Owner, admin, and moderator can create rooms
 * Member can create rooms
 */
export function canCreateRoom(role: UserRole): boolean {
  return ['owner', 'admin', 'moderator', 'member'].includes(role)
}

/**
 * Check if a user can manage settings
 * Owner and admin can manage
 */
export function canManageSettings(role: UserRole): boolean {
  return ['owner', 'admin'].includes(role)
}

