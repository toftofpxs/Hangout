// routes/AppRoutes.jsx
import { Routes, Route, useLocation } from 'react-router-dom';
import PrivateRoute from '../components/PrivateRoute';
import Home from '../pages/Home';
import Login from '../pages/Login';
import Register from '../pages/Register';
import Dashboard from '../pages/Dashboard';
import Admin from '../pages/Admin';
import Organizer from '../pages/Organizer';
import Cart from '../pages/Cart';
import CartPayment from '../pages/CartPayment';
import Payment from '../pages/Payment';
import EventDetails from '../components/EventDetails';

const AppRoutes = () => {
  const location = useLocation()

  return (
    <div key={location.pathname} className="route-shell">
      <Routes location={location}>
        <Route path="/" element={<Home />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/events/:id" element={<EventDetails />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        {/* Routes protégées */}
        <Route 
          path="/dashboard" 
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          } 
        />
        <Route
          path="/payments/event/:id"
          element={
            <PrivateRoute>
              <Payment />
            </PrivateRoute>
          }
        />
        <Route
          path="/cart/payment"
          element={
            <PrivateRoute>
              <CartPayment />
            </PrivateRoute>
          }
        />
        <Route 
          path="/admin" 
          element={
            <PrivateRoute>
              <Admin />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/organizer" 
          element={
            <PrivateRoute>
              <Organizer />
            </PrivateRoute>
          } 
        />
      </Routes>
    </div>
  );
};

export default AppRoutes;