from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from fastapi.responses import FileResponse

from weather import get_weather
# from whisper import get_text_from_audio
# from text_classification import classify_text

app = FastAPI(
    title="Audio to Text API (Stub)",
    description="принимает аудио, возвращает текст.",
    version="0.1.0"
)


@app.get("/site")
async def read_index():
    return FileResponse("index_new.html")


@app.get("/weather")
async def read_index():
    
    weather = get_weather()
    weather = {'conditions': 'Солнечно',
                'temp': '+18'}
    
    return weather


@app.post("/transcribe/", summary=" Распознавание речи")
async def transcribe_audio(file: UploadFile = File(...)):
    """
    Принимает аудиофайл и возвращает текст.
    Поддерживаемые форматы: любые.
    """
    # Проверка, что файл передан
    if not file:
        raise HTTPException(status_code=400, detail="Файл не передан")

    text = await get_text_from_audio(file)

    classification = await classify_text(text)

    # Опционально: можно вернуть имя файла и размер
    return JSONResponse({
        "filename": file.filename,
        "size_bytes": file.size,
        "transcribed_text": classification
    })


# Для запуска через uvicorn (если файл называется main.py)
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
