function displayNotes(notes) {
	const notesList = document.getElementById("notesList");
	notesList.innerHTML = "";

	notes.forEach((note, index) => {
		const noteDiv = document.createElement("div");
		noteDiv.classList.add("note");
		noteDiv.style.backgroundColor = note.color;
		noteDiv.style.color = note.fontColor || "#000000"; // Default font color if not set

		noteDiv.innerHTML = `
        <div class="note-left">
          <strong>${note.title}</strong><br>
          <em>${note.deadline}</em>
        </div>
        <div class="note-right">
          <p>${getDaysRemaining(note.deadline)} days</p>
        </div>
    `;

		notesList.appendChild(noteDiv);
	});
}

function loadNotes() {
	chrome.storage.sync.get(["notes"], function (result) {
		const notes = result.notes || [];
		displayNotes(notes);
	});
}

// Function to calculate days remaining from now until the deadline
function getDaysRemaining(deadline) {
	const today = new Date(); // Current date
	const deadlineDate = new Date(deadline); // Deadline date
	const timeDiff = deadlineDate - today; // Difference in milliseconds
	const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24)); // Convert milliseconds to days
	return daysDiff >= 0 ? daysDiff : "Past Due"; // If the deadline is in the past, show 'Past Due'
}

document.getElementById("openFormBtn").addEventListener("click", function () {
	chrome.windows.create({
		url: "form.html",
		type: "popup",
		width: 400,
		height: 500,
	});
});

loadNotes();
