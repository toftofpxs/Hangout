import React from 'react'
import AppRoutes from './routes/AppRoutes'
import NavBar from './components/NavBar'

export default function App(){
  return (
    <div className="min-h-screen flex flex-col relative overflow-x-hidden">
      <div className="pointer-events-none fixed -top-24 -left-24 w-72 h-72 rounded-full bg-cyan-300/35 blur-3xl" />
      <div className="pointer-events-none fixed top-28 -right-24 w-72 h-72 rounded-full bg-amber-200/45 blur-3xl" />
      <NavBar />
      <main className="flex-1 container mx-auto px-3 sm:px-4 py-5 sm:py-8 relative z-10">
        <AppRoutes />
      </main>
    </div>
  )
}
