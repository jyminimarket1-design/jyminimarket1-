import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { BrowserRouter } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useAuthStore } from './store/authStore.js'

// Configurar interceptor global para manejar errores 401 (token expirado o no enviado)
axios.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      const url = error.config.url;
      // No redirigir si el error es de autenticación básica (login o check-auth)
      if (url && !url.includes('/check-auth') && !url.includes('/login')) {
        useAuthStore.setState({ user: null, isAuthenticated: false, error: "Tu sesión ha expirado. Por favor, inicia sesión de nuevo." });
        
        // Evitar que recargue si ya está en login
        if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
          window.location.href = '/login';
        }
      }
    } else if (error.response && error.response.status === 504) {
      // SLA middleware: la operación excedió 1.5s — mostrar toast amigable
      toast.error('El servidor está ocupado. Intenta de nuevo en unos segundos.', {
        icon: '⏳',
        duration: 4000,
        id: 'sla-timeout', // evitar toasts duplicados
      });
      // Sobreescribir el mensaje técnico para que los stores muestren algo limpio
      if (error.response.data) {
        error.response.data.message = 'Tiempo de espera agotado. Intenta de nuevo.';
      }
    } else if (error.response && error.response.status === 403 && error.response.data?.message?.includes("Suscripción expirada")) {
      useAuthStore.getState().setSubscriptionExpired(true);
    }
    return Promise.reject(error);
  }
);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
