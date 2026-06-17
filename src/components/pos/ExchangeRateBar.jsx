import { useState, useEffect } from "react";
import { RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import Button from "../atoms/Button";
import InputText from "../atoms/InputText";
import { useCurrencyStore } from "../../store/currencyStore";

/**
 * ExchangeRateBar — Barra editable de tasa cambiaria USD/Bs.
 * Permite al usuario ver y actualizar la tasa del día en línea.
 * Ahora se conecta de forma autónoma al store.
 */
const ExchangeRateBar = () => {
  const { exchangeRate, loadRateFromServer, saveRateToServer, isLoading } = useCurrencyStore();
  const [editing, setEditing] = useState(false);
  const [temp, setTemp] = useState(exchangeRate);

  useEffect(() => {
    loadRateFromServer();
  }, [loadRateFromServer]);

  useEffect(() => {
    if (!editing) setTemp(exchangeRate);
  }, [exchangeRate, editing]);

  const save = async () => {
    try {
      await saveRateToServer(temp);
      setEditing(false);
      toast.success(`Tasa actualizada: 1 USD = ${temp} Bs`);
    } catch (error) {
      setTemp(exchangeRate);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3 bg-gradient-to-r from-blue-500/10 to-green-500/10 border border-blue-500/20 rounded-xl px-4 py-3">
      <RefreshCw size={18} className={`text-blue-400 shrink-0 ${isLoading ? "animate-spin" : ""}`} aria-hidden="true" />
      <span className="text-sm text-gray-300 whitespace-nowrap">Tasa del Día:</span>

      {editing ? (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">1 USD =</span>
          <InputText type="number" step="0.01" min="0.01" value={temp}
            onChange={(e) => setTemp(e.target.value)}
            disabled={isLoading}
            className="w-28 px-3 py-1 text-sm" autoFocus />
          <span className="text-sm text-gray-400">Bs</span>
          <Button variant="primary" size="sm" onClick={save} disabled={isLoading}>Guardar</Button>
          <Button variant="ghost" size="sm" onClick={() => { setEditing(false); setTemp(exchangeRate); }} disabled={isLoading}>Cancelar</Button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-blue-400">1 USD = {exchangeRate} Bs</span>
          <Button variant="ghost" size="sm" onClick={() => { setEditing(true); setTemp(exchangeRate); }} className="text-gray-300" disabled={isLoading}>
            Editar
          </Button>
        </div>
      )}
    </div>
  );
};

export default ExchangeRateBar;
