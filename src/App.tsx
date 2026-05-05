import { useState, useEffect } from 'react';
import LiquidacionAirbnb from './components/LiquidacionAirbnb';
import Historial from './components/Historial';
import LiquidacionComisionZectorem from './components/LiquidacionComisionZectorem';
import LiquidacionPropietario from './components/LiquidacionPropietario';
import LiquidacionContrato from './components/LiquidacionContrato';
import { Currency, CURRENCIES, retrieveCurrency, storeCurrency } from './utils/currency';

type View = 'form' | 'historial' | 'comision' | 'propietario' | 'contrato';

function App() {
  const [view, setView] = useState<View>('form');
  const [contratoLiqId, setContratoLiqId] = useState<number | null>(null);
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
      setView('contrato');
    } else {
      setContratoLiqId(null);
      setView(v as View);
    }
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
      {view === 'comision' && <LiquidacionComisionZectorem onNavigate={navigate} currency={currency} />}
      {view === 'propietario' && <LiquidacionPropietario onNavigate={navigate} currency={currency} />}
      {view === 'contrato' && <LiquidacionContrato onNavigate={navigate} liquidacionId={contratoLiqId} currency={currency} />}
      {view === 'form' && <LiquidacionAirbnb onNavigate={navigate} currency={currency} />}
    </>
  );

  return <div style={{ position: 'relative' }}>{appContent}</div>;
}

export default App;
