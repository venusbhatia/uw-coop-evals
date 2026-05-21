import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fs from "fs";
import path from "path";

// Mapping of 20 competencies in the exact order they appear in the PDF
export const COMPETENCY_KEYS = [
  // Page 2
  "learnJobDuties",
  "locateInfo",
  "drawConclusions",
  "employTechSkills",
  "applyPriorKnowledge",
  "deliverQualityWork",
  "meetDeadlines",
  "analyzeProblems",
  "engageWithCuriosity",
  "identifyImprovements",
  "adaptToChange",
  "recognizeLimits",
  // Page 3
  "respondToFeedback",
  "seekTasks",
  "seekOpportunitiesToLearn",
  "writeClearly",
  "orallyConveyIdeas",
  "collaborateWell",
  "ethicalConduct",
  "showSensitivity"
];

// Helper to draw a checkmark or X
const drawCheck = (page: any, x: number, y: number) => {
  page.drawText("X", {
    x: x - 4,
    y: y - 4,
    size: 10,
    color: rgb(0, 0, 0),
  });
};

// Helper to draw a filled dot for radio selections
const drawDot = (page: any, x: number, y: number) => {
  page.drawCircle({
    x,
    y,
    radius: 5,
    color: rgb(0.1, 0.1, 0.1),
  });
};

export async function generateEvaluationPdf(data: any) {
  // 1. Read template PDF from public folder
  const templatePath = path.join(process.cwd(), "public", "context form.pdf");
  const templateBytes = fs.readFileSync(templatePath);
  const pdfDoc = await PDFDocument.load(templateBytes);
  const pages = pdfDoc.getPages();

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const { student, evaluation } = data;

  // --- PAGE 1 OVERLAYS ---
  const p1 = pages[0];
  // Term checkboxes (Winter, Spring, Fall)
  if (student.term === "Winter") drawCheck(p1, 77, 626);
  else if (student.term === "Spring") drawCheck(p1, 283, 626);
  else if (student.term === "Fall") drawCheck(p1, 490, 626);

  // Year
  p1.drawText(student.year || "26", { x: 740, y: 624, size: 10, font });

  // Student Details
  p1.drawText(student.name || "", { x: 130, y: 593, size: 10, font });
  p1.drawText("Student Performance Evaluation", { x: 520, y: 593, size: 10, font });
  p1.drawText(student.studentId || "", { x: 110, y: 562, size: 10, font });
  p1.drawText(student.jobTitle || "", { x: 495, y: 562, size: 10, font });


  // --- PAGE 2 OVERLAYS (Competency Ratings 1 to 12) ---
  const p2 = pages[1];
  
  // X coordinates for the 5 radio options: Not Observed, 1 (Poor), 2 (Developing), 3 (Good), 4 (Strong)
  // These are aligned to the circles on Page 2
  const p2ColX = [370, 442, 532, 638, 798]; 
  
  // Y coordinates for the rows on Page 2
  const p2RowY = [
    708, // learnJobDuties
    654, // locateInfo
    608, // drawConclusions
    556, // employTechSkills
    506, // applyPriorKnowledge
    
    395, // deliverQualityWork
    341, // meetDeadlines
    294, // analyzeProblems
    242, // engageWithCuriosity
    192, // identifyImprovements
    
    81,  // adaptToChange
    32   // recognizeLimits
  ];

  for (let i = 0; i < 12; i++) {
    const key = COMPETENCY_KEYS[i];
    const val = evaluation.ratings[key] ?? 0; // default 0 = Not Observed
    let colIdx = 0; // Not Observed
    if (val === 1) colIdx = 1;
    else if (val === 2) colIdx = 2;
    else if (val === 3) colIdx = 3;
    else if (val === 4) colIdx = 4;
    
    drawDot(p2, p2ColX[colIdx], p2RowY[i]);
  }


  // --- PAGE 3 OVERLAYS (Competency Ratings 13 to 20, Strengths) ---
  const p3 = pages[2];

  // Ratings Y coordinates for Page 3
  const p3RowY = [
    762, // respondToFeedback
    714, // seekTasks
    668  // seekOpportunitiesToLearn
  ];
  
  // Render develop self remaining 3
  for (let i = 12; i < 15; i++) {
    const key = COMPETENCY_KEYS[i];
    const val = evaluation.ratings[key] ?? 0;
    let colIdx = 0;
    if (val === 1) colIdx = 1;
    else if (val === 2) colIdx = 2;
    else if (val === 3) colIdx = 3;
    else if (val === 4) colIdx = 4;
    
    drawDot(p3, p2ColX[colIdx], p3RowY[i - 12]);
  }

  // Build Relationships rows Y coordinates
  const p3RelY = [
    542, // writeClearly
    494, // orallyConveyIdeas
    448, // collaborateWell
    400, // ethicalConduct
    348  // showSensitivity
  ];

  for (let i = 15; i < 20; i++) {
    const key = COMPETENCY_KEYS[i];
    const val = evaluation.ratings[key] ?? 0;
    let colIdx = 0;
    if (val === 1) colIdx = 1;
    else if (val === 2) colIdx = 2;
    else if (val === 3) colIdx = 3;
    else if (val === 4) colIdx = 4;
    
    drawDot(p3, p2ColX[colIdx], p3RelY[i - 15]);
  }

  // Top 3 Strengths checkboxes Y coordinates on Page 3
  const strengthCompMap: { [key: string]: number } = {
    "Discipline and context specific skills": 242,
    "Information and data literacy": 230,
    "Technological agility": 218,
    "Self-management": 206,
    "Self-assessment": 194,
    "Lifelong learning and career development": 182,
    "Communication": 170,
    "Collaboration": 158,
    "Intercultural effectiveness": 146,
    "Innovation mindset": 134,
    "Critical thinking": 122,
    "Implementation": 110,
    "Other": 98
  };

  const selectedStrengths = evaluation.strengths.selections || [];
  selectedStrengths.forEach((strName: string) => {
    const y = strengthCompMap[strName];
    if (y) drawDot(p3, 442, y); // Aligned to checkbox column
  });

  // Strengths comments
  if (evaluation.strengths.comments) {
    p3.drawText(evaluation.strengths.comments, {
      x: 70,
      y: 50,
      size: 9,
      font,
      maxWidth: 500,
      lineHeight: 12,
    });
  }


  // --- PAGE 4 OVERLAYS (Developments & UN SDGs) ---
  const p4 = pages[3];

  // Top 3 Developments checkboxes Y coordinates (reused mapping values)
  const devCompMap: { [key: string]: number } = {
    "Discipline and context specific skills": 732,
    "Information and data literacy": 720,
    "Technological agility": 708,
    "Self-management": 696,
    "Self-assessment": 684,
    "Lifelong learning and career development": 672,
    "Communication": 660,
    "Collaboration": 648,
    "Intercultural effectiveness": 636,
    "Innovation mindset": 624,
    "Critical thinking": 612,
    "Implementation": 600,
    "Other": 588
  };

  const selectedDevelopments = evaluation.developments.selections || [];
  selectedDevelopments.forEach((devName: string) => {
    const y = devCompMap[devName];
    if (y) drawDot(p4, 442, y);
  });

  // Developments comments
  if (evaluation.developments.comments) {
    p4.drawText(evaluation.developments.comments, {
      x: 70,
      y: 540,
      size: 9,
      font,
      maxWidth: 500,
      lineHeight: 12,
    });
  }

  // UN SDGs Y coordinates
  const sdgYMap = [
    430, // 1. No Poverty
    416, // 2. Zero Hunger
    402, // 3. Good Health
    388, // 4. Quality Education
    374, // 5. Gender Equality
    360, // 6. Clean Water
    346, // 7. Affordable Energy
    332, // 8. Decent Work
    318, // 9. Industry/Innovation
    304, // 10. Reduced Inequalities
    290, // 11. Sustainable Cities
    276, // 12. Responsible Consumption
    262, // 13. Climate Action
    248, // 14. Life Below Water
    234, // 15. Life on Land
    220, // 16. Peace and Justice
    206  // 17. Partnerships
  ];

  const selectedSdgs = evaluation.sdgs || [];
  selectedSdgs.forEach((sdgIdx: number) => {
    const y = sdgYMap[sdgIdx - 1];
    if (y) drawDot(p4, 442, y);
  });


  // --- PAGE 5 OVERLAYS (Overall Rating & Comments) ---
  const p5 = pages[4];

  // Overall performance rating positions (Y values)
  const ratingYMap: { [key: string]: number } = {
    "outstanding": 708,
    "excellent": 568,
    "very_good": 444,
    "good": 332,
    "satisfactory": 232,
    "marginal": 138,
    "unsatisfactory": 44
  };

  const ovrRating = evaluation.overallRating || "";
  const rY = ratingYMap[ovrRating];
  if (rY) drawDot(p5, 898, rY); // Checkbox circle is on the far right

  // Outstanding comments
  if (evaluation.outstandingComments && ovrRating === "outstanding") {
    p5.drawText(evaluation.outstandingComments, {
      x: 80,
      y: 600,
      size: 9,
      font,
      maxWidth: 480,
      lineHeight: 12,
    });
  }

  // Supervisor comments
  if (evaluation.overallComments) {
    p5.drawText(evaluation.overallComments, {
      x: 80,
      y: 40,
      size: 9,
      font,
      maxWidth: 500,
      lineHeight: 12,
    });
  }


  // --- PAGE 6 OVERLAYS (Recommendations, Future Employment, Sign-offs) ---
  const p6 = pages[5];

  // Recommendations comments
  if (evaluation.recommendations) {
    p6.drawText(evaluation.recommendations, {
      x: 80,
      y: 640,
      size: 9,
      font,
      maxWidth: 500,
      lineHeight: 12,
    });
  }

  // Reviewed with student checkbox
  if (evaluation.reviewedWithStudent) {
    drawCheck(p6, 77, 526); // Yes
  } else {
    drawCheck(p6, 154, 526); // No
  }

  // Student Comments
  if (evaluation.studentComments) {
    p6.drawText(evaluation.studentComments, {
      x: 80,
      y: 400,
      size: 9,
      font,
      maxWidth: 500,
      lineHeight: 12,
    });
  }

  // Future Employment potential
  const fe = evaluation.futureEmployment || {};
  if (fe.returnTerm === "yes") drawCheck(p6, 77, 302);
  else if (fe.returnTerm === "no") drawCheck(p6, 142, 302);
  else if (fe.returnTerm === "not_applicable") drawCheck(p6, 287, 302);

  if (fe.offeredReemployment === "yes") drawCheck(p6, 77, 268);
  else if (fe.offeredReemployment === "no") drawCheck(p6, 142, 268);
  else if (fe.offeredReemployment === "to_be_determined") drawCheck(p6, 276, 268);

  if (fe.response === "accepted") drawCheck(p6, 107, 234);
  else if (fe.response === "declined") drawCheck(p6, 222, 234);
  else if (fe.response === "is_undecided") drawCheck(p6, 321, 234);

  if (fe.datesFrom) {
    p6.drawText(fe.datesFrom, { x: 190, y: 200, size: 9, font });
  }
  if (fe.datesTo) {
    p6.drawText(fe.datesTo, { x: 300, y: 200, size: 9, font });
  }

  // Print Sign-off Details
  const signOffNames = evaluation.signOffs || [];
  if (signOffNames.length > 0) {
    const supervisorStr = signOffNames.join(", ");
    p6.drawText(supervisorStr, { x: 80, y: 112, size: 10, font: boldFont });
    p6.drawText("[ELECTRONICALLY SIGNED]", { x: 390, y: 112, size: 9, font: boldFont });
    p6.drawText(new Date().toLocaleDateString(), { x: 760, y: 112, size: 10, font });
  }

  // 3. Save and return PDF bytes
  return await pdfDoc.save();
}
