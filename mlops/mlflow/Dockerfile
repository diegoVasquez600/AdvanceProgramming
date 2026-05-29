FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

RUN pip install --no-cache-dir --upgrade pip wheel setuptools==70.0.0
RUN pip install --no-cache-dir mlflow==2.14.3 boto3==1.34.162 psycopg2-binary==2.9.9 setuptools==70.0.0

EXPOSE 5000

CMD ["mlflow", "server", "--host", "0.0.0.0", "--port", "5000"]
