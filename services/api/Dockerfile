FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app

WORKDIR /app

RUN pip install --no-cache-dir --upgrade pip setuptools wheel

COPY services/api/requirements.txt /tmp/requirements-api.txt
RUN pip install --no-cache-dir -r /tmp/requirements-api.txt

COPY services /app/services

EXPOSE 8000

CMD ["python", "-m", "uvicorn", "services.api.src.eva_api.main:app", "--host", "0.0.0.0", "--port", "8000"]
