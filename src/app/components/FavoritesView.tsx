'use client';

import type { IeltsQuestion } from '@/lib/types';
import ReviewCollectionView from './questions/ReviewCollectionView';

interface FavoritesViewProps {
  initialQuestions: IeltsQuestion[];
  userId: string;
}

export default function FavoritesView({ initialQuestions, userId }: FavoritesViewProps) {
  return (
    <ReviewCollectionView
      kind="favorites"
      initialQuestions={initialQuestions}
      userId={userId}
    />
  );
}
