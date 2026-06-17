/**
 * KBD — Indicador visual de tecla de teclado.
 * Átomo reutilizable: muestra una tecla con estilo monoespaciado.
 * Se oculta en pantallas pequeñas (hidden sm:inline-flex).
 */
const KBD = ({ children }) => (
  <kbd className="ml-1.5 hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono font-semibold text-gray-400 bg-black/40 border border-white/10 rounded-md leading-none">
    {children}
  </kbd>
);

export default KBD;
