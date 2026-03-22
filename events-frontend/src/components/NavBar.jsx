import React from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useContext, useState } from 'react'
import { AuthContext } from '../contexts/AuthContext'
import { useCart } from '../contexts/CartContext'

export default function NavBar(){
  const { user, logout } = useContext(AuthContext)
  const { itemCount } = useCart()
  const nav = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  const isOrganizer = user?.role === 'organisateur' || user?.role === 'organizer'
  const isAdmin = user?.role === 'admin' || user?.role === 'super_user'

  const handleLogout = () => {
    logout()
    setMenuOpen(false)
    nav('/')
  }

  const closeMenu = () => setMenuOpen(false)

  return (
    <header className="sticky top-0 z-30">
      <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
        <div className="glass-panel rounded-2xl px-3 sm:px-4 py-3 flex items-center justify-between gap-3">
          <Link to="/" onClick={closeMenu} className="text-lg sm:text-xl font-extrabold tracking-tight text-slate-900 hover:text-cyan-700 transition-colors">Hangout</Link>

          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg border border-slate-300 bg-white/80 text-slate-700"
            aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            aria-expanded={menuOpen}
          >
            {menuOpen ? '×' : '☰'}
          </button>

          <nav className="hidden md:flex items-center gap-4 md:gap-6 text-sm md:text-base">
            <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}>Événements</NavLink>
            <NavLink to="/cart" className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}>
              Panier{itemCount > 0 ? ` (${itemCount})` : ''}
            </NavLink>
          {!user && (
            <>
              <NavLink to="/login" className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}>Se connecter</NavLink>
              <Link to="/register" className="bg-cyan-600 text-white px-4 py-2 rounded-lg hover:bg-cyan-700 shadow-sm">S'inscrire</Link>
            </>
          )}
          {user && (
            <>
              {isOrganizer && <NavLink to="/organizer" className={({ isActive }) => `nav-link font-semibold ${isActive ? 'nav-link-active' : 'text-emerald-700 hover:text-emerald-800'}`}>Organisateur</NavLink>}
              <NavLink to="/dashboard" className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}>Mon compte</NavLink>
              {isAdmin && <NavLink to="/admin" className={({ isActive }) => `nav-link font-semibold ${isActive ? 'nav-link-active' : 'text-amber-700 hover:text-amber-800'}`}>Admin</NavLink>}
              <button 
                onClick={handleLogout}
                className="ml-1 px-3 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 shadow-sm"
              >
                Déconnexion
              </button>
            </>
          )}
          </nav>
        </div>

        {menuOpen && (
          <div className="md:hidden mt-2 glass-panel rounded-2xl p-3 flex flex-col gap-2 text-sm">
            <NavLink to="/" onClick={closeMenu} className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}>Événements</NavLink>
            <NavLink to="/cart" onClick={closeMenu} className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}>
              Panier{itemCount > 0 ? ` (${itemCount})` : ''}
            </NavLink>

            {!user && (
              <>
                <NavLink to="/login" onClick={closeMenu} className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}>Se connecter</NavLink>
                <Link to="/register" onClick={closeMenu} className="bg-cyan-600 text-white px-4 py-2 rounded-lg hover:bg-cyan-700 shadow-sm text-center">S'inscrire</Link>
              </>
            )}

            {user && (
              <>
                {isOrganizer && <NavLink to="/organizer" onClick={closeMenu} className={({ isActive }) => `nav-link font-semibold ${isActive ? 'nav-link-active' : 'text-emerald-700 hover:text-emerald-800'}`}>Organisateur</NavLink>}
                <NavLink to="/dashboard" onClick={closeMenu} className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}>Mon compte</NavLink>
                {isAdmin && <NavLink to="/admin" onClick={closeMenu} className={({ isActive }) => `nav-link font-semibold ${isActive ? 'nav-link-active' : 'text-amber-700 hover:text-amber-800'}`}>Admin</NavLink>}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="mt-1 px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 shadow-sm"
                >
                  Déconnexion
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  )
}
