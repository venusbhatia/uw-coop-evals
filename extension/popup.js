async function getExtensionApiKey() {
  return new Promise((resolve) => {
    if (!chrome.storage?.local) {
      resolve("");
      return;
    }
    chrome.storage.local.get(["extensionApiKey"], (result) => {
      resolve((result.extensionApiKey || "").trim());
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const studentNameInput = document.getElementById("studentName");
  const fetchBtn = document.getElementById("fetchBtn");
  const fillBtn = document.getElementById("fillBtn");
  const statusBox = document.getElementById("statusBox");

  let fetchedData = null;

  fetchBtn.addEventListener("click", async () => {
    const name = studentNameInput.value.trim();
    if (!name) {
      statusBox.className = "status error";
      statusBox.textContent = "Please enter a student name.";
      return;
    }

    const extensionApiKey = await getExtensionApiKey();
    if (!extensionApiKey) {
      statusBox.className = "status error";
      statusBox.textContent =
        "Extension API key not set. In DevTools console run: chrome.storage.local.set({ extensionApiKey: 'YOUR_KEY' })";
      return;
    }

    statusBox.className = "status";
    statusBox.textContent = "Querying database...";
    fetchBtn.disabled = true;

    const hubs = [
      "https://employee-evals.vercel.app",
      "http://localhost:8090",
    ];

    try {
      let response = null;
      for (const base of hubs) {
        try {
          const attempt = await fetch(
            `${base}/api/evaluations/export?name=${encodeURIComponent(name)}`,
            {
              headers: { "X-Extension-Key": extensionApiKey },
            },
          );
          if (attempt.ok) {
            response = attempt;
            break;
          }
          if (attempt.status !== 404) response = attempt;
        } catch {
          /* try next hub */
        }
      }
      if (!response) {
        throw new Error("Could not reach Employee Evals (production or localhost).");
      }
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("No completed evaluations found for this student.");
        } else {
          throw new Error(`Server returned error status: ${response.status}`);
        }
      }

      fetchedData = await response.json();
      statusBox.className = "status success";
      statusBox.textContent = `Found finalized evaluation. Ready to auto-fill.`;
      fillBtn.disabled = false;
    } catch (err) {
      statusBox.className = "status error";
      statusBox.textContent = err.message || "Failed to fetch evaluation.";
      fetchedData = null;
      fillBtn.disabled = true;
    } finally {
      fetchBtn.disabled = false;
    }
  });

  fillBtn.addEventListener("click", () => {
    if (!fetchedData) return;

    statusBox.className = "status";
    statusBox.textContent = "Auto-filling form...";
    fillBtn.disabled = true;

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length === 0) {
        statusBox.className = "status error";
        statusBox.textContent = "No active tab found.";
        fillBtn.disabled = false;
        return;
      }

      const evalPayload = fetchedData.evaluation ?? fetchedData;
      chrome.tabs.sendMessage(tabs[0].id, {
        action: "fillForm",
        data: evalPayload
      }, (response) => {
        fillBtn.disabled = false;
        
        if (chrome.runtime.lastError) {
          statusBox.className = "status error";
          statusBox.textContent = "Error: Cannot fill form. Make sure WaterlooWorks is open.";
          console.error(chrome.runtime.lastError);
          return;
        }

        if (response && response.success) {
          statusBox.className = "status success";
          statusBox.textContent = "Evaluation form filled! Double-check and submit.";
        } else {
          statusBox.className = "status error";
          statusBox.textContent = response?.error || "Failed to locate form fields.";
        }
      });
    });
  });
});
