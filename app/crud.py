from sqlalchemy.orm import Session
from app import models, schemas, utils

# === GESTION UTILISATEUR ===

def get_user_by_email(db: Session, email: str):
    """Cherche un utilisateur par son email (pour éviter les doublons)."""
    return db.query(models.User).filter(models.User.mail == email).first()

def create_user(db: Session, user: schemas.UserCreate):
    """Enregistre un nouvel utilisateur avec mot de passe haché."""
    # 1. Hachage du mot de passe
    hashed_password = utils.get_password_hash(user.mdp)
    
    # 2. Création de l'objet SQLAlchemy
    db_user = models.User(
        nom=user.nom,
        prenom=user.prenom,
        mail=user.mail,
        mdp=hashed_password,  # Important : on stocke le hash
        num_tel=user.num_tel,
        adresse=user.adresse,
        role=user.role
    )
    
    # 3. Insertion en base
    db.add(db_user)
    db.commit()
    db.refresh(db_user) # Récupère l'ID généré par Postgres
    return db_user