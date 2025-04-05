import { NextResponse } from 'next/server';
import { getTraitsForApi } from '@/lib/server/get-traits';

/**
 * GET handler for traits assessment API
 * Returns a list of personality traits with default scores
 */
export async function GET() {
  try {
    const response = await getTraitsForApi();
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in traits API route:', error);
    
    return NextResponse.json(
      {
        success: false,
        status: 500,
        error: 'Failed to fetch traits data'
      },
      { status: 500 }
    );
  }
} 