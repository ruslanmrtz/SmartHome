from fastapi import FastAPI, File, UploadFile, HTTPException, Body
from fastapi.responses import JSONResponse, FileResponse
import logging

from weather import get_weather
from whisper import get_text_from_audio
from text_classification import classify_text

# Импорт работы с базой
from db import add_scenario, get_all_scenarios, get_scenario_by_name, delete_scenario

app = FastAPI(
    title="Audio to Text API (Stub)",
    description="принимает аудио, возвращает текст.",
    version="0.1.0"
)


@app.get("/site")
async def read_index():
    return FileResponse("index_new.html")


@app.get("/weather")
async def read_weather():
    weather = get_weather()
    return weather


@app.post("/transcribe/", summary="Распознавание речи")
async def transcribe_audio(file: UploadFile = File(...)):
    """
    Принимает аудиофайл и возвращает текст.
    Поддерживаемые форматы: любые.
    """
    if not file:
        raise HTTPException(status_code=400, detail="Файл не передан")

    text = await get_text_from_audio(file)

    logging.error('Началась классификация')
    classification = await classify_text(text)

    return JSONResponse({
        "filename": file.filename,
        "size_bytes": file.size,
        "transcribed_text": classification
    })


# ---------- API для сценариев ----------

@app.post("/scenarios", summary="Создать новый сценарий")
async def create_scenario(name: str = Body(...), actions: dict = Body(...)):
    try:
        scenario = add_scenario(name, actions)
        return {"id": scenario.id, "name": scenario.name, "actions": scenario.actions}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Ошибка при добавлении сценария: {e}")


@app.get("/scenarios", summary="Получить все сценарии")
async def list_scenarios():
    scenarios = get_all_scenarios()
    return [
        {"id": s.id, "name": s.name, "actions": s.actions}
        for s in scenarios
    ]


@app.get("/scenarios/{name}", summary="Получить сценарий по названию")
async def get_scenario(name: str):
    scenario = get_scenario_by_name(name)
    if not scenario:
        raise HTTPException(status_code=404, detail="Сценарий не найден")
    return {"id": scenario.id, "name": scenario.name, "actions": scenario.actions}


@app.delete("/scenarios/{name}", summary="Удалить сценарий по названию")
async def delete_scenario_endpoint(name: str):
    try:
        deleted = delete_scenario(name)
        if not deleted:
            raise HTTPException(status_code=404, detail="Сценарий не найден")
        return {"message": "Сценарий успешно удалён"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка при удалении сценария: {e}")


# ---------- Запуск ----------

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
