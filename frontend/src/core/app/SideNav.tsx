
import { LogOut } from 'lucide-react'

interface SideNavProps {
  onLogout: () => void
}

export const SideNav = ({ onLogout }: SideNavProps) => {
  return (
    <nav className="side-nav" aria-label="Primary">
      <div className="side-nav__brand" aria-hidden="true">FC</div>
      <div className="side-nav__spacer" />
      <button className="side-nav__logout" onClick={onLogout} aria-label="Log out">
        <LogOut size={20} />
      </button>
    </nav>
  )
}
