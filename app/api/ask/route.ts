import { NextRequest, NextResponse } from 'next/server';
import { answerQuestionFromContext } from '@/lib/ai';
import type { AskRequest, AskResponse } from '@/types/instagram';

export async function POST(request: NextRequest) {
  try {
    const body: AskRequest = await request.json();

    // Validate question
    if (!body.question || typeof body.question !== 'string' || body.question.trim().length === 0) {
      return NextResponse.json(
        { error: 'Question is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    // Validate that at least one data source is provided
    if (!body.profileData && !body.commentsData) {
      return NextResponse.json(
        { error: 'Either profileData or commentsData must be provided' },
        { status: 400 }
      );
    }

    // Validate contextType matches provided data
    if (body.contextType === 'profile' && !body.profileData) {
      return NextResponse.json(
        { error: 'profileData is required when contextType is "profile"' },
        { status: 400 }
      );
    }

    if (body.contextType === 'post' && !body.commentsData) {
      return NextResponse.json(
        { error: 'commentsData is required when contextType is "post"' },
        { status: 400 }
      );
    }

    try {
      const answer = await answerQuestionFromContext({
        question: body.question.trim(),
        profile: body.profileData,
        comments: body.commentsData,
        conversationHistory: body.conversationHistory,
      });

      const response: AskResponse = {
        answer,
      };

      return NextResponse.json(response);
    } catch (error: any) {
      console.error('AI answer error:', error);
      return NextResponse.json(
        {
          error: error.message || 'Failed to get AI answer',
          details: error.toString(),
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('API route error:', error);
    return NextResponse.json(
      {
        error: 'Invalid request format',
        details: error.message,
      },
      { status: 400 }
    );
  }
}

