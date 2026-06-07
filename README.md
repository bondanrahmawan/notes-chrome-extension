# FocusSpace Chrome Extension ⚡

FocusSpace is a premium, dark-mode productivity dashboard designed as a Google Chrome extension. It combines a battery-friendly Pomodoro timer, structured sticky notes, reading tracking, and a hybrid website blocker to keep you focused and organized.

---

## 🎯 Key Features

### 1. Pomodoro Timer (Manifest V3 Compliant)
* **Epoch-Based Alarm Sync**: Background service workers in Manifest V3 automatically suspend after 30 seconds of inactivity. To ensure the timer remains 100% accurate, the extension stores a future timestamp (`expectedEndTime`) and schedules a Chrome Alarm (`chrome.alarms`) so the background worker sleeps, preserving your battery.
* **Local Fast-Ticker**: When the popup is opened, a local countdown ticker updates every 250ms to display a precise down-to-the-second countdown and animate a visual SVG progress ring.
* **Synthesized audio chimes**: Plays a clear two-tone musical alert (E5 then A5 notes) programmatically using the Web Audio API (`AudioContext`) when focus or break sessions finish.
* **Integrated Settings**: Instantly customize focus, short break, and long break intervals, toggle auto-start rules, and enable/disable audio notifications.
* **Keyboard Hotkeys**:
  * `Space` — Play / Pause
  * `KeyR` — Reset Timer
  * `KeyS` — Skip Session

### 2. Sticky Notes Manager
* **Aesthetic Cards**: Notes feature rounded card containers with custom left-border highlights representing the note's selected category color.
* **Relative Deadlines**: Displays date deadlines and automatically calculates days remaining (highlights status badges like `Due Today` or `Past Due`).
* **Quick Action Checkmarks**: Mark notes as complete directly from the popup list to delete them from storage without opening the dashboard.

### 3. Book Reading Tracker
* **Progress Meter**: Tracks your current page and date-stamps when you last read.
* **Inline Adjusters**: Add or subtract pages directly on the book cards using inline `+` and `-` buttons in the popup.
* **Mark Finished**: One-click complete action to tag a book as "Finished" and highlight it in a soothing green shade.

### 4. Productivity Website Blocker (Hybrid)
* **Hard Block List**: Immediate access denial. Tab requests are intercepted and redirected to a minimal distraction-free screen (`blocked.html`) featuring randomly selected productivity quotes.
* **Soft Block List**: Tracks active, foreground time spent on soft-blocked sites. Once the daily limit (customizable in minutes) is exhausted, the browser redirects the tabs to the blocked landing page.
* **Smart Prioritization**: If a website is placed on both hard and soft blacklists, the strict **Hard Block** takes absolute priority.

### 5. Configurator Dashboard
* Exposes settings in a centered tab layout allowing you to add, edit, or delete items, configure website blacklists, and adjust the automatic notes window popup interval.

---

## 📂 Project Directory Structure

```
├── manifest.json         # Extension specifications and permissions
├── background.js         # Alarm scheduler, time-tracking, and redirect sweeps
├── popup.html            # Main extension popover view layout
├── popup.js              # Local ticker controller, chime sound player, and popup UI binder
├── popup.css             # Main styling system, SVG rings, and glassmorphic tokens
├── form.html             # Dashboard view for adding items and managing blocker configurations
├── form.js               # Form validation, settings triggers, and storage sync
├── form.css              # Dashboard grid systems, input widths, and button controls
├── blocked.html          # Redirect warning screen view
├── blocked.js            # Dynamic warning handler and history browser navigation
└── icons/                # Extension logo icons
```

---

## 🚀 How to Install and Run the Extension

Follow these steps to load the extension unpackaged into Google Chrome:

1. Open **Google Chrome** and navigate to `chrome://extensions/`.
2. In the top-right corner, toggle the **Developer mode** switch to **ON**.
3. In the top-left corner, click the **Load unpacked** button.
4. Select the directory:
   `D:\pet_project\notes-chrome-extension`
5. The extension is now successfully installed! Pin the **FocusSpace** icon to your Chrome toolbar for easy access.

---

## 🛠️ Technologies Used
* **Core**: HTML5, Vanilla JavaScript (ES6+, Web Audio API, Chrome Extensions API)
* **Styling**: Vanilla CSS3 (Custom properties/variables, CSS Grid, Flexbox, glassmorphic visual cues)