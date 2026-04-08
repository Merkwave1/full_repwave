// src/hooks/useCurrency.js
// React hook to access dynamic currency symbol & code driven by settings in localStorage.
import { useEffect, useState } from 'react';
import { getCurrencyCode, getCurrencySymbol, subscribeCurrency, formatCurrency } from '../utils/currency.js';

export default function useCurrency() {
  const [code, setCode] = useState(() => getCurrencyCode());
  const [symbol, setSymbol] = useState(() => getCurrencySymbol());

  useEffect(() => {
    const update = () => {
      setCode(getCurrencyCode());
      setSymbol(getCurrencySymbol());
    };
    const unsubscribe = subscribeCurrency(update);
    // Immediate re-sync in case changed before mount
    update();
    return () => unsubscribe();
  }, []);

  return { code, symbol, formatCurrency };
}
