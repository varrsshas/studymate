
// ==========================================
// STUDYMATE - MAIN JAVASCRIPT
// ==========================================

// 1. DATA STORAGE

const defaultData = {
    profile: {
        name: "Student",
        college: "",
        course: "",
        semester: "",
        goal: 4
    },
    subjects: [],
    tasks: [],
    exams: [],
    schedule: [],
    notes: [],
    links: [],
    sessions: [],
    pdfs: []
};

function loadData() {
    try {
        const saved = JSON.parse(localStorage.getItem("studymateData"));
        return saved ? { ...defaultData, ...saved } : structuredClone(defaultData);
    } catch {
        return structuredClone(defaultData);
    }
}

let data = loadData();

function saveData() {
    localStorage.setItem("studymateData", JSON.stringify(data));
    updateDashboard();
}

// 2. HELPER FUNCTIONS

const $ = id => document.getElementById(id);

function safe(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

function today() {
    return new Date().toISOString().slice(0, 10);
}

function formatDate(date) {
    if (!date) return "No date";
    return new Date(date + "T00:00:00").toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric"
    });
}

function showMessage(message) {
    let box = $("appMessage");

    if (!box) {
        box = document.createElement("div");
        box.id = "appMessage";
        box.style.cssText = `
            position:fixed;bottom:25px;right:25px;
            background:#8870d5;color:white;padding:13px 20px;
            border-radius:12px;z-index:9999;font-size:13px;
            box-shadow:0 5px 20px #0002;
        `;
        document.body.appendChild(box);
    }

    box.textContent = message;
    box.style.display = "block";

    clearTimeout(window.messageTimeout);
    window.messageTimeout = setTimeout(() => {
        box.style.display = "none";
    }, 2500);
}

function createButton(text, action, id) {
    return `<button class="secondary-button" onclick="${action}('${id}')">${text}</button>`;
}

// 3. SIDEBAR NAVIGATION

document.querySelectorAll(".nav-link[data-page]").forEach(button => {
    button.addEventListener("click", () => {
        openPage(button.dataset.page);
    });
});

document.querySelectorAll("[data-goto]").forEach(button => {
    button.addEventListener("click", () => openPage(button.dataset.goto));
});

function openPage(page) {
    document.querySelectorAll(".page-section").forEach(section => {
        section.classList.remove("active");
    });

    document.querySelectorAll(".nav-link[data-page]").forEach(button => {
        button.classList.remove("active");
    });

    const section = $(page);
    if (!section) return;

    section.classList.add("active");

    const activeButton = document.querySelector(`[data-page="${page}"]`);
    if (activeButton) activeButton.classList.add("active");

    const names = {
        dashboard: "Dashboard",
        subjects: "My Subjects",
        timetable: "Timetable",
        tasks: "Tasks",
        exams: "Exam Tracker",
        timer: "Focus Room",
        notes: "Notes & Resources",
        analytics: "Analytics",
        assistant: "AI Assistant",
        profile: "My Profile"
    };

    $("pageHeading").textContent = names[page] || page;
    $("currentPageName").textContent = names[page] || page;

    if (page === "analytics") renderAnalytics();
    if (page === "timetable") renderTimetable();
    if (page === "notes") renderNotes();
}

// 4. DATE AND PROFILE

function initialiseDate() {
    $("currentDate").textContent = new Date().toLocaleDateString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric"
    });
}

function renderProfile() {
    $("welcomeName").textContent = data.profile.name || "Student";
    $("profileName").value = data.profile.name || "";
    $("collegeName").value = data.profile.college || "";
    $("courseName").value = data.profile.course || "";
    $("semester").value = data.profile.semester || "";
    $("dailyGoal").value = data.profile.goal || 4;
    $("studyGoalDisplay").textContent = (data.profile.goal || 4) + " Hours";

    document.querySelector(".profile-avatar").textContent =
        (data.profile.name || "S").charAt(0).toUpperCase();
}

$("saveProfile").addEventListener("click", () => {
    const name = $("profileName").value.trim();
    const goal = Number($("dailyGoal").value);

    if (!name) return showMessage("Please enter your name.");
    if (!Number.isFinite(goal) || goal < 1 || goal > 24) {
        return showMessage("Enter a study goal between 1 and 24 hours.");
    }

    data.profile = {
        name,
        college: $("collegeName").value.trim(),
        course: $("courseName").value.trim(),
        semester: $("semester").value.trim(),
        goal
    };

    saveData();
    renderProfile();
    showMessage("Profile saved successfully!");
});

// 5. SUBJECT MANAGER

$("addSubjectBtn").addEventListener("click", () => {
    $("subjectFormContainer").innerHTML = `
        <div class="content-card form-card">
            <h3>Add New Subject</h3>
            <label>Subject Name</label>
            <input id="subjectName" placeholder="e.g. Mathematics">
            <label>Description</label>
            <input id="subjectDescription" placeholder="Optional description">
            <div class="form-actions">
                <button class="primary-button" onclick="addSubject()">Save Subject</button>
                <button class="secondary-button" onclick="closeForm('subjectFormContainer')">Cancel</button>
            </div>
        </div>`;
});

function closeForm(id) {
    $(id).innerHTML = "";
}

function addSubject() {
    const name = $("subjectName").value.trim();
    if (!name) return showMessage("Enter a subject name.");

    if (data.subjects.some(s => s.name.toLowerCase() === name.toLowerCase())) {
        return showMessage("This subject already exists.");
    }

    data.subjects.push({
        id: crypto.randomUUID(),
        name,
        description: $("subjectDescription").value.trim(),
        topics: []
    });

    saveData();
    renderSubjects();
    closeForm("subjectFormContainer");
    showMessage("Subject added!");
}

function renderSubjects() {
    const container = $("subjectList");

    if (!data.subjects.length) {
        container.innerHTML = `<p class="empty-message">No subjects yet. Add your first subject!</p>`;
        return;
    }

    container.innerHTML = data.subjects.map(subject => {
        const completed = subject.topics.filter(t => t.done).length;
        const total = subject.topics.length;
        const percent = total ? Math.round(completed / total * 100) : 0;

        return `
        <div class="subject-card">
            <h3>📚 ${safe(subject.name)}</h3>
            <p>${safe(subject.description || "Your learning journey starts here.")}</p>
            <p>${completed} of ${total} topics completed · ${percent}%</p>
            <div class="progress-track">
                <div class="progress-fill" style="width:${percent}%"></div>
            </div>
            <div class="topic-list">
                ${subject.topics.map(topic => `
                    <div class="topic-item">
                        <label class="${topic.done ? "topic-done" : ""}">
                            <input type="checkbox" ${topic.done ? "checked" : ""}
                            onchange="toggleTopic('${subject.id}','${topic.id}')">
                            ${safe(topic.name)}
                        </label>
                        <span class="priority ${safe(topic.priority)}">${safe(topic.priority)}</span>
                    </div>
                `).join("")}
            </div>
            <div class="card-actions">
                <button class="secondary-button" onclick="addTopic('${subject.id}')">+ Topic</button>
                ${createButton("Edit", "editSubject", subject.id)}
                ${createButton("Delete", "deleteSubject", subject.id)}
            </div>
        </div>`;
    }).join("");
}

function addTopic(subjectId) {
    const subject = data.subjects.find(s => s.id === subjectId);
    if (!subject) return;

    const name = prompt("Enter topic name:");
    if (!name?.trim()) return;

    const priority = prompt("Priority: High, Medium or Low", "Medium");
    if (!priority) return;

    const validPriority = ["High", "Medium", "Low"];
    if (!validPriority.includes(priority)) {
        return showMessage("Use High, Medium or Low.");
    }

    subject.topics.push({
        id: crypto.randomUUID(),
        name: name.trim(),
        priority,
        done: false
    });

    saveData();
    renderSubjects();
    showMessage("Topic added!");
}

function toggleTopic(subjectId, topicId) {
    const subject = data.subjects.find(s => s.id === subjectId);
    const topic = subject?.topics.find(t => t.id === topicId);
    if (!topic) return;

    topic.done = !topic.done;
    saveData();
    renderSubjects();
}

function editSubject(id) {
    const subject = data.subjects.find(s => s.id === id);
    if (!subject) return;

    const name = prompt("Edit subject name:", subject.name);
    if (!name?.trim()) return;

    subject.name = name.trim();
    saveData();
    renderSubjects();
}

function deleteSubject(id) {
    if (!confirm("Delete this subject and its topics?")) return;

    data.subjects = data.subjects.filter(s => s.id !== id);
    saveData();
    renderSubjects();
    showMessage("Subject deleted.");
}

// 6. TASK MANAGER

$("addTaskBtn").addEventListener("click", () => {
    $("taskFormContainer").innerHTML = `
        <div class="content-card form-card">
            <h3>Add New Task</h3>
            <label>Task Name</label>
            <input id="taskName" placeholder="Enter task">
            <label>Deadline</label>
            <input type="date" id="taskDate">
            <label>Priority</label>
            <select id="taskPriority">
                <option>Medium</option>
                <option>High</option>
                <option>Low</option>
            </select>
            <label>Task Type</label>
            <select id="taskType">
                <option>Study</option>
                <option>Assignment</option>
                <option>Homework</option>
                <option>Personal</option>
            </select>
            <div class="form-actions">
                <button class="primary-button" onclick="addTask()">Save Task</button>
                <button class="secondary-button" onclick="closeForm('taskFormContainer')">Cancel</button>
            </div>
        </div>`;
});

function addTask() {
    const name = $("taskName").value.trim();
    if (!name) return showMessage("Enter a task name.");

    data.tasks.push({
        id: crypto.randomUUID(),
        name,
        date: $("taskDate").value,
        priority: $("taskPriority").value,
        type: $("taskType").value,
        done: false
    });

    saveData();
    renderTasks();
    closeForm("taskFormContainer");
    showMessage("Task added!");
}

let currentFilter = "all";

document.querySelectorAll(".filter-btn").forEach(button => {
    button.addEventListener("click", () => {
        currentFilter = button.dataset.filter;

        document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
        button.classList.add("active");

        renderTasks();
    });
});

function renderTasks() {
    const container = $("taskList");

    const tasks = data.tasks.filter(task => {
        if (currentFilter === "completed") return task.done;
        if (currentFilter === "pending") return !task.done && (!task.date || task.date >= today());
        if (currentFilter === "overdue") return !task.done && task.date && task.date < today();
        return true;
    });

    if (!tasks.length) {
        container.innerHTML = `<p class="empty-message">No tasks in this category.</p>`;
        return;
    }

    container.innerHTML = tasks.map(task => `
        <div class="task-item">
            <input type="checkbox" ${task.done ? "checked" : ""}
                onchange="toggleTask('${task.id}')">
            <div class="task-info">
                <h3 class="${task.done ? "topic-done" : ""}">${safe(task.name)}</h3>
                <p>${safe(task.type)} · ${formatDate(task.date)}</p>
            </div>
            <span class="priority ${safe(task.priority)}">${safe(task.priority)}</span>
            ${createButton("Edit", "editTask", task.id)}
            ${createButton("Delete", "deleteTask", task.id)}
        </div>
    `).join("");
}

function toggleTask(id) {
    const task = data.tasks.find(t => t.id === id);
    if (!task) return;

    task.done = !task.done;
    saveData();
    renderTasks();
}

function editTask(id) {
    const task = data.tasks.find(t => t.id === id);
    if (!task) return;

    const name = prompt("Edit task:", task.name);
    if (!name?.trim()) return;

    task.name = name.trim();
    saveData();
    renderTasks();
}

function deleteTask(id) {
    if (!confirm("Delete this task?")) return;

    data.tasks = data.tasks.filter(t => t.id !== id);
    saveData();
    renderTasks();
}

// 7. TIMETABLE

$("addScheduleBtn").addEventListener("click", () => {
    $("scheduleFormContainer").innerHTML = `
        <div class="content-card form-card">
            <h3>Add Timetable Session</h3>
            <label>Activity / Subject</label>
            <input id="scheduleName" placeholder="e.g. Java Study">
            <label>Day</label>
            <select id="scheduleDay">
                ${["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"]
                    .map(day => `<option>${day}</option>`).join("")}
            </select>
            <div class="form-grid">
                <div>
                    <label>Start Time</label>
                    <input type="time" id="scheduleStart">
                </div>
                <div>
                    <label>End Time</label>
                    <input type="time" id="scheduleEnd">
                </div>
            </div>
            <div class="form-actions">
                <button class="primary-button" onclick="addSchedule()">Save Session</button>
                <button class="secondary-button" onclick="closeForm('scheduleFormContainer')">Cancel</button>
            </div>
        </div>`;
});

function addSchedule() {
    const name = $("scheduleName").value.trim();
    const start = $("scheduleStart").value;
    const end = $("scheduleEnd").value;

    if (!name || !start || !end || end <= start) {
        return showMessage("Enter a valid activity and time range.");
    }

    data.schedule.push({
        id: crypto.randomUUID(),
        name,
        day: $("scheduleDay").value,
        start,
        end
    });

    saveData();
    renderTimetable();
    closeForm("scheduleFormContainer");
    showMessage("Session added!");
}

function renderTimetable() {
    const days = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

    $("weeklyTimetable").innerHTML = `
        <div class="timetable-grid">
        ${days.map(day => `
            <div class="day-column">
                <h4>${day}</h4>
                ${data.schedule.filter(s => s.day === day)
                    .sort((a,b) => a.start.localeCompare(b.start))
                    .map(s => `
                        <div class="schedule-entry">
                            <strong>${safe(s.name)}</strong><br>
                            ${safe(s.start)} - ${safe(s.end)}
                            <br>${createButton("Delete", "deleteSchedule", s.id)}
                        </div>
                    `).join("") || `<p class="empty-message">No sessions</p>`}
            </div>
        `).join("")}
        </div>`;
}

function deleteSchedule(id) {
    data.schedule = data.schedule.filter(s => s.id !== id);
    saveData();
    renderTimetable();
}

// 8. EXAM TRACKER

$("addExamBtn").addEventListener("click", () => {
    $("examFormContainer").innerHTML = `
        <div class="content-card form-card">
            <h3>Add Examination</h3>
            <label>Exam Name</label>
            <input id="examName" placeholder="e.g. Mathematics IA">
            <label>Subject</label>
            <input id="examSubject" placeholder="Subject name">
            <label>Exam Date</label>
            <input type="date" id="examDate">
            <div class="form-actions">
                <button class="primary-button" onclick="addExam()">Save Exam</button>
                <button class="secondary-button" onclick="closeForm('examFormContainer')">Cancel</button>
            </div>
        </div>`;
});

function addExam() {
    const name = $("examName").value.trim();
    const subject = $("examSubject").value.trim();
    const date = $("examDate").value;

    if (!name || !subject || !date || date < today()) {
        return showMessage("Enter valid exam details and a future date.");
    }

    data.exams.push({
        id: crypto.randomUUID(),
        name,
        subject,
        date,
        topics: []
    });

    saveData();
    renderExams();
    closeForm("examFormContainer");
    showMessage("Exam added!");
}

function renderExams() {
    $("examList").innerHTML = data.exams.map(exam => {
        const days = Math.ceil((new Date(exam.date + "T00:00:00") - new Date(today() + "T00:00:00")) / 86400000);

        return `
            <div class="exam-card">
                <h3>🎓 ${safe(exam.name)}</h3>
                <p>Subject: ${safe(exam.subject)}</p>
                <p>Date: ${formatDate(exam.date)}</p>
                <h2 style="color:var(--primary-dark);margin:12px 0">
                    ${days === 0 ? "Today!" : days + " days left"}
                </h2>
                <div class="card-actions">
                    ${createButton("Add Topic", "addExamTopic", exam.id)}
                    ${createButton("Delete", "deleteExam", exam.id)}
                </div>
                <div class="topic-list">
                    ${exam.topics.map(topic => `
                        <div class="topic-item">
                            <label class="${topic.done ? "topic-done" : ""}">
                                <input type="checkbox" ${topic.done ? "checked" : ""}
                                onchange="toggleExamTopic('${exam.id}','${topic.id}')">
                                ${safe(topic.name)}
                            </label>
                        </div>
                    `).join("")}
                </div>
                <p>${exam.topics.length ? Math.round(exam.topics.filter(t => t.done).length / exam.topics.length * 100) : 0}% syllabus completed</p>
            </div>`;
    }).join("") || `<p class="empty-message">No exams added yet.</p>`;
}

function addExamTopic(id) {
    const exam = data.exams.find(e => e.id === id);
    if (!exam) return;

    const name = prompt("Enter syllabus topic:");
    if (!name?.trim()) return;

    exam.topics.push({ id: crypto.randomUUID(), name: name.trim(), done: false });
    saveData();
    renderExams();
}

function toggleExamTopic(examId, topicId) {
    const exam = data.exams.find(e => e.id === examId);
    const topic = exam?.topics.find(t => t.id === topicId);
    if (!topic) return;

    topic.done = !topic.done;
    saveData();
    renderExams();
}

function deleteExam(id) {
    if (!confirm("Delete this exam?")) return;
    data.exams = data.exams.filter(e => e.id !== id);
    saveData();
    renderExams();
}

// 9. POMODORO TIMER

let timerSeconds = 25 * 60;
let remainingSeconds = timerSeconds;
let timerInterval = null;
let timerRunning = false;
let timerMode = "pomodoro";
let timerStartedAt = null;

const timerDurations = {
    pomodoro: 25,
    short: 5,
    long: 15
};

function updateTimerDisplay() {
    const mins = Math.floor(remainingSeconds / 60);
    const secs = remainingSeconds % 60;
    $("timerDisplay").textContent =
        `${String(mins).padStart(2,"0")}:${String(secs).padStart(2,"0")}`;
}

function setTimerMode(mode) {
    if (timerRunning) return showMessage("Pause the timer before changing modes.");

    timerMode = mode;

    document.querySelectorAll(".timer-mode").forEach(b => {
        b.classList.toggle("active", b.dataset.mode === mode);
    });

    if (mode === "custom") {
        $("customTimerContainer").innerHTML = `
            <input type="number" id="customMinutes" min="1" max="180"
                placeholder="Enter minutes" style="max-width:180px;margin:auto">
            <button class="secondary-button" onclick="applyCustomTimer()">Set Time</button>`;
        return;
    }

    $("customTimerContainer").innerHTML = "";
    timerSeconds = timerDurations[mode] * 60;
    remainingSeconds = timerSeconds;
    updateTimerDisplay();
    $("timerStatus").textContent = "Ready to focus?";
}

function applyCustomTimer() {
    const mins = Number($("customMinutes").value);
    if (!Number.isInteger(mins) || mins < 1 || mins > 180) {
        return showMessage("Choose between 1 and 180 minutes.");
    }

    timerSeconds = mins * 60;
    remainingSeconds = timerSeconds;
    updateTimerDisplay();
    showMessage("Custom timer set!");
}

document.querySelectorAll(".timer-mode").forEach(button => {
    button.addEventListener("click", () => setTimerMode(button.dataset.mode));
});

function startTimer() {
    if (timerRunning) return;

    if (remainingSeconds <= 0) remainingSeconds = timerSeconds;

    timerRunning = true;
    timerStartedAt = Date.now();
    $("timerStatus").textContent = "Stay focused! 💜";

    timerInterval = setInterval(() => {
        remainingSeconds--;
        updateTimerDisplay();

        if (remainingSeconds <= 0) {
            completeSession();
        }
    }, 1000);
}

function pauseTimer() {
    if (!timerRunning) return;
    clearInterval(timerInterval);
    timerRunning = false;
    $("timerStatus").textContent = "Timer paused.";
}

function resetTimer() {
    clearInterval(timerInterval);
    timerRunning = false;
    remainingSeconds = timerSeconds;
    updateTimerDisplay();
    $("timerStatus").textContent = "Ready to focus?";
}

function completeSession() {
    clearInterval(timerInterval);
    timerRunning = false;

    if (timerMode === "pomodoro" || timerMode === "custom") {
        data.sessions.push({
            id: crypto.randomUUID(),
            date: today(),
            minutes: Math.round(timerSeconds / 60),
            completedAt: new Date().toISOString()
        });

        saveData();
    }

    remainingSeconds = 0;
    updateTimerDisplay();
    $("timerStatus").textContent = "Session completed! Amazing work! 🎉";

    showMessage("Focus session completed! Take a break.");
    renderTimerStats();
}

$("startTimer").addEventListener("click", startTimer);
$("pauseTimer").addEventListener("click", pauseTimer);
$("resetTimer").addEventListener("click", resetTimer);

function renderTimerStats() {
    const minutes = data.sessions
        .filter(s => s.date === today())
        .reduce((sum, s) => sum + s.minutes, 0);

    $("todayFocusTime").textContent = minutes + " min";
    $("totalSessions").textContent = data.sessions.length;
}

// 10. NOTES

$("addNoteBtn").addEventListener("click", () => {
    $("noteFormContainer").innerHTML = `
        <div class="content-card form-card">
            <h3>Create Note</h3>
            <label>Title</label>
            <input id="noteTitle" placeholder="Note title">
            <label>Subject</label>
            <input id="noteSubject" placeholder="Subject name">
            <label>Content</label>
            <textarea id="noteContent" placeholder="Write your notes..."></textarea>
            <div class="form-actions">
                <button class="primary-button" onclick="addNote()">Save Note</button>
                <button class="secondary-button" onclick="closeForm('noteFormContainer')">Cancel</button>
            </div>
        </div>`;
});

function addNote() {
    const title = $("noteTitle").value.trim();
    const content = $("noteContent").value.trim();

    if (!title || !content) return showMessage("Enter a title and note content.");

    data.notes.push({
        id: crypto.randomUUID(),
        title,
        subject: $("noteSubject").value.trim(),
        content,
        date: today()
    });

    saveData();
    renderNotes();
    closeForm("noteFormContainer");
    showMessage("Note saved!");
}

function renderNotes() {
    const query = $("noteSearch").value.toLowerCase();

    const notes = data.notes.filter(n =>
        (n.title + " " + n.content + " " + n.subject).toLowerCase().includes(query)
    );

    $("notesList").innerHTML = notes.map(note => `
        <div class="note-card">
            <h3>📝 ${safe(note.title)}</h3>
            <p>${safe(note.subject || "General")} · ${formatDate(note.date)}</p>
            <p>${safe(note.content)}</p>
            <div class="card-actions">
                ${createButton("Edit", "editNote", note.id)}
                ${createButton("Delete", "deleteNote", note.id)}
            </div>
        </div>
    `).join("") || `<p class="empty-message">No matching notes found.</p>`;

    $("pdfList").innerHTML = data.pdfs.map(pdf => `
        <p style="font-size:12px;padding:7px 0">
            📄 ${safe(pdf.name)}
            <button class="text-button" onclick="deletePDF('${pdf.id}')">Delete</button>
        </p>
    `).join("") || `<p class="empty-message">No PDFs uploaded.</p>`;

    $("studyLinks").innerHTML = data.links.map(link => `
        <p style="font-size:12px;padding:7px 0">
            🔗 <a href="${safe(link.url)}" target="_blank" rel="noopener noreferrer">${safe(link.name)}</a>
            <button class="text-button" onclick="deleteLink('${link.id}')">Delete</button>
        </p>
    `).join("");
}

$("noteSearch").addEventListener("input", renderNotes);

function editNote(id) {
    const note = data.notes.find(n => n.id === id);
    if (!note) return;

    const title = prompt("Edit title:", note.title);
    if (!title?.trim()) return;

    const content = prompt("Edit content:", note.content);
    if (content === null) return;

    note.title = title.trim();
    note.content = content;
    saveData();
    renderNotes();
}

function deleteNote(id) {
    if (!confirm("Delete this note?")) return;
    data.notes = data.notes.filter(n => n.id !== id);
    saveData();
    renderNotes();
}

// PDF uploads are stored as browser-local data URLs.
// Large files may exceed LocalStorage capacity.

$("pdfUpload").addEventListener("change", async event => {
    for (const file of event.target.files) {
        if (file.type !== "application/pdf") continue;
        if (file.size > 1.5 * 1024 * 1024) {
            showMessage("PDF too large for this initial version. Choose a file under 1.5 MB.");
            continue;
        }

        const reader = new FileReader();

        reader.onload = () => {
            data.pdfs.push({
                id: crypto.randomUUID(),
                name: file.name,
                url: reader.result
            });

            try {
                saveData();
                renderNotes();
                showMessage("PDF saved!");
            } catch {
                data.pdfs.pop();
                showMessage("Storage limit reached. Remove some files.");
            }
        };

        reader.readAsDataURL(file);
    }

    event.target.value = "";
});

function deletePDF(id) {
    data.pdfs = data.pdfs.filter(p => p.id !== id);
    saveData();
    renderNotes();
}

$("addLinkBtn").addEventListener("click", () => {
    $("linkFormContainer").innerHTML = `
        <label>Link Name</label>
        <input id="linkName" placeholder="e.g. Java Tutorial">
        <label>Website URL</label>
        <input id="linkURL" type="url" placeholder="https://example.com">
        <button class="primary-button" style="margin-top:10px" onclick="saveLink()">Save Link</button>`;
});

function saveLink() {
    const name = $("linkName").value.trim();
    const url = $("linkURL").value.trim();

    try {
        const parsed = new URL(url);
        if (!name || !["http:", "https:"].includes(parsed.protocol)) throw new Error();
    } catch {
        return showMessage("Enter a valid name and website URL.");
    }

    data.links.push({ id: crypto.randomUUID(), name, url });
    saveData();
    renderNotes();
    closeForm("linkFormContainer");
    showMessage("Study link saved!");
}

function deleteLink(id) {
    data.links = data.links.filter(l => l.id !== id);
    saveData();
    renderNotes();
}

// 11. DASHBOARD

function updateDashboard() {
    const topics = data.subjects.reduce((sum, s) => sum + s.topics.length, 0);
    const completedTopics = data.subjects.reduce(
        (sum, s) => sum + s.topics.filter(t => t.done).length, 0
    );

    const completedTasks = data.tasks.filter(t => t.done).length;
    const totalTasks = data.tasks.length;

    const focusMinutes = data.sessions.reduce((sum, s) => sum + s.minutes, 0);

    $("totalSubjects").textContent = data.subjects.length;
    $("totalTopics").textContent = topics;
    $("completedTasks").textContent = completedTasks;
    $("focusHours").textContent = (focusMinutes / 60).toFixed(1) + "h";

    const progress = totalTasks ? Math.round(completedTasks / totalTasks * 100) : 0;

    $("dailyProgress").textContent = progress + "%";
    $("dailyProgressBar").style.width = progress + "%";

    $("analyticsFocus").textContent = (focusMinutes / 60).toFixed(1) + "h";
    $("analyticsTopics").textContent = completedTopics;
    $("analyticsTasks").textContent = completedTasks;

    renderProfile();
    renderTodaySchedule();
    renderUpcomingExams();
    renderUpcomingDeadlines();
    renderTimerStats();
}

function renderTodaySchedule() {
    const day = new Date().toLocaleDateString("en-US", { weekday: "long" });

    const sessions = data.schedule.filter(s => s.day === day)
        .sort((a,b) => a.start.localeCompare(b.start));

    $("todaySchedule").innerHTML = sessions.map(s => `
        <div class="schedule-entry">
            <strong>${safe(s.name)}</strong><br>
            ${safe(s.start)} - ${safe(s.end)}
        </div>
    `).join("") || `<p class="empty-message">No sessions planned for today.</p>`;
}

function renderUpcomingExams() {
    const exams = data.exams
        .filter(e => e.date >= today())
        .sort((a,b) => a.date.localeCompare(b.date))
        .slice(0, 4);

    $("upcomingExams").innerHTML = exams.map(e => `
        <div class="schedule-entry">
            <strong>${safe(e.name)}</strong><br>
            ${formatDate(e.date)}
        </div>
    `).join("") || `<p class="empty-message">No upcoming exams.</p>`;
}

function renderUpcomingDeadlines() {
    const tasks = data.tasks
        .filter(t => !t.done && t.date && t.date >= today())
        .sort((a,b) => a.date.localeCompare(b.date))
        .slice(0, 4);

    $("upcomingDeadlines").innerHTML = tasks.map(t => `
        <div class="schedule-entry">
            <strong>${safe(t.name)}</strong><br>
            ${formatDate(t.date)}
        </div>
    `).join("") || `<p class="empty-message">No pending deadlines.</p>`;
}

// 12. ANALYTICS

let weeklyChartInstance = null;
let subjectChartInstance = null;

function renderAnalytics() {
    const dates = [];

    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        dates.push(d.toISOString().slice(0,10));
    }

    const dailyMinutes = dates.map(date =>
        data.sessions.filter(s => s.date === date)
            .reduce((sum, s) => sum + s.minutes, 0)
    );

    const subjectNames = data.subjects.map(s => s.name);
    const subjectProgress = data.subjects.map(s =>
        s.topics.length
            ? Math.round(s.topics.filter(t => t.done).length / s.topics.length * 100)
            : 0
    );

    if (weeklyChartInstance) weeklyChartInstance.destroy();
    if (subjectChartInstance) subjectChartInstance.destroy();

    weeklyChartInstance = new Chart($("weeklyChart"), {
        type: "bar",
        data: {
            labels: dates.map(d => new Date(d + "T00:00:00").toLocaleDateString("en-IN", {weekday:"short"})),
            datasets: [{
                label: "Focus minutes",
                data: dailyMinutes,
                backgroundColor: "#a895e6",
                borderRadius: 7
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } }
        }
    });

    subjectChartInstance = new Chart($("subjectChart"), {
        type: "bar",
        data: {
            labels: subjectNames,
            datasets: [{
                label: "Completion %",
                data: subjectProgress,
                backgroundColor: "#92b9e9",
                borderRadius: 7
            }]
        },
        options: {
            responsive: true,
            scales: { y: { min: 0, max: 100 } }
        }
    });

    $("sessionHistory").innerHTML = data.sessions.slice().reverse().slice(0, 10).map(s => `
        <div class="schedule-entry">
            ${formatDate(s.date)} — ${s.minutes} minutes of focus
        </div>
    `).join("") || `<p class="empty-message">Your completed sessions will appear here.</p>`;

    const datesWithSessions = [...new Set(data.sessions.map(s => s.date))].sort().reverse();
    let streak = 0;
    let checkDate = new Date(today() + "T00:00:00");

    if (!datesWithSessions.includes(today())) {
        checkDate.setDate(checkDate.getDate() - 1);
    }

    while (datesWithSessions.includes(checkDate.toISOString().slice(0,10))) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
    }

    $("studyStreak").textContent = streak + " Days";
}

// 13. BASIC LOCAL STUDY ASSISTANT

function sendMessage(message) {
    if (!message.trim()) return;

    const container = $("chatMessages");

    const user = document.createElement("div");
    user.className = "user-message";
    user.textContent = message;
    container.appendChild(user);

    const reply = document.createElement("div");
    reply.className = "bot-message";
    reply.textContent = getLocalReply(message);
    container.appendChild(reply);

    container.scrollTop = container.scrollHeight;
    $("chatInput").value = "";
}

function getLocalReply(message) {
    const text = message.toLowerCase();

    if (text.includes("plan") || text.includes("schedule")) {
        const pending = data.tasks.filter(t => !t.done);
        return pending.length
            ? "Here are your pending tasks: " + pending.map(t => t.name).join(", ") +
              ". Start with your highest-priority task, then take a short break."
            : "You have no pending tasks! Add your subjects and upcoming tasks to build a study plan.";
    }

    if (text.includes("topic") || text.includes("syllabus")) {
        const pending = data.subjects.flatMap(s =>
            s.topics.filter(t => !t.done).map(t => s.name + ": " + t.name)
        );
        return pending.length
            ? "Your pending topics are: " + pending.join("; ") +
              ". Try completing two or three topics in each focused study session."
            : "You have no pending topics recorded. Add your syllabus in My Subjects!";
    }

    if (text.includes("revision")) {
        return "Try active recall, practise important questions, revise formulas and revisit topics you find difficult. Keep a short revision session every day.";
    }

    return "I'm currently running in local assistant mode, not connected to an AI API. I can help you review the tasks and topics you've entered. For live academic answers, an AI API needs to be connected.";
}

$("sendChat").addEventListener("click", () => sendMessage($("chatInput").value));

$("chatInput").addEventListener("keydown", event => {
    if (event.key === "Enter") sendMessage($("chatInput").value);
});

document.querySelectorAll("[data-prompt]").forEach(button => {
    button.addEventListener("click", () => sendMessage(button.dataset.prompt));
});

// 14. DARK MODE

$("themeToggle").addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");

    const dark = document.body.classList.contains("dark-mode");

    localStorage.setItem("studymateTheme", dark ? "dark" : "light");

    $("themeToggle").innerHTML = dark
        ? '<i data-lucide="sun"></i> Light Mode'
        : '<i data-lucide="moon"></i> Dark Mode';

    if (window.lucide) lucide.createIcons();
});

if (localStorage.getItem("studymateTheme") === "dark") {
    document.body.classList.add("dark-mode");
    $("themeToggle").innerHTML = '<i data-lucide="sun"></i> Light Mode';
}

// 15. EXPORT AND RESET DATA

$("exportData").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json"
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "StudyMate-Backup.json";
    a.click();
    URL.revokeObjectURL(url);

    showMessage("Your backup is ready!");
});

$("clearData").addEventListener("click", () => {
    if (!confirm("Are you sure? This will permanently clear all StudyMate data in this browser.")) return;

    data = structuredClone(defaultData);
    saveData();
    renderAll();
    showMessage("All data cleared.");
});

// 16. INITIALISE WEBSITE

function renderAll() {
    renderProfile();
    renderSubjects();
    renderTasks();
    renderExams();
    renderTimetable();
    renderNotes();
    updateDashboard();
    renderTimerStats();
}

function initialiseStudyMate() {
    initialiseDate();
    renderAll();
    updateTimerDisplay();

    if (window.lucide) {
        lucide.createIcons();
    }

    console.log("StudyMate successfully initialised!");
}

initialiseStudyMate();
