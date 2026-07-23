FROM python:3.11-slim
WORKDIR /app

# CPU-only PyTorch first, from PyTorch's CPU wheel index. Without this, sentence-transformers
# pulls the default CUDA build of torch (~2+ GB of GPU libs that are useless on a CPU host).
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py ./

# The BAAI/bge-m3 model (~2.2 GB) is downloaded on first startup into HF_HOME. Point it at
# /models so a mounted volume caches it — otherwise every container rebuild re-downloads it.
ENV HF_HOME=/models
ENV SENTENCE_TRANSFORMERS_HOME=/models

EXPOSE 8000

# Long start-period: first boot downloads + loads the model before /health answers.
HEALTHCHECK --interval=30s --timeout=5s --start-period=300s --retries=10 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health')" || exit 1

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
