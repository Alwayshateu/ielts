'use client';

import type { IeltsQuestion } from '@/lib/types';
import ReviewCollectionView from './questions/ReviewCollectionView';

interface WrongBookViewProps {
  initialQuestions: IeltsQuestion[];
  userId: string;
}

export default function WrongBookView({ initialQuestions, userId }: WrongBookViewProps) {
  return (
    <ReviewCollectionView
      kind="wrong-book"
      initialQuestions={initialQuestions}
      userId={userId}
    />
  );
}
