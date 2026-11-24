import React, { useState } from "react";
import { AdminDocument, fetchDocumentFilePreview } from "../../services/adminApi";

interface DocumentsPanelProps {
  documents: AdminDocument[];
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  onReview: (id: string, decision: "APPROVED" | "REJECTED") => Promise<void>;
  onError: (msg: string) => void;
}

export const DocumentsPanel: React.FC<DocumentsPanelProps> = ({
  documents,
  statusFilter,
  onStatusFilterChange,
  onReview,
  onError,
}) => {
  const [preview, setPreview] = useState<{
    title: string;
    url: string;
    mimeType: string;
    isBlob: boolean;
  } | null>(null);

  const closePreview = () => {
    if (preview?.isBlob) {
      URL.revokeObjectURL(preview.url);
    }
    setPreview(null);
  };

  const handleOpenPreview = async (doc: AdminDocument) => {
    try {
      const res = await fetchDocumentFilePreview(doc.id);
      setPreview({
        title: `${doc.docType} • ${doc.originalName}`,
        url: res.url,
        mimeType: res.mimeType,
        isBlob: res.isBlob,
      });
    } catch (err) {
      onError(err instanceof Error ? err.message : "Error abriendo documento");
    }
  };

  return (
    <>
      <div className="glass-card">
        <div className="card-head">
          <h3>Documentación de Alta &amp; KYC</h3>
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            className="select-input"
          >
            <option value="ALL">Todos</option>
            <option value="PENDING">Pendientes</option>
            <option value="APPROVED">Aprobados</option>
            <option value="REJECTED">Rechazados</option>
          </select>
        </div>
        {documents.length === 0 ? (
          <p className="muted">No hay documentos en este filtro.</p>
        ) : (
          <div className="list-col">
            {documents.map((d) => (
              <div key={d.id} className="item-row">
                <div>
                  <strong>{d.docType}</strong> &bull; {d.originalName}
                  <div className="sub mono">
                    {d.user?.fullName} ({d.user?.email}) &bull;{" "}
                    <span className={`status-pill ${d.status.toLowerCase()}`}>
                      {d.status}
                    </span>
                  </div>
                </div>
                <div className="row-actions">
                  <button
                    type="button"
                    className="btn btn-glass btn-sm"
                    onClick={() => void handleOpenPreview(d)}
                  >
                    Ver Archivo
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => void onReview(d.id, "APPROVED")}
                  >
                    Aprobar
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost-danger btn-sm"
                    onClick={() => void onReview(d.id, "REJECTED")}
                  >
                    Rechazar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {preview && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          onClick={closePreview}
        >
          <div
            className="login-card"
            style={{ maxWidth: 760, width: "95%", maxHeight: "90dvh" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="card-head" style={{ marginBottom: 12 }}>
              <h3>{preview.title}</h3>
              <button
                type="button"
                className="btn btn-glass btn-sm"
                onClick={closePreview}
              >
                Cerrar
              </button>
            </div>
            {preview.mimeType.includes("pdf") ? (
              <iframe
                src={preview.url}
                title={preview.title}
                style={{ width: "100%", height: "68dvh", border: "none", borderRadius: 8 }}
              />
            ) : (
              <img
                src={preview.url}
                alt={preview.title}
                style={{
                  width: "100%",
                  maxHeight: "68dvh",
                  objectFit: "contain",
                  borderRadius: 8,
                }}
              />
            )}
          </div>
        </div>
      )}
    </>
  );
};
