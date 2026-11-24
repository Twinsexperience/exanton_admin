import React, { useState } from "react";
import { AdminUser, loginAdmin } from "../services/adminApi";

interface AdminLoginProps {
  initialError?: string | null;
  onSuccess: (user: AdminUser) => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({
  initialError = null,
  onSuccess,
}) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(initialError);
  const [loggingIn, setLoggingIn] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoggingIn(true);
    setAuthError(null);
    try {
      const logged = await loginAdmin(email, password);
      onSuccess(logged);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Error de acceso");
    } finally {
      setLoggingIn(false);
    }
  };

  return (
    <div className="center-screen">
      <div className="login-card">
        <div className="brand-header">
          <div className="logo-frame">
            <img src="/logo-warden.png" alt="Exanton Warden" />
          </div>
          <div>
            <h1>EXANTON WARDEN</h1>
            <span className="owner-badge">SOC COMMAND &bull; OWNER</span>
          </div>
        </div>

        {(authError || initialError) && (
          <div className="alert-error">{authError ?? initialError}</div>
        )}

        <form className="login-form" onSubmit={handleLogin} autoComplete="off">
          <div className="field">
            <label htmlFor="adm-email">Correo del Owner (ADMIN)</label>
            <input
              id="adm-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="owner@exanton.com"
              autoComplete="off"
              required
            />
          </div>

          <div className="field">
            <label htmlFor="adm-pass">Contraseña</label>
            <input
              id="adm-pass"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
              required
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={loggingIn}>
            {loggingIn ? "Validando..." : "Entrar al Centro SOC"}
          </button>
        </form>
      </div>
    </div>
  );
};
