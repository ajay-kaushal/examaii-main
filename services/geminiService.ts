import { GoogleGenAI, Type } from "@google/genai";
import type { Question, GradedResult } from '../types';

// Per-user client factory. We avoid caching across users.
function getClient(apiKey: string | undefined): GoogleGenAI {
    if (!apiKey) {
        throw new Error("Gemini API key not configured. Add your key via the profile menu.");
    }
    return new GoogleGenAI({ apiKey });
}

const questionGenerationSchema = {
  type: Type.OBJECT,
  properties: {
    questions: {
      type: Type.ARRAY,
      description: "A list of questions.",
      items: {
        type: Type.OBJECT,
        properties: {
          question: {
            type: Type.STRING,
            description: "The text of the question."
          },
          marks: {
            type: Type.NUMBER,
            description: "The marks allocated to this question."
          }
        },
        required: ["question", "marks"]
      }
    }
  },
  required: ["questions"]
};

const gradingSchema = {
    type: Type.OBJECT,
    properties: {
        totalScore: {
            type: Type.NUMBER,
            description: "The total score awarded to the student for the entire paper."
        },
        overallFeedback: {
            type: Type.STRING,
            description: "A summary of the student's overall performance, highlighting strengths and areas for improvement."
        },
        answers: {
            type: Type.ARRAY,
            description: "A detailed breakdown of the grading for each question.",
            items: {
                type: Type.OBJECT,
                properties: {
                    question: {
                        type: Type.STRING,
                        description: "The original question text."
                    },
                    score: {
                        type: Type.NUMBER,
                        description: "The marks awarded for the answer to this specific question."
                    },
                    feedback: {
                        type: Type.STRING,
                        description: "Specific feedback on the student's answer for this question."
                    }
                },
                required: ["question", "score", "feedback"]
            }
        }
    },
    required: ["totalScore", "overallFeedback", "answers"]
};

export const generateQuestions = async (apiKey: string | undefined, topic: string, numQuestions: number, totalMarks: number): Promise<Question[]> => {
  try {
    const prompt = `You are an expert educator. Create a question paper on the topic of "${topic}".
    It must have exactly ${numQuestions} questions.
    The total marks for the paper should be exactly ${totalMarks}. Distribute the marks among the questions appropriately.
    Generate the questions in a JSON format.`;

    const response = await getClient(apiKey).models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: questionGenerationSchema,
      }
    });

    const jsonText = response.text;
    const result = JSON.parse(jsonText);
    return result.questions;
  } catch (error) {
    console.error("Error generating questions:", error);
    throw new Error("Failed to generate questions. Please check the topic and try again.");
  }
};

export const extractQuestionsFromPaper = async (apiKey: string | undefined, fileBase64: string, mimeType: string, topic: string): Promise<Question[]> => {
    try {
        const textPart = {
            text: `You are an expert educator tasked with digitizing a question paper with 100% accuracy.

            Exam Details Provided by Teacher:
            - Topic: "${topic}"

            Your Task:
            1.  Analyze the provided document (image or PDF).
            2.  You MUST identify and extract every question text and its allocated marks EXACTLY as written in the document.
            3.  Do NOT invent, infer, or distribute marks. If marks for a question are not explicitly written in the document, you must return an empty questions array.
            4.  The number of questions and the marks for each question must precisely match the source document.
            5.  Return the extracted questions and their marks in the specified JSON format. Your output must be perfect.`
        };

        const filePart = {
            inlineData: {
                data: fileBase64,
                mimeType: mimeType
            }
        };

    const response = await getClient(apiKey).models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [textPart, filePart] },
            config: {
                responseMimeType: 'application/json',
                responseSchema: questionGenerationSchema,
            }
        });

        const jsonText = response.text;
        const result = JSON.parse(jsonText);
        
        if (!result.questions || !Array.isArray(result.questions)) {
             // This case might happen if the AI returns a completely invalid structure.
            // A valid but empty `questions` array is the expected "failure" mode.
            return [];
        }
        
        return result.questions;
    } catch (error) {
        console.error("Error extracting questions from file:", error);
        throw new Error("Failed to extract questions from the uploaded file. The file might be unreadable or the format is not supported by the AI.");
    }
};

export const generateQuestionsFromPattern = async (apiKey: string | undefined, fileBase64: string, mimeType: string, topic: string, totalMarks: number): Promise<Question[]> => {
    try {
        const textPart = {
            text: `You are an expert educator. Your task is to create a new question paper based on the pattern of an existing one provided as a file.

            Exam Details Provided by Teacher:
            - Topic: "${topic}"
            - Total Marks: ${totalMarks}

            Your Task:
            1.  Thoroughly analyze the provided document (image or PDF) to understand its structure. Pay attention to:
                - The types of questions (e.g., multiple choice, short answer, long answer, problem-solving).
                - The cognitive level (e.g., knowledge, comprehension, application, analysis).
                - The distribution of marks across different questions and topics within the main subject.
                - The overall difficulty level.
            2.  Based on this analysis, generate a **completely new set of questions** on the same topic ("${topic}").
            3.  This new question paper must follow the same pattern, structure, and mark distribution as the original.
            4.  The total marks for the new paper must be exactly ${totalMarks}.
            5.  Return the newly generated questions and their marks in the specified JSON format. Do NOT copy questions from the provided document.`
        };

        const filePart = {
            inlineData: {
                data: fileBase64,
                mimeType: mimeType
            }
        };

    const response = await getClient(apiKey).models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [textPart, filePart] },
            config: {
                responseMimeType: 'application/json',
                responseSchema: questionGenerationSchema,
            }
        });

        const jsonText = response.text;
        const result = JSON.parse(jsonText);
        
        if (!result.questions || !Array.isArray(result.questions)) {
            throw new Error("AI response did not contain a valid 'questions' array.");
        }

        return result.questions;
    } catch (error) {
        console.error("Error generating questions from pattern:", error);
        throw new Error("Failed to generate questions from the uploaded paper's pattern. The file might be unreadable or the AI could not determine a clear structure.");
    }
};


export const gradeSubmission = async (apiKey: string | undefined, questions: Question[], totalMarks: number, answerSheetImageBase64: string, imageMimeType: string): Promise<GradedResult> => {
    try {
        const textPart = {
            text: `You are an AI-powered exam evaluator. Your task is to grade a student's answer sheet based on a provided question paper.

            **Question Paper Details:**
            - Total Marks: ${totalMarks}
            - Questions:
            ${questions.map((q, i) => `${i + 1}. ${q.question} (${q.marks} marks)`).join('\n')}

            **Instructions:**
            1.  Carefully analyze the attached answer sheet image.
            2.  Evaluate the student's answers for each question against the provided question paper.
            3.  Award marks for each question based on the correctness and completeness of the answer. Be fair but strict.
            4.  Calculate the total score. The maximum possible score is ${totalMarks}.
            5.  Provide constructive feedback for each answer.
            6.  Provide a summary of the student's overall performance.
            7.  Return your evaluation in the specified JSON format.
            `
        };

        const imagePart = {
            inlineData: {
                data: answerSheetImageBase64,
                mimeType: imageMimeType
            }
        };

    const response = await getClient(apiKey).models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [textPart, imagePart] },
            config: {
                responseMimeType: "application/json",
                responseSchema: gradingSchema,
            }
        });
        
        const jsonText = response.text;
        const result: GradedResult = JSON.parse(jsonText);
        return result;

    } catch (error) {
        console.error("Error grading submission:", error);
        throw new Error("AI grading failed. The submitted image might be unclear or there was an issue with the AI model.");
    }
};