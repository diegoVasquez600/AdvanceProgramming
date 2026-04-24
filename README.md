# Notebooks de Programación Avanzada

Este repositorio contiene dos notebooks desarrollados para la asignatura **Programación Avanzada**. El primero corresponde a un análisis exploratorio del dataset **Evaluaciones Agropecuarias Municipales (EVA)** de Colombia y el segundo resuelve el **Taller 1 de Álgebra Lineal para Machine Learning**.

## Contenido del repositorio

- `Exploratory_Data_Analysis_Colombia_EVA.ipynb`: análisis exploratorio, limpieza, estandarización y preparación de datos del dataset EVA para modelado.
- `Taller1_ProgramacionAvanzada_Diego_Rios.ipynb`: desarrollo del Taller 1 con ejercicios de vectores, transformaciones lineales y PCA.

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

## 4. Ejecución de los notebooks

1. Activa el entorno virtual (`.venv`).
2. Abre el proyecto en VS Code.
3. Abre el notebook que desees ejecutar.
4. Selecciona el kernel de `.venv`.
5. Ejecuta todas las celdas en orden.

### Notebook 1: EDA del dataset EVA

Archivo:

- `Exploratory_Data_Analysis_Colombia_EVA.ipynb`

Este notebook usa como fuente principal el CSV completo ubicado en `data/Evaluaciones_Agropecuarias_Municipales_EVA.csv` y, si no está disponible, usa la API de Datos Abiertos como respaldo.

### Notebook 2: Taller 1 de Programación Avanzada

Archivo:

- `Taller1_ProgramacionAvanzada_Diego_Rios.ipynb`

Este notebook no depende de la API de Datos Abiertos. Contiene ejercicios académicos de álgebra lineal aplicados a machine learning, incluyendo similitud coseno, transformaciones lineales sobre imágenes y análisis PCA.

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
|-- Taller1_ProgramacionAvanzada_Diego_Rios.ipynb
|-- requirements.txt
|-- README.md
`-- .gitignore
```

## 9. Recomendación de uso

Si el objetivo es revisar el trabajo de análisis de datos, comienza por `Exploratory_Data_Analysis_Colombia_EVA.ipynb`. Si el objetivo es revisar el desarrollo del taller académico de álgebra lineal, abre `Taller1_ProgramacionAvanzada_Diego_Rios.ipynb`.