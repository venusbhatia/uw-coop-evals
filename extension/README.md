# Evals.com browser autofill extension

Chrome extension that fills employer-hosted student performance evaluation forms using finalized data from Evals.com.

1. Run the app at `http://localhost:3000` (`npm run dev`).
2. Load this folder as an unpacked extension in Chrome.
3. Set your extension API key in DevTools console:

   `chrome.storage.local.set({ extensionApiKey: 'YOUR_KEY' })`

4. Open your employer's evaluation form in the browser.
5. Finalize an evaluation in Evals.com (VP approval), then fetch by student name in the extension popup and auto-fill.

Production hub: `https://employee-evals.vercel.app`
