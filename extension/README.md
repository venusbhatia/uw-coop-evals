# WaterlooWorks autofill extension

## Install (local development)

1. Run the app at `http://localhost:8090` (`npm run dev`).
2. Set `EXTENSION_API_KEY` in `.env.local` (same value as the server).
3. Open `chrome://extensions`, enable **Developer mode**, **Load unpacked**, select this `extension/` folder.
4. Open the extension popup → DevTools on the popup → run:
   ```js
   chrome.storage.local.set({ extensionApiKey: "YOUR_EXTENSION_API_KEY" })
   ```
5. Finalize an evaluation in the app (VP approval), then fetch by student name on WaterlooWorks.

The extension unwraps `evaluation` from the API response before filling the form.

**Do not point production traffic at Vercel until deployment is explicitly approved.**
