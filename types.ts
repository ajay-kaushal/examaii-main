
export interface Question {
  question: string;
  marks: number;
}

export interface Exam {
  id: string;
  topic: string;
  totalMarks: number;
  questions: Question[];
  createdAt: string;
}

export interface GradedResult {
  totalScore: number;
  overallFeedback: string;
  answers: Array<{
    question: string;
    score: number;
    feedback: string;
  }>;
  /**
   * (Experimental) Name the AI model visually detected on the answer sheet image.
   * Empty string or undefined if not clearly legible / not present.
   */
  detectedStudentName?: string;
  /**
   * (Experimental) Roll / registration number the AI model visually detected on the sheet.
   * Empty string or undefined if not found.
   */
  detectedRollNumber?: string;
}

export interface Submission {
  id: string;
  examId: string;
  studentName: string;
  // Deprecated: legacy submissions may still have this base64 field
  answerSheetImage?: string;
  // New lightweight metadata (result-only mode)
  fileName?: string;
  fileSize?: number; // bytes
  fileMime?: string;
  fileHash?: string; // SHA-256 hex of original file for integrity
  submittedAt: string;
  result?: GradedResult;
}
