const QUOTES = [
  { text: "Focus is a matter of deciding what things you're not going to do.", author: "John Carmack" },
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "Amateurs sit and wait for inspiration, the rest of us just get up and go to work.", author: "Stephen King" },
  { text: "Your mind is for having ideas, not holding them.", author: "David Allen" },
  { text: "Only put off until tomorrow what you are willing to die having left undone.", author: "Pablo Picasso" },
  { text: "It is not that we have a short time to live, but that we waste a lot of it.", author: "Seneca" }
];

document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const mode = urlParams.get('mode');
  const domain = urlParams.get('domain') || 'this website';
  const originalUrl = urlParams.get('url');

  const blockIcon = document.getElementById('blockIcon');
  const blockTitle = document.getElementById('blockTitle');
  const goBackBtn = document.getElementById('goBackBtn');
  const tempAllowBtn = document.getElementById('tempAllowBtn');
  const quoteText = document.getElementById('quoteText');
  const quoteAuthor = document.getElementById('quoteAuthor');
  const savedMinutesCount = document.getElementById('savedMinutesCount');
  const currentTaskText = document.getElementById('currentTaskText');

  // Customize block indicators based on mode
  if (mode === 'hard') {
    blockIcon.textContent = '🚫';
    blockTitle.textContent = 'This site is blocked.';
  } else if (mode === 'soft') {
    blockIcon.textContent = '⏳';
    blockTitle.textContent = 'Daily Limit Reached.';
  } else {
    blockIcon.textContent = '🔒';
    blockTitle.textContent = 'This site is blocked.';
  }

  // Load Focus stats and current active task
  chrome.storage.sync.get(["pomodoroState", "notes"], (result) => {
    // 1. Calculate focused minutes today
    const pomo = result.pomodoroState || {};
    const completedToday = pomo.completedSessionsToday || 0;
    const workDuration = (pomo.settings && pomo.settings.workDuration) || 25;
    const minutesSaved = completedToday * workDuration;
    savedMinutesCount.textContent = minutesSaved;

    // 2. Set first note in list as the current task
    const notes = result.notes || [];
    if (notes.length > 0) {
      currentTaskText.textContent = notes[0].title;
    } else {
      currentTaskText.textContent = 'No current tasks. Add one in dashboard!';
    }
  });

  // Display a random quote
  const randomQuote = QUOTES[Math.floor(Math.random() * QUOTES.length)];
  quoteText.textContent = `"${randomQuote.text}"`;
  quoteAuthor.textContent = randomQuote.author;

  // Handle go back action
  goBackBtn.addEventListener('click', () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = 'https://www.google.com';
    }
  });

  // Handle temporary allow action (5 minutes bypass)
  tempAllowBtn.addEventListener('click', () => {
    if (!domain || domain === 'this website') {
      window.location.href = originalUrl || 'https://www.google.com';
      return;
    }

    chrome.storage.local.get('tempAllowSites', (result) => {
      const tempAllowSites = result.tempAllowSites || {};
      
      // Grant whitelist bypass for 5 minutes (300,000 ms)
      tempAllowSites[domain] = Date.now() + (5 * 60 * 1000);
      
      chrome.storage.local.set({ tempAllowSites }, () => {
        chrome.runtime.sendMessage({ type: 'BLOCKER_SWEEP' }).catch(() => {});
        window.location.href = originalUrl || ('https://' + domain);
      });
    });
  });
});
