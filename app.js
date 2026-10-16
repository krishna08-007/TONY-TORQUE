"use strict";

const STORAGE_KEYS = {
  contacts: "tony.contacts.v1",
  notes: "tony.notes.v1",
  reminders: "tony.reminders.v1",
  tasks: "tony.tasks.v1"
};

const elements = {
  clock: document.querySelector("#live-clock"),
  greeting: document.querySelector("#greeting"),
  conversation: document.querySelector("#conversation"),
  commandForm: document.querySelector("#command-form"),
  commandInput: document.querySelector("#command-input"),
  voiceButton: document.querySelector("#voice-button"),
  voiceStatus: document.querySelector("#voice-status"),
  contactForm: document.querySelector("#contact-form"),
  contactName: document.querySelector("#contact-name"),
  contactPhone: document.querySelector("#contact-phone"),
  contactList: document.querySelector("#contact-list"),
  contactsEmpty: document.querySelector("#contacts-empty"),
  addContactButton: document.querySelector("#add-contact-button"),
  cancelContactButton: document.querySelector("#cancel-contact-button"),
  reminderList: document.querySelector("#reminder-list"),
  remindersEmpty: document.querySelector("#reminders-empty"),
  reminderCount: document.querySelector("#reminder-count"),
  noteForm: document.querySelector("#note-form"),
  noteInput: document.querySelector("#note-input"),
  noteList: document.querySelector("#note-list"),
  notesEmpty: document.querySelector("#notes-empty"),
  noteCount: document.querySelector("#note-count"),
  toast: document.querySelector("#toast"),
  taskForm: document.querySelector("#task-form"),
  taskInput: document.querySelector("#task-input"),
  taskList: document.querySelector("#task-list"),
  tasksEmpty: document.querySelector("#tasks-empty"),
  taskCount: document.querySelector("#task-count"),
  installButton: document.querySelector("#install-button"),
  notificationsButton: document.querySelector("#notifications-button")
};

let contacts = readStoredList(STORAGE_KEYS.contacts);
let notes = readStoredList(STORAGE_KEYS.notes);
let reminders = readStoredList(STORAGE_KEYS.reminders);
let tasks = readStoredList(STORAGE_KEYS.tasks);
let toastTimeout;
let recognition;
let installPrompt;
let voiceEnabled = false;
let wakeWordDetected = false;
let voiceCommand = "";
let voiceSubmitTimeout;
let voiceRestartTimeout;

function readStoredList(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch (error) {
    console.error(`Could not read Tony data (${key}).`, error);
    showToast("Tony couldn't read saved data. Check your browser storage settings.");
    return [];
  }
}

function saveStoredList(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Could not save Tony data (${key}).`, error);
    showToast("Tony couldn't save that. Check your browser storage settings.");
    return false;
  }
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("visible");
  window.clearTimeout(toastTimeout);
  toastTimeout = window.setTimeout(() => elements.toast.classList.remove("visible"), 3800);
}

function updateClock() {
  const now = new Date();
  elements.clock.dateTime = now.toISOString();
  elements.clock.textContent = new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(now);
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning." : hour < 18 ? "Good afternoon." : "Good evening.";
  elements.greeting.innerHTML = `${greeting} <span>I'm Tony.</span>`;
}

function addMessage(text, kind) {
  const message = document.createElement("div");
  message.className = `message ${kind}-message`;
  const paragraph = document.createElement("p");
  paragraph.textContent = text;
  if (kind === "assistant") {
    const avatar = document.createElement("span");
    avatar.className = "message-avatar";
    avatar.setAttribute("aria-hidden", "true");
    avatar.textContent = "T";
    message.append(avatar, paragraph);
  } else {
    message.append(paragraph);
  }
  elements.conversation.append(message);
  elements.conversation.scrollTop = elements.conversation.scrollHeight;
}

function addActionCard(title, description, buttonLabel, action) {
  const card = document.createElement("div");
  card.className = "action-card";
  const heading = document.createElement("strong");
  heading.textContent = title;
  const detail = document.createElement("p");
  detail.textContent = description;
  const button = document.createElement("button");
  button.className = "action-button";
  button.type = "button";
  button.textContent = buttonLabel;
  button.addEventListener("click", action, { once: true });
  card.append(heading, detail, button);
  elements.conversation.append(card);
  elements.conversation.scrollTop = elements.conversation.scrollHeight;
}

function searchGoogle(query) {
  addMessage(`I don't have a built-in live answer for that. Searching Google for “${query}”.`, "assistant");
  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
  window.open(searchUrl, "_blank", "noopener,noreferrer");
  addActionCard("Google search", query, "Search Google", () => {
    window.open(searchUrl, "_blank", "noopener,noreferrer");
  });
}

function saveNote(text) {
  const note = { id: crypto.randomUUID(), text, createdAt: new Date().toISOString() };
  notes.unshift(note);
  if (!saveStoredList(STORAGE_KEYS.notes, notes)) {
    notes.shift();
    return false;
  }
  renderNotes();
  return true;
}

function saveTask(text) {
  const task = { id: crypto.randomUUID(), text, createdAt: new Date().toISOString(), completed: false };
  tasks.unshift(task);
  if (!saveStoredList(STORAGE_KEYS.tasks, tasks)) {
    tasks.shift();
    return false;
  }
  renderTasks();
  return true;
}

function saveReminder(text, dueAt) {
  const reminder = { id: crypto.randomUUID(), text, dueAt: dueAt.toISOString(), notified: false };
  reminders.push(reminder);
  if (!saveStoredList(STORAGE_KEYS.reminders, reminders)) {
    reminders.pop();
    return false;
  }
  renderReminders();
  showToast(`Reminder set for ${formatDateTime(dueAt)}.`);
  return true;
}

function renderContacts() {
  elements.contactList.replaceChildren();
  elements.contactsEmpty.classList.toggle("hidden", contacts.length > 0);
  contacts.forEach((contact) => {
    const card = document.createElement("div");
    card.className = "contact-card";
    const avatar = document.createElement("span");
    avatar.className = "contact-avatar";
    avatar.setAttribute("aria-hidden", "true");
    avatar.textContent = contact.name.trim().charAt(0).toUpperCase() || "?";
    const info = document.createElement("span");
    info.className = "contact-info";
    const name = document.createElement("strong");
    name.textContent = contact.name;
    const phone = document.createElement("small");
    phone.textContent = contact.phone;
    info.append(name, phone);
    const actions = document.createElement("span");
    actions.className = "contact-actions";
    const call = document.createElement("a");
    call.href = `tel:${contact.phone.replace(/[^\d+]/g, "")}`;
    call.setAttribute("aria-label", `Call ${contact.name}`);
    call.title = "Call";
    call.textContent = "☎";
    const message = document.createElement("a");
    message.href = `https://wa.me/${contact.phone.replace(/\D/g, "")}`;
    message.target = "_blank";
    message.rel = "noopener noreferrer";
    message.setAttribute("aria-label", `Message ${contact.name} on WhatsApp`);
    message.title = "WhatsApp";
    message.textContent = "↗";
    const remove = document.createElement("button");
    remove.type = "button";
    remove.setAttribute("aria-label", `Remove ${contact.name}`);
    remove.title = "Remove contact";
    remove.textContent = "×";
    remove.addEventListener("click", () => {
      const previous = contacts;
      contacts = contacts.filter((item) => item.id !== contact.id);
      if (saveStoredList(STORAGE_KEYS.contacts, contacts)) renderContacts();
      else contacts = previous;
    });
    actions.append(call, message, remove);
    card.append(avatar, info, actions);
    elements.contactList.append(card);
  });
}

function renderReminders() {
  elements.reminderList.replaceChildren();
  const pending = reminders.filter((reminder) => !reminder.completed);
  elements.reminderCount.textContent = String(pending.length);
  elements.remindersEmpty.classList.toggle("hidden", pending.length > 0);
  pending
    .sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt))
    .forEach((reminder) => {
      const item = document.createElement("li");
      item.className = "reminder-item";
      const icon = document.createElement("span");
      icon.className = "reminder-icon";
      icon.setAttribute("aria-hidden", "true");
      icon.textContent = "◷";
      const copy = document.createElement("span");
      copy.className = "reminder-copy";
      const text = document.createElement("strong");
      text.textContent = reminder.text;
      const due = document.createElement("small");
      due.textContent = formatDateTime(new Date(reminder.dueAt));
      copy.append(text, due);
      const done = document.createElement("button");
      done.className = "remove-button";
      done.type = "button";
      done.setAttribute("aria-label", `Dismiss reminder: ${reminder.text}`);
      done.title = "Dismiss";
      done.textContent = "×";
      done.addEventListener("click", () => removeReminder(reminder.id));
      item.append(icon, copy, done);
      elements.reminderList.append(item);
    });
}

function renderNotes() {
  elements.noteList.replaceChildren();
  elements.noteCount.textContent = String(notes.length);
  elements.notesEmpty.classList.toggle("hidden", notes.length > 0);
  notes.forEach((note) => {
    const item = document.createElement("li");
    item.className = "note-item";
    const copy = document.createElement("span");
    copy.className = "note-copy";
    const text = document.createElement("p");
    text.textContent = note.text;
    const date = document.createElement("small");
    date.textContent = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(note.createdAt));
    copy.append(text, date);
    const remove = document.createElement("button");
    remove.className = "remove-button";
    remove.type = "button";
    remove.setAttribute("aria-label", "Delete note");
    remove.title = "Delete note";
    remove.textContent = "×";
    remove.addEventListener("click", () => {
      const previous = notes;
      notes = notes.filter((item) => item.id !== note.id);
      if (saveStoredList(STORAGE_KEYS.notes, notes)) renderNotes();
      else notes = previous;
    });
    item.append(copy, remove);
    elements.noteList.append(item);
  });
}

function renderTasks() {
  elements.taskList.replaceChildren();
  const remaining = tasks.filter((task) => !task.completed);
  elements.taskCount.textContent = String(remaining.length);
  elements.tasksEmpty.classList.toggle("hidden", tasks.length > 0);
  tasks.forEach((task) => {
    const item = document.createElement("li");
    item.className = "task-item";
    const checkbox = document.createElement("input");
    checkbox.className = "task-checkbox";
    checkbox.type = "checkbox";
    checkbox.checked = task.completed;
    checkbox.setAttribute("aria-label", `${task.completed ? "Reopen" : "Complete"} task: ${task.text}`);
    checkbox.addEventListener("change", () => {
      const previous = task.completed;
      task.completed = checkbox.checked;
      if (saveStoredList(STORAGE_KEYS.tasks, tasks)) renderTasks();
      else task.completed = previous;
    });
    const label = document.createElement("span");
    label.className = task.completed ? "task-copy completed" : "task-copy";
    label.textContent = task.text;
    const remove = document.createElement("button");
    remove.className = "remove-button";
    remove.type = "button";
    remove.setAttribute("aria-label", `Delete task: ${task.text}`);
    remove.title = "Delete task";
    remove.textContent = "×";
    remove.addEventListener("click", () => {
      const previous = tasks;
      tasks = tasks.filter((item) => item.id !== task.id);
      if (saveStoredList(STORAGE_KEYS.tasks, tasks)) renderTasks();
      else tasks = previous;
    });
    item.append(checkbox, label, remove);
    elements.taskList.append(item);
  });
}

function formatDateTime(date) {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(date);
}

function findContact(name) {
  const normalized = name.trim().toLocaleLowerCase();
  return contacts.find((contact) => contact.name.toLocaleLowerCase() === normalized);
}

function findNamedContact(command, verb) {
  const normalized = command.trim().toLocaleLowerCase();
  const prefix = `${verb.toLocaleLowerCase()} `;
  if (!normalized.startsWith(prefix)) return null;
  const rest = normalized.slice(prefix.length);
  return contacts
    .slice()
    .sort((a, b) => b.name.length - a.name.length)
    .find((contact) => rest === contact.name.toLocaleLowerCase() || rest.startsWith(`${contact.name.toLocaleLowerCase()} `)) || null;
}

function parseReminder(command) {
  const match = command.match(/^remind me to (.+?) in (\d+)\s*(minute|minutes|min|hour|hours|hr|hrs)$/i);
  if (!match) return null;
  const amount = Number(match[2]);
  if (!Number.isSafeInteger(amount) || amount < 1 || amount > 525600) return null;
  const unit = match[3].toLowerCase().startsWith("h") ? 60 : 1;
  return { text: match[1].trim(), dueAt: new Date(Date.now() + amount * unit * 60_000) };
}

function handleCommand(rawCommand) {
  const command = rawCommand.trim();
  if (!command) return;
  addMessage(command, "user");
  elements.commandInput.value = "";
  const normalized = command.toLocaleLowerCase();

  const googleSearchMatch = command.match(/^(?:search\s+)?google(?:\s+for)?(?:\s+(.+))?$/i);
  if (googleSearchMatch) {
    const searchQuery = googleSearchMatch[1]?.trim();
    if (!searchQuery) {
      addMessage("What would you like me to search for on Google?", "assistant");
      return;
    }
    searchGoogle(searchQuery);
    return;
  }

  const callContact = findNamedContact(command, "call");
  if (callContact) {
    addMessage(`Calling ${callContact.name}. Your phone may ask you to confirm the call.`, "assistant");
    window.location.href = `tel:${callContact.phone.replace(/[^\d+]/g, "")}`;
    return;
  }
  if (normalized === "call" || normalized.startsWith("call ")) {
    addMessage("I couldn't find that contact. Add them under Your people, including their country code, then try again.", "assistant");
    return;
  }

  const messageContact = findNamedContact(command, "whatsapp") || findNamedContact(command, "message");
  if (messageContact) {
    const verb = normalized.startsWith("whatsapp ") ? "whatsapp" : "message";
    const remainder = command.trim().slice(verb.length).trim();
    const messageText = remainder.slice(messageContact.name.length).trim();
    if (!messageText) {
      addMessage(`What would you like to say to ${messageContact.name}? Try “WhatsApp ${messageContact.name} followed by your message.”`, "assistant");
      return;
    }
    addMessage(`Here is a WhatsApp message for ${messageContact.name}. Review it before sending.`, "assistant");
    addActionCard("WhatsApp message", messageText, "Open WhatsApp", () => {
      const url = `https://wa.me/${messageContact.phone.replace(/\D/g, "")}?text=${encodeURIComponent(messageText)}`;
      window.open(url, "_blank", "noopener,noreferrer");
    });
    return;
  }
  if (normalized.startsWith("whatsapp ") || normalized.startsWith("message ")) {
    addMessage("I couldn't find that contact. Add them under Your people, including their country code, then try again.", "assistant");
    return;
  }

  const reminder = parseReminder(command);
  if (reminder) {
    if (saveReminder(reminder.text, reminder.dueAt)) addMessage(`I'll remind you to ${reminder.text} at ${formatDateTime(reminder.dueAt)}.`, "assistant");
    return;
  }
  if (normalized.startsWith("remind me")) {
    addMessage("Use “remind me to [something] in [number] minutes” or “remind me to [something] in [number] hours.” Tony needs this page open to alert you.", "assistant");
    return;
  }

  const addTaskMatch = command.match(/^(?:add task|task)\s*:?\s*(.+)$/i);
  if (addTaskMatch) {
    const taskText = addTaskMatch[1].trim();
    if (taskText && saveTask(taskText)) addMessage(`Added “${taskText}” to your tasks.`, "assistant");
    return;
  }
  if (/^(?:add task|task)$/i.test(command)) {
    addMessage("What should I add? Type “add task” followed by your to-do.", "assistant");
    elements.taskInput.focus();
    return;
  }
  if (/^(?:list tasks|my tasks|show tasks)$/i.test(command)) {
    const openTasks = tasks.filter((task) => !task.completed);
    addMessage(openTasks.length
      ? `You have ${openTasks.length} open task${openTasks.length === 1 ? "" : "s"}: ${openTasks.map((task) => task.text).join("; ")}.`
      : "You have no open tasks. You're all caught up!", "assistant");
    return;
  }
  const completeTaskMatch = command.match(/^complete task\s+(.+)$/i);
  if (completeTaskMatch) {
    const requested = completeTaskMatch[1].trim().toLocaleLowerCase();
    const task = tasks.find((item) => !item.completed && item.text.toLocaleLowerCase() === requested);
    if (!task) {
      addMessage("I couldn't find that open task. Check “My tasks” and try its exact name.", "assistant");
      return;
    }
    task.completed = true;
    if (saveStoredList(STORAGE_KEYS.tasks, tasks)) {
      renderTasks();
      addMessage(`Marked “${task.text}” complete.`, "assistant");
    } else {
      task.completed = false;
    }
    return;
  }

  const noteMatch = command.match(/^(?:take a note|note)\s*:?\s*(.+)$/i);
  if (noteMatch) {
    if (saveNote(noteMatch[1].trim())) addMessage("Got it. I've saved that note on this device.", "assistant");
    return;
  }
  if (/^(?:take a note|note)$/i.test(command)) {
    addMessage("Sure—type your note after “take a note”, or use Quick notes below.", "assistant");
    elements.noteInput.focus();
    return;
  }

  if (/\b(time|clock)\b/i.test(command)) {
    addMessage(`It's ${new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date())}.`, "assistant");
    return;
  }
  if (/\b(date|day|today)\b/i.test(command)) {
    addMessage(`Today is ${new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(new Date())}.`, "assistant");
    return;
  }
  if (/^(?:help|what can you do)\??$/i.test(command)) {
    addMessage("I can call saved contacts, prepare WhatsApp messages, search Google, save notes, manage tasks, set reminders, and tell you the time or date. Tap the microphone to enable voice and wake-word listening, then say “Hey Tony” or “OK Tony.”", "assistant");
    return;
  }
  searchGoogle(command);
}

function updateNotificationsButton() {
  if (!("Notification" in window)) {
    elements.notificationsButton.hidden = true;
    return;
  }
  elements.notificationsButton.textContent = Notification.permission === "granted"
    ? "Alerts enabled"
    : Notification.permission === "denied" ? "Alerts blocked" : "Enable alerts";
  elements.notificationsButton.disabled = Notification.permission === "denied";
  elements.notificationsButton.title = Notification.permission === "denied"
    ? "Allow notifications in your browser settings"
    : "Allow Tony to show reminder notifications";
}

function setupInstallAndOffline() {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    installPrompt = event;
  });
  window.addEventListener("appinstalled", () => {
    installPrompt = null;
    elements.installButton.textContent = "App installed";
    showToast("Tony has been installed on your device.");
  });
  elements.installButton.addEventListener("click", async () => {
    if (installPrompt) {
      installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === "accepted") elements.installButton.textContent = "App installed";
      installPrompt = null;
      return;
    }
    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent)
      || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    showToast(isIos
      ? "To install Tony, tap Share in Safari, then choose “Add to Home Screen”."
      : "Open your browser menu and choose “Install app” or “Add to Home screen”.");
  });

  if ("serviceWorker" in navigator && window.isSecureContext) {
    navigator.serviceWorker.register("./service-worker.js")
      .catch((error) => {
        console.error("Could not register Tony's offline support.", error);
        showToast("Offline support couldn't start. Tony still works while this page is open.");
      });
  }
}

function removeReminder(id) {
  const previous = reminders;
  reminders = reminders.filter((reminder) => reminder.id !== id);
  if (saveStoredList(STORAGE_KEYS.reminders, reminders)) renderReminders();
  else reminders = previous;
}

function checkReminders() {
  const now = Date.now();
  const due = reminders.filter((reminder) => !reminder.notified && !reminder.completed && new Date(reminder.dueAt).getTime() <= now);
  if (due.length === 0) return;
  due.forEach((reminder) => {
    reminder.notified = true;
    showToast(`Reminder: ${reminder.text}`);
    if ("Notification" in window && Notification.permission === "granted") {
      if ("serviceWorker" in navigator && window.isSecureContext) {
        navigator.serviceWorker.ready
          .then((registration) => registration.showNotification("Tony reminder", { body: reminder.text }))
          .catch((error) => {
            console.error("Could not show the Tony reminder notification.", error);
            showToast("Tony couldn't show a notification. Keep this page open to see reminders.");
          });
      } else {
        try {
          new Notification("Tony reminder", { body: reminder.text });
        } catch (error) {
          console.error("Could not show the Tony reminder notification.", error);
          showToast("Tony couldn't show a notification. Keep this page open to see reminders.");
        }
      }
    }
  });
  saveStoredList(STORAGE_KEYS.reminders, reminders);
  renderReminders();
}

function setupVoiceInput() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    elements.voiceButton.disabled = true;
    elements.voiceButton.title = "Voice input is not supported in this browser";
    elements.voiceStatus.textContent = "Voice input works in supported browsers such as Chrome and Edge.";
    return;
  }
  recognition = new SpeechRecognition();
  recognition.lang = navigator.language || "en-US";
  recognition.continuous = true;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  recognition.addEventListener("start", () => {
    elements.voiceButton.classList.add("listening");
    elements.voiceButton.setAttribute("aria-pressed", "true");
    elements.voiceStatus.textContent = "Listening for “Hey Tony” or “OK Tony”. You can also speak a command.";
  });
  recognition.addEventListener("result", (event) => {
    const transcript = Array.from(event.results)
      .slice(event.resultIndex)
      .filter((result) => result.isFinal)
      .map((result) => result[0].transcript.trim())
      .filter(Boolean)
      .join(" ");
    if (!transcript) return;

    const wakeWord = /\b(?:hey\s+tony|okay\s+tony|ok\s+tony)\b/i;
    const wakeMatch = wakeWord.exec(transcript);
    if (wakeMatch) {
      wakeWordDetected = true;
      voiceCommand += ` ${transcript.slice(wakeMatch.index + wakeMatch[0].length).replace(/^[\s,.:;!?-]+/, "")}`;
    } else if (wakeWordDetected) {
      voiceCommand += ` ${transcript}`;
    } else {
      voiceCommand = transcript;
    }

    voiceCommand = voiceCommand.trim();
    elements.commandInput.value = voiceCommand;
    if (wakeWordDetected && !voiceCommand) {
      elements.voiceStatus.textContent = "Tony is awake. Say your command.";
      return;
    }
    elements.voiceStatus.textContent = "Sending when you finish speaking…";
    window.clearTimeout(voiceSubmitTimeout);
    voiceSubmitTimeout = window.setTimeout(() => {
      if (!elements.commandInput.value.trim()) return;
      elements.commandForm.requestSubmit();
      voiceCommand = "";
      wakeWordDetected = false;
      elements.voiceStatus.textContent = "Listening for “Hey Tony” or “OK Tony”.";
    }, 900);
  });
  recognition.addEventListener("error", (event) => {
    const message = event.error === "not-allowed"
      ? "Microphone access was blocked. Allow it in your browser settings to use voice input."
      : `Voice input failed (${event.error}). You can still type commands.`;
    elements.voiceStatus.textContent = message;
    if (event.error === "not-allowed" || event.error === "service-not-allowed" || event.error === "audio-capture") {
      voiceEnabled = false;
    }
  });
  recognition.addEventListener("end", () => {
    elements.voiceButton.classList.remove("listening");
    elements.voiceButton.setAttribute("aria-pressed", "false");
    if (voiceEnabled && voiceCommand.trim()) {
      window.clearTimeout(voiceSubmitTimeout);
      voiceSubmitTimeout = window.setTimeout(() => {
        elements.commandForm.requestSubmit();
        voiceCommand = "";
        wakeWordDetected = false;
      }, 250);
    }
    if (voiceEnabled) {
      window.clearTimeout(voiceRestartTimeout);
      voiceRestartTimeout = window.setTimeout(startVoiceRecognition, 500);
    }
  });
  function startVoiceRecognition() {
    if (!voiceEnabled) return;
    try {
      recognition.start();
    } catch (error) {
      if (error instanceof DOMException && error.name === "InvalidStateError") return;
      console.error("Could not start voice input.", error);
      voiceEnabled = false;
      elements.voiceStatus.textContent = "Tony couldn't start voice input. You can still type commands.";
    }
  }
  elements.voiceButton.addEventListener("click", () => {
    if (voiceEnabled) {
      voiceEnabled = false;
      window.clearTimeout(voiceRestartTimeout);
      recognition.stop();
      elements.voiceButton.classList.remove("listening");
      elements.voiceButton.setAttribute("aria-pressed", "false");
      elements.voiceStatus.textContent = "Voice listening is off.";
      return;
    }
    voiceEnabled = true;
    wakeWordDetected = false;
    voiceCommand = "";
    elements.voiceStatus.textContent = "";
    startVoiceRecognition();
  });
}

elements.commandForm.addEventListener("submit", (event) => {
  event.preventDefault();
  handleCommand(elements.commandInput.value);
});

document.querySelectorAll("[data-command]").forEach((button) => {
  button.addEventListener("click", () => {
    elements.commandInput.value = button.dataset.command;
    elements.commandInput.focus();
  });
});

elements.addContactButton.addEventListener("click", () => {
  elements.contactForm.classList.toggle("hidden");
  if (!elements.contactForm.classList.contains("hidden")) elements.contactName.focus();
});
elements.cancelContactButton.addEventListener("click", () => {
  elements.contactForm.reset();
  elements.contactForm.classList.add("hidden");
});
elements.contactForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = elements.contactName.value.trim();
  const phone = elements.contactPhone.value.trim();
  if (!name || !/^\+?[\d\s().-]{7,23}$/.test(phone)) {
    showToast("Enter a name and a valid phone number, including the country code.");
    return;
  }
  if (contacts.some((contact) => contact.name.toLocaleLowerCase() === name.toLocaleLowerCase())) {
    showToast("A contact with that name already exists.");
    return;
  }
  const contact = { id: crypto.randomUUID(), name, phone };
  contacts.push(contact);
  if (!saveStoredList(STORAGE_KEYS.contacts, contacts)) {
    contacts.pop();
    return;
  }
  renderContacts();
  elements.contactForm.reset();
  elements.contactForm.classList.add("hidden");
  showToast(`${name} added to your contacts.`);
});

elements.noteForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = elements.noteInput.value.trim();
  if (!text) return;
  if (saveNote(text)) elements.noteInput.value = "";
});

elements.taskForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = elements.taskInput.value.trim();
  if (!text) return;
  if (saveTask(text)) elements.taskInput.value = "";
});

elements.notificationsButton.addEventListener("click", async () => {
  if (!("Notification" in window)) return;
  try {
    const permission = await Notification.requestPermission();
    updateNotificationsButton();
    showToast(permission === "granted"
      ? "Reminder alerts are enabled on this device."
      : "Notifications weren't enabled. You can change this in your browser settings.");
  } catch (error) {
    console.error("Could not request notification permission.", error);
    showToast("Tony couldn't enable notifications. Check your browser settings.");
  }
});

updateClock();
window.setInterval(updateClock, 30_000);
renderContacts();
renderNotes();
renderReminders();
renderTasks();
setupVoiceInput();
updateNotificationsButton();
setupInstallAndOffline();
checkReminders();
window.setInterval(checkReminders, 15_000);
