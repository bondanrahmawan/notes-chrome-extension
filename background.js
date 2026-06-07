const TIMER_ALARM = 'pomodoroTimer';
const POPUP_ALARM = 'autoPopup';
const STORAGE_KEY = 'pomodoroState';

const BLOCKER_STORAGE_KEY = 'blockerState';

const DEFAULT_STATE = {
  sessionType: 'work',
  timeLeft: 25 * 60,
  totalTime: 25 * 60,
  isRunning: false,
  expectedEndTime: 0,
  completedSessions: 0,
  completedSessionsToday: 0,
  pomodoroResetDate: '',
  settings: {
    workDuration: 25,
    shortBreakDuration: 5,
    longBreakDuration: 15,
    autoStartBreaks: false,
    autoStartWork: false,
    soundEnabled: true
  }
};

const DEFAULT_BLOCKER_STATE = {
  enabled: true,
  sites: [], // { domain, mode: 'hard'|'soft', limitMinutes, timeSpentToday }
  lastResetDate: ''
};

// Pomodoro State Accessors
async function getState() {
  const result = await chrome.storage.sync.get(STORAGE_KEY);
  const state = { ...DEFAULT_STATE, ...result[STORAGE_KEY] };

  const today = new Date().toISOString().split('T')[0];
  if (state.pomodoroResetDate !== today) {
    state.completedSessionsToday = 0;
    state.pomodoroResetDate = today;
    await saveState(state);
  }

  return state;
}

async function saveState(state) {
  await chrome.storage.sync.set({ [STORAGE_KEY]: state });
}

// Blocker State Accessors
async function getBlockerState() {
  const result = await chrome.storage.sync.get(BLOCKER_STORAGE_KEY);
  return { ...DEFAULT_BLOCKER_STATE, ...result[BLOCKER_STORAGE_KEY] };
}

async function saveBlockerState(state) {
  await chrome.storage.sync.set({ [BLOCKER_STORAGE_KEY]: state });
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
    state.completedSessionsToday++;
  }

  await sendNotification(state.sessionType);
  
  chrome.runtime.sendMessage({ type: 'POMODORO_COMPLETE_CHIME' });

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
  chrome.runtime.sendMessage({ type: 'POMODORO_STATE_UPDATE', state }).catch(() => {});
}


// Productivity Blocker Time Tracking & Detection Engine
function getDomainFromUrl(url) {
  try {
    if (!url) return null;
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return parsed.hostname.replace(/^www\./, '');
  } catch (e) {
    return null;
  }
}

function matchesBlockedDomain(domain, blockedDomain) {
  return domain === blockedDomain || domain.endsWith('.' + blockedDomain);
}

async function isTemporarilyAllowed(domain) {
  const result = await chrome.storage.local.get('tempAllowSites');
  const tempAllowSites = result.tempAllowSites || {};
  let changed = false;
  let allowed = false;
  const now = Date.now();

  Object.keys(tempAllowSites).forEach((allowedDomain) => {
    if (tempAllowSites[allowedDomain] <= now) {
      delete tempAllowSites[allowedDomain];
      changed = true;
      return;
    }

    if (matchesBlockedDomain(domain, allowedDomain)) {
      allowed = true;
    }
  });

  if (changed) {
    await chrome.storage.local.set({ tempAllowSites });
  }

  return allowed;
}

function getBlockedPageUrl(mode, blockedDomain, originalUrl) {
  const params = new URLSearchParams({
    mode,
    domain: blockedDomain,
    url: originalUrl || ''
  });
  return chrome.runtime.getURL('blocked.html?' + params.toString());
}

async function checkAndResetDailyTimer(state) {
  const today = new Date().toISOString().split('T')[0];
  if (state.lastResetDate !== today) {
    state.sites.forEach(site => {
      site.timeSpentToday = 0;
    });
    state.lastResetDate = today;
    await saveBlockerState(state);
    await chrome.storage.local.remove('activeTracking');
    broadcastBlockerState(state);
  }
}

async function handleTabChange(tab) {
  if (!tab || !tab.url || tab.url.startsWith('chrome') || tab.url.startsWith('chrome-extension')) {
    await pauseActiveTracking();
    return;
  }

  const domain = getDomainFromUrl(tab.url);
  if (!domain) {
    await pauseActiveTracking();
    return;
  }

  const state = await getBlockerState();
  if (!state.enabled) return;

  await checkAndResetDailyTimer(state);

  if (await isTemporarilyAllowed(domain)) {
    await pauseActiveTracking();
    return;
  }

  // 1. Check Hard Blacklist (takes absolute priority!)
  const hardMatch = state.sites.find(s => s.mode === 'hard' && matchesBlockedDomain(domain, s.domain));
  if (hardMatch) {
    await pauseActiveTracking();
    chrome.tabs.update(tab.id, { url: getBlockedPageUrl('hard', hardMatch.domain, tab.url) });
    return;
  }

  // 2. Check Soft Blacklist
  const softMatch = state.sites.find(s => s.mode === 'soft' && matchesBlockedDomain(domain, s.domain));
  if (softMatch) {
    // If daily soft limit has already been exceeded
    if (softMatch.timeSpentToday >= softMatch.limitMinutes * 60) {
      await pauseActiveTracking();
      chrome.tabs.update(tab.id, { url: getBlockedPageUrl('soft', softMatch.domain, tab.url) });
      return;
    }

    // Still has remaining browsing budget! Track active time.
    const local = await chrome.storage.local.get('activeTracking');
    const tracking = local.activeTracking;

    if (tracking && tracking.domain === softMatch.domain) {
      return; // Already tracking this domain, carry on
    }

    if (tracking) {
      await pauseActiveTracking(); // Pause other site tracking
    }

    // Start tracking
    const startTime = Date.now();
    await chrome.storage.local.set({
      activeTracking: {
        domain: softMatch.domain,
        tabId: tab.id,
        startTime: startTime
      }
    });

    // Schedule an alarm to fire when limit is reached
    const remainingSeconds = (softMatch.limitMinutes * 60) - softMatch.timeSpentToday;
    await chrome.alarms.clear('softBlock_' + softMatch.domain);
    await chrome.alarms.create('softBlock_' + softMatch.domain, {
      when: Date.now() + (remainingSeconds * 1000)
    });
  } else {
    // Navigated to non-blocked site, commit active tracking
    await pauseActiveTracking();
  }
}

async function pauseActiveTracking() {
  const local = await chrome.storage.local.get('activeTracking');
  const tracking = local.activeTracking;
  if (!tracking) return;

  // Clear local storage tracking state and associated softBlock alarm
  await chrome.storage.local.remove('activeTracking');
  await chrome.alarms.clear('softBlock_' + tracking.domain);

  const elapsedSeconds = Math.floor((Date.now() - tracking.startTime) / 1000);
  if (elapsedSeconds <= 0) return;

  // Update timeSpentToday in sync storage
  const state = await getBlockerState();
  const site = state.sites.find(s => s.domain === tracking.domain && s.mode === 'soft');
  if (site) {
    site.timeSpentToday = (site.timeSpentToday || 0) + elapsedSeconds;
    await saveBlockerState(state);
    broadcastBlockerState(state);
  }
}

async function sweepAllTabsForBlocks() {
  const state = await getBlockerState();
  if (!state.enabled) return;

  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    const domain = getDomainFromUrl(tab.url);
    if (!domain) continue;

    if (await isTemporarilyAllowed(domain)) continue;

    // Check hard blocks
    const hardMatch = state.sites.find(s => s.mode === 'hard' && matchesBlockedDomain(domain, s.domain));
    if (hardMatch) {
      chrome.tabs.update(tab.id, { url: getBlockedPageUrl('hard', hardMatch.domain, tab.url) });
      continue;
    }

    // Check soft blocks
    const softMatch = state.sites.find(s => s.mode === 'soft' && matchesBlockedDomain(domain, s.domain));
    if (softMatch && softMatch.timeSpentToday >= softMatch.limitMinutes * 60) {
      chrome.tabs.update(tab.id, { url: getBlockedPageUrl('soft', softMatch.domain, tab.url) });
    }
  }

  // Check currently active tab
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (activeTab) {
    await handleTabChange(activeTab);
  }
}

function broadcastBlockerState(state) {
  chrome.runtime.sendMessage({ type: 'BLOCKER_STATE_UPDATE', state }).catch(() => {});
}

async function clearStaleSoftBlockAlarms(state) {
  const softDomains = new Set((state.sites || [])
    .filter(site => site.mode === 'soft')
    .map(site => site.domain));
  const alarms = await chrome.alarms.getAll();

  await Promise.all(alarms
    .filter(alarm => alarm.name.startsWith('softBlock_'))
    .filter(alarm => !softDomains.has(alarm.name.substring('softBlock_'.length)))
    .map(alarm => chrome.alarms.clear(alarm.name)));
}


// Chrome Event Registers
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === TIMER_ALARM) {
    const state = await getState();
    if (state.isRunning) {
      state.timeLeft = 0;
      await handleSessionComplete(state);
    }
  } else if (alarm.name === POPUP_ALARM) {
    openPopup();
  } else if (alarm.name.startsWith('softBlock_')) {
    const domain = alarm.name.substring('softBlock_'.length);
    
    // Commit time spent to maximum
    const state = await getBlockerState();
    const site = state.sites.find(s => s.domain === domain && s.mode === 'soft');
    if (site) {
      site.timeSpentToday = site.limitMinutes * 60;
      await saveBlockerState(state);
      broadcastBlockerState(state);
    }
    
    await chrome.storage.local.remove('activeTracking');

    // Sweep tabs and block this domain
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      const tabDomain = getDomainFromUrl(tab.url);
      if (tabDomain && matchesBlockedDomain(tabDomain, domain) && !(await isTemporarilyAllowed(tabDomain))) {
        chrome.tabs.update(tab.id, { url: getBlockedPageUrl('soft', domain, tab.url) });
      }
    }
  }
});

// Blocker Tab Monitoring Events
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    await handleTabChange(tab);
  } catch (e) {}
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.url) {
    await handleTabChange(tab);
  }
});

chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    await pauseActiveTracking();
  } else {
    try {
      const [tab] = await chrome.tabs.query({ active: true, windowId: windowId });
      if (tab) {
        await handleTabChange(tab);
      }
    } catch (e) {}
  }
});

chrome.tabs.onRemoved.addListener(async (tabId, removeInfo) => {
  const local = await chrome.storage.local.get('activeTracking');
  const tracking = local.activeTracking;
  if (tracking && tracking.tabId === tabId) {
    await pauseActiveTracking();
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
    case 'BLOCKER_STATE_UPDATE':
      if (!message.state) {
        sendResponse({ success: false, error: 'Missing blocker state' });
        return false;
      }
      saveBlockerState(message.state)
        .then(() => clearStaleSoftBlockAlarms(message.state))
        .then(() => sweepAllTabsForBlocks())
        .then(() => sendResponse({ success: true }));
      return true;
    case 'BLOCKER_SWEEP':
      sweepAllTabsForBlocks().then(() => sendResponse({ success: true }));
      return true;
  }
});

function openPopup() {
  chrome.action.openPopup();
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

  const existingBlocker = await chrome.storage.sync.get(BLOCKER_STORAGE_KEY);
  if (!existingBlocker[BLOCKER_STORAGE_KEY]) {
    await saveBlockerState(DEFAULT_BLOCKER_STATE);
  }

  await setupAutoPopupAlarm();
});

// Re-setup popup alarm when storage changes
chrome.storage.onChanged.addListener(async (changes, areaName) => {
  if (areaName === 'sync' && changes.popupInterval) {
    await setupAutoPopupAlarm();
  }
});
