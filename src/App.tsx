import { useState, useEffect } from 'react';
import LiquidacionAirbnb from './components/LiquidacionAirbnb';
import Historial from './components/Historial';
import LiquidacionComisionZectorem from './components/LiquidacionComisionZectorem';
import LiquidacionPropietario from './components/LiquidacionPropietario';
import LiquidacionContrato from './components/LiquidacionContrato';
import HistorialContratos from './components/HistorialContratos';
import { Currency, CURRENCIES, retrieveCurrency, storeCurrency } from './utils/currency';

type View = 'form' | 'historial' | 'comision' | 'propietario' | 'contrato' | 'historial-contratos';
type ContratoRecord = {
  id: number;
  liquidacion_id: number;
  propietario: string;
  propiedad: string;
  huesped: string;
  numero_reserva: string | null;
  ingreso_reserva: number | null;
  mayor_ingreso: number | null;
  iva_reserva: number | null;
  menos_comision_airbnb: number | null;
  iva_comision_airbnb: number | null;
  otros_cobros: number | null;
  total: number | null;
  recibido_banco: number | null;
  diferencia: number | null;
  menos_comision: number | null;
  menos_iva_comision: number | null;
  retencion_fuente: number | null;
  gasto_aseo: number | null;
  gasto_mantenimiento: number | null;
  gasto_otros_cobros: number | null;
  gasto_saldo_favor: number | null;
  total_a_entregar: number | null;
  total_recibido_bancolombia: number | null;
  created_at: string;
};

function App() {
  const [view, setView] = useState<View>('form');
  const [contratoLiqId, setContratoLiqId] = useState<number | null>(null);
  const [contratoData, setContratoData] = useState<ContratoRecord | null>(null);
  const [editLiqId, setEditLiqId] = useState<number | null>(null);
  const [currency, setCurrencyState] = useState<Currency>('COP');

  useEffect(() => {
    setCurrencyState(retrieveCurrency());
  }, []);

  const setCurrency = (curr: Currency) => {
    setCurrencyState(curr);
    storeCurrency(curr);
  };

  const navigate = (v: string) => {
    if (v.startsWith('contrato:')) {
      setContratoLiqId(Number(v.split(':')[1]) || null);
      setContratoData(null);
      setEditLiqId(null);
      setView('contrato');
    } else if (v.startsWith('contrato-ver:')) {
      setView('contrato');
    } else if (v.startsWith('form:edit:')) {
      setEditLiqId(Number(v.split(':')[2]) || null);
      setContratoLiqId(null);
      setContratoData(null);
      setView('form');
    } else {
      setContratoLiqId(null);
      setContratoData(null);
      setEditLiqId(null);
      setView(v as View);
    }
  };

  const handleLoadContrato = (contrato: ContratoRecord) => {
    setContratoData(contrato);
    setContratoLiqId(null);
    setView('contrato');
  };

  const currencySelector = (
    <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', zIndex: 50 }}>
      <select
        value={currency}
        onChange={(e) => setCurrency(e.target.value as Currency)}
        style={{
          padding: '0.5rem 0.75rem',
          borderRadius: '0.5rem',
          border: '1px solid #e2e8f0',
          fontSize: '0.875rem',
          fontWeight: 600,
          background: '#fff',
          cursor: 'pointer',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        }}>
        {Object.entries(CURRENCIES).map(([code, config]) => (
          <option key={code} value={code}>
            {config.symbol} {config.name}
          </option>
        ))}
      </select>
    </div>
  );

  const appContent = (
    <>
      {currencySelector}
      {view === 'historial' && <Historial onNavigate={navigate} currency={currency} />}
      {view === 'historial-contratos' && <HistorialContratos onNavigate={navigate} onLoadContrato={handleLoadContrato} currency={currency} />}
      {view === 'comision' && <LiquidacionComisionZectorem onNavigate={navigate} currency={currency} />}
      {view === 'propietario' && <LiquidacionPropietario onNavigate={navigate} currency={currency} />}
      {view === 'contrato' && <LiquidacionContrato onNavigate={navigate} liquidacionId={contratoLiqId} contratoData={contratoData} currency={currency} />}
      {view === 'form' && <LiquidacionAirbnb onNavigate={navigate} currency={currency} editLiquidacionId={editLiqId} />}
    </>
  );

  return <div style={{ position: 'relative' }}>{appContent}</div>;
}

export default App;
