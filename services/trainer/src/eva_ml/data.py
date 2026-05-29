import re
import unicodedata
from pathlib import Path

import pandas as pd

from .config import NUMERIC_CANDIDATES, TARGET_COLUMN


_DEF_MAP = {
    "cod dep": "c_d_dep",
    "departamento": "departamento",
    "cod mun": "c_d_mun",
    "municipio": "municipio",
    "grupo de cultivo": "grupo_de_cultivo",
    "subgrupo de cultivo": "subgrupo_de_cultivo",
    "cultivo": "cultivo",
    "desagregacion regional y o sistema productivo": "desagregaci_n_regional_y",
    "ano": "a_o",
    "periodo": "periodo",
    "area sembrada ha": "rea_sembrada_ha",
    "area cosechada ha": "rea_cosechada_ha",
    "produccion t": "producci_n_t",
    "rendimiento t ha": "rendimiento_t_ha",
    "estado fisico produccion": "estado_fisico_produccion",
    "nombre cientifico": "nombre_cientifico",
    "ciclo de cultivo": TARGET_COLUMN,
}


def normalize_header(text: str) -> str:
    s = str(text).replace("\n", " ").strip().lower()
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode("ascii")
    s = re.sub(r"[^a-z0-9]+", " ", s).strip()
    s = re.sub(r"\s+", " ", s)
    return s


def standardize_columns(df: pd.DataFrame) -> pd.DataFrame:
    rename_map = {}
    for col in df.columns:
        normalized = normalize_header(col)
        if normalized in _DEF_MAP:
            rename_map[col] = _DEF_MAP[normalized]
    return df.rename(columns=rename_map).copy()


def load_and_clean(csv_path: Path) -> pd.DataFrame:
    df = pd.read_csv(csv_path)
    df = standardize_columns(df)

    for c in NUMERIC_CANDIDATES:
        if c in df.columns:
            cleaned = df[c].astype(str).str.replace(",", "", regex=False).str.strip()
            df[c] = pd.to_numeric(cleaned, errors="coerce")

    obj_cols = df.select_dtypes(include=["object", "string"]).columns.tolist()
    for c in obj_cols:
        s = df[c].astype(str).str.strip().str.replace(r"\s+", " ", regex=True)
        df[c] = s.where(df[c].notna(), pd.NA)

    if TARGET_COLUMN in df.columns:
        df = df.dropna(subset=[TARGET_COLUMN]).copy()

    return df
