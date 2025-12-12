import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation helper
function validateInput(body: unknown): { wrongAnswer: string; subject: string } | null {
  if (!body || typeof body !== 'object') return null;
  
  const data = body as Record<string, unknown>;
  
  // Validate wrongAnswer
  if (typeof data.wrongAnswer !== 'string' || data.wrongAnswer.length < 1 || data.wrongAnswer.length > 10000) {
    return null;
  }
  
  // Validate subject
  const validSubjects = ['computer_science', 'stem', 'humanities'];
  if (typeof data.subject !== 'string' || !validSubjects.includes(data.subject)) {
    return null;
  }
  
  return {
    wrongAnswer: data.wrongAnswer,
    subject: data.subject
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    
    // Validate input
    const validatedInput = validateInput(body);
    if (!validatedInput) {
      return new Response(JSON.stringify({ error: "Invalid input parameters" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    const { wrongAnswer, subject } = validatedInput;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You analyze student mistakes and provide detailed explanations to help them learn. Be encouraging and educational." },
          { role: "user", content: `Analyze this student's wrong answer in ${subject}: ${wrongAnswer}` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "analyze_mistake",
            parameters: {
              type: "object",
              properties: {
                whatWentWrong: { type: "string", description: "What specific mistake the student made" },
                whyItsWrong: { type: "string", description: "Why this approach is incorrect" },
                correctSolution: { type: "string", description: "Step-by-step correct solution" },
                practiceQuestions: { type: "array", items: { type: "object", properties: { question: { type: "string" }, answer: { type: "string" } } } },
              },
              required: ["whatWentWrong", "whyItsWrong", "correctSolution", "practiceQuestions"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "analyze_mistake" } },
      }),
    });

    if (!response.ok) throw new Error("AI request failed");

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    const result = toolCall ? JSON.parse(toolCall.function.arguments) : {};

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
