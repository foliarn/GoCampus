# GoCampus

GoCampus est un site de covoiturage destiné à faciliter les déplacements entre campus ou vers le campus.

## Stack Technique

* **Langage :** Python 3.9+
* **Framework Web :** FastAPI
* **Base de données :** PostgreSQL
* **ORM :** SQLAlchemy
* **Migrations :** Alembic
* **Authentification :** JWT (JSON Web Tokens) & Passlib (Bcrypt)
* **Validation :** Pydantic

## Installation et Lancement

### 1. Prérequis
- Python
- Docker (pour la base de données PostgreSQL)

### 2. Cloner le projet
```bash
git clone https://github.com/foliarn/GoCampus
cd GoCampus
```
### 3. Utiliser un environnement virtuel (venv) et installer les dépendances
```bash
# Création
python -m venv venv

# Activation (Windows)
venv\Scripts\activate

# Activation (Mac/Linux)
source venv/bin/activate

# Dépendances
pip install -r requirements.txt
```

### 4. Configuration .env et clé secrète
Afin que l'application puisse démarrer, créez un fichier .env à la racine du projet et remplissez les informations suivantes :

```bash
# Sécurité
SECRET_KEY=votre_clé_secrete
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Base de données
POSTGRES_USER=gocampus_admin
POSTGRES_PASSWORD=gocampus_pwd
POSTGRES_SERVER=localhost
POSTGRES_PORT=5432
POSTGRES_DB=gocampus_db
```

Remplacez "votre_clé_secrete" par une clé que vous allez générer :

#### Option 1 : Via Python
Vous pouvez générer une clé aléatoire robuste directement avec une ligne de commande Python. Cela utilise la librairie secrets conçue pour la cryptographie.

Ouvrez votre terminal et exécutez :
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

#### Option 2 : Via OpenSSL
Si vous êtes sous Linux ou Mac (ou avez Git Bash sous Windows), vous pouvez utiliser :

```bash
openssl rand -hex 32
```

### 5. Base de données PostgreSQL via Docker
Pour avoir une base de données locale, il suffit d'utiliser le docker-compose.yml contenu dans le repo.
```bash
# A la racine du projet :
docker-compose up -d # Génère le conteneur

# Pour le démarrer/l'arrêter : 
docker start gocampus_db
docker stop gocampus_db

# Pour accéder à l'invite de commande PostgreSQL :
docker exec -it gocampus_db psql -U gocampus_admin -d gocampus_db
```

Il faut ensuite remplir la base de données (via Alembic) :
```bash
# A la racine du projet :
alembic upgrade head
```

### 6. Lancer le serveur
Enfin, lancez le serveur de développement avec Uvicorn
```bash
uvicorn app.main:app --reload
```
L'API sera accessible sur : http://127.0.0.1:8000

### 7. Post-installation
Une fois que toute la première installation est finie, pour lancer le projet, il suffit de rentrer dans l'environnement virtuel et lancer l'étape 6 (Uvicorn)
```bash
# A la racine du projet
# Windows
venv\Scripts\activate

# Bash (MacOS/Linux)
source venv/bin/activate

# Démarrer le serveur
uvicorn app.main:app --reload

```
### Documentation API
Une fois le serveur lancé, la documentation interactive (Swagger UI) est disponible automatiquement ici :

Swagger UI : http://127.0.0.1:8000/docs

ReDoc : http://127.0.0.1:8000/redoc