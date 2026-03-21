import React from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useContext } from 'react'
import { AuthContext } from '../contexts/AuthContext'
import { useCart } from '../contexts/CartContext'

export default function NavBar(){
  const { user, logout } = useContext(AuthContext)
  const { itemCount } = useCart()
  const nav = useNavigate()

  const isOrganizer = user?.role === 'organisateur' || user?.role === 'organizer'
  const isAdmin = user?.role === 'admin' || user?.role === 'super_user'

  return (
    <header className="sticky top-0 z-30">
      <div className="container mx-auto px-4 py-4">
        <div className="glass-panel rounded-2xl px-4 py-3 flex items-center justify-between">
          <Link to="/" className="text-xl font-extrabold tracking-tight text-slate-900 hover:text-cyan-700 transition-colors">Hangout</Link>
          <nav className="flex items-center gap-4 md:gap-6 text-sm md:text-base">
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
                onClick={()=>{ logout(); nav('/') }} 
                className="ml-1 px-3 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 shadow-sm"
              >
                Déconnexion
              </button>
            </>
          )}
          </nav>
        </div>
      </div>
    </header>
  )
}
