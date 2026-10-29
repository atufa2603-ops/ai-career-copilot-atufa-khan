
import { GoogleGenAI } from "@google/genai";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: "GEMINI_API_KEY is missing from the server environment."
    });
  }

  try {
    const { resume, jobDescription } = req.body ?? {};

    if (
      typeof resume !== "string" ||
      typeof jobDescription !== "string" ||
      !resume.trim() ||
      !jobDescription.trim()
    ) {
      return res.status(400).json({
        error: "Please provide both a resume and a job description."
      });
    }

    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `
You are an expert career coach and resume evaluator.

Analyze the resume against the job description.
Use only evidence in the resume. Never invent qualifications.
Return ONLY valid JSON using this exact structure:
{
  "ats_score": 0,
  "strengths": ["specific strength"],
  "missing_keywords": ["missing skill"],
  "improvements": ["actionable suggestion"],
  "summary": "brief explanation"
}

The ats_score must be an integer from 0 to 100.
Missing keywords must be relevant to the job description.
Keep feedback constructive and specific.

RESUME:
${resume}

JOB DESCRIPTION:
${jobDescription}
`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            ats_score: { type: "INTEGER" },
            strengths: {
              type: "ARRAY",
              items: { type: "STRING" }
            },
            missing_keywords: {
              type: "ARRAY",
              items: { type: "STRING" }
            },
            improvements: {
              type: "ARRAY",
              items: { type: "STRING" }
            },
            summary: { type: "STRING" }
          },
          required: [
            "ats_score",
            "strengths",
            "missing_keywords",
            "improvements",
            "summary"
          ]
        }
      }
    });

    const result = JSON.parse(response.text);

    return res.status(200).json(result);
  } catch (error) {
    console.error("Gemini analysis error:", error);
    return res.status(500).json({
      error: "Resume analysis failed. Please try again."
    });
  }
}
