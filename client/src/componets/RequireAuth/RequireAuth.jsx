import React, { memo } from "react";
import { Outlet, useLocation } from "react-router-dom";
import SoftRedirect from "../SoftRedirect/SoftRedirect";

const RequireAuth = memo(() => {
  const token = localStorage.getItem("token");
  const location = useLocation();

  if (!token) {
    const redirect = encodeURIComponent(location.pathname + location.search);
    return <SoftRedirect to={`/Login?redirect=${redirect}`} replace />;
  }

  return <Outlet />;
});

export default RequireAuth;
