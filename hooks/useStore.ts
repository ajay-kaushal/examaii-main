
import { useState, useEffect, useCallback } from 'react';
import type { Exam, Submission } from '../types';
import { createExam, createSubmission, listenToExams, listenToSubmissions, updateSubmissionResult } from '../services/firestoreService';

export interface AppState {
  exams: Exam[];
  submissions: Submission[];
}

export interface AppActions {
  addExam: (exam: Exam) => void;
  addSubmission: (submission: Submission) => void;
  updateSubmission: (submission: Submission) => void;
  getExamById: (id: string) => Exam | undefined;
  getSubmissionsByExamId: (examId: string) => Submission[];
  getSubmissionById: (id: string) => Submission | undefined;
}

export const useStore = (): AppState & AppActions => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);

  // Attach realtime listeners (no manual caching beyond local state reflecting Firestore)
  useEffect(() => {
    const unsubExams = listenToExams(setExams);
    const unsubSubs = listenToSubmissions(setSubmissions);
    return () => {
      unsubExams();
      unsubSubs();
    };
  }, []);

  const addExam = useCallback(async (exam: Exam) => {
    await createExam(exam);
  }, []);

  const addSubmission = useCallback(async (submission: Submission) => {
    await createSubmission(submission);
  }, []);

  const updateSubmission = useCallback(async (updatedSubmission: Submission) => {
    await updateSubmissionResult(updatedSubmission.id, updatedSubmission.result);
  }, []);

  const getExamById = useCallback((id: string) => {
    return exams.find((exam) => exam.id === id);
  }, [exams]);

  const getSubmissionsByExamId = useCallback((examId: string) => {
    return submissions.filter((sub) => sub.examId === examId).sort((a,b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  }, [submissions]);

  const getSubmissionById = useCallback((id: string) => {
    return submissions.find((sub) => sub.id === id);
  }, [submissions]);

  return {
    exams: exams.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    submissions,
    addExam,
    addSubmission,
    updateSubmission,
    getExamById,
    getSubmissionsByExamId,
    getSubmissionById
  };
};
