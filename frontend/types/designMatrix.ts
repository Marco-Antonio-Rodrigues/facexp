/**
 * Tipos para a Tabela de Sinais (Design Matrix)
 */

export interface DesignMatrixHeader {
  symbol: string;
  name: string;
  type: 'intercept' | 'factor' | 'interaction' | 'response';
  factor_id?: number;
  data_type?: string;
  factors?: string[];
  level_mapping?: { [key: number]: number };  // {-1: valor_real_baixo, +1: valor_real_alto}
}

export interface DesignMatrixRun {
  run_order: number;
  standard_order: number;
  is_center_point: boolean;
  values: (number | string | null)[];
  values_coded: (number | string | null)[];  // Valores codificados (-1, +1) para 2^k
}

export interface DesignMatrixData {
  headers: DesignMatrixHeader[];
  runs: DesignMatrixRun[];
  totals: (number | null)[];
  means: (number | null)[];
  effects: (number | null)[];
  contributions: (number | null)[];
  n_runs: number;
  is_two_level_factorial: boolean;
}
