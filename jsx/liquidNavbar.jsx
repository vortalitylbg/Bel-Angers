import React from 'react'
import LiquidGlass from 'liquid-glass-react'

export default function LiquidNavbar() {
  return (
    <LiquidGlass
      displacementScale={70}
      blurAmount={0.08}
      saturation={160}
      elasticity={0.3}
      cornerRadius={14}
      padding="12px 20px"
      style={{ width: '100%' }}
    >
      <div className="navbar-content">
        <span className="welcome-text">Bienvenue</span>
        <ul className="nav-links">
          <li><button className="nav-btn" data-section="calendar">Calendrier</button></li>
          <li><button className="nav-btn" data-section="clients">Clients</button></li>
          <li><button className="nav-btn" data-section="stats">Statistiques</button></li>
        </ul>
        <div className="nav-actions">
          <button className="btn glass-btn danger" id="logoutBtn">Déconnexion</button>
        </div>
      </div>
    </LiquidGlass>
  )
}
