import React, { useState } from "react";
import {
  LeadItem,
  convertLeadToUser,
  updateLead,
} from "../../services/adminApi";

interface LeadsPanelProps {
  leads: LeadItem[];
  onRefresh: () => Promise<void>;
  onNotify: (msg: string) => void;
  onError: (msg: string) => void;
}

export const LeadsPanel: React.FC<LeadsPanelProps> = ({
  leads,
  onRefresh,
  onNotify,
  onError,
}) => {
  const [convertedCreds, setConvertedCreds] = useState<{
    email: string;
    tempPassword: string | null;
  } | null>(null);

  const handleStatusChange = async (
    id: string,
    status: NonNullable<LeadItem["status"]>
  ) => {
    try {
      await updateLead(id, { status });
      onNotify(`Lead actualizado a ${status}.`);
      await onRefresh();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Error actualizando lead");
    }
  };

  const handleConvert = async (id: string) => {
    try {
      const res = await convertLeadToUser(id);
      setConvertedCreds({
        email: res.user.email,
        tempPassword: res.tempPassword,
      });
      onNotify(
        res.alreadyExisted
          ? "El usuario ya existía; lead marcado como CONVERTED."
          : "Lead convertido en cuenta activa."
      );
      await onRefresh();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Error convirtiendo lead");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {convertedCreds && (
        <div className="alert-success">
          <strong>Cuenta creada/vinculada:</strong>{" "}
          <span className="mono">{convertedCreds.email}</span>
          {convertedCreds.tempPassword && (
            <>
              {" "}
              &bull; Contraseña temporal:{" "}
              <strong className="mono">{convertedCreds.tempPassword}</strong>
            </>
          )}
        </div>
      )}

      <div className="glass-card table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Contacto</th>
              <th>Plan / Unidades</th>
              <th>Email / Teléfono</th>
              <th>Estado CRM</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((l) => (
              <tr key={l.id}>
                <td>
                  <strong>{l.name}</strong>
                  {l.company && <div className="sub">{l.company}</div>}
                </td>
                <td className="mono">
                  {l.plan} ({l.vehiclesCount} u.)
                </td>
                <td className="mono">
                  {l.email}
                  <div className="sub">{l.phone}</div>
                </td>
                <td>
                  <select
                    className="select-input"
                    style={{ padding: "4px 8px", fontSize: 11.5 }}
                    value={l.status || "NEW"}
                    onChange={(e) =>
                      void handleStatusChange(
                        l.id,
                        e.target.value as NonNullable<LeadItem["status"]>
                      )
                    }
                  >
                    <option value="NEW">NEW</option>
                    <option value="CONTACTED">CONTACTED</option>
                    <option value="DEMO">DEMO</option>
                    <option value="CONVERTED">CONVERTED</option>
                    <option value="DISCARDED">DISCARDED</option>
                  </select>
                </td>
                <td>
                  {l.status !== "CONVERTED" ? (
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => void handleConvert(l.id)}
                    >
                      Convertir a Cliente
                    </button>
                  ) : (
                    <span className="status-pill active">CONVERTIDO</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
