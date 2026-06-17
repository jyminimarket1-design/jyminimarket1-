import { useAuthStore } from "../store/authStore";

const PermissionGuard = ({ requiredPermission, children, fallback = null }) => {
  const { user } = useAuthStore();

  if (!user) return fallback;

  // Dueños y Admins ven todo
  // Nota (Bug #12): Históricamente el rol "customer" ha representado al propietario 
  // de la cuenta SaaS. Si se introduce un rol real de cliente final, este guard deberá actualizarse.
  if (user.role === "customer" || user.role === "admin") {
    return children;
  }

  // Empleados verifican su lista de permisos
  if (user.role === "employee") {
    if (!requiredPermission || (user.permissions && user.permissions.includes(requiredPermission))) {
      return children;
    }
  }

  return fallback;
};

export default PermissionGuard;
