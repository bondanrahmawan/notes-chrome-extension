// Utility function to escape HTML
function escapeHtml(text) {
	const div = document.createElement('div');
	div.textContent = text;
	return div.innerHTML;
}

// Calculate remaining days for notes
function getDaysRemaining(deadline) {
	const today = new Date();
	today.setHours(0,0,0,0);
	const deadlineDate = new Date(deadline);
	deadlineDate.setHours(0,0,0,0);
	const timeDiff = deadlineDate - today;
	const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
	return daysDiff;
}

// Load and display Notes
function loadNotes() {
	chrome.storage.sync.get(["notes"], function (result) {
		const notes = result.notes || [];
		displayNotes(notes);
	});
}

function displayNotes(notes) {
	const notesList = document.getElementById("notesList");
	notesList.innerHTML = "";

	if (notes.length === 0) {
		notesList.innerHTML = `
			<div class="empty-state">
				<span class="empty-state-icon">📝</span>
				<span>No active notes. Click the button below to add one!</span>
			</div>
		`;
		return;
	}

	notes.forEach((note, index) => {
		const noteCard = document.createElement("div");
		noteCard.classList.add("note-card");
		
		const days = getDaysRemaining(note.deadline);
		let daysText = "";
		let daysClass = "";
		if (days < 0) {
			daysText = "Past Due";
			daysClass = "past-due";
		} else if (days === 0) {
			daysText = "Due Today";
			daysClass = "past-due";
		} else {
			daysText = `${days} day${days > 1 ? 's' : ''} left`;
		}

		noteCard.innerHTML = `
			<div class="note-card-border" style="background-color: ${note.color || '#6366f1'}"></div>
			<div class="note-card-content">
				<div class="note-card-header">
					<span class="note-title" style="color: ${note.fontColor || '#f8fafc'}">${escapeHtml(note.title)}</span>
					<span class="note-priority priority-${note.priority.toLowerCase()}">${escapeHtml(note.priority)}</span>
				</div>
				<div class="note-card-footer">
					<div class="note-deadline">
						<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
						<span>${escapeHtml(note.deadline)}</span>
					</div>
					<div class="note-actions">
						<span class="note-days ${daysClass}">${daysText}</span>
						<button class="note-btn complete-btn" data-index="${index}" title="Complete note">
							<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
						</button>
					</div>
				</div>
			</div>
		`;
		
		// Event listener for quick note deletion
		noteCard.querySelector(".complete-btn").addEventListener("click", function(e) {
			e.stopPropagation();
			const idx = parseInt(this.getAttribute("data-index"), 10);
			deleteNoteQuick(idx);
		});

		notesList.appendChild(noteCard);
	});
}

function deleteNoteQuick(index) {
	chrome.storage.sync.get(["notes"], function (result) {
		const notes = result.notes || [];
		notes.splice(index, 1);
		chrome.storage.sync.set({ notes }, function () {
			loadNotes();
		});
	});
}

// Load and display Books
function loadBooks() {
	chrome.storage.sync.get(["books"], function (result) {
		const books = result.books || [];
		displayBooks(books);
	});
}

function displayBooks(books) {
	const booksList = document.getElementById("booksList");
	booksList.innerHTML = "";

	if (books.length === 0) {
		booksList.innerHTML = `
			<div class="empty-state">
				<span class="empty-state-icon">📖</span>
				<span>No books tracked. Add one in settings to start tracking!</span>
			</div>
		`;
		return;
	}

	books.forEach((book, index) => {
		const bookCard = document.createElement("div");
		bookCard.classList.add("book-card");
		
		const isFinished = typeof book.page === 'string' && (book.page.toLowerCase() === 'finished');
		if (isFinished) {
			bookCard.classList.add("finished");
		}

		bookCard.innerHTML = `
			<div class="book-icon-wrapper">
				${isFinished 
					? '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>' 
					: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>'
				}
			</div>
			<div class="book-info">
				<div class="book-title" title="${escapeHtml(book.title)}">${escapeHtml(book.title)}</div>
				<div class="book-meta">
					<div>
						<span>Page:</span>
						<span class="book-page-badge">${isFinished ? 'Finished' : escapeHtml(String(book.page))}</span>
					</div>
					<div class="book-last-read">Last read: ${escapeHtml(book.lastRead || 'Never')}</div>
				</div>
			</div>
			<div class="book-actions">
				${!isFinished ? `
					<div class="page-controls">
						<button class="page-btn dec-page-btn" data-index="${index}" title="Decrease page">-</button>
						<button class="page-btn inc-page-btn" data-index="${index}" title="Increase page">+</button>
					</div>
					<button class="note-btn finish-book-btn" data-index="${index}" title="Mark as finished">
						<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
					</button>
				` : ''}
			</div>
		`;

		// Attach quick actions
		if (!isFinished) {
			bookCard.querySelector(".inc-page-btn").addEventListener("click", function() {
				incrementBookPage(index);
			});
			bookCard.querySelector(".dec-page-btn").addEventListener("click", function() {
				decrementBookPage(index);
			});
			bookCard.querySelector(".finish-book-btn").addEventListener("click", function() {
				finishBook(index);
			});
		}

		booksList.appendChild(bookCard);
	});
}

function incrementBookPage(index) {
	chrome.storage.sync.get(["books"], function (result) {
		const books = result.books || [];
		if (books[index]) {
			let pageVal = parseInt(books[index].page, 10);
			if (isNaN(pageVal)) pageVal = 0;
			books[index].page = pageVal + 1;
			books[index].lastRead = new Date().toISOString().split('T')[0];
			chrome.storage.sync.set({ books }, function () {
				loadBooks();
			});
		}
	});
}

function decrementBookPage(index) {
	chrome.storage.sync.get(["books"], function (result) {
		const books = result.books || [];
		if (books[index]) {
			let pageVal = parseInt(books[index].page, 10);
			if (!isNaN(pageVal) && pageVal > 1) {
				books[index].page = pageVal - 1;
				books[index].lastRead = new Date().toISOString().split('T')[0];
				chrome.storage.sync.set({ books }, function () {
					loadBooks();
				});
			}
		}
	});
}

function finishBook(index) {
	chrome.storage.sync.get(["books"], function (result) {
		const books = result.books || [];
		if (books[index]) {
			books[index].page = "Finished";
			books[index].lastRead = new Date().toISOString().split('T')[0];
			chrome.storage.sync.set({ books }, function () {
				loadBooks();
			});
		}
	});
}

// Pomodoro Timer Logic
let timerInterval = null;
let currentTimerState = null;

// Programmatic chime using Web Audio API
function playChime() {
	try {
		const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
		
		// Clear tone chime: E5 followed by A5
		const playTone = (freq, startTime, duration) => {
			const osc = audioCtx.createOscillator();
			const gainNode = audioCtx.createGain();
			
			osc.type = 'sine';
			osc.frequency.setValueAtTime(freq, startTime);
			
			gainNode.gain.setValueAtTime(0, startTime);
			gainNode.gain.linearRampToValueAtTime(0.25, startTime + 0.05);
			gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
			
			osc.connect(gainNode);
			gainNode.connect(audioCtx.destination);
			
			osc.start(startTime);
			osc.stop(startTime + duration);
		};
		
		const now = audioCtx.currentTime;
		playTone(659.25, now, 0.4); // E5
		playTone(880.00, now + 0.12, 0.7); // A5
	} catch (err) {
		console.error("Failed to generate chime audio:", err);
	}
}

// Send message to background and get response
function sendMessage(message) {
	return new Promise((resolve) => {
		chrome.runtime.sendMessage(message, (response) => {
			resolve(response);
		});
	});
}

// Update the Timer interface based on state
function updateTimerUI(state) {
	const timerDisplay = document.getElementById('timerDisplay');
	const sessionType = document.getElementById('sessionType');
	const progressCircle = document.getElementById('progressCircle');
	const startBtn = document.getElementById('startTimerBtn');
	const completedSessions = document.getElementById('completedSessions');
	const completedToday = document.getElementById('completedSessionsToday');

	const playIcon = document.getElementById('playIcon');
	const pauseIcon = document.getElementById('pauseIcon');

	// Time formatting
	const minutes = Math.floor(state.timeLeft / 60);
	const seconds = state.timeLeft % 60;
	timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

	// Session display labels and colors
	const labels = {
		work: 'Focus Session',
		shortBreak: 'Short Break',
		longBreak: 'Long Break'
	};
	
	sessionType.textContent = labels[state.sessionType] || 'Focus';
	sessionType.className = `session-type session-${state.sessionType}`;

	// Update play/pause icons and button visual state
	if (state.isRunning) {
		startBtn.classList.add('running');
		playIcon.style.display = 'none';
		pauseIcon.style.display = 'block';
	} else {
		startBtn.classList.remove('running');
		playIcon.style.display = 'block';
		pauseIcon.style.display = 'none';
	}

	// SVG Progress Circle update
	if (progressCircle && state.totalTime > 0) {
		const progress = (state.totalTime - state.timeLeft) / state.totalTime;
		const r = 76; // Circle radius
		const circumference = 2 * Math.PI * r; 
		const offset = circumference * (1 - progress);
		progressCircle.style.strokeDashoffset = offset;
		
		// Match color theme
		if (state.sessionType === 'work') {
			progressCircle.style.stroke = 'var(--accent-work)';
		} else {
			progressCircle.style.stroke = 'var(--accent-break)';
		}
	}

	// Completed sessions count
	if (completedSessions) {
		completedSessions.textContent = state.completedSessions || 0;
	}
	if (completedToday) {
		completedToday.textContent = state.completedSessionsToday || 0;
	}
}

// Local ticking for smooth visual transitions
function startLocalTicker(expectedEndTime, totalTime) {
	if (timerInterval) clearInterval(timerInterval);

	function tick() {
		const now = Date.now();
		const timeLeft = Math.max(0, Math.ceil((expectedEndTime - now) / 1000));
		
		if (currentTimerState) {
			currentTimerState.timeLeft = timeLeft;
			updateTimerUI(currentTimerState);
		}

		if (timeLeft <= 0) {
			clearInterval(timerInterval);
			// Re-fetch clean state after alarm fires
			setTimeout(async () => {
				const state = await sendMessage({ type: 'POMODORO_GET_STATE' });
				currentTimerState = state;
				updateTimerUI(state);
			}, 1000);
		}
	}

	tick();
	timerInterval = setInterval(tick, 250);
}

function stopLocalTicker() {
	if (timerInterval) {
		clearInterval(timerInterval);
		timerInterval = null;
	}
}

async function initPomodoroTimer() {
	currentTimerState = await sendMessage({ type: 'POMODORO_GET_STATE' });
	
	// Cache control buttons
	const startBtn = document.getElementById('startTimerBtn');
	const resetBtn = document.getElementById('resetTimerBtn');
	const skipBtn = document.getElementById('skipTimerBtn');
	const settingsBtn = document.getElementById('timerSettingsBtn');
	const settingsPanel = document.getElementById('timerSettingsPanel');
	
	// Cache setting inputs
	const workDurationInput = document.getElementById('workDuration');
	const shortBreakInput = document.getElementById('shortBreakDuration');
	const longBreakInput = document.getElementById('longBreakDuration');
	const autoStartBreaks = document.getElementById('autoStartBreaks');
	const autoStartWork = document.getElementById('autoStartWork');
	const soundEnabled = document.getElementById('soundEnabled');

	// Populate inputs from settings state
	workDurationInput.value = currentTimerState.settings.workDuration;
	shortBreakInput.value = currentTimerState.settings.shortBreakDuration;
	longBreakInput.value = currentTimerState.settings.longBreakDuration;
	autoStartBreaks.checked = currentTimerState.settings.autoStartBreaks;
	autoStartWork.checked = currentTimerState.settings.autoStartWork;
	soundEnabled.checked = currentTimerState.settings.soundEnabled;

	// Initial UI render
	if (currentTimerState.isRunning) {
		startLocalTicker(currentTimerState.expectedEndTime, currentTimerState.totalTime);
	} else {
		updateTimerUI(currentTimerState);
	}

	// Toggle Settings panel
	settingsBtn.addEventListener('click', (e) => {
		e.stopPropagation();
		settingsPanel.classList.toggle('open');
	});
	
	// Close settings when clicking outside
	document.addEventListener('click', (e) => {
		if (settingsPanel.classList.contains('open') && !settingsPanel.contains(e.target) && e.target !== settingsBtn) {
			settingsPanel.classList.remove('open');
		}
	});

	// Save settings handler
	async function saveSettings() {
		const newSettings = {
			workDuration: parseInt(workDurationInput.value, 10) || 25,
			shortBreakDuration: parseInt(shortBreakInput.value, 10) || 5,
			longBreakDuration: parseInt(longBreakInput.value, 10) || 15,
			autoStartBreaks: autoStartBreaks.checked,
			autoStartWork: autoStartWork.checked,
			soundEnabled: soundEnabled.checked
		};
		await sendMessage({
			type: 'POMODORO_UPDATE_SETTINGS',
			settings: newSettings
		});
	}

	// Watch settings inputs for instant updates
	[workDurationInput, shortBreakInput, longBreakInput].forEach(input => {
		input.addEventListener('change', saveSettings);
	});
	[autoStartBreaks, autoStartWork, soundEnabled].forEach(input => {
		input.addEventListener('change', saveSettings);
	});

	// Control Actions
	startBtn.addEventListener('click', async () => {
		if (currentTimerState.isRunning) {
			await sendMessage({ type: 'POMODORO_PAUSE' });
		} else {
			await sendMessage({ type: 'POMODORO_START' });
		}
	});

	resetBtn.addEventListener('click', async () => {
		await sendMessage({ type: 'POMODORO_RESET' });
	});

	skipBtn.addEventListener('click', async () => {
		await sendMessage({ type: 'POMODORO_SKIP' });
	});

	// Hotkeys
	document.addEventListener('keydown', (e) => {
		const isTimerActive = document.getElementById('timerTab').classList.contains('active');
		if (!isTimerActive) return;

		if (e.target.matches('input, select, textarea')) return;

		if (e.code === 'Space') {
			e.preventDefault();
			startBtn.click();
		} else if (e.code === 'KeyR') {
			e.preventDefault();
			resetBtn.click();
		} else if (e.code === 'KeyS') {
			e.preventDefault();
			skipBtn.click();
		}
	});

	// State broadast listener
	chrome.runtime.onMessage.addListener((message) => {
		if (message.type === 'POMODORO_STATE_UPDATE') {
			currentTimerState = message.state;
			if (currentTimerState.isRunning) {
				startLocalTicker(currentTimerState.expectedEndTime, currentTimerState.totalTime);
			} else {
				stopLocalTicker();
				updateTimerUI(currentTimerState);
			}
		} else if (message.type === 'POMODORO_COMPLETE_CHIME') {
			// Trigger chime sound if enabled
			chrome.storage.sync.get("pomodoroState", (result) => {
				const state = result.pomodoroState;
				if (state && state.settings && state.settings.soundEnabled) {
					playChime();
				}
			});
		}
	});
}

// Tab Switching logic
function initTabs() {
	const tabButtons = document.querySelectorAll('.tab-button');
	const tabContents = document.querySelectorAll('.tab-content');

	tabButtons.forEach(button => {
		button.addEventListener('click', () => {
			const tabId = button.getAttribute('data-tab');

			tabButtons.forEach(btn => btn.classList.remove('active'));
			button.classList.add('active');

			tabContents.forEach(content => {
				content.classList.remove('active');
				if (content.id === tabId + 'Tab') {
					content.classList.add('active');
				}
			});
		});
	});
}

// Open settings window in a new tab
document.getElementById("openFormBtn").addEventListener("click", function () {
	chrome.tabs.create({ url: "form.html" });
});

// Bootstrap
document.addEventListener('DOMContentLoaded', () => {
	initTabs();
	initPomodoroTimer();
	loadNotes();
	loadBooks();
});