FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app

WORKDIR /app

RUN pip install --no-cache-dir --upgrade pip setuptools wheel

COPY services/trainer/requirements.txt /tmp/requirements-trainer.txt
RUN pip install --no-cache-dir -r /tmp/requirements-trainer.txt

COPY services /app/services
COPY data /app/data

CMD ["python", "-m", "services.trainer.src.eva_ml.train"]
