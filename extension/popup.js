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

    statusBox.className = "status";
    statusBox.textContent = "Querying local database...";
    fetchBtn.disabled = true;

    try {
      const response = await fetch(`http://localhost:8090/api/evaluations/export?name=${encodeURIComponent(name)}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("No completed evaluations found for this student.");
        } else {
          throw new Error(`Server returned error status: ${response.status}`);
        }
      }

      fetchedData = await response.json();
      statusBox.className = "status success";
      statusBox.textContent = `Found completed draft! Ready to auto-fill.`;
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

      chrome.tabs.sendMessage(tabs[0].id, {
        action: "fillForm",
        data: fetchedData
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
