import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation helper
function validateInput(body: unknown): { 
  assignmentTitle: string; 
  instructions: string; 
  studentSubmission: string; 
  maxPoints: number 
} | null {
  if (!body || typeof body !== 'object') return null;
  
  const data = body as Record<string, unknown>;
  
  // Validate assignmentTitle
  if (typeof data.assignmentTitle !== 'string' || data.assignmentTitle.length < 1 || data.assignmentTitle.length > 500) {
    return null;
  }
  
  // Validate instructions
  if (typeof data.instructions !== 'string' || data.instructions.length < 1 || data.instructions.length > 10000) {
    return null;
  }
  
  // Validate studentSubmission
  if (typeof data.studentSubmission !== 'string' || data.studentSubmission.length < 1 || data.studentSubmission.length > 50000) {
    return null;
  }
  
  // Validate maxPoints (1-1000)
  let maxPoints = 100;
  if (typeof data.maxPoints === 'number') {
    maxPoints = Math.min(1000, Math.max(1, Math.floor(data.maxPoints)));
  }
  
  return {
    assignmentTitle: data.assignmentTitle,
    instructions: data.instructions,
    studentSubmission: data.studentSubmission,
    maxPoints
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    
    // Validate input
    const validatedInput = validateInput(body);
    if (!validatedInput) {
      return new Response(JSON.stringify({ error: "Invalid input parameters" }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const { assignmentTitle, instructions, studentSubmission, maxPoints } = validatedInput;
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Grading assignment:', assignmentTitle);

    const systemPrompt = `You are an expert academic evaluator. Your task is to grade student assignments fairly and provide constructive feedback.

Guidelines:
- Evaluate based on understanding, accuracy, completeness, and clarity
- Be encouraging but honest about areas needing improvement
- Provide specific, actionable feedback
- Grade out of ${maxPoints} points
- Consider partial credit for partially correct answers`;

    const userPrompt = `Please grade the following assignment submission:

**Assignment Title:** ${assignmentTitle}

**Assignment Instructions:** ${instructions}

**Student's Submission:** ${studentSubmission}

Please provide:
1. A numerical grade out of ${maxPoints}
2. Detailed feedback explaining the grade and how to improve

Respond in JSON format:
{
  "grade": <number>,
  "feedback": "<detailed feedback string>"
}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded, please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Payment required, please add funds.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    console.log('AI response:', content);

    // Parse the JSON response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse AI response');
    }

    const result = JSON.parse(jsonMatch[0]);
    
    // Ensure grade is within bounds
    const grade = Math.min(Math.max(0, Math.round(result.grade)), maxPoints);

    return new Response(JSON.stringify({
      grade,
      feedback: result.feedback,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error grading assignment:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Failed to grade assignment' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
