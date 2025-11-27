import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv() 

# 1. Construction de l'URL de la base de données
# Format : postgresql://user:password@host:port/database
SQLALCHEMY_DATABASE_URL = (
    f"postgresql://{os.getenv('POSTGRES_USER')}:"
    f"{os.getenv('POSTGRES_PASSWORD')}@"
    f"{os.getenv('POSTGRES_SERVER')}:"
    f"{os.getenv('POSTGRES_PORT')}/"
    f"{os.getenv('POSTGRES_DB')}"
)

# 2. Création du Moteur (Engine)
engine = create_engine(SQLALCHEMY_DATABASE_URL)

# 3. Création d'un SessionLocal
# C'est la classe pour créer des sessions de base de données.
# Chaque requête API utilisera un objet SessionLocal.
SessionLocal = sessionmaker(
    autocommit=False, 
    autoflush=False, 
    bind=engine
)

# 4. Création de la classe de base déclarative
# Elle sera héritée par tous vos modèles SQLAlchemy.
db = declarative_base()

def get_db():
    """
    Crée une session de base de données pour une requête et la ferme à la fin.
    À utiliser avec Depends() dans FastAPI.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()