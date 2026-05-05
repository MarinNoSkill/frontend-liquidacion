import { useState, useEffect, useMemo } from 'react';
import { Currency, formatCurrency } from '../utils/currency';

const API_URL = (import.meta as unknown as { env: Record<string, string> }).env.VITE_API_URL ?? 'http://localhost:4000';

type HistorialRecord = {
  liquidacion_id: number;
  fecha: string;
  propiedad: string;
  propietario: string;
  responsable_iva: boolean;
  huesped: string;
  nacionalidad: string | null;
  tipo_documento: string | null;
  numero_documento: string | null;
  numero_reserva: string | null;
  huesped_pago: number | null;
  total_gastos: number | null;
  total_liquidado: number | null;
  confirmacion_total: number | null;
  recibido_neto_banco: number | null;
  otros_cobros: number | null;
};

const fmt = (v: number | null) =>
  formatCurrency(v, currency);

const fmtDate = (d: string) => {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
};

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" style={{ width: '1rem', height: '1rem' }}>
      <path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

export default function Historial({ onNavigate, currency = 'COP' }: { onNavigate: (view: string) => void; currency?: Currency }) {
  const [records, setRecords] = useState<HistorialRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [minVal, setMinVal] = useState('');
  const [maxVal, setMaxVal] = useState('');
  const [deleting, setDeleting] = useState<number | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/historial`)
      .then(r => {
        if (!r.ok) throw new Error(`Error ${r.status}`);
        return r.json() as Promise<HistorialRecord[]>;
      })
      .then(data => { setRecords(data); setLoading(false); })
      .catch((e: Error) => { setError(e.message || 'Error al cargar'); setLoading(false); });
  }, []);

  const filtered = useMemo(() => records.filter(r => {
    const q = search.toLowerCase();
    const matchText = !q ||
      (r.propiedad ?? '').toLowerCase().includes(q) ||
      (r.huesped ?? '').toLowerCase().includes(q) ||
      (r.propietario ?? '').toLowerCase().includes(q) ||
      (r.numero_reserva ?? '').toLowerCase().includes(q) ||
      (r.numero_documento ?? '').toLowerCase().includes(q);
    const matchFrom = !dateFrom || r.fecha >= dateFrom;
    const matchTo   = !dateTo   || r.fecha <= dateTo;
    const val = r.total_liquidado ?? 0;
    const matchMin = !minVal || val >= parseFloat(minVal);
    const matchMax = !maxVal || val <= parseFloat(maxVal);
    return matchText && matchFrom && matchTo && matchMin && matchMax;
  }), [records, search, dateFrom, dateTo, minVal, maxVal]);

  const clearFilters = () => { setSearch(''); setDateFrom(''); setDateTo(''); setMinVal(''); setMaxVal(''); };

  const handleDelete = async (id: number) => {
    if (!window.confirm('¿Seguro que deseas eliminar esta liquidación? Esta acción no se puede deshacer.')) return;
    setDeleting(id);
    try {
      const r = await fetch(`${API_URL}/liquidacion/${id}`, { method: 'DELETE' });
      const json = await r.json() as { success?: boolean; error?: string };
      if (json.success) {
        setRecords(prev => prev.filter(x => x.liquidacion_id !== id));
      } else {
        alert(`Error al eliminar: ${json.error ?? 'desconocido'}`);
      }
    } catch {
      alert('No se pudo conectar al backend.');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="app-layout">
      <div className="app-shell">

        {/* ── HERO ── */}
        <header className="hero-panel">
          <div className="hero-orb hero-orb-left" style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.25), transparent 65%)' }} />
          <div className="hero-orb hero-orb-right" style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.20), transparent 65%)' }} />
          <div className="hero-content">
            <div className="hero-copy">
              <span className="hero-kicker" style={{ borderColor: 'rgba(167,139,250,0.3)', backgroundColor: 'rgba(167,139,250,0.12)', color: '#c4b5fd' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                  <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
                  <rect x="9" y="3" width="6" height="4" rx="1" />
                  <path d="M9 12h6M9 16h4" />
                </svg>
                Historial
              </span>
              <h1>Historial de liquidaciones</h1>
              <p>Consulta, filtra y elimina liquidaciones guardadas en la base de datos.</p>
            </div>
            <nav className="main-nav" aria-label="Módulos">
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button type="button" className="nav-tab nav-tab-single" style={{ flex: '1 1 130px' }} onClick={() => onNavigate('form')}>
                  <span className="nav-tab-title">Liquidación Reserva</span>
                  <span className="nav-tab-text">Flujo completo de liquidación Airbnb.</span>
                </button>
                <button type="button" className="nav-tab is-active nav-tab-single" style={{ flex: '1 1 130px' }}>
                  <span className="nav-tab-title">Historial</span>
                  <span className="nav-tab-text">Ver todas las liquidaciones guardadas.</span>
                </button>
                <button type="button" className="nav-tab nav-tab-single" style={{ flex: '1 1 130px' }} onClick={() => onNavigate('comision')}>
                  <span className="nav-tab-title">Comisión Zectorem</span>
                  <span className="nav-tab-text">Liquidación de comisiones Zectorem.</span>
                </button>
                <button type="button" className="nav-tab nav-tab-single" style={{ flex: '1 1 130px' }} onClick={() => onNavigate('propietario')}>
                  <span className="nav-tab-title">Liq. Propietario</span>
                  <span className="nav-tab-text">Ingresos y compras del mandante.</span>
                </button>
                <button type="button" className="nav-tab nav-tab-single" style={{ flex: '1 1 130px' }} onClick={() => onNavigate('contrato')}>
                  <span className="nav-tab-title">Liq. Contrato</span>
                  <span className="nav-tab-text">Liquidación contrato mandante.</span>
                </button>
              </div>
            </nav>
          </div>
        </header>

        {/* ── FILTROS ── */}
        <div className="content-card">
          <div className="module-header" style={{ marginBottom: '1.25rem' }}>
            <div>
              <span className="card-eyebrow">Búsqueda</span>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 900 }}>Filtrar registros</h2>
            </div>
            <button className="btn btn-secondary" onClick={clearFilters}>Limpiar filtros</button>
          </div>
          <div className="hist-filter-bar">
            <div style={{ flex: '1 1 240px' }}>
              <label className="field-label" style={{ display: 'block', marginBottom: '0.375rem' }}>Buscar</label>
              <input type="search" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Propiedad, huésped, propietario, N° reserva, N° doc…" className="input" />
            </div>
            <div style={{ flex: '0 0 148px' }}>
              <label className="field-label" style={{ display: 'block', marginBottom: '0.375rem' }}>Desde</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="input" />
            </div>
            <div style={{ flex: '0 0 148px' }}>
              <label className="field-label" style={{ display: 'block', marginBottom: '0.375rem' }}>Hasta</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="input" />
            </div>
            <div style={{ flex: '0 0 120px' }}>
              <label className="field-label" style={{ display: 'block', marginBottom: '0.375rem' }}>Monto mín.</label>
              <input type="number" value={minVal} onChange={e => setMinVal(e.target.value)} placeholder="0" className="input" />
            </div>
            <div style={{ flex: '0 0 120px' }}>
              <label className="field-label" style={{ display: 'block', marginBottom: '0.375rem' }}>Monto máx.</label>
              <input type="number" value={maxVal} onChange={e => setMaxVal(e.target.value)} placeholder="∞" className="input" />
            </div>
          </div>
          <p style={{ marginTop: '0.875rem', fontSize: '0.8125rem', color: '#64748b', fontWeight: 600 }}>
            {loading ? 'Cargando…' : `${filtered.length} resultado${filtered.length !== 1 ? 's' : ''} de ${records.length} en total`}
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
              {records.length === 0 ? 'No hay liquidaciones guardadas aún.' : 'Sin resultados para los filtros aplicados.'}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="hist-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Fecha</th>
                    <th>Propiedad</th>
                    <th>Propietario</th>
                    <th>Huésped</th>
                    <th>Nacionalidad</th>
                    <th>Documento</th>
                    <th>N° Documento</th>
                    <th>Reserva N°</th>
                    <th>IVA Responsable</th>
                    <th>Huésped paga</th>
                    <th>Total gastos</th>
                    <th>Total liquidado</th>
                    <th>Confirmación total</th>
                    <th>Recibido neto</th>
                    <th>Otros cobros</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(r => (
                    <tr key={r.liquidacion_id}>
                      <td style={{ color: '#94a3b8', fontSize: '0.75rem' }}>{r.liquidacion_id}</td>
                      <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{fmtDate(r.fecha)}</td>
                      <td style={{ fontWeight: 700, color: '#0f172a', minWidth: '120px' }}>{r.propiedad || '—'}</td>
                      <td style={{ minWidth: '120px' }}>{r.propietario || '—'}</td>
                      <td style={{ minWidth: '110px' }}>{r.huesped || '—'}</td>
                      <td>{r.nacionalidad || '—'}</td>
                      <td>{r.tipo_documento || '—'}</td>
                      <td>{r.numero_documento || '—'}</td>
                      <td style={{ color: '#475569' }}>{r.numero_reserva || '—'}</td>
                      <td style={{ textAlign: 'center' }}>{r.responsable_iva ? 'Sí' : 'No'}</td>
                      <td>{fmt(r.huesped_pago)}</td>
                      <td>{fmt(r.total_gastos)}</td>
                      <td style={{ fontWeight: 700, color: '#0284c7', whiteSpace: 'nowrap' }}>{fmt(r.total_liquidado)}</td>
                      <td>{fmt(r.confirmacion_total)}</td>
                      <td style={{ fontWeight: 600, color: '#059669', whiteSpace: 'nowrap' }}>{fmt(r.recibido_neto_banco)}</td>
                      <td className={r.otros_cobros != null ? 'danger' : ''}>{fmt(r.otros_cobros)}</td>
                      <td style={{ textAlign: 'center', padding: '0.5rem' }}>
                        <button
                          type="button"
                          title="Eliminar registro"
                          disabled={deleting === r.liquidacion_id}
                          onClick={() => handleDelete(r.liquidacion_id)}
                          style={{
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            width: '2rem', height: '2rem', borderRadius: '0.5rem',
                            border: '1px solid #fecaca', backgroundColor: '#fef2f2', color: '#dc2626',
                            cursor: deleting === r.liquidacion_id ? 'not-allowed' : 'pointer',
                            opacity: deleting === r.liquidacion_id ? 0.5 : 1,
                            transition: 'all 0.15s',
                          }}
                        >
                          {deleting === r.liquidacion_id ? '…' : <TrashIcon />}
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
