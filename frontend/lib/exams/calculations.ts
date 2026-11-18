export type GradeBand = {
  /** Inclusive lower percentage bound for this grade. */
  minimumPercentage: number;
  grade: string;
};

/**
 * Central default grade scale. Applications may pass a school-approved scale
 * to the result helpers instead of duplicating or hardcoding grade decisions.
 */
export const DEFAULT_GRADE_SCALE: readonly GradeBand[] = [
  { minimumPercentage: 90, grade: "A+" },
  { minimumPercentage: 80, grade: "A" },
  { minimumPercentage: 70, grade: "B" },
  { minimumPercentage: 60, grade: "C" },
  { minimumPercentage: 50, grade: "D" },
  { minimumPercentage: 40, grade: "E" },
  { minimumPercentage: 0, grade: "F" },
];

export type SubjectMarkInput = {
  subjectId: number;
  subjectName: string;
  maximumMarks: number;
  passingMarks: number;
  marksObtained: number | null;
  isAbsent: boolean;
  allowNegativeMarks?: boolean;
};

export type SubjectResult = {
  subjectId: number;
  subjectName: string;
  maximumMarks: number;
  passingMarks: number;
  marksObtained: number | null;
  status: "marked" | "absent" | "missing";
  percentage: number | null;
  grade: string | null;
  passed: boolean | null;
};

export type ExamResult = {
  subjects: SubjectResult[];
  isComplete: boolean;
  totalObtained: number | null;
  totalMaximum: number | null;
  percentage: number | null;
  grade: string | null;
  result: "pass" | "fail" | "incomplete";
};

function roundPercentage(value: number) {
  return Number(value.toFixed(2));
}

function validateGradeScale(scale: readonly GradeBand[]) {
  if (scale.length === 0 || !scale.some((band) => band.minimumPercentage === 0)) {
    throw new Error("The grade scale must include a grade starting at 0%.");
  }
  if (scale.some((band) => !Number.isFinite(band.minimumPercentage) || band.minimumPercentage < 0 || band.minimumPercentage > 100 || !band.grade.trim())) {
    throw new Error("Grade bands must have a grade label and a threshold between 0 and 100.");
  }
  const thresholds = scale.map((band) => band.minimumPercentage);
  if (new Set(thresholds).size !== thresholds.length) {
    throw new Error("Grade band thresholds must be unique.");
  }
}

export function gradeForPercentage(percentage: number, scale: readonly GradeBand[] = DEFAULT_GRADE_SCALE) {
  validateGradeScale(scale);
  if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100) {
    throw new Error("Percentage must be between 0 and 100.");
  }
  return [...scale]
    .sort((a, b) => b.minimumPercentage - a.minimumPercentage)
    .find((band) => percentage >= band.minimumPercentage)!.grade;
}

export function calculateSubjectResult(
  input: SubjectMarkInput,
  scale: readonly GradeBand[] = DEFAULT_GRADE_SCALE,
): SubjectResult {
  if (!Number.isFinite(input.maximumMarks) || input.maximumMarks <= 0) {
    throw new Error(`Maximum marks for ${input.subjectName} must be greater than zero.`);
  }
  if (!Number.isFinite(input.passingMarks) || input.passingMarks < 0 || input.passingMarks > input.maximumMarks) {
    throw new Error(`Passing marks for ${input.subjectName} must be between zero and maximum marks.`);
  }
  if (input.isAbsent && input.marksObtained !== null) {
    throw new Error(`Absent students must not have numeric marks recorded for ${input.subjectName}.`);
  }
  if (input.marksObtained === null) {
    return {
      subjectId: input.subjectId,
      subjectName: input.subjectName,
      maximumMarks: input.maximumMarks,
      passingMarks: input.passingMarks,
      marksObtained: null,
      status: input.isAbsent ? "absent" : "missing",
      percentage: null,
      grade: null,
      passed: null,
    };
  }
  if (!Number.isFinite(input.marksObtained)) {
    throw new Error(`Marks for ${input.subjectName} must be a finite number.`);
  }
  if (!input.allowNegativeMarks && input.marksObtained < 0) {
    throw new Error(`Negative marks are not allowed for ${input.subjectName}.`);
  }
  if (input.marksObtained > input.maximumMarks) {
    throw new Error(`Marks for ${input.subjectName} cannot exceed maximum marks.`);
  }

  const percentage = roundPercentage((input.marksObtained / input.maximumMarks) * 100);
  return {
    subjectId: input.subjectId,
    subjectName: input.subjectName,
    maximumMarks: input.maximumMarks,
    passingMarks: input.passingMarks,
    marksObtained: input.marksObtained,
    status: "marked",
    percentage,
    // Negative-mark configurations are allowed only by explicit subject setting.
    // They remain below the floor of the configured grade scale (grade F).
    grade: gradeForPercentage(Math.max(0, percentage), scale),
    passed: input.marksObtained >= input.passingMarks,
  };
}

export function calculateExamResult(
  inputs: SubjectMarkInput[],
  scale: readonly GradeBand[] = DEFAULT_GRADE_SCALE,
): ExamResult {
  if (inputs.length === 0) throw new Error("An examination result needs at least one configured subject.");
  const subjects = inputs.map((input) => calculateSubjectResult(input, scale));
  const isComplete = subjects.every((subject) => subject.status === "marked");
  if (!isComplete) {
    return {
      subjects,
      isComplete: false,
      totalObtained: null,
      totalMaximum: null,
      percentage: null,
      grade: null,
      result: "incomplete",
    };
  }

  const totalObtained = subjects.reduce((total, subject) => total + (subject.marksObtained ?? 0), 0);
  const totalMaximum = subjects.reduce((total, subject) => total + subject.maximumMarks, 0);
  const percentage = roundPercentage((totalObtained / totalMaximum) * 100);
  const passed = subjects.every((subject) => subject.passed);
  return {
    subjects,
    isComplete: true,
    totalObtained,
    totalMaximum,
    percentage,
    grade: gradeForPercentage(percentage, scale),
    result: passed ? "pass" : "fail",
  };
}
