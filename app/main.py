from fastapi import FastAPI, Depends, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from app.routers import auth, pages, rides, reservations
from app import deps, schemas

app = FastAPI(title="GoCampus API")

# mount static directory
app.mount("/static", StaticFiles(directory="app/static"), name="static")

# jinja config  
templates = Jinja2Templates(directory="app/templates")

# routers
app.include_router(auth.router)
app.include_router(pages.router)
app.include_router(rides.router)
app.include_router(reservations.router)

# home page
@app.get("/")
def read_home(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

# test route api
@app.get("/users/me", response_model=schemas.UserOut)
def read_users_me(current_user: schemas.UserOut = Depends(deps.get_current_user)):
    return current_user