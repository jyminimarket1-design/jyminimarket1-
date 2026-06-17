import { create } from "zustand";
import axios from "axios";

const API_URL = import.meta.env.MODE === "development" ? "http://localhost:5000/api/auth" : "https://backend-sistema-seven.vercel.app/api/auth";

axios.defaults.withCredentials = true;

export const useAuthStore = create((set) => ({
	user: null,
	isAuthenticated: false,
	error: null,
	isLoading: false,
	isCheckingAuth: true,
	message: null,
	isSubscriptionExpired: false,
	setSubscriptionExpired: (status) => set({ isSubscriptionExpired: status }),

	login: async (email, password) => {
		set({ isLoading: true, error: null });
		try {
			const response = await axios.post(`${API_URL}/login`, { email, password });
			set({
				isAuthenticated: true,
				user: response.data.user,
				error: null,
				isLoading: false,
			});
		} catch (error) {
			set({ error: error.response?.data?.message || "Error logging in", isLoading: false });
			throw error;
		}
	},

	logout: async () => {
		set({ isLoading: true, error: null });
		try {
			await axios.post(`${API_URL}/logout`);
			
			// Nivel 1: Destrucción de persistencia (Local y Session)
			localStorage.clear();
			sessionStorage.clear();
			
			// Nivel 3: Invalidación del cliente API
			delete axios.defaults.headers.common['Authorization'];

			// Nivel 2: Limpieza de Estado Global
			set({ user: null, isAuthenticated: false, error: null, isLoading: false, isSubscriptionExpired: false });

			// Redirección dura para purgar la memoria caché de React y SWR/React Query
			window.location.replace('/login');
		} catch (error) {
			set({ error: "Error logging out", isLoading: false });
			throw error;
		}
	},
	checkAuth: async () => {
		set({ isCheckingAuth: true, error: null });
		try {
			const response = await axios.get(`${API_URL}/check-auth`);
			set({ user: response.data.user, isAuthenticated: true, isCheckingAuth: false });
		} catch (error) {
			set({ error: null, isCheckingAuth: false, isAuthenticated: false });
		}
	},
	forgotPassword: async (email) => {
		set({ isLoading: true, error: null });
		try {
			const response = await axios.post(`${API_URL}/forgot-password`, { email });
			set({ message: response.data.message, isLoading: false });
		} catch (error) {
			set({
				isLoading: false,
				error: error.response?.data?.message || "Error sending reset password email",
			});
			throw error;
		}
	},
	resetPassword: async (token, password) => {
		set({ isLoading: true, error: null });
		try {
			const response = await axios.post(`${API_URL}/reset-password/${token}`, { password });
			set({ message: response.data.message, isLoading: false });
		} catch (error) {
			set({
				isLoading: false,
				error: error.response?.data?.message || "Error resetting password",
			});
			throw error;
		}
	},

	createUserByAdmin: async (name, email, password) => {
		set({ isLoading: true, error: null });
		try {
			const response = await axios.post(`${API_URL}/create-user`, { name, email, password });
			set({ message: response.data.message, isLoading: false });
			return response.data;
		} catch (error) {
			set({
				isLoading: false,
				error: error.response?.data?.message || "Error creating user",
			});
			throw error;
		}
	},

	purgeUser: async (targetUserId) => {
		set({ isLoading: true, error: null });
		try {
			const response = await axios.delete(`${API_URL}/purge/${targetUserId}`);
			set({ message: response.data.message, isLoading: false });
			return response.data;
		} catch (error) {
			set({
				isLoading: false,
				error: error.response?.data?.message || "Error purging user",
			});
			throw error;
		}
	},
}));
