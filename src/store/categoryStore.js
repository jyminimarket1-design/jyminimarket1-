import { create } from "zustand";
import api from "../api/api";

const API_URL = import.meta.env.MODE === "development" ? "http://localhost:5000/api/categories" : "https://backend-sistema-seven.vercel.app/api/categories";



export const useCategoryStore = create((set) => ({
  categories: [],
  pagination: { total: 0, page: 1, limit: 100, totalPages: 0 },
  isLoading: false,
  error: null,

  fetchCategories: async (page = 1, limit = 100, query = "") => {
    set({ isLoading: true, error: null });
    const params = new URLSearchParams({ page, limit, search: query });
    try {
      const response = await api.get(`${API_URL}?${params.toString()}`);
      const payload = response.data;

      // El backend devuelve los campos de paginación en el nivel raíz:
      // { success, categories, total, totalPages, currentPage }
      const categories = payload.categories || payload.data || (Array.isArray(payload) ? payload : []);
      const total = payload.total ?? 0;
      const totalPages = payload.totalPages ?? 1;
      const currentPage = payload.currentPage ?? page;

      set({
        categories,
        pagination: { total, page: currentPage, limit, totalPages },
        isLoading: false,
      });
    } catch (error) {
      set({ error: error.response?.data?.message || "Error al obtener las categorías", isLoading: false });
    }
  },

  createCategory: async (categoryData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post(`${API_URL}`, categoryData);
      set((state) => ({
        categories: [...state.categories, response.data.category || response.data],
        isLoading: false
      }));
      return response.data;
    } catch (error) {
      set({ error: error.response?.data?.message || "Error al crear la categoría", isLoading: false });
      throw error;
    }
  },

  updateCategory: async (id, categoryData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.put(`${API_URL}/${id}`, categoryData);
      set((state) => ({
        categories: state.categories.map((cat) =>
          cat._id === id ? response.data.category || response.data : cat
        ),
        isLoading: false
      }));
      return response.data;
    } catch (error) {
      set({ error: error.response?.data?.message || "Error al actualizar la categoría", isLoading: false });
      throw error;
    }
  },

  deleteCategory: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.delete(`${API_URL}/${id}`);
      set((state) => ({
        categories: state.categories.filter((cat) => cat._id !== id),
        isLoading: false
      }));
      return response.data;
    } catch (error) {
      set({ error: error.response?.data?.message || "No se puede borrar la categoría porque tiene productos asignados.", isLoading: false });
      throw error;
    }
  }
}));
