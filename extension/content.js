chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "fillForm") {
    try {
      const result = fillEvaluationForm(request.data);
      sendResponse(result);
    } catch (err) {
      console.error("[Evals.com Autofill Error]:", err);
      sendResponse({ success: false, error: err.message });
    }
  }
  return true;
});

function fillEvaluationForm(evalData) {
  console.log("[Evals.com Autofill] Starting form fill with data:", evalData);

  // Helper: Find a text input or textarea by label text match
  const findTextareaByLabel = (keywords) => {
    const textareas = Array.from(document.querySelectorAll("textarea"));
    for (const ta of textareas) {
      const label = ta.labels?.[0]?.textContent || "";
      const placeholder = ta.placeholder || "";
      const name = ta.name || "";
      const id = ta.id || "";
      
      const fullText = (label + " " + placeholder + " " + name + " " + id).toLowerCase();
      if (keywords.some(k => fullText.includes(k))) {
        return ta;
      }
    }
    // Fallback search in parents
    for (const ta of textareas) {
      let parent = ta.parentElement;
      while (parent && parent !== document.body) {
        const parentText = parent.textContent || "";
        if (keywords.some(k => parentText.toLowerCase().includes(k))) {
          return ta;
        }
        parent = parent.parentElement;
      }
    }
    return null;
  };

  // 1. Fill Textareas
  const fields = {
    strengths: { keywords: ["strength", "strong point"], value: evalData.strengths?.comments },
    developments: { keywords: ["development", "improve", "weakness"], value: evalData.developments?.comments },
    overallComments: { keywords: ["overall", "summary", "general comment"], value: evalData.overallComments },
    outstandingComments: { keywords: ["outstanding comment", "outstanding detail"], value: evalData.outstandingComments },
    recommendations: { keywords: ["recommendation", "suggestion", "future goal"], value: evalData.recommendations },
    studentComments: { keywords: ["student comment", "student input"], value: evalData.studentComments }
  };

  let filledCount = 0;
  for (const [key, field] of Object.entries(fields)) {
    if (field.value) {
      const ta = findTextareaByLabel(field.keywords);
      if (ta) {
        ta.value = field.value;
        // Trigger input event for React/Angular page listeners on the host form
        ta.dispatchEvent(new Event("input", { bubbles: true }));
        ta.dispatchEvent(new Event("change", { bubbles: true }));
        console.log(`[Evals.com Autofill] Filled textarea: ${key}`);
        filledCount++;
      } else {
        console.warn(`[Evals.com Autofill] Could not find textarea for: ${key}`);
      }
    }
  }

  // 2. Fill the 20 Competency Ratings
  // Competencies are typically grouped in table rows or list items.
  // We'll search for rows containing competency label sub-strings and tick the correct radio button.
  const competencyKeywords = {
    learnJobDuties: ["learn job duties", "work processes", "duties"],
    locateInfo: ["locate", "evaluate", "use information"],
    drawConclusions: ["conclusions", "multiple sources", "reasoned conclusions"],
    employTechSkills: ["technical skills", "skills necessary", "employ tech"],
    applyPriorKnowledge: ["prior knowledge", "academic program", "past work"],
    deliverQualityWork: ["quality work", "deliver quality"],
    meetDeadlines: ["meet deadlines", "pressures", "workplace pressures"],
    analyzeProblems: ["analyze problems", "alternative solutions"],
    engageWithCuriosity: ["curiosity", "clarifying questions"],
    identifyImprovements: ["opportunities for improvement", "identify improvements"],
    adaptToChange: ["changing priorities", "adapt to change"],
    recognizeLimits: ["limits of knowledge", "recognize limits"],
    respondToFeedback: ["direction", "feedback", "incorporate feedback"],
    seekTasks: ["new tasks", "responsibilities", "seek tasks"],
    seekOpportunitiesToLearn: ["opportunities to learn"],
    writeClearly: ["write clearly", "effectively"],
    orallyConveyIdeas: ["orally", "convey ideas"],
    collaborateWell: ["collaborate", "co-workers", "supervisor"],
    ethicalConduct: ["ethical conduct", "ethics"],
    showSensitivity: ["sensitivity", "differences", "diversity"]
  };

  const rows = Array.from(document.querySelectorAll("tr, div.row, div.form-group"));
  let ratingsFilled = 0;

  for (const [key, ratingVal] of Object.entries(evalData.ratings || {})) {
    const kws = competencyKeywords[key];
    if (!kws) continue;

    // Find the row representing this competency
    const matchingRow = rows.find(row => {
      const rowText = (row.textContent || "").toLowerCase();
      // Must match at least 2 keywords to be specific enough
      const matches = kws.filter(kw => rowText.includes(kw));
      return matches.length >= 1;
    });

    if (matchingRow) {
      // Find radio buttons within this row
      const radios = Array.from(matchingRow.querySelectorAll("input[type='radio']"));
      if (radios.length >= 5) {
        // Values: Not Observed (0), Poor (1), Developing (2), Good (3), Strong (4)
        // Usually, radio buttons are ordered left to right: Not Observed, 1, 2, 3, 4
        // Let's check their values or use index mapping
        let targetRadio = null;
        
        // Try exact value matching first
        const strVal = String(ratingVal);
        targetRadio = radios.find(r => r.value === strVal || r.value === `rating-${strVal}`);

        if (!targetRadio) {
          // fallback to index mapping: 0 -> index 0, 1 -> index 1, etc.
          // map: 0 = Not Observed, 1 = Poor, 2 = Developing, 3 = Good, 4 = Strong
          targetRadio = radios[ratingVal];
        }

        if (targetRadio) {
          targetRadio.checked = true;
          targetRadio.dispatchEvent(new Event("change", { bubbles: true }));
          ratingsFilled++;
        }
      }
    }
  }
  console.log(`[Evals.com Autofill] Filled ${ratingsFilled}/20 competency ratings.`);

  // 3. Fill Top 3 Strengths & Development Checkboxes
  // The host form may list the 12 competencies of the Future Ready Talent Framework.
  const allCheckboxes = Array.from(document.querySelectorAll("input[type='checkbox']"));
  
  const tickCheckboxesByName = (selections) => {
    if (!selections) return;
    selections.forEach(sel => {
      // Find checkbox where parent text contains selection name
      const cb = allCheckboxes.find(checkbox => {
        let parent = checkbox.parentElement;
        while (parent && parent !== document.body) {
          if ((parent.textContent || "").includes(sel)) {
            return true;
          }
          parent = parent.parentElement;
        }
        return false;
      });

      if (cb) {
        cb.checked = true;
        cb.dispatchEvent(new Event("change", { bubbles: true }));
      }
    });
  };

  tickCheckboxesByName(evalData.strengths?.selections);
  tickCheckboxesByName(evalData.developments?.selections);

  // 4. Fill SDGs Checkboxes
  if (evalData.sdgs) {
    evalData.sdgs.forEach(sdgNum => {
      const cb = allCheckboxes.find(checkbox => {
        let parent = checkbox.parentElement;
        const text = parent ? (parent.textContent || "") : "";
        // Match numbers, e.g. "Goal 4" or "4." or "Quality Education"
        return text.includes(`Goal ${sdgNum}`) || text.includes(`${sdgNum}.`) || text.includes(` ${sdgNum} `);
      });

      if (cb) {
        cb.checked = true;
        cb.dispatchEvent(new Event("change", { bubbles: true }));
      }
    });
  }

  // 5. Fill Overall Performance Rating
  if (evalData.overallRating) {
    const overallRadios = Array.from(document.querySelectorAll("input[type='radio']"));
    const ratingLabels = {
      outstanding: ["outstanding", "outstanding performance"],
      excellent: ["excellent", "excellent performance"],
      very_good: ["very good", "very-good"],
      good: ["good", "good rating"],
      satisfactory: ["satisfactory"],
      marginal: ["marginal"],
      unsatisfactory: ["unsatisfactory"]
    };

    const kws = ratingLabels[evalData.overallRating];
    if (kws) {
      const targetRadio = overallRadios.find(radio => {
        let parent = radio.parentElement;
        while (parent && parent !== document.body) {
          const parentText = (parent.textContent || "").toLowerCase();
          if (kws.some(kw => parentText.includes(kw))) return true;
          parent = parent.parentElement;
        }
        return false;
      });

      if (targetRadio) {
        targetRadio.checked = true;
        targetRadio.dispatchEvent(new Event("change", { bubbles: true }));
        console.log(`[Evals.com Autofill] Set overall performance rating to: ${evalData.overallRating}`);
      }
    }
  }

  // 6. Fill Reviewed With Student Checked State
  if (evalData.reviewedWithStudent !== undefined) {
    const radios = Array.from(document.querySelectorAll("input[type='radio']"));
    const targetKeywords = evalData.reviewedWithStudent 
      ? ["reviewed with student - yes", "discussed - yes", "yes, reviewed"] 
      : ["reviewed with student - no", "discussed - no", "no, not reviewed"];
      
    const target = radios.find(r => {
      let parent = r.parentElement;
      const text = parent ? (parent.textContent || "").toLowerCase() : "";
      return targetKeywords.some(kw => text.includes(kw));
    });
    if (target) {
      target.checked = true;
      target.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }

  return {
    success: true,
    filledTextareasCount: filledCount,
    ratingsFilledCount: ratingsFilled
  };
}
