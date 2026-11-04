// Freno de gasto diario compartido por las funciones que llaman a la IA.
// Es una segunda barrera: la primera es el límite mensual de US$5 en la consola de Anthropic.

/** Inicio del día en UTC ("2026-11-04T00:00:00.000Z"). */
export function startOfUtcDay(now: Date): string {
  return `${now.toISOString().slice(0, 10)}T00:00:00.000Z`;
}

/** Tope diario en dólares. Por defecto US$0,25 (el mes completo no pasa de unos US$7,5). */
export function dailyLimitUsd(value: string | undefined): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0.25;
}

type RpcClient = {
  rpc: (
    fn: string,
    args: Record<string, unknown>,
  ) => PromiseLike<{ data: unknown; error: unknown }>;
};

/** true si hoy ya se gastó el tope. Si la consulta falla, se frena por precaución. */
export async function overDailyLimit(
  admin: RpcClient,
  limitUsd: number,
  now = new Date(),
): Promise<boolean> {
  const { data, error } = await admin.rpc('ai_spend_since', { p_since: startOfUtcDay(now) });
  if (error) {
    return true;
  }
  return Number(data ?? 0) >= limitUsd;
}
