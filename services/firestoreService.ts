import { collection, setDoc, doc, getDoc, getDocs, query, where, updateDoc, onSnapshot, writeBatch } from 'firebase/firestore';
import { getDb } from './firebase';
import type { Exam, Submission } from '../types';

// Collection references
const examsCol = () => collection(getDb(), 'exams');
const submissionsCol = () => collection(getDb(), 'submissions');

// Exams
export async function createExam(exam: Exam): Promise<string> {
  await setDoc(doc(getDb(), 'exams', exam.id), exam);
  return exam.id;
}

export async function fetchExam(id: string): Promise<Exam | undefined> {
  const snap = await getDoc(doc(getDb(), 'exams', id));
  if (!snap.exists()) return undefined;
  return snap.data() as Exam;
}

export async function fetchAllExams(): Promise<Exam[]> {
  const snap = await getDocs(examsCol());
  return snap.docs.map(d => d.data() as Exam);
}

// Submissions
export async function createSubmission(sub: Submission): Promise<string> {
  await setDoc(doc(getDb(), 'submissions', sub.id), sub);
  return sub.id;
}

export async function updateSubmissionResult(id: string, result: Submission['result']): Promise<void> {
  const ref = doc(getDb(), 'submissions', id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  await updateDoc(ref, { result });
}

export async function fetchSubmission(id: string): Promise<Submission | undefined> {
  const snap = await getDoc(doc(getDb(), 'submissions', id));
  if (!snap.exists()) return undefined;
  return snap.data() as Submission;
}

export async function fetchSubmissionsForExam(examId: string): Promise<Submission[]> {
  // Query still required for filtering by examId
  const q = query(submissionsCol(), where('examId', '==', examId));
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data() as Submission);
}

// Realtime listeners (no caching beyond Firestore's internal in-memory sync)
export function listenToExams(cb: (exams: Exam[]) => void) {
  return onSnapshot(examsCol(), snapshot => {
    const exams = snapshot.docs.map(d => d.data() as Exam).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    cb(exams);
  });
}

export function listenToSubmissions(cb: (subs: Submission[]) => void) {
  return onSnapshot(submissionsCol(), snapshot => {
    const subs = snapshot.docs.map(d => d.data() as Submission);
    cb(subs);
  });
}

// Destructive operations (admin only client-side guard; rules should also restrict in production)
export async function deleteAllSubmissions(): Promise<number> {
  const snap = await getDocs(submissionsCol());
  const batch = writeBatch(getDb());
  snap.docs.forEach(d => batch.delete(d.ref));
  if (snap.docs.length > 0) await batch.commit();
  return snap.docs.length;
}

export async function deleteAllExams(): Promise<number> {
  const snap = await getDocs(examsCol());
  const batch = writeBatch(getDb());
  snap.docs.forEach(d => batch.delete(d.ref));
  if (snap.docs.length > 0) await batch.commit();
  return snap.docs.length;
}

export async function deleteAllUsers(): Promise<number> {
  const usersRef = collection(getDb(), 'users');
  const snap = await getDocs(usersRef);
  const batch = writeBatch(getDb());
  snap.docs.forEach(d => batch.delete(d.ref));
  if (snap.docs.length > 0) await batch.commit();
  return snap.docs.length;
}

export async function deleteExam(examId: string): Promise<void> {
  const ref = doc(getDb(), 'exams', examId);
  await (await import('firebase/firestore')).deleteDoc(ref);
}

export async function deleteSubmissionsForExam(examId: string): Promise<number> {
  const q = query(submissionsCol(), where('examId','==', examId));
  const snap = await getDocs(q);
  const batch = writeBatch(getDb());
  snap.docs.forEach(d => batch.delete(d.ref));
  if (snap.docs.length) await batch.commit();
  return snap.docs.length;
}

export async function deleteExamWithSubmissions(examId: string): Promise<{ submissionsDeleted: number }> {
  const submissionsDeleted = await deleteSubmissionsForExam(examId);
  await deleteExam(examId);
  return { submissionsDeleted };
}
