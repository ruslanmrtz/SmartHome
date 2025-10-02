const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);
// Логика переключения вкладок
const tabButtons = $$('.tab-button');
const tabContents = $$('.tab-content');
tabButtons.forEach(button => {
  button.addEventListener('click', () => {
    const tabName = button.getAttribute('data-tab');
    // Убираем активный класс у всех кнопок и контентов
    tabButtons.forEach(btn => btn.classList.remove('active'));
    tabContents.forEach(content => content.classList.remove('active'));
    // Добавляем активный класс текущей кнопке и контенту
    button.classList.add('active');
    $(`#tab-${tabName}-content`).classList.add('active');
  });
});
// Логика кнопки микрофона
const micButton = $('#mic-button');
const voiceStatus = $('#voice-status');
const frequencyBar = $('#frequency-bar');
let isListening = false;
let recordingInterval = null;
let frequencyInterval = null;
let mediaRecorder = null;
let audioChunks = [];
// При загрузке страницы открываем вкладку голосового ввода
window.addEventListener('DOMContentLoaded', () => {
  // Активируем вкладку голосового ввода
  const voiceTabButton = $('.tab-button[data-tab="voice"]');
  const buttonsTabButton = $('.tab-button[data-tab="buttons"]');
  const scenariosTabButton = $('.tab-button[data-tab="scenarios"]'); // Новая кнопка
  const voiceTabContent = $('#tab-voice-content');
  const buttonsTabContent = $('#tab-buttons-content');
  const scenariosTabContent = $('#tab-scenarios-content'); // Новый контент
  // Убираем активный класс у кнопок и контентов
  tabButtons.forEach(btn => btn.classList.remove('active'));
  tabContents.forEach(content => content.classList.remove('active'));
  // Добавляем активный класс голосовому вводу
  voiceTabButton.classList.add('active');
  voiceTabContent.classList.add('active');
});
// Функция для запроса доступа к микрофону
async function requestMicrophoneAccess() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    voiceStatus.textContent = 'Готов к записи';
    return stream;
  } catch (err) {
    console.error('Ошибка доступа к микрофону:', err);
    voiceStatus.textContent = 'Нет доступа к микрофону';
    return null;
  }
}
// Функция для имитации полоски частот
function startFrequencySimulation() {
  frequencyInterval = setInterval(() => {
    const width = Math.floor(Math.random() * 100);
    frequencyBar.style.width = `${width}%`;
  }, 100);
}
// Функция для остановки имитации полоски частот
function stopFrequencySimulation() {
  clearInterval(frequencyInterval);
  frequencyBar.style.width = '0%';
}
// --- Новая логика для истории запросов ---
const historyList = $('#history-list');
// Загрузка истории из localStorage
function loadHistory() {
    const history = JSON.parse(localStorage.getItem('smartHomeHistory') || '[]');
    renderHistory(history);
    return history;
}
// Сохранение истории в localStorage
function saveHistory(history) {
    localStorage.setItem('smartHomeHistory', JSON.stringify(history));
}
// Отображение истории
function renderHistory(history) {
    if (history.length === 0) {
        historyList.innerHTML = '<li class="text-gray-500 text-sm italic">История пуста</li>';
        return;
    }
    historyList.innerHTML = '';
    history.slice().reverse().forEach(item => {
        const li = document.createElement('li');
        li.className = 'p-2 bg-gray-100 dark:bg-gray-700 rounded text-sm break-words';
        li.textContent = `${item.timestamp}: ${item.command}`;
        historyList.appendChild(li);
    });
}
// Добавление новой команды в историю
function addToHistory(command) {
    const history = loadHistory();
    const now = new Date();
    const timestamp = now.toLocaleTimeString('ru-RU');
    history.push({ command, timestamp });
    // Ограничиваем историю 20 элементами
    if (history.length > 20) history.shift();
    saveHistory(history);
    renderHistory(history);
}
// --- Логика для отображения погоды ---
const weatherPanel = $('#weather-panel');
const btnWeather = $('#btn-weather');
btnWeather.addEventListener('click', async () => {
    try {
        voiceStatus.textContent = 'Получение погоды...';
        const response = await fetch('/weather');
        if (!response.ok) throw new Error('Не удалось получить данные о погоде');
        const data = await response.json();
        const tempCelsius = data.temp.toFixed(1); // Округляем до одного знака
        const conditions = data.conditions;
        // Обновляем содержимое панели
        weatherPanel.innerHTML = `
            <div class="text-center">
                <div class="text-lg font-semibold">Сургут</div>
                <div class="text-xl font-bold mt-1 capitalize">${conditions}</div>
                <div class="text-xl mt-1">+${tempCelsius}°</div>
            </div>
        `;
        // Показываем панель
        weatherPanel.classList.remove('hidden');
        addToHistory(`Погода: Сургут, ${conditions}, +${tempCelsius}°C`);
        // Автоматически скрываем через 5 секунд
        setTimeout(() => {
            weatherPanel.classList.add('hidden');
        }, 5000);
        voiceStatus.textContent = '';
    } catch (error) {
        console.error('Ошибка получения погоды:', error);
        voiceStatus.textContent = 'Ошибка погоды';
        addToHistory('Ошибка получения погоды');
        setTimeout(() => {
            if (!isListening) voiceStatus.textContent = '';
        }, 2000);
    }
});
// --- Обновленная логика кнопки микрофона ---
// --- Обновленная логика кнопки микрофона ---
if (micButton) {
    micButton.addEventListener('click', async () => {
        if (!isListening) {
            // Начинаем запись
            isListening = true;
            micButton.classList.add('listening');
            voiceStatus.textContent = 'Запись...';
            // Запрашиваем доступ к микрофону
            const stream = await requestMicrophoneAccess();
            if (stream) {
                audioChunks = []; // Очищаем предыдущие фрагменты
                mediaRecorder = new MediaRecorder(stream);
                mediaRecorder.ondataavailable = event => {
                    audioChunks.push(event.data);
                };
                mediaRecorder.onstop = async () => {
    // Сбрасываем состояние записи
    isListening = false;
    micButton.classList.remove('listening');
    stopFrequencySimulation();
    // Останавливаем все треки потока
    stream.getTracks().forEach(track => track.stop());
    // Собираем аудио в Blob
    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
    const formData = new FormData();
    formData.append('file', audioBlob, 'recording.webm');
    try {
        voiceStatus.textContent = 'Обработка запроса...';
        const response = await fetch('/transcribe/', {
            method: 'POST',
            body: formData,
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        const classification = data.transcribed_text?.trim(); // Убираем лишние пробелы
        // Проверяем на "не найдено", пустое значение или "Не найден"
        if (!classification || classification === 'Не найден') {
            voiceStatus.textContent = 'Команда не распознана';
            addToHistory('Голосовая команда не распознана');
            setTimeout(() => {
                if (!isListening) voiceStatus.textContent = '';
            }, 2000);
            return;
        }
        let executedAction = false;
        let actionDescription = '';
        switch (classification) {
            case 'шторы':
                btnCurtains.click();
                actionDescription = curtainsOpen ? "Шторы открыты" : "Шторы закрыты";
                executedAction = true;
                break;
            case 'свет':
                btnLights.click();
                actionDescription = lightsOn ? "Свет включён" : "Свет выключен";
                executedAction = true;
                break;
            case 'телевизор':
                btnTv.click();
                actionDescription = tvOn ? "ТВ включён" : "ТВ выключен";
                executedAction = true;
                break;
            case 'часы':
                btnClock.click();
                actionDescription = clockOn ? "Часы выключены" : "Часы включены";
                executedAction = true;
                break;
            case 'утро':
                btnMorning.click();
                actionDescription = "Утренний режим активирован";
                executedAction = true;
                break;
            case 'вечер':
                btnEvening.click();
                actionDescription = "Вечерний режим активирован";
                executedAction = true;
                break;
            case 'погода':
                btnWeather.click();
                actionDescription = "Погода: Сургут, Солнечно, +15°C";
                executedAction = true;
                break;
            default:
                console.warn("Неизвестная команда:", classification);
                voiceStatus.textContent = 'Команда не поддерживается';
                addToHistory(`Голосовая команда (не поддерживается): "${classification}"`);
                setTimeout(() => {
                    if (!isListening) voiceStatus.textContent = '';
                }, 2000);
                return;
        }
        if (executedAction) {
            addToHistory(actionDescription);
            voiceStatus.textContent = 'Команда выполнена';
            // Очистка статуса через 2 секунды
            setTimeout(() => {
                if (!isListening) {
                    voiceStatus.textContent = '';
                }
            }, 2000);
        }
    } catch (error) {
        console.error('Ошибка при отправке аудио или получении ответа:', error);
        voiceStatus.textContent = 'Ошибка при обработке команды';
        addToHistory(`Ошибка голосового ввода: ${error.message}`);
        setTimeout(() => {
            if (!isListening) {
                voiceStatus.textContent = '';
            }
        }, 3000);
    }
};
                // Запускаем запись
                mediaRecorder.start();
                let seconds = 0;
                recordingInterval = setInterval(() => {
                    seconds++;
                    voiceStatus.textContent = `Запись... ${seconds}с`;
                    if (seconds >= 5) {
                        mediaRecorder.stop();
                        clearInterval(recordingInterval);
                    }
                }, 1000);
                startFrequencySimulation();
            } else {
                isListening = false;
                micButton.classList.remove('listening');
                voiceStatus.textContent = 'Ошибка доступа к микрофону';
                setTimeout(() => {
                    voiceStatus.textContent = '';
                }, 3000);
            }
        } else {
            // Останавливаем запись
            if (mediaRecorder && mediaRecorder.state === 'recording') {
                mediaRecorder.stop();
                clearInterval(recordingInterval);
                stopFrequencySimulation();
            }
            // Состояние isListening будет установлено в false в onstop коллбэке
        }
    });
    }
// --- Обновленная логика кнопок ---
const btnCurtains = $('#btn-curtains');
const btnLights = $('#btn-lights');
const btnTv = $('#btn-tv');
const btnMorning = $('#btn-morning');
const btnEvening = $('#btn-evening');
// Удалены несуществующие элементы
const room = $('#room');
const sun = $('.sun');
const curtainLeft = $('.curtain.left');
const curtainRight = $('.curtain.right');
// Элементы люстры
const chandelierBulbs = $$('.chandelier-bulb');
// Все элементы свечения
const chandelierGlows = $$('.chandelier-glow');
const tv = $('.tv');
const timeDisplay = $('#time-display');
const statusCurtains = $('#status-curtains');
const statusLights = $('#status-lights');
const statusTv = $('#status-tv');
const statusClock = $('#status-clock');
// Изначально шторы открыты
let curtainsOpen = true;
let lightsOn = false;
let tvOn = false;
let theme = 'day';
let soundEnabled = true;
// Новое состояние для часов
let clockOn = true;
let clockInterval = null;
function playSound(src) {
  if (!soundEnabled) return;
  try {
    const audio = new Audio(src);
    audio.volume = 0.6;
    audio.play().catch(() => {});
  } catch (e) {
    console.warn('Audio error', e);
  }
}
function updateClock() {
  if (!clockOn) return; // Не обновляем, если часы выключены
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const seconds = now.getSeconds().toString().padStart(2, '0');
  timeDisplay.textContent = `${hours}:${minutes}:${seconds}`;
}
// Функция для запуска/остановки часов
function toggleClock() {
    clockOn = !clockOn;
    if (clockOn) {
        // Включаем часы
        const btnClock = $('#btn-clock');
        if (btnClock) btnClock.textContent = 'Выключить часы';
        timeDisplay.style.opacity = "1";
        clockInterval = setInterval(updateClock, 1000);
        statusClock.textContent = `Часы: Работают`;
        addToHistory("Часы включены"); // Добавляем в историю
    } else {
        // Выключаем часы
        const btnClock = $('#btn-clock');
        if (btnClock) btnClock.textContent = 'Включить часы';
        timeDisplay.style.opacity = "0.3";
        clearInterval(clockInterval);
        statusClock.textContent = `Часы: Выключены`;
        addToHistory("Часы выключены"); // Добавляем в историю
    }
}
function updateUI() {
  const btnCurtains = $('#btn-curtains');
  const btnLights = $('#btn-lights');
  const btnTv = $('#btn-tv');
  if (btnCurtains) btnCurtains.textContent = curtainsOpen ? 'Закрыть шторы' : 'Открыть шторы';
  if (btnLights) btnLights.textContent = lightsOn ? 'Выключить свет' : 'Включить свет';
  if (btnTv) btnTv.textContent = tvOn ? 'Выключить ТВ' : 'Включить ТВ';
  // Состояние часов обновляется в toggleClock
  curtainLeft.classList.toggle('open-left', curtainsOpen);
  curtainRight.classList.toggle('open-right', curtainsOpen);
  if (sun) sun.style.opacity = curtainsOpen ? '1' : '0.3';
  // Управление люстрой
  chandelierBulbs.forEach(bulb => {
    bulb.classList.toggle('on', lightsOn);
  });
  // Управление свечением всех лампочек
  chandelierGlows.forEach(glow => {
    glow.classList.toggle('on', lightsOn);
  });
  tv.classList.toggle('tv-on', tvOn);
  tv.classList.toggle('tv-off', !tvOn);
  const screenText = $('.tv .screen-text');
  if (screenText) {
      if (tvOn) {
        screenText.textContent = '';
      } else {
        screenText.textContent = 'ТВ — выкл.';
      }
  }
  if (statusCurtains) statusCurtains.textContent = `Шторы: ${curtainsOpen ? 'Открыты' : 'Закрыты'}`;
  if (statusLights) statusLights.textContent = `Свет: ${lightsOn ? 'Включён' : 'Выключен'}`;
  if (statusTv) statusTv.textContent = `ТВ: ${tvOn ? 'Вкл.' : 'Выкл.'}`;
  // Статус часов обновляется в toggleClock
}
// Проверяем существование элементов перед добавлением обработчиков
if (btnCurtains) {
  btnCurtains.addEventListener('click', () => {
    curtainsOpen = !curtainsOpen;
    if (!curtainsOpen) {
      document.body.classList.add('night');
      if (room) {
          room.classList.remove('bg-[#eaf2ff]', 'text-black');
          room.classList.add('bg-[#0b1320]', 'text-white');
      }
    } else {
      if (!lightsOn) {
        document.body.classList.remove('night');
        if (room) {
            room.classList.remove('bg-[#0b1320]', 'text-white');
            room.classList.add('bg-[#eaf2ff]', 'text-black');
        }
      }
    }
    playSound(curtainsOpen ? '/sounds/curtain-open.mp3' : '/sounds/curtain-close.mp3');
    updateUI();
    addToHistory(curtainsOpen ? "Шторы открыты" : "Шторы закрыты"); // Добавляем в историю
  });
}
if (btnLights) {
  btnLights.addEventListener('click', () => {
    lightsOn = !lightsOn;
    if (lightsOn) {
      document.body.classList.remove('night');
      if (room) {
          room.classList.remove('bg-[#0b1320]', 'text-white');
          room.classList.add('bg-[#eaf2ff]', 'text-black');
      }
    }
    else if (!curtainsOpen) {
       document.body.classList.add('night');
       if (room) {
           room.classList.remove('bg-[#eaf2ff]', 'text-black');
           room.classList.add('bg-[#0b1320]', 'text-white');
       }
    }
    playSound('/sounds/switch.mp3');
    updateUI();
    addToHistory(lightsOn ? "Свет включён" : "Свет выключен"); // Добавляем в историю
  });
}
if (btnTv) {
  btnTv.addEventListener('click', () => {
    tvOn = !tvOn;
    playSound('/sounds/tv-toggle.mp3');
    updateUI();
    addToHistory(tvOn ? "ТВ включён" : "ТВ выключен"); // Добавляем в историю
  });
}
// Обработчик для кнопки выключения часов
const btnClock = $('#btn-clock');
if (btnClock) {
  btnClock.addEventListener('click', () => {
      toggleClock();
      // playSound('/sounds/switch.mp3'); // Можно добавить звук
  });
}
if (btnMorning) {
  btnMorning.addEventListener('click', () => {
    curtainsOpen = true;
    lightsOn = false;
    tvOn = false;
    // При утреннем режиме включаем часы
    if (!clockOn) toggleClock();
    document.body.classList.remove('night');
    if (room) {
        room.classList.remove('bg-[#0b1320]', 'text-white');
        room.classList.add('bg-[#eaf2ff]', 'text-black');
    }
    playSound('/sounds/morning.mp3');
    updateUI();
    addToHistory("Утренний режим активирован"); // Добавляем в историю
  });
}
if (btnEvening) {
  btnEvening.addEventListener('click', () => {
    curtainsOpen = false;
    lightsOn = true;
    tvOn = true;
    // При вечернем режиме включаем часы
    if (!clockOn) toggleClock();
    document.body.classList.add('night');
    if (room) {
        room.classList.remove('bg-[#eaf2ff]', 'text-black');
        room.classList.add('bg-[#0b1320]', 'text-white');
    }
    playSound('/sounds/evening.mp3');
    updateUI();
    addToHistory("Вечерний режим активирован"); // Добавляем в историю
  });
}
// Инициализация часов
updateClock();
clockInterval = setInterval(updateClock, 1000);
// Изначально шторы открыты
updateUI();
// --- Работа со сценариями через API ---
const scenarioList = document.getElementById('scenario-list'); // Список в вкладке "Сценарии"
const scenarioListButtons = document.getElementById('scenario-list-buttons'); // Список в вкладке "Кнопки"
const saveScenarioBtn = document.getElementById('save-scenario');
// Загрузка сценариев с сервера
async function loadScenarios() {
    try {
        const response = await fetch('/scenarios');
        if (!response.ok) throw new Error("Ошибка загрузки сценариев");
        const scenarios = await response.json();
        renderScenarioList(scenarios); // Для вкладки "Сценарии"
        renderScenarioListButtons(scenarios); // Для вкладки "Кнопки"
        return scenarios;
    } catch (error) {
        console.error(error);
        scenarioList.innerHTML = '<p class="text-red-500 text-sm">Ошибка загрузки сценариев</p>';
        scenarioListButtons.innerHTML = '<p class="text-red-500 text-sm">Ошибка загрузки сценариев</p>';
        return [];
    }
}
// Сохранение сценария на сервере
async function saveScenario(name, actions) {
    try {
        const response = await fetch('/scenarios', {
            method: 'POST',
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, actions })
        });
        if (!response.ok) throw new Error("Ошибка сохранения сценария");
        await loadScenarios(); // Перезагружаем после сохранения
        addToHistory(`Сценарий "${name}" сохранён`);
    } catch (error) {
        console.error(error);
        alert("Не удалось сохранить сценарий");
    }
}
// Удаление сценария
async function deleteScenario(name) {
    try {
        const response = await fetch(`/scenarios/${encodeURIComponent(name)}`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error("Ошибка удаления сценария");
        await loadScenarios(); // Перезагружаем после удаления
        addToHistory(`Сценарий "${name}" удалён`);
    } catch (error) {
        console.error(error);
        alert("Не удалось удалить сценарий");
    }
}
// Отображение списка сценариев (для вкладки "Сценарии") - теперь без кнопок запуска
function renderScenarioList(scenarios) {
    scenarioList.innerHTML = '<h4 class="text-md font-medium mb-1">Сохранённые сценарии</h4>';
    if (scenarios.length === 0) {
        scenarioList.innerHTML += '<p class="text-gray-500 text-sm italic">Сценарии отсутствуют</p>';
        return;
    }
    scenarios.forEach((scenario) => {
        const div = document.createElement('div');
        div.className = 'scenario-item';
        div.innerHTML = `
            <span>${scenario.name}</span>
            <button onclick="deleteScenario('${scenario.name}')" class="bg-red-500 text-white px-2 py-1 rounded text-xs">Удалить</button>
        `;
        scenarioList.appendChild(div);
    });
}
// Отображение списка сценариев (для вкладки "Кнопки")
function renderScenarioListButtons(scenarios) {
    scenarioListButtons.innerHTML = '';
    if (scenarios.length === 0) {
        scenarioListButtons.innerHTML = '<p class="text-gray-500 text-sm italic">Нет доступных сценариев</p>';
        return;
    }
    scenarios.forEach((scenario) => {
        const button = document.createElement('button');
        button.className = 'w-full py-2 rounded-lg bg-purple-500 text-white hover:opacity-90';
        button.textContent = `Запустить: ${scenario.name}`;
        button.addEventListener('click', () => runScenario(scenario.name));
        scenarioListButtons.appendChild(button);
    });
}
// Запуск сценария (запрос по имени)
async function runScenario(name) {
    try {
        const response = await fetch(`/scenarios/${encodeURIComponent(name)}`);
        if (!response.ok) throw new Error("Ошибка запуска сценария");
        const scenario = await response.json();
        // Применение сценария
        if (scenario.actions.curtains === 'open') { curtainsOpen = true; }
        if (scenario.actions.curtains === 'close') { curtainsOpen = false; }
        if (scenario.actions.lights === 'on') { lightsOn = true; }
        if (scenario.actions.lights === 'off') { lightsOn = false; }
        if (scenario.actions.tv === 'on') { tvOn = true; }
        if (scenario.actions.tv === 'off') { tvOn = false; }
        if (scenario.actions.clock === 'on' && !clockOn) toggleClock();
        if (scenario.actions.clock === 'off' && clockOn) toggleClock();
        if (scenario.actions.weather === 'show') {
            weatherPanel.classList.remove('hidden');
            setTimeout(() => weatherPanel.classList.add('hidden'), 5000);
        } else if (scenario.actions.weather === 'hide') {
            weatherPanel.classList.add('hidden');
        }
        updateUI();
        addToHistory(`Сценарий "${name}" запущен`);
    } catch (error) {
        console.error(error);
        alert("Не удалось запустить сценарий");
    }
}
// Обработчик кнопки "Сохранить"
saveScenarioBtn.addEventListener('click', () => {
    const nameInput = document.getElementById('scenario-name');
    const name = nameInput.value.trim();
    if (!name) {
        alert('Введите название сценария');
        return;
    }
    const actions = {
        curtains: document.getElementById('device-curtains').value,
        lights: document.getElementById('device-lights').value,
        tv: document.getElementById('device-tv').value,
        clock: document.getElementById('device-clock').value,
        weather: document.getElementById('device-weather').value
    };
    saveScenario(name, actions);
    nameInput.value = '';
});
// При загрузке страницы подтягиваем сценарии с сервера
loadScenarios();