import {
  COMPETENCY_LABELS,
  FUTURE_READY_COMPETENCIES,
  OVERALL_RATING_OPTIONS,
  SDG_LIST,
  WIZARD_DOMAINS,
  ALL_RATING_KEYS,
} from "@/lib/evaluationConfig";

/** Official form labels aligned with context form.pdf (pages 2–3). */
export const FORM_COMPETENCY_ROWS: Record<
  string,
  { section: string; page: 2 | 3; label: string }
> = {
  learnJobDuties: {
    section: "expandAndTransferExpertise",
    page: 2,
    label: "learn job duties and work processes",
  },
  locateInfo: {
    section: "expandAndTransferExpertise",
    page: 2,
    label: "locate, evaluate, and use information effectively",
  },
  drawConclusions: {
    section: "expandAndTransferExpertise",
    page: 2,
    label: "draw reasoned conclusions from multiple sources of information",
  },
  employTechSkills: {
    section: "expandAndTransferExpertise",
    page: 2,
    label: "learn and employ technical skills necessary for the role",
  },
  applyPriorKnowledge: {
    section: "expandAndTransferExpertise",
    page: 2,
    label:
      "apply skills and prior knowledge from academic program and/or previous work experience",
  },
  deliverQualityWork: {
    section: "designAndDeliverSolutions",
    page: 2,
    label: "deliver quality work",
  },
  meetDeadlines: {
    section: "designAndDeliverSolutions",
    page: 2,
    label: "meet deadlines and cope with workplace pressures",
  },
  analyzeProblems: {
    section: "designAndDeliverSolutions",
    page: 2,
    label: "analyze problems and evaluate alternative solutions",
  },
  engageWithCuriosity: {
    section: "designAndDeliverSolutions",
    page: 2,
    label:
      "engage in work with curiosity; ask questions to understand more than the work assigned",
  },
  identifyImprovements: {
    section: "designAndDeliverSolutions",
    page: 2,
    label: "identify opportunities for improvement within the team and/or organization",
  },
  adaptToChange: {
    section: "developSelf",
    page: 2,
    label: "adapt to changing priorities and circumstances",
  },
  recognizeLimits: {
    section: "developSelf",
    page: 2,
    label: "recognize limits of knowledge, skills and abilities",
  },
  respondToFeedback: {
    section: "developSelf",
    page: 3,
    label: "respond well to direction and incorporate feedback on performance",
  },
  seekTasks: {
    section: "developSelf",
    page: 3,
    label: "seek new tasks and responsibilities",
  },
  seekOpportunitiesToLearn: {
    section: "developSelf",
    page: 3,
    label: "seek opportunities to learn",
  },
  writeClearly: {
    section: "buildRelationships",
    page: 3,
    label: "write clearly and effectively",
  },
  orallyConveyIdeas: {
    section: "buildRelationships",
    page: 3,
    label: "orally convey ideas and information clearly and effectively",
  },
  collaborateWell: {
    section: "buildRelationships",
    page: 3,
    label:
      "collaborate well with others; both co-workers and supervisor/senior leaders",
  },
  ethicalConduct: {
    section: "buildRelationships",
    page: 3,
    label: "demonstrate ethical conduct in the workplace",
  },
  showSensitivity: {
    section: "buildRelationships",
    page: 3,
    label:
      "show understanding and sensitivity to the needs and differences of others in the workplace (e.g. ethnicity, religion, language, etc.)",
  },
};

const RATING_LABELS: Record<number, string> = {
  0: "Not observed",
  1: "Poor performance",
  2: "Developing performance",
  3: "Good performance",
  4: "Strong performance",
};

const OVERALL_FORM_LABELS: Record<string, string> = {
  outstanding: "Outstanding Performance",
  excellent: "Excellent Performance",
  very_good: "Very Good Performance",
  good: "Good Performance",
  satisfactory: "Satisfactory Performance",
  marginal: "Marginal Performance",
  unsatisfactory: "Unsatisfactory Performance",
};

type StudentRecord = {
  name: string;
  studentId: string;
  jobTitle: string;
  term: string;
  year: string;
};

type EvaluationRecord = {
  evaluatorName?: string;
  type: string;
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
  signOffs?: string[];
  status?: string;
  createdAt?: number;
};

function competencyExport(key: string, value: number) {
  const meta = FORM_COMPETENCY_ROWS[key];
  return {
    id: key,
    section: meta?.section ?? "unknown",
    page: meta?.page ?? 2,
    label: meta?.label ?? COMPETENCY_LABELS[key]?.label ?? key,
    rating: value,
    ratingCode: value === 0 ? "not_observed" : String(value),
    ratingLabel: RATING_LABELS[value] ?? "Not observed",
    scale: {
      notObserved: 0,
      poor: 1,
      developing: 2,
      good: 3,
      strong: 4,
    },
  };
}

function sectionCompetencies(sectionId: string, ratings: Record<string, number>) {
  const domain = WIZARD_DOMAINS.find((d) => d.id === sectionId);
  if (!domain) return [];
  return domain.keys.map((key) => competencyExport(key, ratings[key] ?? 0));
}

function futureReadySelections(selected: string[]) {
  return FUTURE_READY_COMPETENCIES.map((name) => ({
    name,
    selected: selected.includes(name),
  }));
}

function sdgExport(selected: number[]) {
  return SDG_LIST.map((name, index) => ({
    number: index + 1,
    name,
    selected: selected.includes(index + 1),
  }));
}

export function buildSpeExport(params: {
  student: StudentRecord;
  evaluation: EvaluationRecord;
  sourceType: "reconciled" | "draft";
  organization?: string;
}) {
  const { student, evaluation, sourceType, organization = "" } = params;
  const ratings = evaluation.ratings ?? {};

  const legacyFlat = {
    student,
    evaluation: {
      ...evaluation,
      ratings,
    },
  };

  return {
    exportedAt: new Date().toISOString(),
    formReference: "Standard Student Performance Evaluation (SPE form)",
    evaluationType: evaluation.type,
    source: {
      type: sourceType,
      evaluatorName: evaluation.evaluatorName ?? null,
      status: evaluation.status ?? "completed",
      signOffs: evaluation.signOffs ?? [],
    },
    /** Flat shape used by the Chrome extension autofill. */
    extensionAutofill: legacyFlat,
    pages: {
      page1_cover: {
        title: "Student Performance Evaluation",
        department: "Work-term program",
        term: {
          winter: student.term === "Winter",
          spring: student.term === "Spring",
          fall: student.term === "Fall",
          year: student.year,
        },
        studentName: student.name,
        organization,
        studentIdNumber: student.studentId,
        jobTitle: student.jobTitle,
        guidelines: {
          ratingScale: [
            { code: 4, label: "Strong performance; exceeded expectations in this area" },
            { code: 3, label: "Good performance; met expectations in this area" },
            { code: 2, label: "Developing performance; somewhat below expectations in this area" },
            { code: 1, label: "Poor performance; significantly below expectations in this area" },
            { code: 0, label: "Not observed — insufficient opportunity to observe" },
          ],
        },
      },
      page2_performanceExpectations: {
        expandAndTransferExpertise: {
          title: "Expand and Transfer Expertise",
          competencies: sectionCompetencies("expertise", ratings),
        },
        designAndDeliverSolutions: {
          title: "Design and Deliver Solutions",
          competencies: sectionCompetencies("solutions", ratings),
        },
        developSelf_part1: {
          title: "Develop Self",
          competencies: sectionCompetencies("self", ratings).filter((c) => c.page === 2),
        },
      },
      page3_performanceExpectations: {
        developSelf_part2: {
          title: "Develop Self (continued)",
          competencies: sectionCompetencies("self", ratings).filter((c) => c.page === 3),
        },
        buildRelationships: {
          title: "Build Relationships",
          competencies: sectionCompetencies("relationships", ratings),
        },
        top3AreasOfStrength: {
          title: "Top 3 Areas of Strength",
          instruction:
            "Select top 3 areas of strength demonstrated during this work term (Future Ready Talent Framework).",
          frameworkOptions: futureReadySelections(evaluation.strengths?.selections ?? []),
          selected: evaluation.strengths?.selections ?? [],
          other: "",
          additionalComments: evaluation.strengths?.comments ?? "",
        },
      },
      page4_developmentAndSdgs: {
        top3AreasForDevelopment: {
          title: "Top 3 Areas for Development",
          instruction:
            "Select top 3 areas for development identified during this work term.",
          frameworkOptions: futureReadySelections(
            evaluation.developments?.selections ?? [],
          ),
          selected: evaluation.developments?.selections ?? [],
          other: "",
          additionalComments: evaluation.developments?.comments ?? "",
        },
        unitedNationsSdgs: {
          title: "United Nations' Sustainable Development Goals (SDGs)",
          instruction:
            "Select the main SDGs that you believe the student impacted.",
          goals: sdgExport(evaluation.sdgs ?? []),
          selectedNumbers: evaluation.sdgs ?? [],
        },
      },
      page5_overallPerformance: {
        title: "OVERALL PERFORMANCE RATING",
        rating: evaluation.overallRating,
        ratingLabel:
          OVERALL_FORM_LABELS[evaluation.overallRating] ??
          evaluation.overallRating,
        ratingOptions: OVERALL_RATING_OPTIONS.map((o) => ({
          value: o.value,
          label: o.label,
          selected: o.value === evaluation.overallRating,
        })),
        outstandingJustificationRequired: evaluation.overallRating === "outstanding",
        outstandingJustificationComments: evaluation.outstandingComments ?? "",
        supervisorsOverallJobPerformanceComments: evaluation.overallComments ?? "",
      },
      page6_closing: {
        supervisorsRecommendations: {
          label:
            "Supervisor's Recommendations — personal and/or professional development (Optional)",
          text: evaluation.recommendations ?? "",
        },
        reviewedWithStudent: {
          label: "Did you review the completed evaluation form with the student?",
          required: true,
          yes: evaluation.reviewedWithStudent === true,
          no: evaluation.reviewedWithStudent === false,
        },
        studentsComments: {
          label:
            "Student's Comments — overall performance, learning objectives, future employment expectations",
          text: evaluation.studentComments ?? "",
        },
        futureEmploymentPotential: {
          returnForNextWorkTerm: {
            label: "Do you wish to have the student return for the next work term?",
            value: evaluation.futureEmployment?.returnTerm ?? "not_applicable",
            yes: evaluation.futureEmployment?.returnTerm === "yes",
            no: evaluation.futureEmployment?.returnTerm === "no",
            notApplicable: evaluation.futureEmployment?.returnTerm === "not_applicable",
          },
          offeredReemployment: {
            label: "If yes, have you offered to re-employ the student for the next work term?",
            value: evaluation.futureEmployment?.offeredReemployment ?? "to_be_determined",
            yes: evaluation.futureEmployment?.offeredReemployment === "yes",
            no: evaluation.futureEmployment?.offeredReemployment === "no",
            toBeDetermined:
              evaluation.futureEmployment?.offeredReemployment === "to_be_determined",
          },
          studentResponseToOffer: {
            label: "If yes, how did the student respond to your offer?",
            value: evaluation.futureEmployment?.response ?? "is_undecided",
            accepted: evaluation.futureEmployment?.response === "accepted",
            declined: evaluation.futureEmployment?.response === "declined",
            isUndecided: evaluation.futureEmployment?.response === "is_undecided",
          },
          workTermDatesIfAccepted: {
            label: "If the student has accepted please confirm work term dates",
            from: evaluation.futureEmployment?.datesFrom ?? "",
            to: evaluation.futureEmployment?.datesTo ?? "",
          },
        },
        signatures: {
          supervisor: {
            namePrinted: evaluation.evaluatorName ?? "",
            signature: "",
            title: "",
            date: "",
          },
          student: {
            signature: "",
            date: "",
          },
          managerOrHumanResources: {
            signature: "",
            title: "",
            date: "",
          },
        },
      },
    },
    /** All 20 competencies in PDF order for scripting. */
    allCompetenciesOrdered: ALL_RATING_KEYS.map((key) =>
      competencyExport(key, ratings[key] ?? 0),
    ),
  };
}

export function downloadJsonFile(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
