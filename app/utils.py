from passlib.context import CryptContext

# Configuration pour utiliser l'algorithme bcrypt (standard robuste)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password, hashed_password):
    """Vérifie si le mot de passe correspond au hash enregistré."""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    """Transforme un mot de passe en hash sécurisé."""
    return pwd_context.hash(password)