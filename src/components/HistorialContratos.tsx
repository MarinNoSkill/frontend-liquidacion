import { useState, useEffect, useMemo } from 'react';
import { Currency, formatCurrency } from '../utils/currency';
import { exportAllHistorialToExcel } from '../utils/exportToExcel';

const API_URL = (import.meta as unknown as { env: Record<string, string> }).env.VITE_API_URL ?? 'http://localhost:4000';

type ContratoRecord = {
  id: number;
  liquidacion_id: number;
  propietario: string;
  propiedad: string;
  huesped: string;
  numero_reserva: string | null;
  ingreso_reserva: number | null;
  mayor_ingreso: number | null;
  menos_comision_airbnb: number | null;
  iva_comision_airbnb: number | null;
  otros_cobros: number | null;
  total: number | null;
  recibido_banco: number | null;
  diferencia: number | null;
  menos_comision: number | null;
  menos_iva_comision: number | null;
  retencion_fuente: number | null;
  total_a_entregar: number | null;
  created_at: string;
};

export default function HistorialContratos({
  onNavigate,
  onLoadContrato,
  currency = 'COP',
}: {
  onNavigate: (view: string) => void;
  onLoadContrato?: (contrato: ContratoRecord) => void;
  currency?: Currency;
}) {
  const fmt = (v: number | null | undefined) => formatCurrency(v, currency);
  const [contratos, setContratos] = useState<ContratoRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportMsg, setExportMsg] = useState('');

  useEffect(() => {
    fetch(`${API_URL}/contratos-propietario`)
      .then(r => {
        if (!r.ok) throw new Error(`Error ${r.status}`);
        return r.json() as Promise<ContratoRecord[]>;
      })
      .then(data => { setContratos(data); setLoading(false); })
      .catch((e: Error) => { setError(e.message || 'Error al cargar'); setLoading(false); });
  }, []);

  const filtered = useMemo(() => contratos.filter(c => {
    const q = search.toLowerCase();
    return !q ||
      (c.propiedad ?? '').toLowerCase().includes(q) ||
      (c.propietario ?? '').toLowerCase().includes(q) ||
      (c.huesped ?? '').toLowerCase().includes(q) ||
      (c.numero_reserva ?? '').toLowerCase().includes(q);
  }), [contratos, search]);

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar este contrato? Esta acción no se puede deshacer.')) return;
    try {
      const res = await fetch(`${API_URL}/contrato-propietario-borrar/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setContratos(prev => prev.filter(c => c.id !== id));
      } else {
        alert('Error al eliminar el contrato');
      }
    } catch {
      alert('No se pudo conectar al backend');
    }
  };

  const handleExportAll = async () => {
    setExporting(true); setExportMsg('');
    try {
      await exportAllHistorialToExcel();
      setExportMsg('Excel descargado correctamente.');
    } catch (e) {
      setExportMsg(`Error al exportar: ${e instanceof Error ? e.message : 'desconocido'}`);
    } finally {
      setExporting(false);
    }
  };

  const handleView = (contrato: ContratoRecord) => {
    if (onLoadContrato) {
      onLoadContrato(contrato);
    } else {
      onNavigate('contrato');
    }
  };

  return (
    <div className="app-layout">
      <div className="app-shell">
        {/* ── HERO ── */}
        <header className="hero-panel" style={{ minHeight: '340px' }}>
          <div className="hero-orb hero-orb-left" style={{ background: 'radial-gradient(circle, rgba(34,197,94,0.25), transparent 65%)' }} />
          <div className="hero-orb hero-orb-right" style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.20), transparent 65%)' }} />
          <div className="hero-content">
            <div className="hero-copy">
              <span className="hero-kicker" style={{ borderColor: 'rgba(74,222,128,0.3)', backgroundColor: 'rgba(74,222,128,0.12)', color: '#86efac' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Historial
              </span>
              <h1>Historial de Liquidaciones Contrato</h1>
              <p>Resumen de todas las liquidaciones de contrato guardadas.</p>
            </div>
            <nav className="main-nav" aria-label="Módulos">
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="button" className="nav-tab nav-tab-single" style={{ flex: '1 1 120px' }} onClick={() => onNavigate('form')}>
                  <span className="nav-tab-title">Liquidación Reserva</span>
                  <span className="nav-tab-text">Flujo completo de liquidación Airbnb.</span>
                </button>
                <button type="button" className="nav-tab nav-tab-single" style={{ flex: '1 1 120px' }} onClick={() => onNavigate('historial')}>
                  <span className="nav-tab-title">Historial</span>
                  <span className="nav-tab-text">Ver todas las liquidaciones guardadas.</span>
                </button>
                <button type="button" className="nav-tab nav-tab-single" style={{ flex: '1 1 120px' }} onClick={() => onNavigate('comision')}>
                  <span className="nav-tab-title">Comisión Zectorem</span>
                  <span className="nav-tab-text">Liquidación de comisiones Zectorem.</span>
                </button>
                <button type="button" className="nav-tab nav-tab-single" style={{ flex: '1 1 120px' }} onClick={() => onNavigate('propietario')}>
                  <span className="nav-tab-title">Liq. Propietario</span>
                  <span className="nav-tab-text">Ingresos y compras del mandante.</span>
                </button>
                <button type="button" className="nav-tab nav-tab-single" style={{ flex: '1 1 120px' }} onClick={() => onNavigate('contrato')}>
                  <span className="nav-tab-title">Liq. Contrato</span>
                  <span className="nav-tab-text">Liquidación contrato mandante.</span>
                </button>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button type="button" className="nav-tab is-active nav-tab-single" style={{ flex: '1 1 100%' }}>
                  <span className="nav-tab-title">Historial Contratos</span>
                  <span className="nav-tab-text">Ver contratos guardados.</span>
                </button>
              </div>
            </nav>
          </div>
        </header>

        {/* ── FILTROS ── */}
        <div className="content-card">
          <div className="module-header" style={{ marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <span className="card-eyebrow">Búsqueda</span>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 900 }}>Filtrar contratos</h2>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
              {exportMsg && (
                <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: exportMsg.startsWith('Error') ? '#dc2626' : '#059669' }}>
                  {exportMsg}
                </span>
              )}
              <button
                type="button"
                onClick={handleExportAll}
                disabled={exporting || contratos.length === 0}
                style={{
                  padding: '0.625rem 1.25rem', borderRadius: '0.625rem',
                  border: '1px solid #bbf7d0', background: '#f0fdf4', color: '#15803d',
                  fontWeight: 700, fontSize: '0.875rem',
                  cursor: exporting || contratos.length === 0 ? 'not-allowed' : 'pointer',
                  opacity: exporting || contratos.length === 0 ? 0.6 : 1,
                }}
              >
                {exporting ? 'Generando…' : 'Descargar Excel (todos)'}
              </button>
            </div>
          </div>
          <div className="hist-filter-bar">
            <div style={{ flex: '1 1 240px' }}>
              <label className="field-label" style={{ display: 'block', marginBottom: '0.375rem' }}>Buscar</label>
              <input type="search" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Propiedad, propietario, huésped, N° reserva…" className="input" />
            </div>
          </div>
          <p style={{ marginTop: '0.875rem', fontSize: '0.8125rem', color: '#64748b', fontWeight: 600 }}>
            {loading ? 'Cargando…' : `${filtered.length} resultado${filtered.length !== 1 ? 's' : ''} de ${contratos.length} en total`}
          </p>
        </div>

        {/* ── TABLA ── */}
        <div className="content-card" style={{ padding: 0, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Cargando historial…</div>
          ) : error ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#dc2626' }}>⚠ {error} — verifica que el backend esté corriendo.</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
              {contratos.length === 0 ? 'No hay liquidaciones de contrato guardadas aún.' : 'Sin resultados para los filtros aplicados.'}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="hist-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Propietario</th>
                    <th>Propiedad</th>
                    <th>Huésped</th>
                    <th>Reserva N°</th>
                    <th>Total a Entregar</th>
                    <th>Fecha</th>
                    <th style={{ textAlign: 'center' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(c => (
                    <tr key={c.id}>
                      <td style={{ color: '#94a3b8', fontSize: '0.75rem' }}>{c.id}</td>
                      <td style={{ fontWeight: 700, color: '#0f172a' }}>{c.propietario || '—'}</td>
                      <td style={{ fontWeight: 600 }}>{c.propiedad || '—'}</td>
                      <td>{c.huesped || '—'}</td>
                      <td style={{ color: '#475569' }}>{c.numero_reserva || '—'}</td>
                      <td style={{ fontWeight: 700, color: '#10b981', whiteSpace: 'nowrap' }}>{fmt(c.total_a_entregar)}</td>
                      <td style={{ fontSize: '0.8rem', color: '#64748b' }}>{new Date(c.created_at).toLocaleDateString('es-CO')}</td>
                      <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <button
                          onClick={() => handleView(c)}
                          style={{
                            padding: '0.4rem 0.875rem',
                            marginRight: '0.5rem',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            background: '#0284c7',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '0.375rem',
                            cursor: 'pointer',
                          }}
                        >
                          Ver
                        </button>
                        <button
                          onClick={() => handleDelete(c.id)}
                          style={{
                            padding: '0.4rem 0.875rem',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            background: '#fef2f2',
                            color: '#dc2626',
                            border: '1px solid #fecaca',
                            borderRadius: '0.375rem',
                            cursor: 'pointer',
                          }}
                        >
                          Borrar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
