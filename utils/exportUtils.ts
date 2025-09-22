import * as XLSX from 'xlsx';
import { Exam, Submission } from '../types';

/**
 * Export exam submissions with results to an Excel file.
 * Each answer breakdown is flattened into separate columns.
 */
export function exportExamResultsToExcel(exam: Exam, submissions: Submission[]) {
  if (!exam) return;
  const rows: any[] = [];

  submissions.forEach(sub => {
    const baseRow: any = {
      SubmissionID: sub.id,
      Student: sub.studentName,
      ScannedName: sub.result?.detectedStudentName ?? '',
      ScannedRollNumber: sub.result?.detectedRollNumber ?? '',
      SubmittedAt: new Date(sub.submittedAt).toLocaleString(),
      TotalMarks: exam.totalMarks,
      AwardedScore: sub.result?.totalScore ?? '',
      Percentage: sub.result ? ((sub.result.totalScore / exam.totalMarks) * 100).toFixed(2) + '%' : '',
      OverallFeedback: sub.result?.overallFeedback || ''
    };

    // Add per-question columns (Score_Q1, Feedback_Q1, ...)
    exam.questions.forEach((q, idx) => {
      const ans = sub.result?.answers[idx];
      baseRow[`Q${idx + 1}_Question`] = q.question;
      baseRow[`Q${idx + 1}_Marks`] = q.marks;
      baseRow[`Q${idx + 1}_Score`] = ans?.score ?? '';
      baseRow[`Q${idx + 1}_Feedback`] = ans?.feedback ?? '';
    });

    rows.push(baseRow);
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Results');
  const fileName = `${sanitizeFilename(exam.topic)}_results.xlsx`;
  XLSX.writeFile(workbook, fileName);
}

function sanitizeFilename(name: string) {
  return name.replace(/[^a-z0-9\-_]+/gi, '_');
}
