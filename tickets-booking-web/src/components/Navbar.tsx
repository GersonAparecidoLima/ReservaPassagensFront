import { NavLink } from 'react-router-dom'
import './Navbar.css'

export function Navbar() {
  return (
    <header className="navbar">
      <div className="navbar__brand">
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
          <path d="M13 5v2" /><path d="M13 17v2" /><path d="M13 11v2" />
        </svg>
        <span>Tickets Booking</span>
      </div>

      <nav className="navbar__nav" aria-label="Navegação principal">
        <NavLink
          to="/"
          end
          className={({ isActive }) => `navbar__link${isActive ? ' navbar__link--active' : ''}`}
        >
          Venda de Passagens
        </NavLink>
        <NavLink
          to="/reservas"
          className={({ isActive }) => `navbar__link${isActive ? ' navbar__link--active' : ''}`}
        >
          Dashboard de Reservas
        </NavLink>
      </nav>
    </header>
  )
}
