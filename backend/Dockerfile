FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV WORKDIR=/app

WORKDIR $WORKDIR

# Install system dependencies (needed for compiling C++ or running JS if code execution happens inside container)
RUN apt-get update && apt-get install -y \
    build-essential \
    nodejs \
    default-jdk \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
