import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { content, title, images } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const hasContent = content && content.trim();
    const hasImages = images && images.length > 0;

    if (!hasContent && !hasImages) {
      throw new Error("No content or images provided");
    }

    console.log("Processing summarization request:", {
      contentLength: content?.length || 0,
      imageCount: images?.length || 0
    });

    // Build messages based on whether we have text, images, or both
    const userContent: any[] = [];
    
    if (hasImages) {
      // Add instruction for image processing
      userContent.push({
        type: "text",
        text: `Please analyze and extract all text content from the following ${images.length} page image(s) of a document${title ? ` titled "${title}"` : ''}. Then create a comprehensive summary, key points, flashcards, and quiz questions based on the content.${hasContent ? `\n\nAdditional text content extracted: ${content.substring(0, 30000)}` : ''}`
      });
      
      // Add images (limit to first 10 for performance)
      const imagesToProcess = images.slice(0, 10);
      for (const imageData of imagesToProcess) {
        userContent.push({
          type: "image_url",
          image_url: {
            url: imageData
          }
        });
      }
    } else {
      // Text-only content
      userContent.push({
        type: "text",
        text: `Summarize this content${title ? ` titled "${title}"` : ''}: ${content.substring(0, 50000)}`
      });
    }

    const messages = [
      { 
        role: "system", 
        content: `You are an educational assistant that creates summaries, flashcards, and quiz questions from lecture content. When processing images of documents, first extract all readable text, then create comprehensive educational materials. Be thorough in extracting text from images - read every line carefully.`
      },
      {
        role: "user",
        content: userContent
      }
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
        tools: [{
          type: "function",
          function: {
            name: "create_summary",
            description: "Create educational summary materials from the provided content",
            parameters: {
              type: "object",
              properties: {
                summary: { type: "string", description: "A comprehensive summary of the content (2-3 paragraphs)" },
                keyPoints: { type: "array", items: { type: "string" }, description: "5-7 key points from the content" },
                flashcards: { 
                  type: "array", 
                  items: { 
                    type: "object", 
                    properties: { 
                      front: { type: "string", description: "The question or term" }, 
                      back: { type: "string", description: "The answer or definition" } 
                    },
                    required: ["front", "back"]
                  },
                  description: "5-8 flashcards for studying"
                },
                quizQuestions: { 
                  type: "array", 
                  items: { 
                    type: "object", 
                    properties: { 
                      question: { type: "string" }, 
                      answer: { type: "string" } 
                    },
                    required: ["question", "answer"]
                  },
                  description: "5-8 quiz questions with answers"
                },
              },
              required: ["summary", "keyPoints", "flashcards", "quizQuestions"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "create_summary" } },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API Error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "API credits exhausted. Please contact support." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      throw new Error("AI request failed");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      console.error("No tool call in response:", JSON.stringify(data));
      throw new Error("Failed to generate summary");
    }
    
    const result = JSON.parse(toolCall.function.arguments);

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