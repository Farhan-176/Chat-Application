import { useState } from 'react'
import './SideNav.css'

interface SideNavProps {
    onLogout: () => void
}

export const SideNav = ({ onLogout }: SideNavProps) => {
    const [activeNav, setActiveNav] = useState<'chat' | 'users' | 'analytics'>('chat')

    const handleNavClick = (nav: 'chat' | 'users' | 'analytics') => {
        setActiveNav(nav)
        console.log(`Switched to ${nav} view`)
    }

    return (
        <nav className="side-nav">
            <div className="nav-logo-section">
                <div className="nav-logo">LX</div>
            </div>

            <div className="nav-links">
                <button 
                    className={`nav-link ${activeNav === 'chat' ? 'active' : ''}`}
                    onClick={() => handleNavClick('chat')}
                    title="Chat">
                    <div className="nav-link-bg"></div>
                    <svg className="nav-icon" viewBox="0 0 256 256" fill="currentColor">
                        <path d="M216,48H40A16,16,0,0,0,24,64V224a15.8,15.8,0,0,0,9.2,14.5,15.9,15.9,0,0,0,16.2-1.9L86.8,208H216a16,16,0,0,0,16-16V64A16,16,0,0,0,216,48ZM216,192H83.2a15.8,15.8,0,0,0-10.4,3.9L40,223.1V64H216Z" />
                    </svg>
                </button>

                <button 
                    className={`nav-link ${activeNav === 'users' ? 'active' : ''}`}
                    onClick={() => handleNavClick('users')}
                    title="Users">
                    <div className="nav-link-bg"></div>
                    <svg className="nav-icon" viewBox="0 0 256 256" fill="currentColor">
                        <path d="M117.3,158.2a48,48,0,1,0-58.6,0A95.8,95.8,0,0,0,8,240a8,8,0,0,0,16,0,80,80,0,1,1,160,0,8,8,0,0,0,16,0A95.8,95.8,0,0,0,117.3,158.2ZM88,144a32,32,0,1,1,32-32A32.1,32.1,0,0,1,88,144Zm120,14.2a40,40,0,1,0-48,0,80.4,80.4,0,0,1,31.3,42.5,8,8,0,1,0,15.4-4.2A64.2,64.2,0,0,0,208,158.2ZM160,136a24,24,0,1,1,24-24A24.1,24.1,0,0,1,160,136Z" />
                    </svg>
                </button>

                <button 
                    className={`nav-link ${activeNav === 'analytics' ? 'active' : ''}`}
                    onClick={() => handleNavClick('analytics')}
                    title="Analytics">
                    <div className="nav-link-bg"></div>
                    <svg className="nav-icon" viewBox="0 0 256 256" fill="currentColor">
                        <path d="M232,208a8,8,0,0,1-8,8H32a8,8,0,0,1-8-8V48a8,8,0,0,1,16,0V200H224A8,8,0,0,1,232,208ZM80,184a8,8,0,0,1-8-8V136a8,8,0,0,1,16,0v40A8,8,0,0,1,80,184Zm48,0a8,8,0,0,1-8-8V104a8,8,0,0,1,16,0v72A8,8,0,0,1,128,184Zm48,0a8,8,0,0,1-8-8V72a8,8,0,0,1,16,0v104A8,8,0,0,1,176,184Z" />
                    </svg>
                </button>
            </div>

            <div className="nav-footer">
                <button className="nav-footer-btn" onClick={onLogout} title="Logout">
                    <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
                    </svg>
                </button>
            </div>
        </nav>
    )
}
