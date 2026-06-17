import { motion } from "framer-motion";
import { X } from "lucide-react";
import Button from "../atoms/Button";

/**
 * Modal Dropdown animado
 * 
 * @param {boolean} isOpen - Controla la visibilidad del componente
 * @param {function} onClose - Función que cierra el modal
 * @param {string|React.ReactNode} title - Título del modal
 * @param {React.ReactNode} children - El formulario o contenido
 * @param {React.ReactNode} icon - Icono que acompaña al título (opcional)
 */
const Modal = ({ isOpen, onClose, title, children, icon }) => {
  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0, scale: 0.95 }}
      animate={{ opacity: 1, height: "auto", scale: 1 }}
      exit={{ opacity: 0, height: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="mb-8 p-4 sm:p-6 bg-[#1a1a24] border border-white/10 rounded-2xl shadow-xl relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 to-transparent pointer-events-none"></div>
      
      <div className="flex justify-between items-center mb-6 relative z-10">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          {icon && <span className="text-orange-500">{icon}</span>}
          {title}
        </h3>
        <Button variant="ghost" onClick={onClose} aria-label="Cerrar ventana">
          <X size={24} />
        </Button>
      </div>

      <div className="relative z-10">
        {children}
      </div>
    </motion.div>
  );
};

export default Modal;
