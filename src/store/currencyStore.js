import { create } from "zustand";
import { persist } from "zustand/middleware";
import axios from "axios";

const API_URL = import.meta.env.MODE === "development" ? "http://localhost:5000/api/rates" : "https://backend-sistema-seven.vercel.app/api/rates";

axios.defaults.withCredentials = true;

export const useCurrencyStore = create(
  persist(
    (set, get) => ({
      // Tasa de cambio: 1 USD = X Bs
      exchangeRate: 95.0,
      // Moneda activa para visualización
      displayCurrency: "USD",
      isLoading: false,
      error: null,

      setExchangeRate: (rate) => {
        const parsed = parseFloat(rate);
        if (!isNaN(parsed) && parsed > 0) {
          set({ exchangeRate: parsed });
        }
      },

      loadRateFromServer: async () => {
        set({ isLoading: true, error: null });
        try {
          const response = await axios.get(`${API_URL}/today`);
          if (response.data && response.data.rate) {
            // response.data.rate podria ser el documento { _id, rate, ... } o el numero. 
            // Asumiendo que el backend retorna { success: true, rate: { rate: 38.5, ... } } o { rate: 38.5 }
            const rateValue = response.data.rate.rate || response.data.rate;
            set({ exchangeRate: rateValue, isLoading: false });
          } else {
            set({ isLoading: false });
          }
        } catch (error) {
          set({ error: error.response?.data?.message || "Error al cargar la tasa", isLoading: false });
        }
      },

      saveRateToServer: async (rate) => {
        const parsed = parseFloat(rate);
        if (isNaN(parsed) || parsed <= 0) return;

        set({ isLoading: true, error: null });
        try {
          const response = await axios.post(API_URL, { rate: parsed });
          if (response.data && response.data.rate) {
            const rateValue = response.data.rate.rate || response.data.rate;
            set({ exchangeRate: rateValue, isLoading: false });
          } else {
            set({ exchangeRate: parsed, isLoading: false });
          }
        } catch (error) {
          set({ error: error.response?.data?.message || "Error al guardar la tasa", isLoading: false });
          throw error;
        }
      },

      setDisplayCurrency: (currency) => set({ displayCurrency: currency }),

      // Helper: convertir USD a Bs
      toBs: (usdAmount) => {
        const rate = get().exchangeRate;
        return Number((usdAmount * rate).toFixed(2));
      },

      // Helper: formatear en ambas monedas
      formatDual: (usdAmount) => {
        const rate = get().exchangeRate;
        const bs = Number((usdAmount * rate).toFixed(2));
        return { usd: Number(usdAmount).toFixed(2), bs: bs.toFixed(2) };
      },
    }),
    {
      name: "currency-store",
    }
  )
);
