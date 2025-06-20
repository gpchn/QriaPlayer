#!/usr/bin/env python3
# coding=utf-8

import fastapi
import uvicorn
from pathlib import Path


app = fastapi.FastAPI()
static = Path(__file__).parent / "static"


@app.get("/")
async def route_index():
    return fastapi.responses.FileResponse(static / "index.html")


@app.get("/{filename}")
async def route_favicon(filename):
    return fastapi.responses.FileResponse(static / filename)


@app.get("/api/")


def start():
    uvicorn.run("player:app", host="localhost", port=41004)
