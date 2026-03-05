# Dockerfile — Image Docker pour le script de migration

FROM python:3.11-slim

# Dossier de travail dans le conteneur
WORKDIR /app

# Installation des dépendances
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copie du script de migration
COPY migrate.py .

# Lancement du script au démarrage du conteneur
CMD ["python", "migrate.py"]
