FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app

WORKDIR /app

RUN pip install --no-cache-dir --upgrade pip setuptools wheel

COPY services/api/requirements.txt /tmp/requirements-api.txt
RUN pip install --no-cache-dir -r /tmp/requirements-api.txt

COPY services /app/services

# Bundle ReDoc locally so /redoc works without external CDN at runtime.
RUN python -c "import pathlib, urllib.request; p=pathlib.Path('/app/services/api/src/eva_api/static'); p.mkdir(parents=True, exist_ok=True); urllib.request.urlretrieve('https://cdn.jsdelivr.net/npm/redoc@2.1.5/bundles/redoc.standalone.js', p / 'redoc.standalone.js')"

EXPOSE 8000

CMD ["python", "-m", "uvicorn", "services.api.src.eva_api.main:app", "--host", "0.0.0.0", "--port", "8000"]
