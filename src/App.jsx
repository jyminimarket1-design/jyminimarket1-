import { Navigate, Route, Routes, useLocation, Outlet } from "react-router-dom";
import NebulaBackground from "./components/NebulaBackground";
import LoginPage from "./pages/LoginPage";
import EmailVerificationPage from "./pages/EmailVerificationPage";
import DashboardPage from "./pages/DashboardPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import LoadingSpinner from "./components/LoadingSpinner";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import HomePage from "./pages/HomePage";
import Footer from "./components/Footer";
import SubscriptionExpiredPage from "./pages/SubscriptionExpiredPage";
import { Toaster } from "react-hot-toast";
import { useAuthStore } from "./store/authStore";
import { useEffect } from "react";

// protect routes that require authentication
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  /*if (user && !user.isVerified) {
    return <Navigate to="/verify-email" replace />;
  }*/

  return children;
};

// redirect authenticated users to the dashboard page
const RedirectAuthenticatedUser = ({ children }) => {
  const { isAuthenticated, user } = useAuthStore();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

function App() {
  const { isCheckingAuth, checkAuth, isSubscriptionExpired } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (isCheckingAuth) return <LoadingSpinner />;

  if (isSubscriptionExpired) {
    return (
      <div className="min-h-screen w-full bg-[#020617] relative overflow-x-hidden font-sans selection:bg-orange-500/30">
        <div className="fixed inset-0 z-0">
          <NebulaBackground />
        </div>
        <SubscriptionExpiredPage />
        <Toaster />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#020617] relative overflow-x-hidden font-sans selection:bg-orange-500/30">
      <div className="fixed inset-0 z-0">
        <NebulaBackground />
      </div>

      {/* Contenido de la App */}
      <div className="relative z-10 w-full min-h-screen">
        <Routes>
          <Route path="/" element={<HomePage />} />

          {/* Todas las demás rutas se renderizan dentro de un contenedor centrado */}
          <Route element={
            <div className="min-h-screen w-full flex items-center justify-center p-4">
              <Outlet />
            </div>
          }>
            <Route
              path="/dashboard/*"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/login"
              element={
                <RedirectAuthenticatedUser>
                  <LoginPage />
                </RedirectAuthenticatedUser>
              }
            />
            <Route path="/verify-email" element={<EmailVerificationPage />} />
            <Route
              path="/forgot-password"
              element={
                <RedirectAuthenticatedUser>
                  <ForgotPasswordPage />
                </RedirectAuthenticatedUser>
              }
            />
            <Route
              path="/reset-password/:token"
              element={
                <RedirectAuthenticatedUser>
                  <ResetPasswordPage />
                </RedirectAuthenticatedUser>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </div>
      {!location.pathname.startsWith("/dashboard") && <Footer />}
      <Toaster />
    </div>
  );
}

export default App;
