FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 MPLBACKEND=Agg MPLCONFIGDIR=/tmp/mpl
RUN apt-get update && apt-get install -y --no-install-recommends libglib2.0-0 poppler-utils \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /srv
COPY backend/requirements.txt /srv/backend/requirements.txt
RUN pip install --no-cache-dir -r /srv/backend/requirements.txt
COPY backend/ /srv/backend/
COPY scripts/make_sample_videos.py /srv/scripts/make_sample_videos.py
RUN python /srv/scripts/make_sample_videos.py --out /srv/samples
RUN useradd -m app && mkdir -p /data && chown -R app:app /data /srv
USER app
ENV DATA_DIR=/data SAMPLES_DIR=/srv/samples
WORKDIR /srv/backend
EXPOSE 8000
CMD ["uvicorn","app.main:app","--host","0.0.0.0","--port","8000","--workers","1","--proxy-headers","--forwarded-allow-ips=*"]
