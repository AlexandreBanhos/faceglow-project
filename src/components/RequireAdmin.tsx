import { Navigate, Outlet } from "react-router-dom";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { LoadingScreen } from "./LoadingScreen";

const RequireAdmin = () => {
  const { isAdmin, isLoading } = useIsAdmin();

  if (isLoading) return <LoadingScreen />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  return <Outlet />;
};

export default RequireAdmin;
