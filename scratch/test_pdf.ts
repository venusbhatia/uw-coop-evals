import { generateEvaluationPdf } from "../src/lib/pdfGenerator";
import fs from "fs";
import path from "path";

const mockStudent = {
  name: "Jane Doe",
  studentId: "20987654",
  jobTitle: "Software Engineer Intern",
  term: "Spring",
  year: "2026"
};

const mockEvaluation = {
  ratings: {
    learnJobDuties: 4,
    locateInfo: 3,
    drawConclusions: 4,
    employTechSkills: 4,
    applyPriorKnowledge: 3,
    deliverQualityWork: 4,
    meetDeadlines: 3,
    analyzeProblems: 4,
    engageWithCuriosity: 4,
    identifyImprovements: 3,
    adaptToChange: 4,
    recognizeLimits: 3,
    respondToFeedback: 4,
    seekTasks: 4,
    seekOpportunitiesToLearn: 3,
    writeClearly: 4,
    orallyConveyIdeas: 4,
    collaborateWell: 4,
    ethicalConduct: 4,
    showSensitivity: 4
  },
  strengths: {
    selections: ["Collaboration", "Technological agility", "Self-management"],
    comments: "Jane showed outstanding collaboration, technological agility, and excellent self-management."
  },
  developments: {
    selections: ["Critical thinking", "Implementation"],
    comments: "Critical thinking and implementation are developing nicely; she could continue taking on independent design decisions."
  },
  sdgs: [4, 8, 9],
  overallRating: "excellent",
  overallComments: "Overall a fantastic term! Very reliable team member.",
  outstandingComments: "",
  recommendations: "Continue taking initiative on design docs.",
  reviewedWithStudent: true,
  studentComments: "I enjoyed the coop and learned a lot.",
  futureEmployment: {
    returnTerm: "yes",
    offeredReemployment: "to_be_determined",
    response: "is_undecided",
    datesFrom: "2026-09-01",
    datesTo: "2026-12-31"
  },
  signOffs: ["Lead Engineer", "Product Manager"]
};

async function test() {
  console.log("Generating test PDF...");
  try {
    const pdfBytes = await generateEvaluationPdf({
      student: mockStudent,
      evaluation: mockEvaluation
    });
    const outputPath = path.join(__dirname, "test_filled_evaluation.pdf");
    fs.writeFileSync(outputPath, pdfBytes);
    console.log(`Success! PDF saved to: ${outputPath}`);
  } catch (err) {
    console.error("PDF Generation failed:", err);
  }
}

test();
