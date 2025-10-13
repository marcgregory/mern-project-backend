import { BrowserRouter, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./protected.route";
import AuthRoute from "./auth.route";
import {
  authenticationRoutePaths,
  baseRoutePaths,
  protectedRoutePaths,
} from "./common/routes";
import AppLayout from "@/layout/app.layout";
import BaseLayout from "@/layout/base.layout";
import NotFound from "@/page/errors/NotFound";

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<BaseLayout />}>
          {/* All baseRoutePaths (like /home, /about, etc.) will be rendered inside BaseLayout. */}
          {baseRoutePaths.map((route) => (
            <Route key={route.path} path={route.path} element={route.element} />
          ))}
        </Route>

        <Route path="/" element={<AuthRoute />}>
          {/* AuthRoute acts as a wrapper (a gatekeeper for login/register pages). */}
          {/* It probably checks if the user is already authenticated — */}
          {/* if they are, it redirects to /dashboard; if not, it lets them see login/signup pages. */}
          <Route element={<BaseLayout />}>
            {authenticationRoutePaths.map((route) => (
              <Route
                key={route.path}
                path={route.path}
                element={route.element}
              />
            ))}
          </Route>
        </Route>

        {/* Protected Route */}
        <Route path="/" element={<ProtectedRoute />}>
          {/* ProtectedRoute is another wrapper — it checks if the user is logged in. */}
          <Route element={<AppLayout />}>
            {protectedRoutePaths.map((route) => (
              <Route
                key={route.path}
                path={route.path}
                element={route.element}
              />
            ))}
          </Route>
        </Route>
        {/* Catch-all for undefined routes */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRoutes;
