import torch
# torchaudio больше не нужно для загрузки
from transformers import AutoProcessor, WhisperForConditionalGeneration
from fastapi import UploadFile
from io import BytesIO
import tempfile
import os
import logging
from pathlib import Path
from pydub import AudioSegment  # Импортируем pydub
import numpy as np  # Импортируем numpy

logger = logging.getLogger(__name__)

device = "cuda" if torch.cuda.is_available() else "cpu"
logging.error(f"Используемое устройство: {device}")

# Загрузка модели и процессора
processor = AutoProcessor.from_pretrained("openai/whisper-large-v3-turbo")
model = WhisperForConditionalGeneration.from_pretrained("openai/whisper-large-v3-turbo")


async def get_text_from_audio(file: UploadFile):
    logger.error('Начало транскрибации')
    suffix = Path(file.filename).suffix
    temp_input_path = None
    temp_wav_path = None

    try:
        # 1. Сохраняем загруженный файл во временный файл
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp_input:
            content = await file.read()
            tmp_input.write(content)
            temp_input_path = tmp_input.name
        logger.error(f"Сохранён временный файл: {temp_input_path}")

        # 2. Загружаем файл с помощью pydub (он сам определит формат)
        try:
            audio_segment = AudioSegment.from_file(temp_input_path)
            logger.info(f"Файл {temp_input_path} загружен с помощью pydub.")
        except Exception as e:
            logger.error(f"Ошибка загрузки с помощью pydub: {e}")
            raise RuntimeError(f"Не удалось загрузить аудио с помощью pydub: {e}")

        # 3. Обработка аудио с помощью pydub: ресэмплинг и моно
        # Ресэмплинг на 16000 Гц (требуется для Whisper)
        if audio_segment.frame_rate != 16000:
            audio_segment = audio_segment.set_frame_rate(16000)
            logger.info(f"Аудио ресемплировано до 16000 Гц.")

        # Преобразование в моно, если стерео
        if audio_segment.channels > 1:
            audio_segment = audio_segment.set_channels(1)
            logger.info(f"Аудио преобразовано в моно.")

        # 4. Преобразование в numpy array
        # pydub использует 16-битные целые числа, нам нужны float32 для Whisper
        audio_array_int16 = np.array(audio_segment.get_array_of_samples())
        audio_array_float32 = audio_array_int16.astype(np.float32) / 32768.0  # Нормализация

        logger.info(
            f"Аудио обработано: форма {audio_array_float32.shape}, тип {audio_array_float32.dtype}, частота {audio_segment.frame_rate} Гц")

        logger.error('1')

        # 5. Транскрибация с помощью Whisper
        # Подготовка входных данных: processor ожидает аудио и частоту дискретизации
        inputs = processor(audio_array_float32, return_tensors="pt", sampling_rate=audio_segment.frame_rate)
        input_features = inputs.input_features

        # Генерация транскрипции
        generated_ids = model.generate(inputs=input_features)

        # Декодирование результата
        transcription = processor.batch_decode(generated_ids, skip_special_tokens=True)[0]
        logger.error(f"Транскрибация завершена: {transcription}")

    finally:
        # 6. Удаляем временные файлы
        if temp_wav_path and os.path.exists(temp_wav_path):
            try:
                os.unlink(temp_wav_path)
                logger.info(f"Удалён временный файл WAV: {temp_wav_path}")
            except PermissionError as e:
                logger.warning(f"Не удалось удалить временный файл WAV {temp_wav_path}: {e}")
        if temp_input_path and os.path.exists(temp_input_path):
            try:
                os.unlink(temp_input_path)
                logger.info(f"Удалён временный файл исходного формата: {temp_input_path}")
            except PermissionError as e:
                logger.warning(f"Не удалось удалить временный файл исходного формата {temp_input_path}: {e}")

    return transcription

# async def classify_text(text: str) -> str:
#     # Ваша логика классификации
#     pass
