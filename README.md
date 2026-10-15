# Tony

Tony is a private-by-default personal assistant that runs in your browser. It uses plain HTML, CSS, and JavaScript; there is no build step, account, API key, or application server. Its installable app shell can be cached for offline use.

## Run it

For basic use, open `index.html` in a modern browser. To install Tony on a phone or enable offline support, serve this folder from a secure HTTPS site (or localhost); service workers and app installation are not available from a `file://` URL.

- **Android:** Open the secure site in Chrome, tap **Install app** (or choose **Install app / Add to Home screen** from the browser menu).
- **iPhone/iPad:** Open the secure site in Safari, tap **Share**, then **Add to Home Screen**.
- **Voice input:** Chrome or Edge is recommended. Allow microphone access if prompted.

## What it can do

- **Calls:** Add a contact with their phone number and country code, then say or type `call Alex`. Tony asks you to confirm by pressing a call button; your device handles the call.
- **WhatsApp:** Use `WhatsApp Alex I'm on my way` or `message Alex I'll call later`. Tony prepares a message and opens WhatsApp for you to review and send.
- **Reminders:** Try `remind me to stretch in 20 minutes` or `remind me to call Alex in 2 hours`. Keep the page open for the reminder alert; browser notifications are shown if you have already allowed them.
- **Notes:** Use `take a note buy coffee`, or add notes in Quick notes.
- **Tasks:** Use `add task pick up groceries`, `list tasks`, or `complete task pick up groceries`. Tasks can also be checked off or deleted in My tasks.
- **Time and date:** Ask `what time is it?` or `what is today's date?`.
- **Voice input:** Press the microphone, speak, review the recognized command, then press Send.
- **Notifications:** Tap **Enable alerts** and allow browser notifications to receive reminder alerts while Tony is open.
- **Offline app shell:** After first loading Tony from a secure site, its page, styles, scripts, and icon are cached for later offline visits.

Contacts, reminders, notes, and tasks are saved in this browser's local storage and are not sent to a Tony server. Clearing browser data removes them; data is not automatically shared between devices. Keep Tony open for reminder timers to run—mobile browsers may pause timers when the app is closed or suspended. Voice input is provided by your browser and may be processed online by its speech-recognition service. A phone number must include its international country code for WhatsApp links to work. The browser cannot silently place calls or send WhatsApp messages; you review and confirm those actions in your device's calling app or WhatsApp.
