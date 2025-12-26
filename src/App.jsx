import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import BountyLanding from './BountyLanding';
import HunterDashboard from './HunterDashboard';
import PosterDashboard from './PosterDashboard';
import AuthPage from './AuthPage';

// Protected route wrapper
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/auth" />;
  }
  
  return children;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<BountyLanding />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route 
        path="/hunt" 
        element={
          <ProtectedRoute>
            <HunterDashboard />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/post" 
        element={
          <ProtectedRoute>
            <PosterDashboard />
          </ProtectedRoute>
        } 
      />
    </Routes>
  );
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}
