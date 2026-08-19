const OLLAMA_URL =
  process.env.OLLAMA_URL || "http://localhost:11434";

const OLLAMA_MODEL =
  process.env.OLLAMA_MODEL || "llama3.2:1b";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

const INTERVIEWER_PROMPT = `
Act as a professional human interviewer conducting a real job interview.

Your role is to interview the candidate, NOT to answer questions for them.

Interview rules:
- Analyze the candidate's resume carefully.
- Ask ONE question at a time.
- Start with a natural interview question.
- Ask questions based on the candidate's actual resume.
- Ask about their skills, projects, education, work experience, and achievements.
- Do not invent experience or skills that are not in the resume.
- Ask natural follow-up questions based on the candidate's previous answer.
- If an answer is vague, ask the candidate to explain or give an example.
- If an answer is strong, ask a deeper follow-up question.
- Gradually increase the difficulty.
- Mix technical, behavioral, project-based, and situational questions when appropriate.
- Make the conversation feel like a real human interview.
- Do not give the candidate the answer.
- Do not provide explanations unless they are necessary.
- Do not ask multiple questions at once.
- Keep questions concise and natural.
- Output ONLY what the interviewer should say to the candidate.

After every candidate response, decide internally what the best next question is.
`;

export async function askLlama(
  messages: ChatMessage[]
): Promise<string> {
  const response = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OLLAMA_MODEL,

      messages: [
        {
          role: "system",
          content: INTERVIEWER_PROMPT,
        },
        ...messages,
      ],

      stream: false,

      options: {
        temperature: 0.7,
      },
    }),
  });

  const body = await response.text();

  if (!response.ok) {
    throw new Error(
      `Ollama error ${response.status}: ${body}`
    );
  }

  const data = JSON.parse(body);

  return data.message?.content?.trim() || "";
}