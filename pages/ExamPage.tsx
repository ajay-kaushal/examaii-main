import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../hooks/useStore';
import { toBase64 } from '../utils/fileUtils';
import { gradeSubmission } from '../services/geminiService';
import { useAuth } from '../hooks/useAuth';
import { Card, Button, Input, FileInput, Spinner } from '../components/ui';
import type { Submission } from '../types';

const gradingMessages = [
    "Receiving your answer sheet...",
    "The AI proctor is now starting the evaluation...",
    "Analyzing your handwriting and answers...",
    "Cross-referencing with question marks...",
    "Calculating your final score...",
    "Generating detailed feedback...",
    "Almost there, just polishing the results!",
];

const ExamPage: React.FC = () => {
    const { examId } = useParams<{ examId: string }>();
    const navigate = useNavigate();
    const { getExamById, addSubmission } = useStore();
    const { profile } = useAuth();
    const exam = examId ? getExamById(examId) : undefined;

    const [studentName, setStudentName] = useState('');
    const [answerSheet, setAnswerSheet] = useState<File | null>(null);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState(gradingMessages[0]);

    React.useEffect(() => {
        if (!isLoading) return;
        let index = 0;
        const interval = setInterval(() => {
            index = (index + 1) % gradingMessages.length;
            setLoadingMessage(gradingMessages[index]);
        }, 3000);
        return () => clearInterval(interval);
    }, [isLoading]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!answerSheet || !studentName.trim() || !exam) {
            setError("Please enter your name and upload your answer sheet.");
            return;
        }

        setIsLoading(true);
        setError('');
        setLoadingMessage(gradingMessages[0]);
        
        try {
            const imageBase64 = await toBase64(answerSheet);
            const mimeType = answerSheet.type;

            if (!profile?.geminiApiKey) throw new Error('Gemini API key missing. Open the profile menu and add your key before submitting.');
            const result = await gradeSubmission(profile.geminiApiKey, exam.questions, exam.totalMarks, imageBase64, mimeType);
            
            const newSubmission: Submission = {
                id: `sub-${Date.now()}`,
                examId: exam.id,
                studentName,
                answerSheetImage: imageBase64,
                submittedAt: new Date().toISOString(),
                result: result,
            };
            
            addSubmission(newSubmission);
            navigate(`/results/${newSubmission.id}`);

        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred.');
            setIsLoading(false);
        }
    };
    
    if (isLoading) {
        return (
            <div className="fixed inset-0 bg-white bg-opacity-90 flex flex-col items-center justify-center z-50 text-center p-4">
                <Spinner className="h-16 w-16 text-primary-600"/>
                <h2 className="text-2xl font-bold mt-8 text-primary-800">Grading in Progress...</h2>
                <p className="text-gray-600 mt-2 text-lg">{loadingMessage}</p>
                <p className="text-sm text-gray-500 mt-4">Please do not close this window. This may take a minute.</p>
            </div>
        )
    }

    if (!exam) {
        return <div className="text-center text-red-500 font-bold">Exam not found.</div>;
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <Card>
                <div className="p-6 bg-primary-700 text-white">
                    <h1 className="text-3xl font-bold">{exam.topic}</h1>
                    <div className="flex justify-between items-baseline mt-2">
                        <p>Answer all questions on a single sheet of paper.</p>
                        <p className="font-bold">Total Marks: {exam.totalMarks}</p>
                    </div>
                </div>
                <div className="p-6">
                    <ul className="space-y-6">
                        {exam.questions.map((q, index) => (
                            <li key={index} className="flex items-start">
                                <span className="font-bold text-primary-600 mr-4">{index + 1}.</span>
                                <div className="flex-grow flex justify-between">
                                    <p>{q.question}</p>
                                    <span className="ml-4 font-semibold text-gray-600 whitespace-nowrap">[{q.marks} Marks]</span>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            </Card>

            <Card className="p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Submit Your Answers</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                        id="studentName"
                        label="Your Full Name"
                        type="text"
                        value={studentName}
                        onChange={(e) => setStudentName(e.target.value)}
                        placeholder="e.g., Jane Doe"
                        required
                    />
                    <FileInput
                        id="answer-sheet"
                        label="Upload Answer Sheet"
                        accept="image/png, image/jpeg, application/pdf"
                        onChange={(file) => setAnswerSheet(file)}
                    />
                    {answerSheet && <p className="text-sm text-green-600">File selected: {answerSheet.name}</p>}
                    
                    <Button type="submit" isLoading={isLoading} disabled={isLoading || !answerSheet || !studentName} className="w-full">
                        {isLoading ? 'Submitting...' : 'Submit for AI Grading'}
                    </Button>
                    {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
                </form>
            </Card>
        </div>
    );
};

export default ExamPage;