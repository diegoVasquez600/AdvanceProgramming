# Análisis Exploratorio de Datos - Colombia EVA

Este proyecto contiene un análisis exploratorio del dataset **Evaluaciones Agropecuarias Municipales (EVA)** de Colombia.

El notebook principal es:

- `Exploratory_Data_Analysis_Colombia_EVA.ipynb`

El proyecto está configurado para:

- Usar primero el archivo CSV local completo en `data/Evaluaciones_Agropecuarias_Municipales_EVA.csv`.
- Usar la API de Datos Abiertos (`datos.gov.co`) como respaldo si el CSV no está disponible.

## 1. Requisitos

- Python 3.10 o superior (recomendado)
- `pip` actualizado
- VS Code con extensiones de Python/Jupyter o Jupyter Notebook/Lab

## 2. Instalación

### Windows (PowerShell)

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip setuptools wheel
pip install -r requirements.txt
```

### macOS / Linux

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip setuptools wheel
pip install -r requirements.txt
```

## 3. Verificación rápida

Ejecuta este comando para validar dependencias:

```bash
python -c "import pandas, numpy, matplotlib, seaborn, scipy, sodapy, dotenv; print('OK: dependencias instaladas')"
```

## 4. Ejecución del notebook

1. Activa el entorno virtual (`.venv`).
2. Abre el proyecto en VS Code.
3. Abre `Exploratory_Data_Analysis_Colombia_EVA.ipynb`.
4. Selecciona el kernel de `.venv`.
5. Ejecuta todas las celdas en orden.

## 5. Fuente de datos

### Opción recomendada (por defecto): CSV local completo

El notebook intentará cargar automáticamente:

- `data/Evaluaciones_Agropecuarias_Municipales_EVA.csv`

Si el archivo existe, se usa como fuente principal y se estandarizan los encabezados para mantener compatibilidad con el esquema del análisis.

### Opción de respaldo: API de Datos Abiertos

Si falla la carga del CSV, el notebook consulta la API Socrata de `datos.gov.co`.

Variables usadas:

- `DOMAIN = datos.gov.co`
- `DATASET_ID = 2pnw-mmge`

## 6. Variables de entorno (opcional, recomendado para API)

Puedes definir credenciales en un archivo `.env` en la raíz del proyecto:

```env
DATOSABIERTOS_API_KEY=tu_api_key
DATOSABIERTOS_API_SECRET=tu_api_secret
DATOSABIERTOS_APP_TOKEN=tu_app_token
```

Notas:

- Si no defines `DATOSABIERTOS_APP_TOKEN`, el notebook intenta usar `DATOSABIERTOS_API_KEY` como token.
- Si no hay credenciales, puede funcionar en modo público con límites de tasa.

## 7. Solución de problemas comunes

### Error de importación de paquetes

```bash
python -m pip install --upgrade pip setuptools wheel
pip install --no-cache-dir -r requirements.txt
```

### Kernel incorrecto en VS Code

- Abre el selector de kernel en el notebook.
- Elige el intérprete de `.venv`.

### El notebook no encuentra el CSV

Verifica que exista exactamente esta ruta relativa:

- `data/Evaluaciones_Agropecuarias_Municipales_EVA.csv`

### Se usa API y da error de autenticación

- Revisa variables `.env`.
- Valida token en `datos.gov.co`.
- Reintenta en modo público (sin token) o usa el CSV local.

## 8. Estructura del proyecto

```text
AdvanceProgramming/
|-- data/
|   `-- Evaluaciones_Agropecuarias_Municipales_EVA.csv
|-- Exploratory_Data_Analysis_Colombia_EVA.ipynb
|-- requirements.txt
|-- README.md
`-- .gitignore
```

## 9. Recomendación para evaluación académica

Para reproducibilidad total, se recomienda ejecutar siempre con el CSV local completo y luego guardar el notebook con todas las celdas ejecutadas.