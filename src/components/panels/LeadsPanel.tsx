import React from "react";
import { LeadItem } from "../../services/adminApi";

interface LeadsPanelProps {
  leads: LeadItem[];
}

export const LeadsPanel: React.FC<LeadsPanelProps> = ({ leads }) => {
  return (
    <div className="glass-card table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Contacto</th>
            <th>Empresa</th>
            <th>Plan</th>
            <th>Unidades</th>
            <th>Email / Teléfono</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((l) => (
            <tr key={l.id}>
              <td>
                <strong>{l.name}</strong>
              </td>
              <td>{l.company || "-"}</td>
              <td>{l.plan}</td>
              <td className="mono">{l.vehiclesCount}</td>
              <td className="mono">
                {l.email} &bull; {l.phone}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
