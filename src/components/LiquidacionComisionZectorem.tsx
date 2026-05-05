import { useState, useEffect, useMemo } from 'react';
import { Currency, formatCurrency } from '../utils/currency';

const API_URL = (import.meta as unknown as { env: Record<string, string> }).env.VITE_API_URL ?? 'http://localhost:4000';

type ComisionRecord = {
  liquidacion_id: number;
  fecha: string;
  propiedad: string;
  propietario: string | null;
  responsable_iva: boolean;
  huesped: string;
  numero_reserva: string | null;
  confirmacion_total: number | null;
  total_liquidado: number | null;
  comision_id: number | null;
  base_comision: number | null;
  comision: number | null;
  iva_comision_19: number | null;
  porcentaje_retencion: number | null;
  retencion_fuente: number | null;
  total_comision: number | null;
  estado: 'pendiente' | 'listo';
};

const fmtDate = (d: string) => {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
};

export default function LiquidacionComisionZectorem({ onNavigate, currency = 'COP' }: { onNavigate: (view: string) => void; currency?: Currency }) {
  const fmt = (v: number | null | undefined) => formatCurrency(v, currency);

  const [records, setRecords]     = useState<ComisionRecord[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [view, setView]           = useState<'list' | 'form'>('list');
  const [filterMode, setFilterMode] = useState<'todas' | 'pendientes' | 'comisionadas'>('todas');
  const [selected, setSelected]   = useState<ComisionRecord | null>(null);
  const [pctInput, setPctInput]   = useState('');
  const [saving, setSaving]       = useState(false);
  const [saveMsg, setSaveMsg]     = useState('');
  const [search, setSearch]       = useState('');

  useEffect(() => {
    fetch(`${API_URL}/comisiones-zectorem`)
      .then(r => {
        if (!r.ok) throw new Error(`Error ${r.status}`);
        return r.json() as Promise<ComisionRecord[]>;
      })
      .then(data => { setRecords(data); setLoading(false); })
      .catch((e: Error) => { setError(e.message || 'Error al cargar'); setLoading(false); });
  }, []);

  const filtered = useMemo(() => records.filter(r => {
    if (filterMode === 'comisionadas' && r.estado !== 'listo') return false;
    if (filterMode === 'pendientes'   && r.estado !== 'pendiente') return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (r.propiedad ?? '').toLowerCase().includes(q) ||
      (r.huesped    ?? '').toLowerCase().includes(q) ||
      (r.propietario ?? '').toLowerCase().includes(q) ||
      (r.numero_reserva ?? '').toLowerCase().includes(q)
    );
  }), [records, filterMode, search]);

  const openForm = (record: ComisionRecord) => {
    setSelected(record);
    setPctInput('');
    setSaveMsg('');
    setView('form');
  };

  // ── Cálculos (usados solo en vista form) ──
  const baseComision   = selected?.confirmacion_total ?? 0;
  const comision       = baseComision * 0.15;
  const ivaComision19  = comision * 0.19;
  const pctNum         = parseFloat(pctInput) || 0;
  const retencionFuente = selected?.responsable_iva ? (pctNum / 100) * comision : 0;
  const totalComision  = selected?.responsable_iva
    ? comision + ivaComision19 - retencionFuente
    : comision + ivaComision19;

  const handleGuardar = async () => {
    if (!selected) return;
    if (selected.responsable_iva && !pctInput) {
      setSaveMsg('Ingresa el porcentaje de retención en la fuente.');
      return;
    }
    setSaving(true);
    setSaveMsg('');
    try {
      const r = await fetch(`${API_URL}/comisiones-zectorem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          liquidacionId:       selected.liquidacion_id,
          baseComision,
          comision,
          ivaComision19,
          porcentajeRetencion: selected.responsable_iva ? pctNum : null,
          retencionFuente:     selected.responsable_iva ? retencionFuente : null,
          totalComision,
        }),
      });
      const json = await r.json() as { success?: boolean; error?: string };
      if (json.success) {
        setRecords(prev => prev.map(rec =>
          rec.liquidacion_id === selected.liquidacion_id
            ? {
                ...rec,
                estado:              'listo',
                comision_id:         -1,
                base_comision:       baseComision,
                comision:            comision,
                iva_comision_19:     ivaComision19,
                porcentaje_retencion: selected.responsable_iva ? pctNum : null,
                retencion_fuente:    selected.responsable_iva ? retencionFuente : null,
                total_comision:      totalComision,
              }
            : rec
        ));
        setSaveMsg('¡Comisión guardada correctamente!');
        setTimeout(() => setView('list'), 1400);
      } else {
        setSaveMsg(`Error: ${json.error ?? 'desconocido'}`);
      }
    } catch {
      setSaveMsg('No se pudo conectar al backend.');
    } finally {
      setSaving(false);
    }
  };

  // ── NAV TABS compartidos ──
  const navTabs = (
    <nav className="main-nav" aria-label="Módulos">
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button type="button" className="nav-tab nav-tab-single" style={{ flex: '1 1 130px' }} onClick={() => onNavigate('form')}>
          <span className="nav-tab-title">Liquidación Reserva</span>
          <span className="nav-tab-text">Flujo completo de liquidación Airbnb.</span>
        </button>
        <button type="button" className="nav-tab nav-tab-single" style={{ flex: '1 1 130px' }} onClick={() => onNavigate('historial')}>
          <span className="nav-tab-title">Historial</span>
          <span className="nav-tab-text">Ver todas las liquidaciones guardadas.</span>
        </button>
        <button type="button" className="nav-tab is-active nav-tab-single" style={{ flex: '1 1 130px' }}>
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
  );

  // ══════════════════════════════════════════
  //  VISTA DETALLE / FORMULARIO
  // ══════════════════════════════════════════
  if (view === 'form' && selected) {
    return (
      <div className="app-layout">
        <div className="app-shell">

          <header className="hero-panel">
            <div className="hero-orb hero-orb-left"  style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.22), transparent 65%)' }} />
            <div className="hero-orb hero-orb-right" style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.18), transparent 65%)' }} />
            <div className="hero-content">
              <div className="hero-copy">
                <span className="hero-kicker" style={{ borderColor: 'rgba(52,211,153,0.3)', backgroundColor: 'rgba(52,211,153,0.12)', color: '#6ee7b7' }}>
                  Comisión Zectorem
                </span>
                <h1>Liquidación de Comisión</h1>
                <p>Calcula y registra la comisión Zectorem para la reserva seleccionada.</p>
              </div>
              <nav className="main-nav" aria-label="Módulos">
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button type="button" className="nav-tab nav-tab-single" style={{ flex: 1 }} onClick={() => setView('list')}>
                    <span className="nav-tab-title">← Volver al listado</span>
                    <span className="nav-tab-text">Cancelar y regresar.</span>
                  </button>
                </div>
              </nav>
            </div>
          </header>

          {/* INFO RESERVA */}
          <div className="content-card">
            <div className="module-header" style={{ marginBottom: '1.25rem' }}>
              <div>
                <span className="card-eyebrow">Reserva seleccionada</span>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 900 }}>{selected.propiedad}</h2>
              </div>
              <span className="module-badge">{fmtDate(selected.fecha)}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.75rem' }}>
              {[
                { label: 'Propietario',       value: selected.propietario || '—' },
                { label: 'Huésped',           value: selected.huesped || '—' },
                { label: 'N° Reserva',        value: selected.numero_reserva || '—' },
                { label: 'Confirmación Total', value: fmt(selected.confirmacion_total) },
                { label: 'IVA Responsable',   value: selected.responsable_iva ? 'Sí' : 'No' },
              ].map(item => (
                <div key={item.label} style={{
                  background: '#f8fafc', borderRadius: '0.75rem',
                  padding: '0.875rem 1rem', border: '1px solid #e2e8f0',
                }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', marginBottom: '0.25rem' }}>
                    {item.label}
                  </div>
                  <div style={{ fontWeight: 800, color: '#0f172a' }}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* CÁLCULO */}
          <div className="content-card">
            <div className="module-header" style={{ marginBottom: '1.5rem' }}>
              <div>
                <span className="card-eyebrow">Cálculo</span>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 900 }}>Comisión Zectorem</h2>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '500px' }}>

              {/* BASE COMISION EXTRANJERO */}
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '0.875rem', padding: '1rem 1.25rem' }}>
                <div style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#16a34a', marginBottom: '0.3rem' }}>
                  Base Comisión Extranjero
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#15803d' }}>{fmt(baseComision)}</div>
                <div style={{ fontSize: '0.72rem', color: '#86efac', marginTop: '0.2rem' }}>= Confirmación total</div>
              </div>

              {/* COMISION */}
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '0.875rem', padding: '1rem 1.25rem' }}>
                <div style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#1d4ed8', marginBottom: '0.3rem' }}>
                  Comisión
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#1e40af' }}>{fmt(comision)}</div>
                <div style={{ fontSize: '0.72rem', color: '#93c5fd', marginTop: '0.2rem' }}>= Base Comisión × 15%</div>
              </div>

              {/* IVA COMISION 19% */}
              <div style={{ background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: '0.875rem', padding: '1rem 1.25rem' }}>
                <div style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#7c3aed', marginBottom: '0.3rem' }}>
                  IVA Comisión 19%
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#6d28d9' }}>{fmt(ivaComision19)}</div>
                <div style={{ fontSize: '0.72rem', color: '#c4b5fd', marginTop: '0.2rem' }}>= Comisión × 19%</div>
              </div>

              {/* RETENCIÓN EN LA FUENTE — solo si responsable_iva */}
              {selected.responsable_iva && (
                <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '0.875rem', padding: '1rem 1.25rem' }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#c2410c', marginBottom: '0.6rem' }}>
                    Retención en la Fuente
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={pctInput}
                        onChange={e => setPctInput(e.target.value)}
                        placeholder="0.00"
                        className="input"
                        style={{ width: '110px' }}
                      />
                      <span style={{ fontWeight: 800, color: '#7c2d12', fontSize: '1rem' }}>%</span>
                    </div>
                    <span style={{ color: '#94a3b8', fontWeight: 600 }}>=</span>
                    <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#c2410c' }}>{fmt(retencionFuente)}</div>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#fb923c' }}>= Porcentaje ingresado × Comisión</div>
                </div>
              )}

              {/* TOTAL */}
              <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1e3f 100%)', borderRadius: '0.875rem', padding: '1.25rem 1.5rem' }}>
                <div style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', marginBottom: '0.3rem' }}>
                  Total
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 900, color: '#fff' }}>{fmt(totalComision)}</div>
                <div style={{ fontSize: '0.72rem', color: '#475569', marginTop: '0.25rem' }}>
                  {selected.responsable_iva
                    ? '= Comisión + IVA Comisión − Retención en la Fuente'
                    : '= Comisión + IVA Comisión'}
                </div>
              </div>

            </div>

            <div style={{ marginTop: '1.75rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-primary" disabled={saving} onClick={handleGuardar}>
                {saving ? 'Guardando…' : 'Guardar comisión'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setView('list')}>
                Cancelar
              </button>
              {saveMsg && (
                <span style={{
                  fontSize: '0.875rem', fontWeight: 700,
                  color: saveMsg.startsWith('¡') ? '#059669' : '#dc2626',
                }}>
                  {saveMsg}
                </span>
              )}
            </div>
          </div>

        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════
  //  VISTA LISTA
  // ══════════════════════════════════════════
  const pendientes = records.filter(r => r.estado === 'pendiente').length;
  const listos     = records.filter(r => r.estado === 'listo').length;

  return (
    <div className="app-layout">
      <div className="app-shell">

        <header className="hero-panel">
          <div className="hero-orb hero-orb-left"  style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.22), transparent 65%)' }} />
          <div className="hero-orb hero-orb-right" style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.18), transparent 65%)' }} />
          <div className="hero-content">
            <div className="hero-copy">
              <span className="hero-kicker" style={{ borderColor: 'rgba(52,211,153,0.3)', backgroundColor: 'rgba(52,211,153,0.12)', color: '#6ee7b7' }}>
                Comisión Zectorem
              </span>
              <h1>Liquidación Comisión Zectorem</h1>
              <p>Gestiona las comisiones Zectorem. Las filas <strong style={{ color: '#fbbf24' }}>pendientes</strong> son clicables para registrar la comisión.</p>
            </div>
            {navTabs}
          </div>
        </header>

        {/* FILTROS */}
        <div className="content-card">
          <div className="module-header" style={{ marginBottom: '1.25rem' }}>
            <div>
              <span className="card-eyebrow">Gestión</span>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 900 }}>Liquidaciones de comisión</h2>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className={`btn ${filterMode === 'todas' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setFilterMode('todas')}
              >
                Todas
              </button>
              <button
                type="button"
                className={`btn ${filterMode === 'pendientes' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setFilterMode('pendientes')}
              >
                Pendientes
              </button>
              <button
                type="button"
                className={`btn ${filterMode === 'comisionadas' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setFilterMode('comisionadas')}
              >
                Ver liquidaciones comisionadas de Zectorem
              </button>
            </div>
          </div>
          <div>
            <label className="field-label" style={{ display: 'block', marginBottom: '0.375rem' }}>Buscar</label>
            <input
              type="search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Propiedad, huésped, propietario, N° reserva…"
              className="input"
              style={{ maxWidth: '400px' }}
            />
          </div>
          <p style={{ marginTop: '0.875rem', fontSize: '0.8125rem', color: '#64748b', fontWeight: 600 }}>
            {loading
              ? 'Cargando…'
              : `${filtered.length} resultado${filtered.length !== 1 ? 's' : ''} — ${pendientes} pendiente${pendientes !== 1 ? 's' : ''}, ${listos} listo${listos !== 1 ? 's' : ''}`}
          </p>
        </div>

        {/* TABLA */}
        <div className="content-card" style={{ padding: 0, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Cargando…</div>
          ) : error ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#dc2626' }}>⚠ {error} — verifica que el backend esté corriendo.</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
              {records.length === 0 ? 'No hay liquidaciones registradas aún.' : 'Sin resultados para los filtros aplicados.'}
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
                    <th>Reserva N°</th>
                    <th>IVA Resp.</th>
                    <th>Confirm. Total</th>
                    <th>Estado</th>
                    {filterMode === 'comisionadas' && (
                      <>
                        <th>Base Comisión</th>
                        <th>Comisión</th>
                        <th>IVA Com. 19%</th>
                        <th>Retención %</th>
                        <th>Retención</th>
                        <th>Total Comisión</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(r => (
                    <tr
                      key={r.liquidacion_id}
                      onClick={r.estado === 'pendiente' ? () => openForm(r) : undefined}
                      title={r.estado === 'pendiente' ? 'Clic para registrar comisión' : undefined}
                      style={{
                        cursor:     r.estado === 'pendiente' ? 'pointer' : 'default',
                        background: r.estado === 'listo'     ? '#f0fdf4'  : undefined,
                      }}
                    >
                      <td style={{ color: '#94a3b8', fontSize: '0.75rem' }}>{r.liquidacion_id}</td>
                      <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{fmtDate(r.fecha)}</td>
                      <td style={{ fontWeight: 700, color: '#0f172a', minWidth: '120px' }}>{r.propiedad || '—'}</td>
                      <td style={{ minWidth: '110px' }}>{r.propietario || '—'}</td>
                      <td style={{ minWidth: '110px' }}>{r.huesped || '—'}</td>
                      <td style={{ color: '#475569' }}>{r.numero_reserva || '—'}</td>
                      <td style={{ textAlign: 'center' }}>{r.responsable_iva ? 'Sí' : 'No'}</td>
                      <td style={{ fontWeight: 700, color: '#0284c7', whiteSpace: 'nowrap' }}>{fmt(r.confirmacion_total)}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                          padding: '0.2rem 0.65rem', borderRadius: '99px',
                          fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em',
                          background: r.estado === 'pendiente' ? '#fff7ed' : '#f0fdf4',
                          color:      r.estado === 'pendiente' ? '#c2410c' : '#15803d',
                          border:     `1px solid ${r.estado === 'pendiente' ? '#fed7aa' : '#bbf7d0'}`,
                        }}>
                          {r.estado === 'pendiente' ? '● Pendiente' : '✓ Listo'}
                        </span>
                      </td>
                      {filterMode === 'comisionadas' && (
                        <>
                          <td>{fmt(r.base_comision)}</td>
                          <td style={{ fontWeight: 700, color: '#1d4ed8', whiteSpace: 'nowrap' }}>{fmt(r.comision)}</td>
                          <td style={{ color: '#7c3aed', whiteSpace: 'nowrap' }}>{fmt(r.iva_comision_19)}</td>
                          <td style={{ textAlign: 'center' }}>
                            {r.porcentaje_retencion != null ? `${r.porcentaje_retencion}%` : '—'}
                          </td>
                          <td style={{ color: '#c2410c', whiteSpace: 'nowrap' }}>{fmt(r.retencion_fuente)}</td>
                          <td style={{ fontWeight: 900, color: '#0f172a', whiteSpace: 'nowrap' }}>{fmt(r.total_comision)}</td>
                        </>
                      )}
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
