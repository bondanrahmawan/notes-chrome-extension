const TIMER_ALARM = 'pomodoroTimer';
const POPUP_ALARM = 'autoPopup';
const STORAGE_KEY = 'pomodoroState';

const DEFAULT_STATE = {
  sessionType: 'work',
  timeLeft: 25 * 60,
  totalTime: 25 * 60,
  isRunning: false,
  expectedEndTime: 0,
  completedSessions: 0,
  settings: {
    workDuration: 25,
    shortBreakDuration: 5,
    longBreakDuration: 15,
    autoStartBreaks: false,
    autoStartWork: false,
    soundEnabled: true
  }
};

async function getState() {
  const result = await chrome.storage.sync.get(STORAGE_KEY);
  return { ...DEFAULT_STATE, ...result[STORAGE_KEY] };
}

async function saveState(state) {
  await chrome.storage.sync.set({ [STORAGE_KEY]: state });
}

function getDurationForSession(sessionType, settings) {
  switch (sessionType) {
    case 'work':
      return settings.workDuration * 60;
    case 'shortBreak':
      return settings.shortBreakDuration * 60;
    case 'longBreak':
      return settings.longBreakDuration * 60;
    default:
      return settings.workDuration * 60;
  }
}

function getNextSessionType(currentType, completedSessions, settings) {
  if (currentType === 'work') {
    const isLongBreak = (completedSessions) % 4 === 0 && completedSessions > 0;
    return isLongBreak ? 'longBreak' : 'shortBreak';
  }
  return 'work';
}

async function createTimerAlarm(timestamp) {
  await clearTimerAlarm();
  // Set alarm for exact target timestamp
  await chrome.alarms.create(TIMER_ALARM, {
    when: timestamp
  });
}

async function clearTimerAlarm() {
  await chrome.alarms.clear(TIMER_ALARM);
}

async function sendNotification(sessionType) {
  const messages = {
    work: 'Focus session completed! Time for a break ☕.',
    shortBreak: 'Short break is over! Ready to focus? 🎯',
    longBreak: 'Long break is over! Ready to get back to work? 🌿'
  };

  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: 'FocusSpace Timer',
    message: messages[sessionType] || 'Timer completed!',
    priority: 2
  });
}

async function handleSessionComplete(state) {
  await clearTimerAlarm();

  if (state.sessionType === 'work') {
    state.completedSessions++;
  }

  // Notify user
  await sendNotification(state.sessionType);
  
  // Broadcast chime message to popup if it's currently open
  chrome.runtime.sendMessage({ type: 'POMODORO_COMPLETE_CHIME' });

  // Get next session
  const nextSessionType = getNextSessionType(state.sessionType, state.completedSessions, state.settings);
  const shouldAutoStart = nextSessionType === 'work' 
    ? state.settings.autoStartWork 
    : state.settings.autoStartBreaks;

  state.sessionType = nextSessionType;
  state.totalTime = getDurationForSession(nextSessionType, state.settings);
  state.timeLeft = state.totalTime;
  
  if (shouldAutoStart) {
    state.isRunning = true;
    state.expectedEndTime = Date.now() + state.timeLeft * 1000;
    await saveState(state);
    await createTimerAlarm(state.expectedEndTime);
  } else {
    state.isRunning = false;
    state.expectedEndTime = 0;
    await saveState(state);
  }

  broadcastState(state);
}

async function startTimer() {
  const state = await getState();
  if (state.isRunning) return;

  state.isRunning = true;
  state.expectedEndTime = Date.now() + state.timeLeft * 1000;
  await saveState(state);

  await createTimerAlarm(state.expectedEndTime);
  broadcastState(state);
}

async function pauseTimer() {
  const state = await getState();
  if (!state.isRunning) return;

  state.isRunning = false;
  const remainingMs = state.expectedEndTime - Date.now();
  state.timeLeft = Math.max(0, Math.ceil(remainingMs / 1000));
  state.expectedEndTime = 0;

  await clearTimerAlarm();
  await saveState(state);
  broadcastState(state);
}

async function resetTimer() {
  const state = await getState();
  state.isRunning = false;
  state.expectedEndTime = 0;
  state.timeLeft = state.totalTime;

  await clearTimerAlarm();
  await saveState(state);
  broadcastState(state);
}

async function skipSession() {
  const state = await getState();
  await handleSessionComplete(state);
}

async function updateSettings(newSettings) {
  const state = await getState();
  state.settings = { ...state.settings, ...newSettings };
  
  // Update times if timer is idle
  if (!state.isRunning) {
    state.totalTime = getDurationForSession(state.sessionType, state.settings);
    state.timeLeft = state.totalTime;
  }

  await saveState(state);
  broadcastState(state);
}

async function setSessionType(sessionType) {
  const state = await getState();
  state.sessionType = sessionType;
  state.totalTime = getDurationForSession(sessionType, state.settings);
  state.timeLeft = state.totalTime;
  state.isRunning = false;
  state.expectedEndTime = 0;

  await clearTimerAlarm();
  await saveState(state);
  broadcastState(state);
}

function broadcastState(state) {
  // Ignore error if popup is not open/listening
  chrome.runtime.sendMessage({ type: 'POMODORO_STATE_UPDATE', state }).catch(() => {});
}

// Alarm Listener
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === TIMER_ALARM) {
    const state = await getState();
    if (state.isRunning) {
      state.timeLeft = 0;
      await handleSessionComplete(state);
    }
  } else if (alarm.name === POPUP_ALARM) {
    openPopup();
  }
});

// Message Listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'POMODORO_GET_STATE':
      getState().then(sendResponse);
      return true;
    case 'POMODORO_START':
      startTimer().then(() => sendResponse({ success: true }));
      return true;
    case 'POMODORO_PAUSE':
      pauseTimer().then(() => sendResponse({ success: true }));
      return true;
    case 'POMODORO_RESET':
      resetTimer().then(() => sendResponse({ success: true }));
      return true;
    case 'POMODORO_SKIP':
      skipSession().then(() => sendResponse({ success: true }));
      return true;
    case 'POMODORO_UPDATE_SETTINGS':
      updateSettings(message.settings).then(() => sendResponse({ success: true }));
      return true;
    case 'POMODORO_SET_SESSION':
      setSessionType(message.sessionType).then(() => sendResponse({ success: true }));
      return true;
  }
});

function openPopup() {
  chrome.windows.create({
    url: "popup.html",
    type: "popup",
    width: 380,
    height: 550,
  });
}

// Setup Auto Popup Interval Alarm
async function setupAutoPopupAlarm() {
  chrome.storage.sync.get(["popupInterval"], async function (result) {
    const intervalMinutes = parseFloat(result.popupInterval) || 15;
    await chrome.alarms.clear(POPUP_ALARM);
    chrome.alarms.create(POPUP_ALARM, {
      periodInMinutes: intervalMinutes,
      delayInMinutes: intervalMinutes
    });
  });
}

chrome.runtime.onInstalled.addListener(async () => {
  const existing = await chrome.storage.sync.get(STORAGE_KEY);
  if (!existing[STORAGE_KEY]) {
    await saveState(DEFAULT_STATE);
  }
  await setupAutoPopupAlarm();
});

// Re-setup popup alarm when storage changes
chrome.storage.onChanged.addListener(async (changes, areaName) => {
  if (areaName === 'sync' && changes.popupInterval) {
    await setupAutoPopupAlarm();
  }
});