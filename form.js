document.addEventListener("DOMContentLoaded", function () {
	const noteList = document.getElementById("noteList");
	const bookList = document.getElementById("bookList");
	const colorOptions = document.getElementById("colorOptions");
	let selectedColor = "#ffeb3b"; // Default color
	let editingNoteIndex = null; // Keep track of the note being edited
	let editingBookIndex = null; // Keep track of the book being edited

	// Utility to escape HTML
	function escapeHtml(text) {
		const div = document.createElement('div');
		div.textContent = text;
		return div.innerHTML;
	}

	// Load and display all notes
	function displayNotes() {
		chrome.storage.sync.get(["notes"], function (result) {
			const notes = result.notes || [];
			noteList.innerHTML = ""; // Clear the list before rendering
			
			if (notes.length === 0) {
				noteList.innerHTML = '<div class="empty-list-msg">No active notes. Create one below!</div>';
				return;
			}

			notes.forEach((note, index) => {
				const noteItem = document.createElement("div");
				noteItem.className = "note-item";
				noteItem.style.borderLeftColor = note.color;
				
				noteItem.innerHTML = `
					<div class="item-details">
						<strong style="color: ${note.fontColor || '#f8fafc'}">${escapeHtml(note.title)}</strong><br>
						<span style="color: var(--text-secondary)">Deadline: ${escapeHtml(note.deadline)}</span><br>
						<span style="color: var(--text-secondary)">Priority: ${escapeHtml(note.priority)} | Order: ${escapeHtml(String(note.order))}</span>
					</div>
					<div class="item-actions">
						<button class="editNoteBtn" data-index="${index}">Edit</button>
						<button class="deleteNoteBtn delete-btn" data-index="${index}">Delete</button>
					</div>
				`;
				noteList.appendChild(noteItem);
			});

			// Attach event listeners
			document.querySelectorAll(".editNoteBtn").forEach((button) => {
				button.addEventListener("click", function () {
					const index = parseInt(this.getAttribute("data-index"), 10);
					loadNoteForEdit(index);
				});
			});
			document.querySelectorAll(".deleteNoteBtn").forEach((button) => {
				button.addEventListener("click", function () {
					const index = parseInt(this.getAttribute("data-index"), 10);
					deleteNote(index);
				});
			});
		});
	}

	// Load a note into the form for editing
	function loadNoteForEdit(index) {
		chrome.storage.sync.get(["notes"], function (result) {
			const notes = result.notes || [];
			const note = notes[index];

			document.getElementById("noteTitle").value = note.title;
			document.getElementById("noteDeadline").value = note.deadline;
			document.getElementById("notePriority").value = note.priority;
			
			const noteFontColor = note.fontColor || "#000000";
			document.getElementById("noteFontColor").value = noteFontColor;
			document.getElementById("noteOrder").value = note.order;

			// Highlight Note Background Color
			selectedColor = note.color || "#ffeb3b";
			document.querySelectorAll("#colorOptions .color-option").forEach((option) => {
				option.classList.remove("selected");
				if (option.getAttribute("data-color") === selectedColor) {
					option.classList.add("selected");
				}
			});

			// Highlight Font Color Presets
			document.querySelectorAll("#fontColorPresets .color-option").forEach((option) => {
				option.classList.remove("selected");
				if (option.getAttribute("data-color").toLowerCase() === noteFontColor.toLowerCase()) {
					option.classList.add("selected");
				}
			});

			document.getElementById("noteFormTitle").textContent = "Edit Note";
			editingNoteIndex = index; // Set the editing index
		});
	}

	// Save or update a note
	function saveNote() {
		const title = document.getElementById("noteTitle").value.trim();
		const deadline = document.getElementById("noteDeadline").value;
		const priority = document.getElementById("notePriority").value;
		const fontColor = document.getElementById("noteFontColor").value;
		const order = parseInt(document.getElementById("noteOrder").value, 10) || 1;

		if (!title || !deadline) {
			alert("Please provide a title and deadline.");
			return;
		}

		chrome.storage.sync.get(["notes"], function (result) {
			const notes = result.notes || [];
			const note = { title, deadline, priority, color: selectedColor, fontColor, order };

			if (editingNoteIndex !== null) {
				// Update existing note
				notes[editingNoteIndex] = note;
			} else {
				// Add a new note
				notes.push(note);
			}

			// Sort notes by order
			notes.sort((a, b) => a.order - b.order);

			chrome.storage.sync.set({ notes }, function () {
				displayNotes(); // Refresh the note list
				clearNoteForm(); // Reset the form after saving
			});
		});
	}

	// Delete a note
	function deleteNote(index) {
		if (!confirm("Are you sure you want to delete this note?")) return;
		chrome.storage.sync.get(["notes"], function (result) {
			const notes = result.notes || [];
			notes.splice(index, 1); // Remove note

			chrome.storage.sync.set({ notes }, function () {
				displayNotes(); // Refresh list
				// If we deleted the note currently being edited, clear the form
				if (editingNoteIndex === index) {
					clearNoteForm();
				}
			});
		});
	}

	// Clear the form
	function clearNoteForm() {
		document.getElementById("noteTitle").value = "";
		document.getElementById("noteDeadline").value = "";
		document.getElementById("notePriority").value = "Low";
		document.getElementById("noteOrder").value = "";
		
		// Reset Background Color Selection
		document.querySelectorAll("#colorOptions .color-option").forEach((option) => option.classList.remove("selected"));
		selectedColor = "#ffeb3b";
		document.querySelector(`#colorOptions [data-color="${selectedColor}"]`).classList.add("selected");
		
		// Reset Font Color Selection
		const defaultFontColor = "#000000";
		document.getElementById("noteFontColor").value = defaultFontColor;
		document.querySelectorAll("#fontColorPresets .color-option").forEach((option) => option.classList.remove("selected"));
		document.querySelector(`#fontColorPresets [data-color="${defaultFontColor}"]`).classList.add("selected");

		document.getElementById("noteFormTitle").textContent = "Add / Edit Note";
		editingNoteIndex = null; // Reset editing state
	}

	// Handle background color selection
	colorOptions.addEventListener("click", function (event) {
		if (event.target.classList.contains("color-option")) {
			document.querySelectorAll("#colorOptions .color-option").forEach((option) => option.classList.remove("selected"));
			event.target.classList.add("selected");
			selectedColor = event.target.getAttribute("data-color");
		}
	});

	// Handle font color preset selection
	const fontColorPresets = document.getElementById("fontColorPresets");
	fontColorPresets.addEventListener("click", function (event) {
		if (event.target.classList.contains("color-option")) {
			document.querySelectorAll("#fontColorPresets .color-option").forEach((option) => option.classList.remove("selected"));
			event.target.classList.add("selected");
			const color = event.target.getAttribute("data-color");
			document.getElementById("noteFontColor").value = color;
		}
	});

	// Handle custom font color input changes
	const noteFontColorInput = document.getElementById("noteFontColor");
	noteFontColorInput.addEventListener("input", function () {
		const customColor = this.value.toLowerCase();
		document.querySelectorAll("#fontColorPresets .color-option").forEach((option) => {
			if (option.getAttribute("data-color").toLowerCase() === customColor) {
				option.classList.add("selected");
			} else {
				option.classList.remove("selected");
			}
		});
	});

	// Attach event listener to the save note button
	document.getElementById("saveNoteBtn").addEventListener("click", saveNote);


	// Books Functionality
	function displayBooks() {
		chrome.storage.sync.get(["books"], function (result) {
			const books = result.books || [];
			bookList.innerHTML = ""; // Clear list before rendering

			if (books.length === 0) {
				bookList.innerHTML = '<div class="empty-list-msg">No books tracked. Create one below!</div>';
				return;
			}

			books.forEach((book, index) => {
				const bookItem = document.createElement("div");
				const isFinished = typeof book.page === 'string' && (book.page.toLowerCase() === 'finished');
				
				bookItem.className = `book-item ${isFinished ? 'book-finished' : ''}`;
				
				bookItem.innerHTML = `
					<div class="item-details">
						<strong>${escapeHtml(book.title)}</strong><br>
						<span style="color: var(--text-secondary)">Page: ${escapeHtml(String(book.page))}</span><br>
						<span style="color: var(--text-muted)">Last Read: ${escapeHtml(book.lastRead || 'Never')}</span>
					</div>
					<div class="item-actions">
						<button class="editBookBtn" data-index="${index}">Edit</button>
						<button class="deleteBookBtn delete-btn" data-index="${index}">Delete</button>
						${!isFinished ? `<button class="markFinishedBtn finish-btn" data-index="${index}">Finish</button>` : ''}
					</div>
				`;
				bookList.appendChild(bookItem);
			});

			// Attach event listeners
			document.querySelectorAll(".editBookBtn").forEach((button) => {
				button.addEventListener("click", function () {
					const index = parseInt(this.getAttribute("data-index"), 10);
					loadBookForEdit(index);
				});
			});

			document.querySelectorAll(".deleteBookBtn").forEach((button) => {
				button.addEventListener("click", function () {
					const index = parseInt(this.getAttribute("data-index"), 10);
					deleteBook(index);
				});
			});

			document.querySelectorAll(".markFinishedBtn").forEach((button) => {
				button.addEventListener("click", function () {
					const index = parseInt(this.getAttribute("data-index"), 10);
					markBookAsFinished(index);
				});
			});
		});
	}

	// Load a book into the form for editing
	function loadBookForEdit(index) {
		chrome.storage.sync.get(["books"], function (result) {
			const books = result.books || [];
			const book = books[index];

			document.getElementById("bookTitle").value = book.title;
			document.getElementById("bookPage").value = book.page;
			document.getElementById("bookLastRead").value = book.lastRead || "";

			document.getElementById("bookFormTitle").textContent = "Edit Book";
			editingBookIndex = index; // Set the editing index
		});
	}

	function saveBook() {
		const title = document.getElementById("bookTitle").value.trim();
		const page = document.getElementById("bookPage").value.trim();
		const lastRead = document.getElementById("bookLastRead").value;

		if (!title || !lastRead) {
			alert("Please provide a title and last read date.");
			return;
		}

		chrome.storage.sync.get(["books"], function (result) {
			const books = result.books || [];
			const book = { title, page, lastRead };

			if (editingBookIndex !== null) {
				books[editingBookIndex] = book;
			} else {
				books.push(book);
			}

			chrome.storage.sync.set({ books }, function () {
				displayBooks(); // Refresh list
				clearBookForm(); // Reset form
			});
		});
	}

	function deleteBook(index) {
		if (!confirm("Are you sure you want to delete this book?")) return;
		chrome.storage.sync.get(["books"], function (result) {
			const books = result.books || [];
			books.splice(index, 1);

			chrome.storage.sync.set({ books }, function () {
				displayBooks();
				if (editingBookIndex === index) {
					clearBookForm();
				}
			});
		});
	}

	// Mark finished
	function markBookAsFinished(index) {
		chrome.storage.sync.get(["books"], function (result) {
			const books = result.books || [];
			books[index].page = "Finished";
			books[index].lastRead = new Date().toISOString().split('T')[0];

			chrome.storage.sync.set({ books }, function () {
				displayBooks();
			});
		});
	}

	function clearBookForm() {
		document.getElementById("bookTitle").value = "";
		document.getElementById("bookPage").value = "";
		document.getElementById("bookLastRead").value = "";
		document.getElementById("bookFormTitle").textContent = "Add / Edit Book";
		editingBookIndex = null;
	}

	// Save book event listener
	document.getElementById("saveBookBtn").addEventListener("click", saveBook);


	// Productivity Blocker Logic
	const hardBlockList = document.getElementById("hardBlockList");
	const softBlockList = document.getElementById("softBlockList");
	const blockMode = document.getElementById("blockMode");
	const blockLimit = document.getElementById("blockLimit");
	const saveBlockBtn = document.getElementById("saveBlockBtn");

	// Toggle time limit input based on block mode select
	blockMode.addEventListener("change", function () {
		if (this.value === "soft") {
			blockLimit.disabled = false;
			blockLimit.value = "15";
		} else {
			blockLimit.disabled = true;
			blockLimit.value = "";
		}
	});

	function displayBlocker() {
		chrome.storage.sync.get(["blockerState"], function (result) {
			const state = result.blockerState || { enabled: true, sites: [] };
			hardBlockList.innerHTML = "";
			softBlockList.innerHTML = "";

			const hardSites = state.sites.filter(s => s.mode === "hard");
			const softSites = state.sites.filter(s => s.mode === "soft");

			if (hardSites.length === 0) {
				hardBlockList.innerHTML = '<div class="empty-list-msg">No sites hard-blocked.</div>';
			} else {
				hardSites.forEach((site) => {
					const item = document.createElement("div");
					item.className = "block-item hard-mode";
					item.innerHTML = `
						<div class="item-details">
							<strong>${escapeHtml(site.domain)}</strong><br>
							<span style="color: var(--text-muted)">Immediate block</span>
						</div>
						<div class="item-actions">
							<button class="deleteBlockBtn delete-btn" data-domain="${escapeHtml(site.domain)}">Remove</button>
						</div>
					`;
					hardBlockList.appendChild(item);
				});
			}

			if (softSites.length === 0) {
				softBlockList.innerHTML = '<div class="empty-list-msg">No sites soft-blocked.</div>';
			} else {
				softSites.forEach((site) => {
					const item = document.createElement("div");
					item.className = "block-item soft-mode";
					const spentMin = Math.floor((site.timeSpentToday || 0) / 60);
					item.innerHTML = `
						<div class="item-details">
							<strong>${escapeHtml(site.domain)}</strong><br>
							<span style="color: var(--text-muted)">Limit: ${site.limitMinutes}m | Spent: ${spentMin}m today</span>
						</div>
						<div class="item-actions">
							<button class="deleteBlockBtn delete-btn" data-domain="${escapeHtml(site.domain)}">Remove</button>
						</div>
					`;
					softBlockList.appendChild(item);
				});
			}

			// Attach delete events
			document.querySelectorAll(".deleteBlockBtn").forEach((button) => {
				button.addEventListener("click", function () {
					const domain = this.getAttribute("data-domain");
					removeBlockedSite(domain);
				});
			});
		});
	}

	function saveBlockedSite() {
		let domain = document.getElementById("blockDomain").value.trim().toLowerCase();
		if (!domain) {
			alert("Please enter a domain.");
			return;
		}

		// Normalize domain: strip protocols and paths
		domain = domain.replace(/^(https?:\/\/)?(www\.)?/, "");
		domain = domain.split("/")[0];

		const mode = blockMode.value;
		let limitMinutes = 0;

		if (mode === "soft") {
			limitMinutes = parseInt(blockLimit.value, 10);
			if (isNaN(limitMinutes) || limitMinutes < 1) {
				alert("Please enter a valid time limit in minutes.");
				return;
			}
		}

		chrome.storage.sync.get(["blockerState"], function (result) {
			const state = result.blockerState || { enabled: true, sites: [], lastResetDate: "" };
			
			// Remove duplicate if same site already exists
			state.sites = state.sites.filter(s => s.domain !== domain);

			state.sites.push({
				domain: domain,
				mode: mode,
				limitMinutes: limitMinutes,
				timeSpentToday: 0
			});

			chrome.storage.sync.set({ blockerState: state }, function () {
				chrome.runtime.sendMessage({ type: 'BLOCKER_STATE_UPDATE', state }).catch(() => {});
				displayBlocker();
				document.getElementById("blockDomain").value = "";
				blockLimit.value = "";
				blockMode.value = "hard";
				blockLimit.disabled = true;
			});
		});
	}

	function removeBlockedSite(domain) {
		chrome.storage.sync.get(["blockerState"], function (result) {
			const state = result.blockerState || { enabled: true, sites: [] };
			state.sites = state.sites.filter(s => s.domain !== domain);

			chrome.storage.sync.set({ blockerState: state }, function () {
				chrome.runtime.sendMessage({ type: 'BLOCKER_STATE_UPDATE', state }).catch(() => {});
				displayBlocker();
			});
		});
	}

	saveBlockBtn.addEventListener("click", saveBlockedSite);


	// General Settings
	function loadGeneralSettings() {
		chrome.storage.sync.get(["popupInterval"], function (result) {
			document.getElementById("popupInterval").value = result.popupInterval || 15;
		});
	}

	document.getElementById("saveSettingsBtn").addEventListener("click", function () {
		const interval = parseInt(document.getElementById("popupInterval").value, 10);
		if (isNaN(interval) || interval < 1) {
			alert("Please provide a valid interval of at least 1 minute.");
			return;
		}

		chrome.storage.sync.set({ popupInterval: interval }, function () {
			alert("Settings saved!");
		});
	});


	// Sync UI updates from background tracking
	chrome.runtime.onMessage.addListener((message) => {
		if (message.type === 'BLOCKER_STATE_UPDATE') {
			displayBlocker();
		}
	});


	// Display on load
	displayNotes();
	displayBooks();
	displayBlocker();
	loadGeneralSettings();
});
