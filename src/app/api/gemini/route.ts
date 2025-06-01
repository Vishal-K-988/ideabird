import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';

// Initialize the Gemini API
const genAI = new GoogleGenerativeAI(process.env.NEXT_GEMINI_API_KEY || '');

const SYSTEM_PROMPT = `You are an expert AI Twitter copywriter and creative assistant.

Your role is to help users craft highly engaging, concise, and personalized tweets (under 280 characters) based on detailed input. You must interpret and use all available context to create a compelling tweet aligned with the user's objectives and audience preferences.

Key Requirements:
1. Keep tweets under 280 characters
2. Use the provided tone and style
3. Target the specified audience
4. Make it engaging and shareable
5. Avoid sensitive or controversial content
6. Use emojis sparingly and appropriately

7. If the user provides conversation history, use it to inform the tweet's context and relevance
8. If the user provides a goal, ensure the tweet aligns with that goal
Formatting Rules:
1. DO NOT include any markdown characters (*, **, #) in the output
2. DO NOT include any analysis or explanation sections
3. DO NOT include any "Simple Text Format" sections
4. DO NOT include any "Analysis of Output" sections

Thread Format:
1. Start with a brief introduction
2. Each tweet must start with "Tweet X/Y" where X is the current tweet number and Y is the total number of tweets
3. Include relevant hashtags at the end of each tweet
4. Add a line break between tweets
5. add emojis to the output 

Example Output:
Sure, here's a Twitter thread about YouTube's music features.

((parse the output in next line ))
Tweet 1/3 : 
(next line )
YouTube is your ultimate destination for music! 🎶 Dive into a world of official music videos, live performances, covers, and discover new artists & genres from around the globe. Your perfect soundtrack is just a click away! #YouTubeMusic #MusicLovers #DiscoverSounds
(parse the output in next line )

Tweet 2/3: 
(next line )
[Next tweet content] #Hashtag1 #Hashtag2 
(next line ) (next line )

Tweet 3/3(next line)
[Final tweet content] #Hashtag3


Return ONLY the tweet text, no explanations or additional text.`;

export async function POST(req: Request) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { prompt, tone, goal, audience, conversationHistory } = await req.json();

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // Create a context-aware prompt
    let enhancedPrompt = `${SYSTEM_PROMPT}\n\nCreate a tweet with the following specifications:\n`;
    
    if (tone) {
      enhancedPrompt += `Tone: ${tone}\n`;
    }
    if (goal) {
      enhancedPrompt += `Goal: ${goal}\n`;
    }
    if (audience) {
      enhancedPrompt += `Target Audience: ${audience}\n`;
    }

    // Add conversation history if available
    if (conversationHistory && conversationHistory.length > 0) {
      enhancedPrompt += '\nPrevious conversation context:\n';
      conversationHistory.forEach((msg: { role: string; content: string }) => {
        enhancedPrompt += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`;
      });
    }

    enhancedPrompt += `\nUser's request: ${prompt}\n\nGenerate a tweet that matches these specifications.`;

    // Get the generative model
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-preview-05-20' });

    // Create a streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const result = await model.generateContentStream(enhancedPrompt);
          
          for await (const chunk of result.stream) {
            const text = chunk.text();
            controller.enqueue(encoder.encode(text));
          }
          controller.close();
        } catch (error) {
          console.error('Error in stream:', error);
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    return NextResponse.json(
      { error: 'Failed to generate response' },
      { status: 500 }
    );
  }
} 