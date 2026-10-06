/** Produção FICTÍCIA da aluna de demonstração (mês 14 de 30). */
export const byProcedure = [
  { name: 'Laminado cerâmico', category: 'Restauração indireta', count: 8, unit: 'peças', cohortMedian: 6 },
  { name: 'Resina anterior', category: 'Restauração direta', count: 8, unit: 'dentes', cohortMedian: 9 },
  { name: 'Resina posterior', category: 'Restauração direta', count: 6, unit: 'dentes', cohortMedian: 7 },
  { name: 'Clareamento', category: 'Clareamento', count: 3, unit: 'casos', cohortMedian: 3 },
  { name: 'Onlay', category: 'Restauração indireta', count: 2, unit: 'peças', cohortMedian: 4 },
  { name: 'Faceta em resina', category: 'Restauração direta', count: 1, unit: 'dentes', cohortMedian: 2 },
  { name: 'Coroa', category: 'Restauração indireta', count: 0, unit: 'peças', cohortMedian: 2 },
  { name: 'Outros', category: 'Outros', count: 3, unit: '', cohortMedian: 3 },
]

/** Procedimentos por mês, de fev/2027 a mar/2028. */
export const byMonth = [
  ['2027-02', 0], ['2027-03', 1], ['2027-04', 2], ['2027-05', 1], ['2027-06', 3], ['2027-07', 2], ['2027-08', 5],
  ['2027-09', 2], ['2027-10', 3], ['2027-11', 2], ['2027-12', 1], ['2028-01', 2], ['2028-02', 3], ['2028-03', 4],
] as const
