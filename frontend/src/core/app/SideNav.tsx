
import { LogOut } from 'lucide-react'

interface SideNavProps {
  onLogout: () => void
}

export const SideNav = ({ onLogout }: SideNavProps) => {
  return (
    <nav style={{ 
      width: '72px', 
      background: 'var(--surface-layer-1)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '20px 0',
      borderRight: '1px solid var(--border-subtle)'
    }}>
      <div className="logo" style={{ marginBottom: 'auto', fontWeight: 'bold' }}>FC</div>
      <button onClick={onLogout} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
        <LogOut size={20} />
      </button>
    </nav>
  )
}
