import torch
from transformers import AutoProcessor, WhisperForConditionalGeneration
from fastapi import UploadFile
from io import BytesIO
import tempfile
import os
import logging
from pathlib import Path
from pydub import AudioSegment
import numpy as np

logger = logging.getLogger(__name__)

# --- 1. Выбор устройства и настройка ---
device = "cuda" if torch.cuda.is_available() else "cpu"
dtype = torch.float16 if device == "cuda" else torch.float32  # FP16 на CUDA ускоряет inference
logger.error(f"Используемое устройство: {device}, dtype: {dtype}")

# --- 2. Загрузка модели с оптимизациями ---
processor = AutoProcessor.from_pretrained("openai/whisper-large-v3-turbo")
model = WhisperForConditionalGeneration.from_pretrained(
    "openai/whisper-large-v3-turbo",
    torch_dtype=dtype,
    low_cpu_mem_usage=True
)
model.to(device)
model.eval()  # Важно: отключаем dropout и прочее для инференса

# --- Дополнительно: компиляция модели (PyTorch 2+, очень эффективно) ---
try:
    model = torch.compile(model, mode="reduce-overhead", fullgraph=True)
    logger.info("Модель скомпилирована с torch.compile")
except Exception as e:
    logger.warning(f"Не удалось применить torch.compile: {e}")

# --- Функция транскрибации ---
async def get_text_from_audio(file: UploadFile):
    logger.info('Начало транскрибации')
    suffix = Path(file.filename).suffix
    temp_input_path = None

    try:
        # 1. Сохраняем во временный файл (не избежать при использовании pydub)
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp_input:
            content = await file.read()
            tmp_input.write(content)
            temp_input_path = tmp_input.name
        logger.debug(f"Сохранён временный файл: {temp_input_path}")

        # 2. Загрузка аудио через pydub
        try:
            audio_segment = AudioSegment.from_file(temp_input_path)
        except Exception as e:
            raise RuntimeError(f"Ошибка загрузки аудио: {e}")

        # 3. Ресэмплинг и моно-канал
        if audio_segment.frame_rate != 16000:
            audio_segment = audio_segment.set_frame_rate(16000)
        if audio_segment.channels > 1:
            audio_segment = audio_segment.set_channels(1)

        # 4. Преобразование в float32 numpy array
        samples = np.array(audio_segment.get_array_of_samples())
        audio_array = samples.astype(np.float32) / 32768.0
        logger.debug(f"Аудио обработано: форма {audio_array.shape}, нормализовано")

        # 5. Подготовка входа и перенос на GPU
        inputs = processor(
            audio_array,
            return_tensors="pt",
            sampling_rate=16000,
            truncation=True  # Обрезка очень длинных файлов
        )
        input_features = inputs.input_features.to(device, dtype=dtype)
        # Пример: указываем, что аудио на русском языке
        forced_decoder_ids = processor.get_decoder_prompt_ids(language="russian", task="transcribe")
        # 6. Генерация без градиентов
        with torch.no_grad():
            generated_ids = model.generate(
                inputs=input_features,
                forced_decoder_ids=forced_decoder_ids,
                max_new_tokens=256,           # Ограничить длину
                num_beams=1,                  # Убрать beam search для скорости
                do_sample=False,              # Отключить семплирование
                temperature=0.0,              # Только argmax
            )

        # 7. Декодирование
        transcription = processor.batch_decode(generated_ids, skip_special_tokens=True)[0]
        logger.info(f"Транскрибация завершена: {transcription}")
        return transcription

    except Exception as e:
        logger.error(f"Ошибка в процессе транскрибации: {e}")
        raise

    finally:
        # Удаление временного файла
        if temp_input_path and os.path.exists(temp_input_path):
            try:
                os.unlink(temp_input_path)
                logger.debug(f"Удалён временный файл: {temp_input_path}")
            except PermissionError as e:
                logger.warning(f"Не удалось удалить временный файл: {e}")