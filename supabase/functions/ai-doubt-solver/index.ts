import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation helper
function validateInput(body: unknown): { question: string; subject: string; conversationHistory?: Array<{ role: string; content: string }> } | null {
  if (!body || typeof body !== 'object') return null;
  
  const data = body as Record<string, unknown>;
  
  // Validate question
  if (typeof data.question !== 'string' || data.question.length < 1 || data.question.length > 10000) {
    return null;
  }
  
  // Validate subject
  const validSubjects = ['computer_science', 'stem', 'humanities'];
  if (typeof data.subject !== 'string' || !validSubjects.includes(data.subject)) {
    return null;
  }
  
  // Validate conversation history if present
  let conversationHistory: Array<{ role: string; content: string }> | undefined;
  if (data.conversationHistory !== undefined) {
    if (!Array.isArray(data.conversationHistory)) return null;
    if (data.conversationHistory.length > 50) return null; // Limit history length
    
    conversationHistory = [];
    for (const msg of data.conversationHistory) {
      if (typeof msg !== 'object' || !msg) return null;
      const m = msg as Record<string, unknown>;
      if (typeof m.role !== 'string' || !['user', 'assistant'].includes(m.role)) return null;
      if (typeof m.content !== 'string' || m.content.length > 10000) return null;
      conversationHistory.push({ role: m.role, content: m.content });
    }
  }
  
  return {
    question: data.question,
    subject: data.subject,
    conversationHistory
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
    
    const { question, subject, conversationHistory } = validatedInput;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const subjectContext = {
      computer_science: "You are an expert in Computer Science, programming, algorithms, data structures, and software engineering.",
      stem: "You are an expert in Science, Technology, Engineering, and Mathematics including physics, chemistry, biology, and calculus.",
      humanities: "You are an expert in Humanities including history, literature, philosophy, and social sciences.",
    };

    const messages = [
      { role: "system", content: `${subjectContext[subject as keyof typeof subjectContext] || subjectContext.computer_science}

You are a helpful educational assistant for higher education students. Provide clear, step-by-step explanations. Use examples when helpful. Be encouraging and supportive. Format your responses with markdown when appropriate - use **bold** for important terms, bullet points for lists, and code blocks for code examples.` },
      ...(conversationHistory || []),
      { role: "user", content: question },
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ 
        model: "google/gemini-2.5-flash", 
        messages,
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required, please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const error = await response.text();
      console.error("AI error:", error);
      throw new Error("AI request failed");
    }

    // Return the stream directly
    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
