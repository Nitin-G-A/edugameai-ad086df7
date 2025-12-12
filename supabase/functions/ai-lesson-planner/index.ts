import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation helper
function validateInput(body: unknown): { unitName: string; duration: string; grade: string } | null {
  if (!body || typeof body !== 'object') return null;
  
  const data = body as Record<string, unknown>;
  
  // Validate unitName
  if (typeof data.unitName !== 'string' || data.unitName.length < 1 || data.unitName.length > 500) {
    return null;
  }
  
  // Validate duration
  if (typeof data.duration !== 'string' || data.duration.length < 1 || data.duration.length > 100) {
    return null;
  }
  
  // Validate grade
  if (typeof data.grade !== 'string' || data.grade.length < 1 || data.grade.length > 100) {
    return null;
  }
  
  return {
    unitName: data.unitName,
    duration: data.duration,
    grade: data.grade
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
    
    const { unitName, duration, grade } = validatedInput;
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
          { role: "system", content: "You are an expert educational curriculum designer for higher education." },
          { role: "user", content: `Create a comprehensive lesson plan for "${unitName}" designed for ${grade} students, to be taught over ${duration}. Include learning objectives, teaching activities with time allocations, common student mistakes to address, quiz questions, and a suggested class flow.` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "create_lesson_plan",
            parameters: {
              type: "object",
              properties: {
                objectives: { type: "array", items: { type: "string" }, description: "3-5 learning objectives" },
                activities: { type: "array", items: { type: "object", properties: { title: { type: "string" }, description: { type: "string" }, duration: { type: "string" } } } },
                commonMistakes: { type: "array", items: { type: "string" }, description: "Common mistakes students make" },
                quizQuestions: { type: "array", items: { type: "object", properties: { question: { type: "string" }, answer: { type: "string" } } } },
                classFlow: { type: "string", description: "Suggested timeline and pacing for the class" },
              },
              required: ["objectives", "activities", "commonMistakes", "quizQuestions", "classFlow"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "create_lesson_plan" } },
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
