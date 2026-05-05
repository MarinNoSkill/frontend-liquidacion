export type Currency = 'COP' | 'USD' | 'EUR';

export interface CurrencyConfig {
  code: Currency;
  name: string;
  symbol: string;
  locale: string;
}

export const CURRENCIES: Record<Currency, CurrencyConfig> = {
  COP: {
    code: 'COP',
    name: 'Peso Colombiano',
    symbol: '$',
    locale: 'es-CO',
  },
  USD: {
    code: 'USD',
    name: 'Dólar Estadounidense',
    symbol: '$',
    locale: 'en-US',
  },
  EUR: {
    code: 'EUR',
    name: 'Euro',
    symbol: '€',
    locale: 'es-ES',
  },
};

export const DEFAULT_CURRENCY: Currency = 'COP';

export const formatCurrency = (
  value: number | null | undefined,
  currency: Currency = DEFAULT_CURRENCY
): string => {
  if (value == null) return '-';

  const config = CURRENCIES[currency];
  const formatter = new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency: config.code,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return formatter.format(value);
};

export const getCurrencySymbol = (currency: Currency = DEFAULT_CURRENCY): string => {
  return CURRENCIES[currency].symbol;
};

export const getCurrencyCode = (currency: Currency = DEFAULT_CURRENCY): string => {
  return CURRENCIES[currency].code;
};

export const storeCurrency = (currency: Currency) => {
  localStorage.setItem('selectedCurrency', currency);
};

export const retrieveCurrency = (): Currency => {
  const stored = localStorage.getItem('selectedCurrency');
  return (stored as Currency) || DEFAULT_CURRENCY;
};
