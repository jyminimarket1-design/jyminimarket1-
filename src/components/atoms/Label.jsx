const Label = ({ children, className = "", ...props }) => (
  <label className={`block text-sm font-medium text-gray-300 mb-1 ${className}`} {...props}>
    {children}
  </label>
);

export default Label;
