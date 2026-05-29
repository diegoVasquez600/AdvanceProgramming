export type EvaColumn = {
  displayName: string;
  apiField: string;
  dataType: 'Numero' | 'Texto';
  description: string;
  role: 'entrada_modelo' | 'proxy_bloqueada' | 'objetivo';
};

export const EVA_COLUMNS: EvaColumn[] = [
  {
    displayName: 'COD. DEP.',
    apiField: 'c_d_dep',
    dataType: 'Numero',
    description: 'Codigo del departamento segun el DANE.',
    role: 'entrada_modelo',
  },
  {
    displayName: 'DEPARTAMENTO',
    apiField: 'departamento',
    dataType: 'Texto',
    description: 'Nombre del departamento colombiano.',
    role: 'entrada_modelo',
  },
  {
    displayName: 'COD. MUN.',
    apiField: 'c_d_mun',
    dataType: 'Numero',
    description: 'Codigo del municipio segun el DANE.',
    role: 'entrada_modelo',
  },
  {
    displayName: 'MUNICIPIO',
    apiField: 'municipio',
    dataType: 'Texto',
    description: 'Nombre del municipio colombiano.',
    role: 'entrada_modelo',
  },
  {
    displayName: 'GRUPO DE CULTIVO',
    apiField: 'grupo_de_cultivo',
    dataType: 'Texto',
    description: 'Categoria general del cultivo.',
    role: 'entrada_modelo',
  },
  {
    displayName: 'SUBGRUPO DE CULTIVO',
    apiField: 'subgrupo_de_cultivo',
    dataType: 'Texto',
    description: 'Tipo de cultivo dentro de su categoria.',
    role: 'proxy_bloqueada',
  },
  {
    displayName: 'CULTIVO',
    apiField: 'cultivo',
    dataType: 'Texto',
    description: 'Nombre especifico del cultivo.',
    role: 'proxy_bloqueada',
  },
  {
    displayName: 'DESAGREGACION REGIONAL Y/O SISTEMA PRODUCTIVO',
    apiField: 'desagregaci_n_regional_y',
    dataType: 'Texto',
    description: 'Descripcion regional o de sistema productivo del cultivo.',
    role: 'proxy_bloqueada',
  },
  {
    displayName: 'ANO',
    apiField: 'a_o',
    dataType: 'Numero',
    description: 'Ano de produccion reportado.',
    role: 'entrada_modelo',
  },
  {
    displayName: 'PERIODO',
    apiField: 'periodo',
    dataType: 'Texto',
    description: 'Periodo de produccion.',
    role: 'entrada_modelo',
  },
  {
    displayName: 'Area Sembrada (ha)',
    apiField: 'rea_sembrada_ha',
    dataType: 'Numero',
    description: 'Area sembrada en hectareas.',
    role: 'entrada_modelo',
  },
  {
    displayName: 'Area Cosechada (ha)',
    apiField: 'rea_cosechada_ha',
    dataType: 'Numero',
    description: 'Area cosechada en hectareas.',
    role: 'entrada_modelo',
  },
  {
    displayName: 'Produccion (t)',
    apiField: 'producci_n_t',
    dataType: 'Numero',
    description: 'Produccion total en toneladas.',
    role: 'entrada_modelo',
  },
  {
    displayName: 'Rendimiento (t/ha)',
    apiField: 'rendimiento_t_ha',
    dataType: 'Numero',
    description: 'Rendimiento por hectarea en toneladas.',
    role: 'entrada_modelo',
  },
  {
    displayName: 'ESTADO FISICO PRODUCCION',
    apiField: 'estado_fisico_produccion',
    dataType: 'Texto',
    description: 'Estado fisico del producto agricola.',
    role: 'proxy_bloqueada',
  },
  {
    displayName: 'NOMBRE CIENTIFICO',
    apiField: 'nombre_cientifico',
    dataType: 'Texto',
    description: 'Nombre cientifico del cultivo.',
    role: 'proxy_bloqueada',
  },
  {
    displayName: 'CICLO DE CULTIVO',
    apiField: 'ciclo_de_cultivo',
    dataType: 'Texto',
    description: 'Variable objetivo: ciclo de cultivo en Colombia.',
    role: 'objetivo',
  },
];
