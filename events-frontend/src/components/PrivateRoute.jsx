import React from 'react'
import { Navigate } from 'react-router-dom'
import { useContext } from 'react'
import { AuthContext } from '../contexts/AuthContext'

export default function PrivateRoute({ children, roles }){
  const { user, loading } = useContext(AuthContext)
  if(loading) return <div>Chargement...</div>
  if(!user) return <Navigate to="/login" replace />
  if(roles && !roles.includes(user.role)) return <Navigate to="/" replace />
  return children
}
