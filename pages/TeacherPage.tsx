import React, { useState, FormEvent } from 'react';
import { useStore } from '../hooks/useStore';
import { generateQuestions, extractQuestionsFromPaper, generateQuestionsFromPattern, gradeSubmission } from '../services/geminiService';
import { toBase64 } from '../utils/fileUtils';
import type { Question } from '../types';
import { Card, Button, Input, FileInput, ConfirmModal } from '../components/ui';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const CreateExamForm: React.FC<{ onExamCreated: (id: string) => void }> = ({ onExamCreated }) => {
    const { addExam } = useStore();
    const { profile } = useAuth();
    const [topic, setTopic] = useState('');
    const [numQuestions, setNumQuestions] = useState(5);
    const [totalMarks, setTotalMarks] = useState(20);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const hashFile = async (file: File) => {
        const buf = await file.arrayBuffer();
        const digest = await crypto.subtle.digest('SHA-256', buf);
        return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2,'0')).join('');
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        try {
            if (!profile?.geminiApiKey) throw new Error('Please add your Gemini API key (profile menu) before generating questions.');
            const questions: Question[] = await generateQuestions(profile.geminiApiKey, topic, numQuestions, totalMarks);
            const newExam = {
                id: `exam-${Date.now()}`,
                topic,
                totalMarks,
                questions,
                createdAt: new Date().toISOString(),
            };
            addExam(newExam);
            onExamCreated(newExam.id);
            setTopic('');

        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card className="p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Generate Exam with AI</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                    id="topic"
                    label="Exam Topic"
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g., Photosynthesis in Plants"
                    required
                />
                <div className="grid grid-cols-2 gap-4">
                    <Input
                        id="numQuestions"
                        label="Number of Questions"
                        type="number"
                        value={numQuestions}
                        onChange={(e) => setNumQuestions(Number(e.target.value))}
                        required
                        min="1"
                        max="20"
                    />
                    <Input
                        id="totalMarks"
                        label="Total Marks"
                        type="number"
                        value={totalMarks}
                        onChange={(e) => setTotalMarks(Number(e.target.value))}
                        required
                        min="1"
                    />
                </div>
                {!profile?.geminiApiKey && (
                    <p className="text-xs text-red-600 bg-red-50 p-2 rounded-md">Add your Gemini API key in profile to enable AI generation.</p>
                )}
                <Button type="submit" isLoading={isLoading} disabled={isLoading || !profile?.geminiApiKey} className="w-full">
                    {isLoading ? 'Generating Exam...' : 'Generate Exam with AI'}
                </Button>
                {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
            </form>
        </Card>
    );
};

const UploadExamForm: React.FC<{ onExamCreated: (id: string) => void }> = ({ onExamCreated }) => {
    const { addExam } = useStore();
    const { profile } = useAuth();
    const [topic, setTopic] = useState('');
    const [totalMarks, setTotalMarks] = useState(20);
    const [examFile, setExamFile] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [uploadAction, setUploadAction] = useState<'reproduce' | 'regenerate'>('reproduce');

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!examFile) {
            setError("Please upload a question paper file.");
            return;
        }
        setIsLoading(true);
        setError('');
        try {
            const fileBase64 = await toBase64(examFile);
            let questions: Question[];
            let finalTotalMarks: number;

          if (!profile?.geminiApiKey) throw new Error('Please add your Gemini API key (profile menu) before using AI file features.');
          if (uploadAction === 'reproduce') {
              questions = await extractQuestionsFromPaper(profile.geminiApiKey, fileBase64, examFile.type, topic);
                 if (!questions || questions.length === 0) {
                    throw new Error("AI failed to extract questions and marks accurately. Please ensure the uploaded paper is clear and contains explicit marks for each question.");
                 }
                 finalTotalMarks = questions.reduce((sum, q) => sum + q.marks, 0);
          } else {
              questions = await generateQuestionsFromPattern(profile.geminiApiKey, fileBase64, examFile.type, topic, totalMarks);
                 if (!questions || questions.length === 0) {
                    throw new Error("The AI could not generate any questions from the uploaded file's pattern.");
                 }
                 finalTotalMarks = totalMarks;
            }

            const newExam = {
                id: `exam-${Date.now()}`,
                topic,
                totalMarks: finalTotalMarks,
                questions,
                createdAt: new Date().toISOString(),
            };
            addExam(newExam);
            onExamCreated(newExam.id);
            setTopic('');
            setExamFile(null);

        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const ActionButton: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
        <button
            type="button"
            onClick={onClick}
            className={`px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 w-full text-center border-2 ${
                active 
                ? 'bg-primary-600 text-white border-primary-600 shadow-md' 
                : 'bg-white text-gray-700 hover:bg-gray-100 border-gray-300'
            }`}
            aria-pressed={active}
        >
            {children}
        </button>
    );

    const buttonText = uploadAction === 'reproduce' ? 'Create Exam from File' : 'Generate New Paper';
    const loadingText = uploadAction === 'reproduce' ? 'Extracting Questions...' : 'Generating New Paper...';
    
    return (
        <Card className="p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Create Exam from File</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
                <FileInput
                    id="exam-file"
                    label="Upload Question Paper (Image or PDF)"
                    accept="image/png, image/jpeg, application/pdf"
                    onChange={(file) => setExamFile(file)}
                />
                {examFile && <p className="text-sm text-green-600 -mt-2">File selected: {examFile.name}</p>}
                
                {examFile && (
                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Action for Uploaded File</label>
                         <div className="grid grid-cols-2 gap-3 p-1 bg-gray-100 rounded-lg border">
                            <ActionButton active={uploadAction === 'reproduce'} onClick={() => setUploadAction('reproduce')}>
                                Reproduce Same Paper
                            </ActionButton>
                            <ActionButton active={uploadAction === 'regenerate'} onClick={() => setUploadAction('regenerate')}>
                                Generate New (Pattern)
                            </ActionButton>
                        </div>
                    </div>
                )}

                <Input
                    id="upload-topic"
                    label="Exam Topic"
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g., Photosynthesis in Plants"
                    required
                />
                
                {uploadAction === 'regenerate' && (
                    <Input
                        id="upload-totalMarks"
                        label="Total Marks"
                        type="number"
                        value={totalMarks}
                        onChange={(e) => setTotalMarks(Number(e.target.value))}
                        required
                        min="1"
                    />
                )}

                {!profile?.geminiApiKey && (
                    <p className="text-xs text-red-600 bg-red-50 p-2 rounded-md">Add your Gemini API key in profile to use AI file processing.</p>
                )}
                <Button type="submit" isLoading={isLoading} disabled={isLoading || !examFile || !topic || !profile?.geminiApiKey} className="w-full">
                    {isLoading ? loadingText : buttonText}
                </Button>
                {error && <p className="text-red-500 text-sm mt-2 text-center">{error}</p>}
            </form>
        </Card>
    );
};

// New: Teacher upload student answer sheet for evaluation
const UploadAnswerSheetForm: React.FC = () => {
    const { exams, addSubmission, updateSubmission } = useStore();
    const { profile } = useAuth();
    const [selectedExamId, setSelectedExamId] = useState('');
    const [studentName, setStudentName] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [autoEvaluate, setAutoEvaluate] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const selectedExam = exams.find(e => e.id === selectedExamId);

    const hashFile = async (file: File) => {
        const buf = await file.arrayBuffer();
        const digest = await crypto.subtle.digest('SHA-256', buf);
        return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2,'0')).join('');
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!file || !selectedExamId || !studentName.trim()) {
            setError('All fields are required.');
            return;
        }
        setIsLoading(true);
        setError('');
        setSuccess('');
        try {
            const fileHash = await hashFile(file);

            const submissionId = `sub-${Date.now()}`;
            const newSubmission = {
                id: submissionId,
                examId: selectedExamId,
                studentName: studentName.trim(),
                fileName: file.name,
                fileSize: file.size,
                fileMime: file.type,
                fileHash,
                submittedAt: new Date().toISOString(),
            } as const;
            await addSubmission(newSubmission as any);

            if (autoEvaluate && selectedExam) {
                try {
                    if (!profile?.geminiApiKey) throw new Error('Add your Gemini API key before auto-evaluating.');
                    // Use base64 only in-memory for grading; convert if needed
                    let base64 = await toBase64(file);
                    if (base64.startsWith('data:')) base64 = base64.split(',')[1];
                    const result = await gradeSubmission(profile.geminiApiKey, selectedExam.questions, selectedExam.totalMarks, base64, file.type || 'application/pdf');
                    await updateSubmission({ ...newSubmission, result } as any);
                } catch (gradingErr: any) {
                    console.error('Auto grading failed:', gradingErr);
                    setError('Submission saved but auto evaluation failed. You can evaluate manually later.');
                }
            }

            setSuccess('Submission uploaded successfully' + (autoEvaluate ? ' (evaluation may take a moment).' : '.'));
            setStudentName('');
            setFile(null);
        } catch (err: any) {
            setError(err.message || 'Failed to upload submission.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card className="p-6">
            <h3 className="text-lg font-bold mb-4">Upload Student Answer Sheet</h3>
            {exams.length === 0 ? (
                <p className="text-sm text-gray-500">Create an exam first to upload submissions.</p>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                    {!profile?.geminiApiKey && autoEvaluate && (
                        <p className="text-xs text-red-600 bg-red-50 p-2 rounded-md">Add your Gemini API key (profile menu) to enable auto evaluation.</p>
                    )}
                    <div>
                        <label htmlFor="exam-select" className="block text-sm font-medium text-gray-700 mb-1">Exam</label>
                        <select
                            id="exam-select"
                            value={selectedExamId}
                            onChange={(e) => setSelectedExamId(e.target.value)}
                            className="w-full border rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                            required
                        >
                            <option value="" disabled>Select an exam</option>
                            {exams.map(ex => (
                                <option key={ex.id} value={ex.id}>{ex.topic} ({ex.totalMarks} marks)</option>
                            ))}
                        </select>
                    </div>
                    <Input
                        id="student-name"
                        label="Student Name"
                        type="text"
                        value={studentName}
                        onChange={(e) => setStudentName(e.target.value)}
                        required
                    />
                    <FileInput
                        id="answer-sheet"
                        label="Answer Sheet (Image or PDF)"
                        accept="image/png, image/jpeg, application/pdf"
                        onChange={(f) => setFile(f)}
                    />
                    {file && <p className="text-xs text-green-600 -mt-2">File: {file.name}</p>}
                    <div className="flex items-center space-x-2 pt-2">
                        <input
                            id="auto-evaluate"
                            type="checkbox"
                            className="h-4 w-4 text-primary-600 border-gray-300 rounded"
                            checked={autoEvaluate}
                            onChange={(e) => setAutoEvaluate(e.target.checked)}
                        />
                        <label htmlFor="auto-evaluate" className="text-sm text-gray-700">Auto evaluate with AI after upload</label>
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading} isLoading={isLoading}>
                        {isLoading ? 'Uploading...' : autoEvaluate ? 'Upload & Auto Evaluate' : 'Upload Submission'}
                    </Button>
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                    {success && <p className="text-green-600 text-sm">{success}</p>}
                </form>
            )}
        </Card>
    );
};

interface BulkFileStatus {
    file: File;
    studentName: string;
    status: 'pending' | 'uploading' | 'evaluating' | 'done' | 'error';
    error?: string;
    submissionId?: string;
}

const BulkUploadAnswerSheets: React.FC = () => {
    const { exams, addSubmission, updateSubmission } = useStore();
    const { profile } = useAuth();
    const [selectedExamId, setSelectedExamId] = useState('');
    const [files, setFiles] = useState<BulkFileStatus[]>([]);
    const [autoEvaluate, setAutoEvaluate] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);

    const selectedExam = exams.find(e => e.id === selectedExamId);

    const onFilesSelected = (fileList: FileList | null) => {
        if (!fileList) return;
        const incoming = Array.from(fileList);
        const pdfs = incoming.filter(f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
        const rejected = incoming.filter(f => !pdfs.includes(f));
        const newStatuses: BulkFileStatus[] = pdfs.map(f => ({
            file: f,
            studentName: deriveStudentName(f.name),
            status: 'pending'
        }));
        setFiles(prev => [...prev, ...newStatuses]);
        if (rejected.length > 0) {
            // Add placeholder error entries for rejected files (optional) OR just ignore.
            // We'll ignore silently to keep UI clean.
            console.warn('Some non-PDF files were ignored in bulk upload:', rejected.map(r => r.name));
        }
    };

    const deriveStudentName = (filename: string) => {
        return filename.replace(/\.[^.]+$/, '') // remove extension
                       .replace(/[_-]+/g, ' ')   // underscores/dashes to space
                       .replace(/\s+/g, ' ')    // collapse spaces
                       .trim();
    };

    const hashFile = async (file: File) => {
        const buf = await file.arrayBuffer();
        const digest = await crypto.subtle.digest('SHA-256', buf);
        return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2,'0')).join('');
    };

    const processFiles = async () => {
        if (!selectedExamId || files.length === 0) return;
        setIsProcessing(true);
        const exam = selectedExam;
        for (let i = 0; i < files.length; i++) {
            setFiles(curr => curr.map((f, idx) => idx === i ? { ...f, status: 'uploading', error: undefined } : f));
            const entry = files[i];
            try {
                const fileHash = await hashFile(entry.file);
                const submissionId = `sub-${Date.now()}-${i}`;
                const newSubmission = {
                    id: submissionId,
                    examId: selectedExamId,
                    studentName: entry.studentName || 'Unnamed',
                    fileName: entry.file.name,
                    fileSize: entry.file.size,
                    fileMime: entry.file.type,
                    fileHash,
                    submittedAt: new Date().toISOString(),
                } as const;
                await addSubmission(newSubmission as any);
                setFiles(curr => curr.map((f, idx) => idx === i ? { ...f, status: autoEvaluate ? 'evaluating' : 'done', submissionId } : f));

                if (autoEvaluate && exam) {
                    try {
                        if (!profile?.geminiApiKey) throw new Error('API key missing');
                        if (entry.file.type !== 'application/pdf' && !entry.file.name.toLowerCase().endsWith('.pdf')) {
                            throw new Error('File is not a PDF');
                        }
                        let base64 = await toBase64(entry.file);
                        if (base64.startsWith('data:')) base64 = base64.split(',')[1];
                        const result = await gradeSubmission(profile.geminiApiKey, exam.questions, exam.totalMarks, base64, 'application/pdf');
                        await updateSubmission({ ...newSubmission, result } as any);
                        setFiles(curr => curr.map((f, idx) => idx === i ? { ...f, status: 'done' } : f));
                    } catch (err: any) {
                        setFiles(curr => curr.map((f, idx) => idx === i ? { ...f, status: 'error', error: err.message || 'Auto eval failed' } : f));
                    }
                }
            } catch (err: any) {
                setFiles(curr => curr.map((f, idx) => idx === i ? { ...f, status: 'error', error: err.message || 'Upload failed' } : f));
            }
        }
        setIsProcessing(false);
    };

    const clearList = () => setFiles([]);

    return (
        <Card className="p-6">
            <h3 className="text-lg font-bold mb-4">Bulk Upload Answer Sheets</h3>
            {exams.length === 0 ? <p className="text-sm text-gray-500">Create an exam first.</p> : (
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Exam</label>
                        <select
                            value={selectedExamId}
                            onChange={e => setSelectedExamId(e.target.value)}
                            className="w-full border rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                            <option value="">Select exam</option>
                            {exams.map(ex => <option key={ex.id} value={ex.id}>{ex.topic} ({ex.totalMarks} marks)</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Answer Sheet PDF Files</label>
                        <input
                            type="file"
                            multiple
                            accept="application/pdf"
                            onChange={e => onFilesSelected(e.target.files)}
                            className="w-full border rounded-md p-2 text-sm"
                        />
                        <p className="text-xs text-gray-500 mt-1">Only PDF files are accepted. Filenames will be used as student names (extension removed). Each PDF will be auto evaluated if enabled below.</p>
                    </div>
                    <div className="flex items-center space-x-2">
                        <input
                            id="bulk-auto-eval"
                            type="checkbox"
                            className="h-4 w-4 text-primary-600 border-gray-300 rounded"
                            checked={autoEvaluate}
                            onChange={e => setAutoEvaluate(e.target.checked)}
                            disabled={!profile?.geminiApiKey}
                        />
                        <label htmlFor="bulk-auto-eval" className="text-sm text-gray-700">Auto evaluate PDFs with AI</label>
                        {!profile?.geminiApiKey && <span className="text-xs text-red-600">Add API key to enable.</span>}
                    </div>
                    <div className="flex space-x-3">
                        <Button
                            onClick={processFiles}
                            disabled={!selectedExamId || files.length === 0 || isProcessing}
                            isLoading={isProcessing}
                        >
                            {isProcessing ? 'Processing...' : 'Start Upload'}
                        </Button>
                        <Button variant="secondary" onClick={clearList} disabled={isProcessing || files.length === 0}>Clear</Button>
                    </div>
                    {files.length > 0 && (
                        <div className="max-h-64 overflow-auto border rounded-md divide-y">
                            {files.map((f, idx) => (
                                <div key={idx} className="p-2 text-sm flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                        <p className="font-medium text-gray-800">{f.studentName || f.file.name}</p>
                                        <p className="text-xs text-gray-500 break-all">{f.file.name}</p>
                                        {f.error && <p className="text-xs text-red-600 mt-1">{f.error}</p>}
                                    </div>
                                    <div className="text-right w-28">
                                        <StatusBadge status={f.status} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </Card>
    );
};

const StatusBadge: React.FC<{ status: BulkFileStatus['status'] }> = ({ status }) => {
    const styles: Record<string, string> = {
        pending: 'bg-gray-100 text-gray-600',
        uploading: 'bg-blue-100 text-blue-700',
        evaluating: 'bg-indigo-100 text-indigo-700',
        done: 'bg-green-100 text-green-700',
        error: 'bg-red-100 text-red-700'
    };
    const labels: Record<string, string> = {
        pending: 'Pending',
        uploading: 'Uploading',
        evaluating: 'Evaluating',
        done: 'Done',
        error: 'Error'
    };
    return <span className={`inline-block px-2 py-1 text-[10px] font-semibold rounded ${styles[status]}`}>{labels[status]}</span>;
};


const TeacherPage: React.FC = () => {
    const { exams, getSubmissionsByExamId, submissions } = useStore();
    const { profile } = useAuth();
    const [newExamId, setNewExamId] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [creationMode, setCreationMode] = useState<'generate' | 'upload'>('generate');
    const [activeTab, setActiveTab] = useState<'create' | 'evaluate'>('create');

    const handleExamCreated = (id: string) => {
        setNewExamId(id);
        window.scrollTo(0, 0);
    };
    
    const copyLink = () => {
        const link = `${window.location.origin}/#exam/${newExamId}`;
        navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const TabButton: React.FC<{ active: boolean, onClick: () => void, children: React.ReactNode }> = ({ active, onClick, children }) => (
        <button
            onClick={onClick}
            className={`px-6 py-3 text-sm font-medium rounded-lg transition-colors ${
                active ? 'bg-primary-600 text-white shadow-lg' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
        >
            {children}
        </button>
    );

    const ToggleButton: React.FC<{ active: boolean, onClick: () => void, children: React.ReactNode }> = ({ active, onClick, children }) => (
        <button
            onClick={onClick}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                active ? 'bg-primary-600 text-white shadow' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
        >
            {children}
        </button>
    );

    return (
        <div className="space-y-8">
            {/* Tab Navigation */}
            <div className="flex justify-center mb-8">
                <div className="bg-gray-50 p-1 rounded-lg flex space-x-2 border">
                    <TabButton active={activeTab === 'create'} onClick={() => setActiveTab('create')}>
                        Create Exams
                    </TabButton>
                    <TabButton active={activeTab === 'evaluate'} onClick={() => setActiveTab('evaluate')}>
                        Evaluate Submissions
                    </TabButton>
                </div>
            </div>

            {activeTab === 'create' ? (
                // Create Exams Tab Content
                <>
                    {newExamId && (
                         <Card className="p-6 bg-primary-50 border border-primary-200">
                            <h2 className="text-lg font-bold text-green-700">Exam Created Successfully!</h2>
                            <p className="text-gray-600 mt-2">Share the link below with your students:</p>
                            <div className="mt-3 flex items-center space-x-2 bg-white p-2 rounded-md border">
                                <input type="text" readOnly value={`${window.location.origin}/#exam/${newExamId}`} className="flex-grow p-1 border-none focus:ring-0" />
                                <Button onClick={copyLink} variant="secondary">
                                    {copied ? 'Copied!' : 'Copy'}
                                </Button>
                            </div>
                             <Button onClick={() => setNewExamId(null)} variant="secondary" className="mt-4">Create Another Exam</Button>
                        </Card>
                    )}

                    <div className="space-y-6">
                         <div className="flex justify-center mb-6">
                            <div className="bg-gray-100 p-1 rounded-lg flex space-x-2 border">
                                <ToggleButton active={creationMode === 'generate'} onClick={() => setCreationMode('generate')}>
                                    Generate with AI
                                </ToggleButton>
                                <ToggleButton active={creationMode === 'upload'} onClick={() => setCreationMode('upload')}>
                                    Upload Paper
                                </ToggleButton>
                            </div>
                        </div>

                        {creationMode === 'generate' ? (
                            <CreateExamForm onExamCreated={handleExamCreated} />
                        ) : (
                            <UploadExamForm onExamCreated={handleExamCreated} />
                        )}
                    </div>

                    <div className="space-y-6">
                        <h2 className="text-2xl font-bold text-gray-900">My Exams</h2>
                        {exams.length === 0 ? (
                            <Card className="p-6 text-center">
                              <p className="text-gray-500">You haven't created any exams yet. Use one of the forms above to get started.</p>
                            </Card>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {exams.map(exam => {
                                    const submissions = getSubmissionsByExamId(exam.id);
                                    return (
                                        <ExamCard key={exam.id} exam={exam} submissionCount={submissions.length} />
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </>
            ) : (
                // Evaluate Submissions Tab Content
                <>
                <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-gray-900">Evaluate Submissions</h2>
                    {/* Upload answer sheet form */}
                    <UploadAnswerSheetForm />
                    <BulkUploadAnswerSheets />
                    {submissions.length === 0 ? (
                        <Card className="p-6 text-center">
                            <p className="text-gray-500">No submissions to evaluate yet. Students need to submit their exams first.</p>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {submissions.map(submission => {
                                const exam = exams.find(e => e.id === submission.examId);
                                if (!exam) return null;
                                
                                const scorePercentage = submission.result ? (submission.result.totalScore / exam.totalMarks) * 100 : 0;
                                const needsEvaluation = !submission.result;
                                
                                return (
                                    <Card key={submission.id} className="flex flex-col">
                                        <div className="p-6 flex-grow">
                                            <h3 className="text-lg font-bold text-primary-800">{submission.studentName}</h3>
                                            <p className="text-sm text-gray-600 mt-1">{exam.topic}</p>
                                            <p className="text-xs text-gray-500 mt-1">
                                                Submitted: {new Date(submission.submittedAt).toLocaleString()}
                                            </p>
                                            <div className="mt-4">
                                                {submission.result ? (
                                                    <div className="space-y-2">
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-sm">Score:</span>
                                                            <span className={`font-bold ${
                                                                scorePercentage >= 80 ? 'text-green-600' : 
                                                                scorePercentage >= 50 ? 'text-yellow-600' : 'text-red-600'
                                                            }`}>
                                                                {submission.result.totalScore}/{exam.totalMarks}
                                                            </span>
                                                        </div>
                                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                                            <div 
                                                                className={`h-2 rounded-full ${
                                                                    scorePercentage >= 80 ? 'bg-green-500' : 
                                                                    scorePercentage >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                                                                }`}
                                                                style={{ width: `${scorePercentage}%` }}
                                                            ></div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="bg-yellow-50 border border-yellow-200 rounded p-2">
                                                        <p className="text-sm text-yellow-700 font-medium">Needs Evaluation</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="bg-gray-50 p-4 border-t">
                                            <Link to={`/results/${submission.id}`}>
                                                <Button 
                                                    variant={needsEvaluation ? "primary" : "secondary"} 
                                                    className="w-full"
                                                >
                                                    {needsEvaluation ? 'Evaluate Now' : 'Review & Re-evaluate'}
                                                </Button>
                                            </Link>
                                        </div>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </div>
                {profile?.role === 'teacher' && <DangerZone />}
                </>
            )}
        </div>
    );
};

// Danger Zone component (admin destructive actions)
const DangerZone: React.FC = () => {
    const { profile } = useAuth();
    const [open, setOpen] = useState<null | 'subs' | 'exams' | 'all'>(null);
    const [busy, setBusy] = useState(false);
    const [lastResult, setLastResult] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const { exams, submissions } = useStore(); // just to show counts
    const run = async () => {
        if (!open) return;
        setBusy(true); setError(null); setLastResult(null);
        try {
            let count = 0; let label = '';
            if (open === 'subs') { const { deleteAllSubmissions } = await import('../services/firestoreService'); count = await deleteAllSubmissions(); label = 'submissions'; }
            if (open === 'exams') { const { deleteAllExams } = await import('../services/firestoreService'); count = await deleteAllExams(); label = 'exams'; }
            if (open === 'all') { const svc = await import('../services/firestoreService'); const c1 = await svc.deleteAllSubmissions(); const c2 = await svc.deleteAllExams(); const c3 = await svc.deleteAllUsers(); count = c1 + c2 + c3; label = 'documents (submissions + exams + users)'; }
            setLastResult(`Deleted ${count} ${label}.`);
            setOpen(null);
        } catch (e: any) {
            setError(e.message || 'Deletion failed');
        } finally { setBusy(false); }
    };

    if (profile?.role !== 'teacher') return null;
    return (
        <Card className="p-6 border border-red-300 bg-red-50">
            <h2 className="text-xl font-bold text-red-700 mb-3">Danger Zone</h2>
            <p className="text-sm text-red-700 mb-4">Destructive actions below cannot be undone. Consider exporting data first.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button variant="danger" onClick={() => setOpen('subs')}>Delete All Answer Sheets ({submissions.length})</Button>
                <Button variant="danger" onClick={() => setOpen('exams')}>Delete All Question Papers ({exams.length})</Button>
                <Button variant="danger" onClick={() => setOpen('all')}>Delete ALL Data</Button>
            </div>
            {lastResult && <p className="text-xs text-green-700 mt-4">{lastResult}</p>}
            {error && <p className="text-xs text-red-700 mt-4">{error}</p>}
            <ConfirmModal
                open={open !== null}
                title={open === 'all' ? 'Delete ALL Data' : open === 'exams' ? 'Delete All Exams' : 'Delete All Submissions'}
                description={<>
                    <p>This action will permanently delete {open === 'all' ? 'ALL exams, ALL submissions, and ALL user profile documents' : open === 'exams' ? 'every exam document (submissions remain)' : 'every submission (exam papers remain)'}.</p>
                    <ul className="list-disc ml-5 text-xs text-gray-600 mt-2 space-y-1">
                        <li>Operation is irreversible.</li>
                        <li>AI results and metadata will be lost.</li>
                        {open === 'all' && <li>User documents (including stored API keys) will be removed.</li>}
                    </ul>
                </>}
                confirmLabel={busy ? 'Deleting...' : 'Yes, Delete'}
                onCancel={() => !busy && setOpen(null)}
                onConfirm={run}
                busy={busy}
                requirePhrase={open === 'all' ? 'DELETE ALL' : open === 'exams' ? 'DELETE EXAMS' : 'DELETE SUBS'}
            />
        </Card>
    );
};

export default TeacherPage;

// ExamCard with delete functionality
const ExamCard: React.FC<{ exam: any; submissionCount: number }> = ({ exam, submissionCount }) => {
    const { getSubmissionsByExamId } = useStore(); // not used but hook ensures state updates
    const { profile } = useAuth();
    const [open, setOpen] = useState(false);
    const [cascade, setCascade] = useState(true);
    const [busy, setBusy] = useState(false);
    const [feedback, setFeedback] = useState<string | null>(null);
    const topic = exam.topic;
    const handleDelete = async () => {
        setBusy(true); setFeedback(null);
        try {
            if (cascade) {
                const svc = await import('../services/firestoreService');
                const res = await svc.deleteExamWithSubmissions(exam.id);
                setFeedback(`Deleted exam and ${res.submissionsDeleted} submission(s).`);
            } else {
                const { deleteExam } = await import('../services/firestoreService');
                await deleteExam(exam.id);
                setFeedback('Deleted exam. Submissions (if any) remain and will appear orphaned.');
            }
            setOpen(false);
        } catch (e: any) {
            setFeedback(e.message || 'Deletion failed');
        } finally { setBusy(false); }
    };
    return (
        <Card className="flex flex-col relative">
            <div className="p-6 flex-grow space-y-2">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <h3 className="text-lg font-bold text-primary-800">{topic}</h3>
                        <p className="text-sm text-gray-500 mt-1">{new Date(exam.createdAt).toLocaleDateString()}</p>
                    </div>
                    {profile?.role === 'teacher' && (
                        <button onClick={() => setOpen(true)} className="text-xs text-red-600 hover:underline">Delete</button>
                    )}
                </div>
                <div className="mt-2 flex justify-between text-sm">
                    <span>{exam.questions.length} Questions</span>
                    <span className="font-semibold">{exam.totalMarks} Marks</span>
                </div>
            </div>
            <div className="bg-gray-50 p-4 border-t">
                {submissionCount > 0 ? (
                    <Link to={`/exam/${exam.id}/submissions`}>
                        <Button variant="secondary" className="w-full">View {submissionCount} Submission(s)</Button>
                    </Link>
                ) : (
                    <p className="text-center text-sm text-gray-500">No submissions yet.</p>
                )}
            </div>
            <ConfirmModal
                open={open}
                title={`Delete Exam: ${topic}`}
                description={<>
                    <p>This will permanently delete <strong>{topic}</strong>{submissionCount ? ` and optionally its ${submissionCount} submission(s)` : ''}.</p>
                    {submissionCount > 0 && (
                        <label className="flex items-center gap-2 mt-3 text-xs text-gray-700">
                            <input type="checkbox" checked={cascade} onChange={e => setCascade(e.target.checked)} className="h-4 w-4" />
                            Also delete associated submissions
                        </label>
                    )}
                    <p className="text-[10px] mt-3 text-gray-500">Type <code>DELETE {topic.toUpperCase().slice(0,15)}</code> to enable the Delete button.</p>
                </>}
                confirmLabel={busy ? 'Deleting...' : 'Delete'}
                onCancel={() => !busy && setOpen(false)}
                onConfirm={handleDelete}
                busy={busy}
                requirePhrase={`DELETE ${topic.toUpperCase().slice(0,15)}`}
            />
            {feedback && <p className="text-[10px] text-center py-1 text-gray-500">{feedback}</p>}
        </Card>
    );
};