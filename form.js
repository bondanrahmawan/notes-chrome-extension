document.addEventListener("DOMContentLoaded", function () {
	const noteList = document.getElementById("noteList");
	const bookList = document.getElementById("bookList");
	const colorOptions = document.getElementById("colorOptions");
	let selectedColor = "#ffeb3b"; // Default color
	let editingIndex = null; // Keep track of the note being edited

	// Load and display all notes
	function displayNotes() {
		chrome.storage.sync.get(["notes"], function (result) {
			const notes = result.notes || [];
			noteList.innerHTML = ""; // Clear the list before rendering
			notes.forEach((note, index) => {
				const noteItem = document.createElement("div");
				noteItem.className = "note-item";
				noteItem.style.backgroundColor = note.color;
				noteItem.style.color = note.fontColor;
				noteItem.innerHTML = `
          <strong>${note.title}</strong><br>
          Deadline: ${note.deadline}<br>
          Priority: ${note.priority}<br>
          Order: ${note.order}<br>
          <button class="editBtn" data-index="${index}">Edit</button>
          <button class="deleteBtn" data-index="${index}">Delete</button>
        `;
				noteList.appendChild(noteItem);
			});

			// Attach event listeners to the edit and delete buttons
			document.querySelectorAll(".editBtn").forEach((button) => {
				button.addEventListener("click", function () {
					const index = this.getAttribute("data-index");
					loadNoteForEdit(index);
				});
			});
			document.querySelectorAll(".deleteBtn").forEach((button) => {
				button.addEventListener("click", function () {
					const index = this.getAttribute("data-index");
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
			document.getElementById("noteFontColor").value = note.fontColor || "#000000";
			document.getElementById("noteOrder").value = note.order;

			selectedColor = note.color;
			document.querySelectorAll(".color-option").forEach((option) => {
				option.classList.remove("selected");
			});
			document.querySelector(`[data-color="${selectedColor}"]`).classList.add("selected");

			editingIndex = index; // Set the editing index
		});
	}

	// Save or update a note
	function saveNote() {
		const title = document.getElementById("noteTitle").value;
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

			if (editingIndex !== null) {
				// Update existing note
				notes[editingIndex] = note;
			} else {
				// Add a new note
				notes.push(note);
			}

			// Sort notes by order
			notes.sort((a, b) => a.order - b.order);

			chrome.storage.sync.set({ notes }, function () {
				alert("Note saved!");
				displayNotes(); // Refresh the note list
				clearForm(); // Reset the form after saving
			});
		});
	}

	// Delete a note
	function deleteNote(index) {
		chrome.storage.sync.get(["notes"], function (result) {
			const notes = result.notes || [];
			notes.splice(index, 1); // Remove the note at the given index

			chrome.storage.sync.set({ notes }, function () {
				alert("Note deleted!");
				displayNotes(); // Refresh the note list
			});
		});
	}

	// Clear the form
	function clearForm() {
		document.getElementById("noteTitle").value = "";
		document.getElementById("noteDeadline").value = "";
		document.getElementById("notePriority").value = "Low";
		document.getElementById("noteFontColor").value = "#000000";
		document.getElementById("noteOrder").value = "";
		document
			.querySelectorAll(".color-option")
			.forEach((option) => option.classList.remove("selected"));
		selectedColor = "#ffeb3b";
		document.querySelector(`[data-color="${selectedColor}"]`).classList.add("selected");
		editingIndex = null; // Reset editing state
	}

	// Handle color selection
	colorOptions.addEventListener("click", function (event) {
		if (event.target.classList.contains("color-option")) {
			document
				.querySelectorAll(".color-option")
				.forEach((option) => option.classList.remove("selected"));
			event.target.classList.add("selected");
			selectedColor = event.target.getAttribute("data-color");
		}
	});

	// Attach event listener to the save button
	document.getElementById("saveNoteBtn").addEventListener("click", saveNote);

	function displayBooks() {
		chrome.storage.sync.get(["books"], function (result) {
			const books = result.books || [];
			bookList.innerHTML = ""; // Clear list before rendering

			books.forEach((book, index) => {
				const bookItem = document.createElement("div");
				bookItem.className = "book-item";
				bookItem.innerHTML = `
					<strong>${book.title}</strong><br>
					Page: ${book.page}<br>
					Last Read: ${book.lastRead}<br>
					<button class="editBookBtn" data-index="${index}">Edit</button>
					<button class="deleteBookBtn" data-index="${index}">Delete</button>
					<button class="markFinishedBtn" data-index="${index}">Mark as Finished</button>
				`;
				bookList.appendChild(bookItem);
			});

			// Attach event listeners for edit, delete, and mark as finished
			document.querySelectorAll(".editBookBtn").forEach((button) => {
				button.addEventListener("click", function () {
					const index = this.getAttribute("data-index");
					loadBookForEdit(index);
				});
			});

			document.querySelectorAll(".deleteBookBtn").forEach((button) => {
				button.addEventListener("click", function () {
					const index = this.getAttribute("data-index");
					deleteBook(index);
				});
			});

			document.querySelectorAll(".markFinishedBtn").forEach((button) => {
				button.addEventListener("click", function () {
					const index = this.getAttribute("data-index");
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

			const bookTitleInput = document.getElementById("bookTitle");
			const bookPageInput = document.getElementById("bookPage");
			const bookLastReadInput = document.getElementById("bookLastRead");

			bookTitleInput.value = book.title;
			bookPageInput.value = book.page;
			bookLastReadInput.value = book.lastRead;

			editingIndex = index; // Set the editing index
		});
	}

	function saveBook() {
		const title = document.getElementById("bookTitle").value;
		const page = document.getElementById("bookPage").value;
		const lastRead = document.getElementById("bookLastRead").value;

		if (!title || !lastRead) {
			alert("Please provide a title and last read date.");
			return;
		}

		chrome.storage.sync.get(["books"], function (result) {
			const books = result.books || [];
			const book = { title, page, lastRead };

			if (editingIndex !== null) {
				books[editingIndex] = book;
			} else {
				books.push(book);
			}

			chrome.storage.sync.set({ books }, function () {
				alert("Book saved!");
				displayBooks(); // Refresh the list
				clearBookForm(); // Reset the form
			});
		});
	}

	// Delete or mark book as finished functions
	function deleteBook(index) {
		chrome.storage.sync.get(["books"], function (result) {
			const books = result.books || [];
			books.splice(index, 1);

			chrome.storage.sync.set({ books }, function () {
				alert("Book deleted!");
				displayBooks();
			});
		});
	}

	function markBookAsFinished(index) {
		chrome.storage.sync.get(["books"], function (result) {
			const books = result.books || [];
			books[index].page = "Finished";

			chrome.storage.sync.set({ books }, function () {
				alert("Book marked as finished!");
				displayBooks();
			});
		});
	}

	function clearBookForm() {
		document.getElementById("bookTitle").value = "";
		document.getElementById("bookPage").value = "";
		document.getElementById("bookLastRead").value = "";
	}

	// Attach event listener for the save button
	document.getElementById("saveBookBtn").addEventListener("click", saveBook);

	// Display the list of notes and notes when the page loads
	displayNotes();
	displayBooks();
});
