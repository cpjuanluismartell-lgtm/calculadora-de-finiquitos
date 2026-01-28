
// Valores para 2025-2026
export const UMA_2025 = 113.14; 
export const UMA_2026 = 117.31; // Nueva UMA 2026 (vigente desde Feb)
export const DEFAULT_UMA = 117.31; 

export const DEFAULT_SALARIO_MINIMO = 315.04; // Salario Mínimo General 2026
export const AGUINALDO_DAYS = 15;
export const VACATION_PREMIUM_RATE = 0.25;

// Art. 76 LFT: Días de vacaciones por antigüedad
export const VACATION_DAYS_BY_SENIORITY: { [key: number]: number } = {
  1: 12,
  2: 14,
  3: 16,
  4: 18,
  5: 20,
};

// Tabla de ISR Mensual 2026 (Art. 96 LISR)
export const ISR_MONTHLY_TABLE_2026 = [
  { lowerLimit: 0.01, upperLimit: 844.59, fixedQuota: 0.00, percentage: 0.0192 },
  { lowerLimit: 844.60, upperLimit: 7168.51, fixedQuota: 16.22, percentage: 0.0640 },
  { lowerLimit: 7168.52, upperLimit: 12598.02, fixedQuota: 420.95, percentage: 0.1088 },
  { lowerLimit: 12598.03, upperLimit: 14644.64, fixedQuota: 1011.68, percentage: 0.1600 },
  { lowerLimit: 14644.65, upperLimit: 17533.64, fixedQuota: 1339.14, percentage: 0.1792 },
  { lowerLimit: 17533.65, upperLimit: 35362.83, fixedQuota: 1856.84, percentage: 0.2136 },
  { lowerLimit: 35362.84, upperLimit: 55736.68, fixedQuota: 5665.16, percentage: 0.2352 },
  { lowerLimit: 55736.69, upperLimit: 106410.50, fixedQuota: 10457.09, percentage: 0.3000 },
  { lowerLimit: 106410.51, upperLimit: 141880.66, fixedQuota: 25659.23, percentage: 0.3200 },
  { lowerLimit: 141880.67, upperLimit: 425641.99, fixedQuota: 37009.69, percentage: 0.3400 },
  { lowerLimit: 425642.00, upperLimit: Infinity, fixedQuota: 133488.54, percentage: 0.3500 },
];

// Subsidio al Empleo para 2026 (Basado en UMA y tope de ingresos)
export const SUBSIDY_2026_INCOME_LIMIT = 11492.66;
export const SUBSIDY_2026_PERCENT_JAN = 0.1559; // 15.59%
export const SUBSIDY_2026_PERCENT_FEB_DEC = 0.1502; // 15.02%
export const MONTHLY_FACTOR = 30.4;

// Cuotas IMSS Empleado 2024 (simplificado)
export const IMSS_RATES_EMPLOYEE = {
  ENFERMEDAD_MATERNIDAD_CUOTA_FIJA: 0,
  ENFERMEDAD_MATERNIDAD_EXCEDENTE: 0.004,
  INVALIDEZ_VIDA: 0.00625,
  CESANTIA_VEJEZ: 0.01125,
  PRESTACIONES_DINERO: 0.0025,
  GASTOS_MEDICOS_PENSIONADOS: 0.00375,
};
