import { Routes, Route, Navigate, NavLink } from 'react-router-dom'
import { ProtectedRoute } from './components/layout/ProtectedRoute'
import Hoy from './pages/Hoy'
import Medicamentos from './pages/Medicamentos'
import Progreso from './pages/Progreso'
import Perfil from './pages/Perfil'
import Login from './pages/Login'
import { useAuth } from './hooks/useAuth'

const navLinkClass = ({ isActive }) =>
  isActive
    ? 'text-blue-600 text-xs font-semibold flex flex-col items-center'
    : 'text-gray-400 text-xs flex flex-col items-center'

function Navbar() {
  const { user } = useAuth()
  if (!user) return null
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around py-3 z-50">
      <NavLink to="/" end className={navLinkClass}>
        <span className="text-xl">🏠</span> Hoy
      </NavLink>
      <NavLink to="/medicamentos" className={navLinkClass}>
        <span className="text-xl">💊</span> Medicamentos
      </NavLink>
      <NavLink to="/progreso" className={navLinkClass}>
        <span className="text-xl">📊</span> Progreso
      </NavLink>
      <NavLink to="/perfil" className={navLinkClass}>
        <span className="text-xl">👤</span> Perfil
      </NavLink>
    </nav>
  )
}

export default function App() {
  return (
    <>
      <Navbar />
      <div className="pb-16">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Hoy /></ProtectedRoute>} />
          <Route path="/medicamentos" element={<ProtectedRoute><Medicamentos /></ProtectedRoute>} />
          <Route path="/progreso" element={<ProtectedRoute><Progreso /></ProtectedRoute>} />
          <Route path="/perfil" element={<ProtectedRoute><Perfil /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </>
  )
}