import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/Authcontext';
import Navbar from './components/Navbar';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Session from './pages/Session';
import Quiz from './pages/Quiz';
import Feynman from './pages/Feynman';
import Completion from './pages/Completion';
import History from './pages/History';
import Analytics from './pages/Analytics';
import './styles/main.css';

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="loading">Loading...</div>;
  }
  
  return user ? children : <Navigate to="/login" />;
};

const AppRoutes = () => {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route 
          path="/dashboard" 
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/session/:id" 
          element={
            <PrivateRoute>
              <Session />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/quiz/:sessionId/:checkpointId" 
          element={
            <PrivateRoute>
              <Quiz />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/feynman/:sessionId/:checkpointId" 
          element={
            <PrivateRoute>
              <Feynman />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/completion/:sessionId" 
          element={
            <PrivateRoute>
              <Completion />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/history" 
          element={
            <PrivateRoute>
              <History />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/analytics" 
          element={
            <PrivateRoute>
              <Analytics />
            </PrivateRoute>
          } 
        />
      </Routes>
    </Router>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;