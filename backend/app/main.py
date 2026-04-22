from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers import auth_router, users_router, parts_router, assemblies_router, bom_router, logs_router, dict_router, attachments_router, custom_fields_router

app = FastAPI(
    title="BOM管理系统API",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api")
app.include_router(users_router, prefix="/api")
app.include_router(parts_router, prefix="/api")
app.include_router(assemblies_router, prefix="/api")
app.include_router(bom_router, prefix="/api")
app.include_router(logs_router, prefix="/api")
app.include_router(dict_router, prefix="/api")
app.include_router(attachments_router, prefix="/api")
app.include_router(custom_fields_router, prefix="/api")

@app.get("/")
async def root():
    return {"message": "BOM管理系统API服务运行中"}

@app.get("/health")
async def health():
    return {"status": "healthy"}
