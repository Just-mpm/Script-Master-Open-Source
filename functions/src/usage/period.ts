// ---------------------------------------------------------------------------
// Serviço de período mensal para créditos
// ---------------------------------------------------------------------------
//
// Calcula períodos mensais no formato 'YYYY-MM' usando apenas Date nativo,
// sem dependência de date-fns para manter o bundle do functions/ leve.
// ---------------------------------------------------------------------------

/**
 * Retorna a chave do período atual no formato 'YYYY-MM'.
 * Exemplo: se hoje é 18 de maio de 2026, retorna '2026-05'.
 */
export function getCurrentPeriodKey(): string {
  return formatPeriodKey(new Date());
}

/**
 * Retorna a chave do próximo período ('YYYY-MM').
 * Exemplo: se o período atual é '2026-05', retorna '2026-06'.
 * Se o mês atual for dezembro, avança o ano (ex: '2026-12' → '2027-01').
 */
export function getNextPeriodKey(): string {
  const now = new Date();
  const nextMonth = now.getMonth() === 11
    ? new Date(now.getFullYear() + 1, 0, 1)
    : new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return formatPeriodKey(nextMonth);
}

/**
 * Retorna o início do período (primeiro dia do mês às 00:00:00.000 UTC).
 */
export function getPeriodStart(periodKey: string): Date {
  const [yearStr, monthStr] = periodKey.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr) - 1; // Date usa meses 0-indexados
  return new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
}

/**
 * Retorna o fim do período (último milissegundo do mês em UTC).
 * Exemplo: para '2026-05', retorna 2026-05-31T23:59:59.999Z.
 */
export function getPeriodEnd(periodKey: string): Date {
  const [yearStr, monthStr] = periodKey.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr); // 1-indexado
  // Cria o primeiro dia do mês seguinte e subtrai 1ms
  const nextMonthFirstDay = month === 12
    ? new Date(Date.UTC(year + 1, 0, 1, 0, 0, 0, 0))
    : new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
  return new Date(nextMonthFirstDay.getTime() - 1);
}

/**
 * Verifica se o mês virou em relação ao último período registrado.
 * Retorna true se o período atual é diferente do último registrado.
 */
export function isNewPeriod(lastPeriodKey: string): boolean {
  const current = getCurrentPeriodKey();
  return current !== lastPeriodKey;
}

// ---------------------------------------------------------------------------
// Helpers internos
// ---------------------------------------------------------------------------

/**
 * Formata uma data como 'YYYY-MM'.
 */
function formatPeriodKey(date: Date): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // Date usa meses 0-indexados
  const monthPadded = String(month).padStart(2, '0');
  return `${year}-${monthPadded}`;
}
