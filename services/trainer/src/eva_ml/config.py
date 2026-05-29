from pathlib import Path

TARGET_COLUMN = "ciclo_de_cultivo"

PROXY_COLUMNS = [
    "cultivo",
    "subgrupo_de_cultivo",
    "nombre_cientifico",
    "estado_fisico_produccion",
    "desagregaci_n_regional_y",
]

NUMERIC_CANDIDATES = [
    "c_d_dep",
    "c_d_mun",
    "a_o",
    "rea_sembrada_ha",
    "rea_cosechada_ha",
    "producci_n_t",
    "rendimiento_t_ha",
]


def find_project_root(start: Path) -> Path:
    candidates = [start] + list(start.parents)
    for c in candidates:
        if (c / "data" / "Evaluaciones_Agropecuarias_Municipales_EVA.csv").exists():
            return c
    raise FileNotFoundError(
        "Could not find project root containing data/Evaluaciones_Agropecuarias_Municipales_EVA.csv"
    )
