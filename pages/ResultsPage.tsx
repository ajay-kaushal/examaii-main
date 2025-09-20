
import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useStore } from '../hooks/useStore';
import { Card, Button, Input } from '../components/ui';
import { gradeSubmission } from '../services/geminiService';
import { toBase64 } from '../utils/fileUtils';
import { useAuth } from '../hooks/useAuth';
import { exportExamResultsToExcel } from '../utils/exportUtils';
import type { GradedResult } from '../types';

const ResultsPage: React.FC = () => {
    const { submissionId, examId } = useParams<{ submissionId?: string; examId?: string }>();
    const { getSubmissionById, getSubmissionsByExamId, getExamById, updateSubmission } = useStore();
    const { profile } = useAuth();
    const [isEvaluating, setIsEvaluating] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [editedScores, setEditedScores] = useState<{ [key: number]: number }>({});
    const [editedFeedbacks, setEditedFeedbacks] = useState<{ [key: number]: string }>({});
    const [editedOverallFeedback, setEditedOverallFeedback] = useState('');
    const [saveSuccess, setSaveSuccess] = useState(false);

    if (examId) {
        const submissions = getSubmissionsByExamId(examId);
        const exam = getExamById(examId);

        if (!exam) return <div className="text-center p-4">Exam not found.</div>;
        if (submissions.length === 0) return <div className="text-center p-4">No submissions for this exam yet.</div>;
        
        const handleExport = () => {
            exportExamResultsToExcel(exam, submissions.filter(s => s.result));
        };

        return (
            <div className="space-y-6">
                 <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <h1 className="text-2xl font-bold text-gray-800">Submissions for: <span className="text-primary-600">{exam.topic}</span></h1>
                    <div className="flex items-center gap-3">
                        <Button variant="secondary" onClick={handleExport} disabled={submissions.filter(s => s.result).length === 0}>
                            Export Evaluated to Excel
                        </Button>
                        <Link to="/">
                            <Button variant="secondary">Back</Button>
                        </Link>
                    </div>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {submissions.map(sub => (
                        <Link to={`/results/${sub.id}`} key={sub.id}>
                            <Card className="p-4 hover:shadow-xl hover:border-primary-500 border transition">
                                <p className="font-bold">{sub.studentName}</p>
                                <p className="text-sm text-gray-500">Submitted: {new Date(sub.submittedAt).toLocaleString()}</p>
                                {sub.result ? (
                                     <p className="mt-2 text-lg font-bold text-primary-700">Score: {sub.result.totalScore} / {exam.totalMarks}</p>
                                ) : (
                                    <p className="mt-2 text-yellow-600">Result pending...</p>
                                )}
                            </Card>
                        </Link>
                    ))}
                 </div>
            </div>
        )
    }

    const submission = submissionId ? getSubmissionById(submissionId) : undefined;
    const exam = submission ? getExamById(submission.examId) : undefined;

    const handleAutoEvaluate = async (file?: File) => {
        if (!submission || !exam) return;
        setIsEvaluating(true);
        try {
            if (!profile?.geminiApiKey) throw new Error('Add your Gemini API key (profile menu) before running AI evaluation.');
            let base64 = submission.answerSheetImage;
            let mime = 'application/pdf';
            if (file) {
                let temp = await toBase64(file);
                if (temp.startsWith('data:')) temp = temp.split(',')[1];
                base64 = temp;
                mime = file.type || mime;
            }
            if (!base64) throw new Error('Original answer sheet not stored. Re-upload the PDF to evaluate.');
            const result = await gradeSubmission(
                profile.geminiApiKey,
                exam.questions,
                exam.totalMarks,
                base64,
                mime
            );
            const updatedSubmission = { ...submission, result };
            await updateSubmission(updatedSubmission);
        } catch (error: any) {
            console.error('Auto evaluation failed:', error);
            alert(error.message || 'Auto evaluation failed. Please try manual evaluation.');
        } finally {
            setIsEvaluating(false);
        }
    };

    const initializeEditMode = () => {
        if (submission?.result) {
            const scores: { [key: number]: number } = {};
            const feedbacks: { [key: number]: string } = {};
            
            submission.result.answers.forEach((answer, index) => {
                scores[index] = answer.score;
                feedbacks[index] = answer.feedback;
            });
            
            setEditedScores(scores);
            setEditedFeedbacks(feedbacks);
            setEditedOverallFeedback(submission.result.overallFeedback);
        }
        setEditMode(true);
    };

    const handleManualSave = async () => {
        if (!submission || !exam) return;
        
        const answers = exam.questions.map((question, index) => ({
            question: question.question,
            score: editedScores[index] || 0,
            feedback: editedFeedbacks[index] || ''
        }));
        
        // Ensure we explicitly treat the values as numbers
        const totalScore: number = Object.values(editedScores)
            .map(v => typeof v === 'number' && !isNaN(v) ? v : 0)
            .reduce((sum, v) => sum + v, 0);
        
        const result: GradedResult = {
            totalScore,
            overallFeedback: editedOverallFeedback,
            answers
        };
        
    const updatedSubmission = { ...submission, result };
    await updateSubmission(updatedSubmission);
    setEditMode(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
    };

    const handleScoreChange = (questionIndex: number, score: number) => {
        if (!exam) return;
        const maxMarks = exam.questions[questionIndex]?.marks ?? 0;
        let safeScore = Number(score);
        if (isNaN(safeScore) || safeScore < 0) safeScore = 0;
        if (safeScore > maxMarks) safeScore = maxMarks;
        setEditedScores(prev => ({ ...prev, [questionIndex]: safeScore }));
    };

    const handleFeedbackChange = (questionIndex: number, feedback: string) => {
        setEditedFeedbacks(prev => ({ ...prev, [questionIndex]: feedback }));
    };

    if (!submission || !exam) {
        return <div className="text-center p-4">Submission or exam not found.</div>;
    }
    
    const { result } = submission;
    const hasResult = !!result;
    const scorePercentage = hasResult ? (result.totalScore / exam.totalMarks) * 100 : 0;
    const scoreColorClass = scorePercentage >= 80 ? 'text-green-600' : scorePercentage >= 50 ? 'text-yellow-600' : 'text-red-600';

    return (
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
                <Card>
                     <div className="p-6">
                        <h1 className="text-2xl font-bold">Results for {submission.studentName}</h1>
                        <p className="text-gray-600">Exam: {exam.topic}</p>
                    </div>
                </Card>
                <Card>
                    <div className="p-6">
                        <h2 className="text-xl font-bold mb-4">Evaluation Controls</h2>
                        <div className="space-y-4">
                            {!hasResult ? (
                                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                    <p className="text-yellow-800 font-medium mb-3">This submission needs evaluation</p>
                                    <div className="space-x-3">
                                        <AutoEvalReupload onEvaluate={handleAutoEvaluate} loading={isEvaluating} canEvaluate={!!profile?.geminiApiKey} hasStored={!!submission.answerSheetImage} />
                                        <Button 
                                            variant="secondary" 
                                            onClick={initializeEditMode}
                                        >
                                            Manual Evaluation
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-x-3">
                                    <AutoEvalReupload onEvaluate={handleAutoEvaluate} loading={isEvaluating} canEvaluate={!!profile?.geminiApiKey} hasStored={!!submission.answerSheetImage} reeval />
                                    <Button 
                                        onClick={initializeEditMode}
                                        disabled={editMode}
                                    >
                                        Edit Manually
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                </Card>

                {saveSuccess && (
                    <Card>
                        <div className="p-4 text-green-700 text-sm font-medium bg-green-50 border border-green-200 rounded">
                            Manual evaluation saved successfully.
                        </div>
                    </Card>
                )}

                {hasResult && (
                    <Card>
                        <div className="p-6">
                            <h2 className="text-xl font-bold mb-4">Overall Performance</h2>
                            <div className="text-center mb-4">
                                <p className="text-sm text-gray-500">Total Score</p>
                                <p className={`text-6xl font-bold ${scoreColorClass}`}>{result.totalScore}<span className="text-3xl text-gray-500">/{exam.totalMarks}</span></p>
                            </div>
                            {editMode ? (
                                <div className="space-y-4">
                                    <label className="block text-sm font-medium text-gray-700">Overall Feedback</label>
                                    <textarea
                                        value={editedOverallFeedback}
                                        onChange={(e) => setEditedOverallFeedback(e.target.value)}
                                        className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                        rows={3}
                                    />
                                    <div className="flex space-x-3">
                                        <Button onClick={handleManualSave}>Save Changes</Button>
                                        <Button variant="secondary" onClick={() => setEditMode(false)}>Cancel</Button>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-gray-700 bg-gray-50 p-4 rounded-md">{result.overallFeedback}</p>
                            )}
                        </div>
                    </Card>
                )}

                {hasResult && (
                    <Card>
                        <div className="p-6">
                            <h2 className="text-xl font-bold mb-4">Detailed Breakdown</h2>
                            <ul className="space-y-6">
                                {result.answers.map((ans, index) => (
                                    <li key={index} className="border-b pb-4 last:border-b-0">
                                        <p className="font-semibold">{ans.question}</p>
                                        {editMode ? (
                                            <div className="mt-3 space-y-3">
                                                <div className="flex items-center space-x-3">
                                                    <label className="text-sm font-medium text-gray-700 w-16">Score:</label>
                                                    <Input
                                                        type="number"
                                                        value={editedScores[index] || 0}
                                                        onChange={(e) => handleScoreChange(index, Number(e.target.value))}
                                                        min="0"
                                                        max={exam.questions[index]?.marks || 10}
                                                        className="w-20"
                                                    />
                                                    <span className="text-sm text-gray-500">/ {exam.questions[index]?.marks || 10}</span>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Feedback:</label>
                                                    <textarea
                                                        value={editedFeedbacks[index] || ''}
                                                        onChange={(e) => handleFeedbackChange(index, e.target.value)}
                                                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                                        rows={2}
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <p className="mt-2 text-sm text-gray-500">
                                                    <span className="font-bold text-primary-600">Score: {ans.score}</span>
                                                </p>
                                                <p className="mt-2 text-sm text-gray-700 bg-blue-50 p-2 rounded-md">
                                                    <span className="font-semibold">Feedback:</span> {ans.feedback}
                                                </p>
                                            </>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </Card>
                )}
            </div>

            <div className="lg:col-span-1">
                <Card>
                    <div className="p-4">
                        <h2 className="text-lg font-bold mb-2">Submitted Answer Sheet</h2>
                        <img 
                            src={`data:image/png;base64,${submission.answerSheetImage}`} 
                            alt={`${submission.studentName}'s answer sheet`} 
                            className="w-full h-auto rounded-md border"
                        />
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default ResultsPage;

// Small helper component to allow re-uploading file when original not stored
const AutoEvalReupload: React.FC<{
    onEvaluate: (file?: File) => void;
    loading: boolean;
    canEvaluate: boolean;
    hasStored: boolean;
    reeval?: boolean;
}> = ({ onEvaluate, loading, canEvaluate, hasStored, reeval }) => {
    const [tempFile, setTempFile] = React.useState<File | null>(null);
    const disabled = loading || !canEvaluate;
    return (
        <div className="flex flex-col gap-3">
            {!hasStored && (
                <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                    Original answer sheet not stored for this submission. Re-upload the PDF to {reeval ? 're-evaluate' : 'evaluate'}.
                </div>
            )}
            {!hasStored && (
                <input
                    type="file"
                    accept="application/pdf,image/*"
                    onChange={e => setTempFile(e.target.files?.[0] || null)}
                    className="text-xs"
                />
            )}
            <Button
                onClick={() => onEvaluate(hasStored ? undefined : tempFile || undefined)}
                isLoading={loading}
                disabled={disabled || (!hasStored && !tempFile)}
                variant={reeval ? 'secondary' : 'primary'}
            >
                {loading ? (reeval ? 'Re-evaluating...' : 'Auto Evaluating...') : reeval ? 'Re-evaluate with AI' : 'Auto Evaluate with AI'}
            </Button>
            {!canEvaluate && <p className="text-xs text-red-600">Add Gemini API key to enable AI evaluation.</p>}
        </div>
    );
};
