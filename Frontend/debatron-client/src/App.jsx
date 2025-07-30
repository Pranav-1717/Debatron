// E:\Debatron\Frontend\my-debate-arena-frontend\src\App.jsx
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AuthPage from './pages/AuthPage';
import HomePage from './pages/HomePage';
import DebateRoomPage from './pages/DebateRoomPage';
import Navbar from './components/Navbar';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext'; // SocketProvider will wrap DebateRoomPage

// ProtectedRoute component to guard routes that require authentication
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '80vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <span className="ms-2">Loading user session...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  return children;
};

function App() {
  return (
    <Router> {/* Router now wraps AuthProvider */}
      <AuthProvider>
        <Navbar />
        <div className="container mt-4 flex-grow-1"> {/* Bootstrap container for content spacing */}
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <HomePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/room/:roomId"
              element={
                <ProtectedRoute>
                    <SocketProvider> {/* SocketProvider wraps only the debate room, as it relies on roomId from URL */}
                        <DebateRoomPage />
                    </SocketProvider>
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<h1 className="text-center mt-5">404 - Page Not Found</h1>} />
          </Routes>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;