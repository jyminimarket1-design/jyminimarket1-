import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Check, ShoppingCart, Calendar, HelpCircle, X, ChevronDown,
} from "lucide-react";
import { useSaleStore } from "../store/saleStore";
import { useProductStore } from "../store/productStore";
import { useStaffStore } from "../store/staffStore";
import { useAuthStore } from "../store/authStore";
import { useCurrencyStore } from "../store/currencyStore";
import toast from "react-hot-toast";
import { fmtUSD, fmtBs, itemSubtotal, getExpirationInfo } from "../utils/salesFormatters";

import Button from "./atoms/Button";
import Badge from "./atoms/Badge";
import KBD from "./atoms/KBD";
import DataTable from "./organisms/DataTable";
import BarcodeScanner from "./BarcodeScanner";
import ExchangeRateBar from "./pos/ExchangeRateBar";
import HelpModal from "./pos/HelpModal";
import SaleDetailView from "./pos/SaleDetailView";
import SalePOSForm from "./pos/SalePOSForm";
import EditSaleModal from "./pos/EditSaleModal";

import { usePOSCart } from "../hooks/usePOSCart";
import { useSalesFilters, DATE_FILTER_OPTIONS } from "../hooks/useSalesFilters";
import { usePOSKeyboard } from "../hooks/usePOSKeyboard";

/* ─── buildHistoryColumns ────────────────────────────────── */
const buildHistoryColumns = (onViewDetail, toBs) => [
  {
    key: "createdAt",
    label: "Fecha",
    render: (val) => (
      <div className="text-gray-300 text-sm">
        {new Date(val).toLocaleDateString()}
        <div className="text-[10px] sm:text-xs text-gray-500 mt-0.5">
          {new Date(val).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>
    ),
  },
  {
    key: "payment_method",
    label: "Método Pago",
    headerClassName: "hidden md:table-cell",
    className: "hidden md:table-cell text-white font-medium text-sm",
  },
  {
    key: "status",
    label: "Estado",
    headerClassName: "hidden sm:table-cell",
    className: "hidden sm:table-cell",
    render: (val) => <Badge variant="success">{val || "Completada"}</Badge>,
  },
  {
    key: "sold_by",
    label: "Vendedor",
    headerClassName: "hidden lg:table-cell",
    className: "hidden lg:table-cell",
    render: (val) => {
      const name = val?.name || "Propietario";
      return (
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400 text-[10px] font-bold border border-orange-500/30">
            {name.charAt(0).toUpperCase()}
          </div>
          <span className="text-gray-300 text-sm font-medium">{name}</span>
        </div>
      );
    },
  },
  {
    key: "total_amount",
    label: "Total",
    render: (val, row) => {
      const histBs = row.exchange_rate ? Number((val * row.exchange_rate).toFixed(2)) : toBs(val);
      return (
        <div>
          <div className="text-amber-500 font-medium text-sm sm:text-base">{fmtUSD(val)}</div>
          <div className="text-[10px] sm:text-xs text-blue-400 mt-0.5">Bs {histBs.toFixed(2)}</div>
        </div>
      );
    },
  },
  {
    key: "_id",
    label: "",
    render: (id) => (
      <Button variant="ghost" size="sm" onClick={() => onViewDetail(id)}
        className="bg-white/5 hover:bg-white/10 text-orange-400 px-2 sm:px-3 text-xs sm:text-sm">
        <span className="hidden sm:inline">Ver Detalles</span>
        <span className="sm:hidden">Detalles</span>
      </Button>
    ),
  },
];

/* ════════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL — orquestador
════════════════════════════════════════════════════════════ */
const SalesManager = () => {
  const { sales, isLoading, error, createSale, fetchSaleById, cancelSale, updateSale } = useSaleStore();
  const { posProducts, isPosLoading, fetchAllForPOS, fetchProductByBarcode } = useProductStore();
  const { staff, fetchStaff } = useStaffStore();
  const { user } = useAuthStore();
  const { exchangeRate, setExchangeRate, toBs } = useCurrencyStore();

  /* ── UI state local ── */
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [viewedSale, setViewedSale] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const searchInputRef = useRef(null);
  const submitBtnRef = useRef(null);
  const paymentSelectRef = useRef(null);

  /* ── Custom hooks ── */
  const {
    items, paymentMethod, cartPulse, currentTotal, setPaymentMethod,
    handleAddItem, handleQtyChange, handleRemoveItem,
    cyclePaymentMethod, clearCart, modifyLastItemQty, resetCart,
  } = usePOSCart();

  const {
    dateFilter, setDateFilter,
    dateFrom, setDateFrom,
    dateTo, setDateTo,
    sellerFilter, setSellerFilter,
    paymentFilter, setPaymentFilter,
    isDatePickerOpen, setIsDatePickerOpen,
    currentPage, setCurrentPage,
    datePickerRef, activeDateLabel, filteredTotal, totalPages, totalDocs,
  } = useSalesFilters();

  /* ── Effects ── */
  useEffect(() => { fetchStaff(); }, [fetchStaff]);

  useEffect(() => {
    if (isFormOpen) fetchAllForPOS();
  }, [isFormOpen, fetchAllForPOS]);

  useEffect(() => {
    if (!isScannerOpen && isFormOpen) setTimeout(() => searchInputRef.current?.focus(), 100);
  }, [isScannerOpen, isFormOpen]);

  /* ── cancelForm ── */
  const cancelForm = useCallback(() => {
    setIsFormOpen(false);
    setIsCartOpen(false);
    resetCart();
  }, [resetCart]);

  /* ── Barcode scan ── */
  const handleBarcodeScan = useCallback(async (code, qty = 1) => {
    const notifyExpiration = (prod) => {
      const info = getExpirationInfo(prod.expiration_date);
      if (!info) return;
      if (info.status === "expired")
        toast.error(`⚠️ ${prod.name} está VENCIDO (${info.label})`, { duration: 5000 });
      else if (info.status === "warning")
        toast(`${prod.name} vence pronto — ${info.days} días restantes`, { icon: "⚠️", duration: 4000 });
    };
    const local = posProducts.find((p) => p.barcode === code || p._id === code);
    if (local) {
      handleAddItem(local, qty);
      toast.success(`Añadido: ${qty}x ${local.name}`);
      notifyExpiration(local);
      setSearchTerm("");
      return;
    }
    try {
      const res = await fetchProductByBarcode(code);
      const product = res?.product || res;
      if (product?._id) {
        handleAddItem(product, qty);
        toast.success(`Añadido: ${qty}x ${product.name}`);
        notifyExpiration(product);
        setSearchTerm("");
      } else throw new Error();
    } catch { toast.error(`Código "${code}" no encontrado`); }
  }, [posProducts, handleAddItem, fetchProductByBarcode]);

  /* ── Submit venta ── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (items.length === 0) return toast.error("Agrega al menos un artículo");
    const total_amount = items.reduce((a, i) => a + itemSubtotal(i), 0);
    try {
      await createSale({
        customer_id: user?._id || user?.id, payment_method: paymentMethod, total_amount,
        exchange_rate: exchangeRate,
        items: items.map((i) => ({ product_id: i.product_id, quantity: parseFloat(i.quantity) || 0, unit_price: i.unit_price })),
      });
      toast.success("Venta registrada con éxito");
      cancelForm();
      fetchAllForPOS();
    } catch (err) { toast.error(err?.response?.data?.message || error || "Error al registrar la venta"); }
  };

  const handleViewDetail = async (id) => {
    try { setViewedSale(await fetchSaleById(id)); }
    catch { toast.error("No se pudo cargar el detalle de la venta"); }
  };

  const handleCancelSale = async (id) => {
    if (!window.confirm("¿Estás seguro de que deseas anular esta venta? El stock será devuelto y el monto quedará en 0.")) return;
    try {
      await cancelSale(id);
      toast.success("Venta anulada con éxito");
      setViewedSale(null);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Error al anular la venta");
    }
  };

  const handleUpdateSale = async (updateData) => {
    try {
      const updated = await updateSale(viewedSale._id, updateData);
      setViewedSale((prev) => ({ ...prev, ...updated }));
      setIsEditModalOpen(false);
      toast.success("Venta actualizada con éxito");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Error al actualizar la venta");
    }
  };

  /* ── Keyboard ── */
  usePOSKeyboard({
    isFormOpen, viewedSale, showHelp, isScannerOpen, isCartOpen, items,
    setShowHelp, setIsFormOpen, setViewedSale, setIsScannerOpen, setIsCartOpen,
    searchInputRef, submitBtnRef,
    cyclePaymentMethod, clearCart, modifyLastItemQty, handleBarcodeScan, cancelForm,
  });

  /* ── Derived data ── */
  const filteredProducts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return posProducts;
    return posProducts.filter(
      (p) => p.name.toLowerCase().includes(term) ||
        (p.barcode && p.barcode.toLowerCase().includes(term))
    );
  }, [posProducts, searchTerm]);

  /* ── Render ── */
  return (
    <section aria-labelledby="sales-heading" className="w-full max-w-6xl mx-auto p-4 sm:p-6">

      {/* Encabezado */}
      <header className="flex flex-col gap-4 mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 id="sales-heading" className="text-2xl sm:text-3xl font-bold text-white tracking-wide">
            {user?.role === "employee"
              ? <>Mis <span className="text-orange-500">Ventas</span></>
              : <>Punto de <span className="text-orange-500">Venta</span></>
            }
          </h2>
          {!isFormOpen && !viewedSale && (
            <Button variant="primary" onClick={() => setIsFormOpen(true)} className="w-full sm:w-auto">
              <Plus size={20} /> Nueva Venta <KBD>F2</KBD>
            </Button>
          )}
        </div>
        <ExchangeRateBar />
      </header>

      {/* POS fullscreen */}
      <AnimatePresence>
        {isFormOpen && (
          <SalePOSForm
            items={items}
            onCancel={cancelForm}
            onAddItem={handleAddItem}
            onRemoveItem={handleRemoveItem}
            onQtyChange={handleQtyChange}
            onSubmit={handleSubmit}
            paymentMethod={paymentMethod}
            onPaymentChange={setPaymentMethod}
            isLoading={isLoading || isPosLoading}
            currentTotal={currentTotal}
            toBs={toBs}
            filteredProducts={filteredProducts}
            searchTerm={searchTerm}
            onSearch={setSearchTerm}
            onOpenScanner={() => setIsScannerOpen(true)}
            cartPulse={cartPulse}
            submitBtnRef={submitBtnRef}
            paymentSelectRef={paymentSelectRef}
            searchInputRef={searchInputRef}
            isCartOpen={isCartOpen}
            setIsCartOpen={setIsCartOpen}
          />
        )}
      </AnimatePresence>

      {/* Detalle de venta */}
      {viewedSale && !isFormOpen && (
        <SaleDetailView
          sale={viewedSale}
          onBack={() => setViewedSale(null)}
          toBs={toBs}
          userRole={user?.role}
          onCancel={() => handleCancelSale(viewedSale._id)}
          onEdit={() => setIsEditModalOpen(true)}
        />
      )}

      {/* Error */}
      {error && !isFormOpen && !viewedSale && (
        <p role="alert" className="p-4 mb-6 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm">{error}</p>
      )}

      {/* Historial */}
      {!isFormOpen && !viewedSale && (
        <>
          {/* Filtros */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3 flex-wrap">

              {/* Selector de fecha */}
              {user?.role === "employee" ? (
                <div>
                </div>
              ) : (
                <div className="relative" ref={datePickerRef}>
                  <button
                    type="button"
                    onClick={() => setIsDatePickerOpen((p) => !p)}
                    aria-expanded={isDatePickerOpen}
                    aria-haspopup="true"
                    aria-label={`Filtrar por fecha: ${activeDateLabel}`}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all
                      ${dateFilter !== "all" || dateFrom
                        ? "bg-orange-500/15 border-orange-500/40 text-orange-400"
                        : "bg-[#1a1a24] border-white/10 text-gray-300 hover:border-orange-500/40 hover:text-orange-400"}`}
                  >
                    <Calendar size={16} aria-hidden="true" />
                    <span className="max-w-[160px] truncate">{activeDateLabel}</span>
                    <ChevronDown size={14} className={`transition-transform duration-200 ${isDatePickerOpen ? "rotate-180" : ""}`} />
                  </button>

                  <AnimatePresence>
                    {isDatePickerOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -6, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.97 }}
                        transition={{ duration: 0.15 }}
                        className="absolute top-full mt-2 left-0 z-50 bg-[#1a1a24] border border-white/10 rounded-2xl shadow-2xl shadow-black/60 p-4 min-w-[260px]"
                      >
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Período rápido</p>
                        <div className="grid grid-cols-2 gap-1.5 mb-4">
                          {DATE_FILTER_OPTIONS.map((opt) => (
                            <button
                              key={opt.value} type="button"
                              onClick={() => { setDateFilter(opt.value); setDateFrom(""); setDateTo(""); setCurrentPage(1); setIsDatePickerOpen(false); }}
                              className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all
                                ${dateFilter === opt.value && !dateFrom
                                  ? "bg-orange-500 text-black shadow-[0_0_10px_rgba(249,115,22,0.3)]"
                                  : "bg-white/5 text-gray-300 hover:bg-orange-500/20 hover:text-orange-400 border border-white/5"}`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>

                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Rango personalizado</p>
                        <div className="flex flex-col gap-2">
                          <div>
                            <label htmlFor="date-from" className="text-xs text-gray-400 mb-1 block">Desde</label>
                            <input id="date-from" type="date" value={dateFrom}
                              onChange={(e) => setDateFrom(e.target.value)}
                              className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-orange-500 focus:outline-none transition" />
                          </div>
                          <div>
                            <label htmlFor="date-to" className="text-xs text-gray-400 mb-1 block">Hasta</label>
                            <input id="date-to" type="date" value={dateTo} min={dateFrom}
                              onChange={(e) => setDateTo(e.target.value)}
                              className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-orange-500 focus:outline-none transition" />
                          </div>
                          <Button variant="primary" size="sm" type="button"
                            disabled={!dateFrom || !dateTo}
                            onClick={() => { setDateFilter("custom"); setCurrentPage(1); setIsDatePickerOpen(false); }}
                            className="mt-1">
                            <Check size={14} className="mr-1" /> Aplicar rango
                          </Button>
                          {(dateFilter !== "all" || dateFrom) && (
                            <button type="button"
                              onClick={() => { setDateFilter("all"); setDateFrom(""); setDateTo(""); setCurrentPage(1); setIsDatePickerOpen(false); }}
                              className="text-xs text-gray-500 hover:text-gray-300 text-center py-1 transition">
                              Limpiar filtro
                            </button>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Filtro por Método de Pago */}
              {user?.role !== "employee" && (
                <div className="flex items-center gap-2">
                  <label htmlFor="payment-filter" className="sr-only">Filtrar por método de pago</label>
                  <select
                    id="payment-filter"
                    aria-label="Filtrar por método de pago"
                    value={paymentFilter}
                    onChange={(e) => { setPaymentFilter(e.target.value); setCurrentPage(1); }}
                    className="bg-[#1a1a24] border border-white/10 rounded-xl px-3 py-1.5 text-sm text-gray-300 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition outline-none cursor-pointer"
                  >
                    <option value="all">Todos los pagos</option>
                    <option value="Efectivo">Efectivo</option>
                    <option value="Divisas">Divisas</option>
                    <option value="BioPago">BioPago</option>
                    <option value="Tarjeta">Tarjeta</option>
                    <option value="Pago Movil">Pago Móvil</option>
                    <option value="Transferencia">Transferencia</option>
                    <option value="Zelle">Zelle</option>
                  </select>
                </div>
              )}

              {/* Filtro por vendedor */}
              {user?.role !== "employee" && (
                <div className="flex items-center gap-2">
                  <label htmlFor="seller-filter" className="sr-only">Filtrar por vendedor</label>
                  <select
                    id="seller-filter"
                    aria-label="Filtrar por vendedor"
                    value={sellerFilter || ""}
                    onChange={(e) => { setSellerFilter(e.target.value || null); setCurrentPage(1); }}
                    className="bg-[#1a1a24] border border-white/10 rounded-xl px-3 py-1.5 text-sm text-gray-300 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition outline-none cursor-pointer"
                  >
                    <option value="">Todos los vendedores</option>
                    {staff.map((emp) => (
                      <option key={emp._id} value={emp._id}>{emp.name}</option>
                    ))}
                  </select>
                  {sellerFilter && (
                    <div className="flex items-center gap-1.5 bg-orange-500/10 border border-orange-500/20 text-orange-400 px-3 py-1.5 rounded-xl text-xs font-medium">
                      <span>Filtrando: {staff.find((e) => e._id === sellerFilter)?.name || "Vendedor"}</span>
                      <button onClick={() => { setSellerFilter(null); setCurrentPage(1); }} aria-label="Limpiar filtro de vendedor" className="hover:text-white transition"><X size={14} /></button>
                    </div>
                  )}
                </div>
              )}
            </div>


          </div>

          {/* ── Resumen de Ventas ── */}
          {(() => {
            const seller = sellerFilter ? staff.find((e) => e._id === sellerFilter) : null;
            const initial = seller ? seller?.name?.charAt(0).toUpperCase() : "Σ";
            const sellerName = seller ? seller.name : "Todas las ventas";
            return (
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 mb-4
                bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-transparent
                border border-orange-500/25 rounded-2xl">
                <div className="w-11 h-11 rounded-full bg-orange-500/20 border border-orange-500/40
                  flex items-center justify-center text-orange-400 font-bold text-xl shrink-0">
                  {initial}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400 uppercase tracking-widest mb-0.5">
                    {seller ? "Vendedor" : "Resumen Global"}
                  </p>
                  <p className="text-white font-bold text-base truncate">{sellerName}</p>
                  <p className="text-xs text-orange-400/70 mt-0.5">{activeDateLabel}</p>
                </div>
                <div className="flex gap-6 sm:gap-8">
                  <div className="text-center">
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-0.5">Ventas</p>
                    <p className="text-2xl font-extrabold text-white">{totalDocs}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-0.5">Total</p>
                    <p className="text-2xl font-extrabold text-amber-500">{fmtUSD(filteredTotal)}</p>
                    <p className="text-xs text-blue-400">{fmtBs(filteredTotal, toBs)}</p>
                  </div>
                </div>
                {sellerFilter && (
                  <button
                    onClick={() => { setSellerFilter(null); setCurrentPage(1); }}
                    aria-label="Quitar filtro de vendedor"
                    className="text-gray-500 hover:text-white transition p-1 shrink-0"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            );
          })()}

          <DataTable
            columns={buildHistoryColumns(handleViewDetail, toBs)}
            data={sales}
            isLoading={isLoading}
            emptyMessage={sales.length === 0 ? "Aún no hay ventas" : "Sin ventas en este período"}
            emptyIcon={<ShoppingCart size={30} />}
            emptyDetail={sales.length === 0 ? "El historial de ventas está vacío." : "No se encontraron ventas con el filtro seleccionado."}
            emptyAction={sales.length > 0 ? { label: "Ver todas las ventas", onClick: () => setDateFilter("all") } : undefined}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </>
      )}

      {/* Escáner de cámara */}
      <BarcodeScanner
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleBarcodeScan}
        continuous={isFormOpen}
      />

      {/* Help modal F1 */}
      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />

      {/* Modal de edición de venta */}
      <EditSaleModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        sale={viewedSale}
        onSave={handleUpdateSale}
        isLoading={isLoading}
      />

      {/* Botón flotante de ayuda */}
      {!isFormOpen && !viewedSale && (
        <div className="fixed bottom-6 right-6 z-40">
          <button
            onClick={() => setShowHelp(true)}
            aria-label="Ver atajos de teclado"
            className="flex items-center gap-2 px-3 py-2 bg-[#1a1a24]/90 border border-white/10 rounded-xl text-gray-400 hover:text-orange-400 hover:border-orange-500/30 transition backdrop-blur-sm shadow-lg"
          >
            <HelpCircle size={18} />
            <span className="text-xs font-medium">Atajos</span>
            <KBD>F1</KBD>
          </button>
        </div>
      )}
    </section>
  );
};

export default SalesManager;
