export const FUTURE_READY_COMPETENCIES = [
  "Discipline and context specific skills",
  "Information and data literacy",
  "Technological agility",
  "Self-management",
  "Self-assessment",
  "Lifelong learning and career development",
  "Communication",
  "Collaboration",
  "Intercultural effectiveness",
  "Innovation mindset",
  "Critical thinking",
  "Implementation",
];

export const SDG_LIST = [
  "No Poverty",
  "Zero Hunger",
  "Good Health and Well-Being",
  "Quality Education",
  "Gender Equality",
  "Clean Water and Sanitation",
  "Affordable and Clean Energy",
  "Decent Work and Economic Growth",
  "Industry, Innovation and Infrastructure",
  "Reduced Inequalities",
  "Sustainable Cities and Communities",
  "Responsible Consumption and Production",
  "Climate Action",
  "Life Below Water",
  "Life on Land",
  "Peace, Justice and Strong Institutions",
  "Partnerships for the Goals",
];

export const SIMPLE_EVALUATION_QUESTION_COUNT = 5;

export function buildSimpleEvaluationPrompt(
  studentName: string,
  evaluatorName: string,
  evalType: string,
  userAnswerCount: number,
): string {
  const nextQuestion = userAnswerCount + 1;
  const mustSubmit = userAnswerCount >= SIMPLE_EVALUATION_QUESTION_COUNT;

  return `You help supervisors complete a co-op ${evalType} performance evaluation through exactly ${SIMPLE_EVALUATION_QUESTION_COUNT} simple questions.

Student: ${studentName}
Supervisor: ${evaluatorName}

The supervisor has answered ${userAnswerCount} question(s) so far.
${mustSubmit ? `They just answered question ${SIMPLE_EVALUATION_QUESTION_COUNT}. You MUST call submit_evaluation now with a complete draft. Do NOT ask another question.` : `Ask question ${nextQuestion} of ${SIMPLE_EVALUATION_QUESTION_COUNT} only.`}

Question themes (one per turn, adapt wording using prior answers):
1. Skills, learning, and applying knowledge on the job
2. Quality of work, deadlines, and problem-solving
3. Initiative, adaptability, and responding to feedback
4. Communication, collaboration, and professionalism
5. Top strengths, areas to develop, overall performance, and any SDGs their work supported

Rules:
- Output ONLY the question text in your message (1-3 short sentences). No numbering prefix like "Question 1:".
- Plain language. No competency codes or HR jargon.
- One question per turn until all ${SIMPLE_EVALUATION_QUESTION_COUNT} answers exist.
- Infer all 20 competency ratings (0-4), exactly 3 strength and 3 development selections from: ${FUTURE_READY_COMPETENCIES.join("; ")}
- Pick overallRating from: outstanding, excellent, very_good, good, satisfactory, marginal, unsatisfactory
- Default futureEmployment: returnTerm "not_applicable", offeredReemployment "to_be_determined", response "is_undecided", datesFrom "", datesTo ""
- Default reviewedWithStudent false, studentComments "" unless mentioned
- Never mention tools, JSON, or internal structure.`;
}

export const SUBMIT_EVALUATION_TOOL = {
  type: "function" as const,
  function: {
    name: "submit_evaluation",
    description:
      "Submit the compiled performance evaluation once the interview is complete.",
    parameters: {
      type: "object",
      properties: {
        ratings: {
          type: "object",
          properties: {
            learnJobDuties: { type: "integer", minimum: 0, maximum: 4 },
            locateInfo: { type: "integer", minimum: 0, maximum: 4 },
            drawConclusions: { type: "integer", minimum: 0, maximum: 4 },
            employTechSkills: { type: "integer", minimum: 0, maximum: 4 },
            applyPriorKnowledge: { type: "integer", minimum: 0, maximum: 4 },
            deliverQualityWork: { type: "integer", minimum: 0, maximum: 4 },
            meetDeadlines: { type: "integer", minimum: 0, maximum: 4 },
            analyzeProblems: { type: "integer", minimum: 0, maximum: 4 },
            engageWithCuriosity: { type: "integer", minimum: 0, maximum: 4 },
            identifyImprovements: { type: "integer", minimum: 0, maximum: 4 },
            adaptToChange: { type: "integer", minimum: 0, maximum: 4 },
            recognizeLimits: { type: "integer", minimum: 0, maximum: 4 },
            respondToFeedback: { type: "integer", minimum: 0, maximum: 4 },
            seekTasks: { type: "integer", minimum: 0, maximum: 4 },
            seekOpportunitiesToLearn: { type: "integer", minimum: 0, maximum: 4 },
            writeClearly: { type: "integer", minimum: 0, maximum: 4 },
            orallyConveyIdeas: { type: "integer", minimum: 0, maximum: 4 },
            collaborateWell: { type: "integer", minimum: 0, maximum: 4 },
            ethicalConduct: { type: "integer", minimum: 0, maximum: 4 },
            showSensitivity: { type: "integer", minimum: 0, maximum: 4 },
          },
          required: [
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
            "respondToFeedback",
            "seekTasks",
            "seekOpportunitiesToLearn",
            "writeClearly",
            "orallyConveyIdeas",
            "collaborateWell",
            "ethicalConduct",
            "showSensitivity",
          ],
        },
        strengths: {
          type: "object",
          properties: {
            selections: { type: "array", items: { type: "string" } },
            comments: { type: "string" },
          },
          required: ["selections", "comments"],
        },
        developments: {
          type: "object",
          properties: {
            selections: { type: "array", items: { type: "string" } },
            comments: { type: "string" },
          },
          required: ["selections", "comments"],
        },
        sdgs: { type: "array", items: { type: "integer", minimum: 1, maximum: 17 } },
        overallRating: {
          type: "string",
          enum: [
            "outstanding",
            "excellent",
            "very_good",
            "good",
            "satisfactory",
            "marginal",
            "unsatisfactory",
          ],
        },
        overallComments: { type: "string" },
        outstandingComments: { type: "string" },
        recommendations: { type: "string" },
        reviewedWithStudent: { type: "boolean" },
        studentComments: { type: "string" },
        futureEmployment: {
          type: "object",
          properties: {
            returnTerm: {
              type: "string",
              enum: ["yes", "no", "not_applicable"],
            },
            offeredReemployment: {
              type: "string",
              enum: ["yes", "no", "to_be_determined"],
            },
            response: {
              type: "string",
              enum: ["accepted", "declined", "is_undecided"],
            },
            datesFrom: { type: "string" },
            datesTo: { type: "string" },
          },
          required: [
            "returnTerm",
            "offeredReemployment",
            "response",
            "datesFrom",
            "datesTo",
          ],
        },
      },
      required: [
        "ratings",
        "strengths",
        "developments",
        "sdgs",
        "overallRating",
        "overallComments",
        "outstandingComments",
        "recommendations",
        "reviewedWithStudent",
        "studentComments",
        "futureEmployment",
      ],
    },
  },
};

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export const RATING_OPTIONS = [
  { value: 0, label: "Not observed", short: "N/O" },
  { value: 1, label: "Poor", short: "1" },
  { value: 2, label: "Developing", short: "2" },
  { value: 3, label: "Good", short: "3" },
  { value: 4, label: "Strong", short: "4" },
] as const;

export const OVERALL_RATING_OPTIONS = [
  { value: "outstanding", label: "Outstanding" },
  { value: "excellent", label: "Excellent" },
  { value: "very_good", label: "Very good" },
  { value: "good", label: "Good" },
  { value: "satisfactory", label: "Satisfactory" },
  { value: "marginal", label: "Marginal" },
  { value: "unsatisfactory", label: "Unsatisfactory" },
] as const;

export const COMPETENCY_LABELS: Record<string, { label: string; cat: string }> = {
  learnJobDuties: { label: "Learn job duties and work processes", cat: "Expand & transfer expertise" },
  locateInfo: { label: "Locate and use information effectively", cat: "Expand & transfer expertise" },
  drawConclusions: { label: "Draw reasoned conclusions from multiple sources", cat: "Expand & transfer expertise" },
  employTechSkills: { label: "Learn and employ technical skills for the role", cat: "Expand & transfer expertise" },
  applyPriorKnowledge: { label: "Apply prior knowledge from school or past work", cat: "Expand & transfer expertise" },
  deliverQualityWork: { label: "Deliver quality work", cat: "Design & deliver solutions" },
  meetDeadlines: { label: "Meet deadlines and workplace pressures", cat: "Design & deliver solutions" },
  analyzeProblems: { label: "Analyze problems and evaluate solutions", cat: "Design & deliver solutions" },
  engageWithCuriosity: { label: "Engage with curiosity; ask clarifying questions", cat: "Design & deliver solutions" },
  identifyImprovements: { label: "Identify opportunities for improvement", cat: "Design & deliver solutions" },
  adaptToChange: { label: "Adapt to changing priorities", cat: "Develop self" },
  recognizeLimits: { label: "Recognize limits of knowledge and skills", cat: "Develop self" },
  respondToFeedback: { label: "Respond to feedback and direction", cat: "Develop self" },
  seekTasks: { label: "Seek new tasks and responsibilities", cat: "Develop self" },
  seekOpportunitiesToLearn: { label: "Seek opportunities to learn", cat: "Develop self" },
  writeClearly: { label: "Write clearly and effectively", cat: "Build relationships" },
  orallyConveyIdeas: { label: "Orally convey ideas clearly", cat: "Build relationships" },
  collaborateWell: { label: "Collaborate well with coworkers and leaders", cat: "Build relationships" },
  ethicalConduct: { label: "Demonstrate ethical conduct", cat: "Build relationships" },
  showSensitivity: { label: "Show sensitivity to others' needs and differences", cat: "Build relationships" },
};

export const WIZARD_DOMAINS = [
  {
    id: "expertise",
    title: "Expand & transfer expertise",
    subtitle: "How does this student learn, apply skills, and share knowledge?",
    keys: ["learnJobDuties", "locateInfo", "drawConclusions", "employTechSkills", "applyPriorKnowledge"],
  },
  {
    id: "solutions",
    title: "Design & deliver solutions",
    subtitle: "Quality of work, deadlines, problem-solving, and initiative.",
    keys: ["deliverQualityWork", "meetDeadlines", "analyzeProblems", "engageWithCuriosity", "identifyImprovements"],
  },
  {
    id: "self",
    title: "Develop self",
    subtitle: "Adaptability, feedback, and drive to learn.",
    keys: ["adaptToChange", "recognizeLimits", "respondToFeedback", "seekTasks", "seekOpportunitiesToLearn"],
  },
  {
    id: "relationships",
    title: "Build relationships",
    subtitle: "Communication, collaboration, ethics, and inclusion.",
    keys: ["writeClearly", "orallyConveyIdeas", "collaborateWell", "ethicalConduct", "showSensitivity"],
  },
] as const;

export const ALL_RATING_KEYS = WIZARD_DOMAINS.flatMap((d) => d.keys);

export function emptyRatings(): Record<string, number | null> {
  return Object.fromEntries(ALL_RATING_KEYS.map((k) => [k, null]));
}

export type DraftPayload = {
  ratings: Record<string, number>;
  strengths: { selections: string[]; comments: string };
  developments: { selections: string[]; comments: string };
  sdgs: number[];
  overallRating: string;
  overallComments: string;
  outstandingComments: string;
  recommendations: string;
  reviewedWithStudent: boolean;
  studentComments: string;
  futureEmployment: {
    returnTerm: string;
    offeredReemployment: string;
    response: string;
    datesFrom: string;
    datesTo: string;
  };
};
