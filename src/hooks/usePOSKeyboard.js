import { useEffect } from "react";

/**
 * usePOSKeyboard — Handler global de teclado para el POS.
 * Registra/desregistra el listener en window al montar/desmontar.
 * Recibe todo como parámetros para evitar stale closures.
 */
export function usePOSKeyboard({
  isFormOpen, viewedSale, showHelp, isScannerOpen, isCartOpen, items,
  setShowHelp, setIsFormOpen, setViewedSale, setIsScannerOpen, setIsCartOpen,
  searchInputRef, submitBtnRef,
  cyclePaymentMethod, clearCart, modifyLastItemQty, handleBarcodeScan, cancelForm,
}) {
  useEffect(() => {
    let buffer = "", lastKeyTime = Date.now();

    const onKey = (e) => {
      const isInput = ["input", "textarea", "select"].includes(e.target.tagName.toLowerCase());

      switch (e.key) {
        case "F1": e.preventDefault(); setShowHelp((p) => !p); return;
        case "F2": e.preventDefault(); if (!isFormOpen) { setIsFormOpen(true); setViewedSale(null); } return;
        case "F3": e.preventDefault(); if (isFormOpen) searchInputRef.current?.focus(); return;
        case "F4": e.preventDefault(); if (isFormOpen && items.length > 0) !isCartOpen && setIsCartOpen(true); return;
        case "F9":
          e.preventDefault();
          if (isFormOpen && isCartOpen && submitBtnRef.current && items.length > 0)
            submitBtnRef.current.click();
          return;
        case "F5": e.preventDefault(); if (isFormOpen) cyclePaymentMethod(); return;
        case "F6": e.preventDefault(); if (isFormOpen) setIsScannerOpen(true); return;
        case "F8": e.preventDefault(); if (isFormOpen) clearCart(); return;
        case "Escape":
          e.preventDefault();
          if (showHelp)     { setShowHelp(false);     return; }
          if (isScannerOpen){ setIsScannerOpen(false); return; }
          if (viewedSale)   { setViewedSale(null);     return; }
          if (isCartOpen)   { setIsCartOpen(false);    return; }
          if (isFormOpen)   { cancelForm();            return; }
          return;
        default: break;
      }

      if (e.key === "/" && !isInput && isFormOpen) {
        e.preventDefault(); searchInputRef.current?.focus(); return;
      }
      if (!isInput && isFormOpen) {
        if (e.key === "+" || e.key === "=") { e.preventDefault(); modifyLastItemQty(1);  return; }
        if (e.key === "-")                  { e.preventDefault(); modifyLastItemQty(-1); return; }
      }
      // Buffer de escáner físico (caracteres rápidos seguidos de Enter)
      if (!isInput) {
        const now = Date.now();
        if (now - lastKeyTime > 50) buffer = "";
        if (e.key === "Enter") {
          if (buffer.length >= 5) { handleBarcodeScan(buffer); buffer = ""; e.preventDefault(); }
        } else if (e.key.length === 1) {
          buffer += e.key;
        }
        lastKeyTime = now;
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    isFormOpen, viewedSale, showHelp, isScannerOpen, isCartOpen, items,
    setShowHelp, setIsFormOpen, setViewedSale, setIsScannerOpen, setIsCartOpen,
    searchInputRef, submitBtnRef,
    cyclePaymentMethod, clearCart, modifyLastItemQty, handleBarcodeScan, cancelForm,
  ]);
}
