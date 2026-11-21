FROM python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl xz-utils fonts-noto fonts-noto-cjk fonts-noto-core \
    && rm -rf /var/lib/apt/lists/*

# Install Typst binary for HarfBuzz + Noto multilingual PDF compilation
RUN ARCH=$(uname -m) && \
    if [ "$ARCH" = "aarch64" ]; then TYPST_ARCH="aarch64-unknown-linux-musl"; else TYPST_ARCH="x86_64-unknown-linux-musl"; fi && \
    curl -fsSL "https://github.com/typst/typst/releases/latest/download/typst-${TYPST_ARCH}.tar.xz" -o /tmp/typst.tar.xz && \
    tar -xf /tmp/typst.tar.xz -C /tmp && \
    mv /tmp/typst-${TYPST_ARCH}/typst /usr/local/bin/typst && \
    chmod +x /usr/local/bin/typst && \
    rm -rf /tmp/typst*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
