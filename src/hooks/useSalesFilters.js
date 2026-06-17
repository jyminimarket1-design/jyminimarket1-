import { useState, useRef, useEffect, useMemo } from "react";
import { useSaleStore } from "../store/saleStore";
import { useAuthStore } from "../store/authStore";

export const DATE_FILTER_OPTIONS = [
  { value: "all",    label: "Todas"    },
  { value: "today",  label: "Hoy"      },
  { value: "ayer",   label: "Ayer"     },
  { value: "7days",  label: "7 días"   },
  { value: "30days", label: "30 días"  },
  { value: "month",  label: "Este mes" },
];

export function useSalesFilters() {
  const { sales, pagination, fetchSales } = useSaleStore();

  const { user } = useAuthStore();

  const [dateFilter, setDateFilter]           = useState("all");
  const [dateFrom,   setDateFrom]             = useState("");
  const [dateTo,     setDateTo]               = useState("");
  const [sellerFilter, setSellerFilter]       = useState(null);
  const [paymentFilter, setPaymentFilter]     = useState("all");
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [currentPage, setCurrentPage]         = useState(1);
  const datePickerRef = useRef(null);

  // Re-fetch cuando cambian los filtros o la página
  useEffect(() => {
    if (user?.role !== "employee" && dateFilter === "custom" && (!dateFrom || !dateTo)) return;

    const finalDateFilter = user?.role === "employee" ? undefined : dateFilter;
    const finalDateFrom = user?.role === "employee" ? undefined : (dateFrom || undefined);
    const finalDateTo = user?.role === "employee" ? undefined : (dateTo || undefined);
    const finalPaymentFilter = user?.role === "employee" ? undefined : paymentFilter;

    fetchSales(currentPage, 20, sellerFilter, finalDateFilter, finalDateFrom, finalDateTo, finalPaymentFilter);
  }, [fetchSales, currentPage, sellerFilter, dateFilter, dateFrom, dateTo, paymentFilter, user?.role]);

  // Cierra el datepicker al hacer clic fuera
  useEffect(() => {
    const handleOutside = (e) => {
      if (datePickerRef.current && !datePickerRef.current.contains(e.target))
        setIsDatePickerOpen(false);
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const activeDateLabel = useMemo(() => {
    if (dateFilter === "custom" && dateFrom && dateTo) {
      const fmt = (d) => new Date(d + "T00:00:00").toLocaleDateString("es-VE", {
        day: "2-digit", month: "2-digit", year: "numeric",
      });
      return `${fmt(dateFrom)} – ${fmt(dateTo)}`;
    }
    return DATE_FILTER_OPTIONS.find((o) => o.value === dateFilter)?.label || "Todas";
  }, [dateFilter, dateFrom, dateTo]);

  const filteredTotal = useMemo(() => {
    return Number(pagination?.totalAmount || 0);
  }, [pagination]);

  const totalPages = pagination?.totalPages || 1;
  const totalDocs  = pagination?.total ?? sales.length;

  return {
    dateFilter, setDateFilter,
    dateFrom,   setDateFrom,
    dateTo,     setDateTo,
    sellerFilter, setSellerFilter,
    paymentFilter, setPaymentFilter,
    isDatePickerOpen, setIsDatePickerOpen,
    currentPage, setCurrentPage,
    datePickerRef,
    activeDateLabel,
    filteredTotal,
    totalPages,
    totalDocs,
    DATE_FILTER_OPTIONS,
  };
}
