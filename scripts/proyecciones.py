#!/usr/bin/env python3
"""Proyección de usuarios, ingresos y costos de Frescura a 24 meses, en tres escenarios.

Uso:  python3 scripts/proyecciones.py
Imprime tablas en Markdown (se pegan en docs/monetizacion.md). Todos los supuestos están arriba
y se pueden cambiar: son estimaciones, no datos medidos.
"""

USD_CLP = 950  # dólar aproximado
PRICE_MONTH = 1990  # Premium mensual, con IVA incluido
PRICE_YEAR = 14990  # Premium anual, con IVA incluido
ANNUAL_SHARE = 0.4  # parte de los Premium que elige el plan anual
IVA = 0.19  # se descuenta del precio (en Chile los precios a consumidores incluyen IVA)
STORE_FEE = 0.15  # comisión de Google Play en suscripciones
PREMIUM_FROM_MONTH = 4  # se empieza a cobrar en el mes 4 (antes hay que tener el development build)

# Costo de IA por usuario activo al mes (US$). Gratis: ~8 boletas y 2 recetas; Premium: ~3 veces más.
AI_FREE_USD = 0.006
AI_PREMIUM_USD = 0.02
# Supabase gratis hasta 50.000 usuarios activos; después, plan Pro.
SUPABASE_PRO_USD = 25
SUPABASE_FREE_MAU = 50_000

SCENARIOS = {
    # instalaciones del mes 1, crecimiento mensual de instalaciones, parte que queda activa el
    # primer mes, parte de los activos que sigue al mes siguiente, conversión a Premium
    'Pesimista': dict(installs=150, growth=0.05, activation=0.30, retention=0.70, conversion=0.01),
    'Base': dict(installs=400, growth=0.12, activation=0.35, retention=0.78, conversion=0.02),
    'Optimista': dict(installs=800, growth=0.15, activation=0.40, retention=0.82, conversion=0.035),
}


def net_monthly_price() -> float:
    """Lo que queda por cada Premium al mes, después de IVA y comisión de Google."""
    yearly_as_month = PRICE_YEAR / 12
    gross = (1 - ANNUAL_SHARE) * PRICE_MONTH + ANNUAL_SHARE * yearly_as_month
    return gross / (1 + IVA) * (1 - STORE_FEE)


def project(s: dict, months: int = 24) -> list[dict]:
    rows = []
    mau = 0.0
    total_installs = 0.0
    for month in range(1, months + 1):
        installs = s['installs'] * (1 + s['growth']) ** (month - 1)
        total_installs += installs
        mau = mau * s['retention'] + installs * s['activation']
        premium = mau * s['conversion'] if month >= PREMIUM_FROM_MONTH else 0
        revenue = premium * net_monthly_price()
        ai_usd = (mau - premium) * AI_FREE_USD + premium * AI_PREMIUM_USD
        infra_usd = SUPABASE_PRO_USD if mau > SUPABASE_FREE_MAU else 0
        cost = (ai_usd + infra_usd) * USD_CLP
        rows.append(
            dict(
                month=month,
                installs=total_installs,
                mau=mau,
                premium=premium,
                revenue=revenue,
                cost=cost,
                profit=revenue - cost,
            )
        )
    return rows


def clp(value: float) -> str:
    sign = '-' if value < 0 else ''
    return f"{sign}${abs(round(value)):,}".replace(',', '.')


def num(value: float) -> str:
    return f"{round(value):,}".replace(',', '.')


def first_month(rows: list[dict], threshold_clp: float) -> str:
    for r in rows:
        if r['profit'] >= threshold_clp:
            return f"mes {r['month']}"
    return 'no en 24 meses'


def main() -> None:
    print(f"Precio neto por Premium al mes: {clp(net_monthly_price())}\n")
    for name, s in SCENARIOS.items():
        rows = project(s)
        print(f"### Escenario {name.lower()}\n")
        print('| Mes | Instalaciones (total) | Activos al mes | Premium | Ingresos | Costo IA e infra | Resultado |')
        print('| --- | --- | --- | --- | --- | --- | --- |')
        for r in rows:
            if r['month'] in (1, 3, 6, 9, 12, 18, 24):
                print(
                    f"| {r['month']} | {num(r['installs'])} | {num(r['mau'])} | {num(r['premium'])} | "
                    f"{clp(r['revenue'])} | {clp(r['cost'])} | {clp(r['profit'])} |"
                )
        year1 = sum(r['profit'] for r in rows[:12])
        year2 = sum(r['profit'] for r in rows[12:])
        print(
            f"\nResultado del año 1: {clp(year1)} · año 2: {clp(year2)} · cubre US$100 al mes "
            f"({clp(100 * USD_CLP)}): {first_month(rows, 100 * USD_CLP)} · US$200: "
            f"{first_month(rows, 200 * USD_CLP)}\n"
        )


if __name__ == '__main__':
    main()
