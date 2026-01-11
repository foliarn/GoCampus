from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # JWT
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # DB
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_PORT: str = "5432"
    POSTGRES_DB: str = "gocampus"
    
    # Google Maps
    GOOGLE_MAPS_API_KEY: str = ""
    
    # IUT Amiens coordinates (fixed reference point)
    IUT_AMIENS_ADDRESS: str = "Avenue des Facultés, 80000 Amiens"
    IUT_AMIENS_LAT: float = 49.8847
    IUT_AMIENS_LNG: float = 2.2637
    
    # Search settings
    PROXIMITY_RADIUS_KM: float = 5.0
    TIME_WINDOW_MINUTES: int = 30

    model_config = SettingsConfigDict(
        env_file=".env", 
        case_sensitive=True
    )

settings = Settings()