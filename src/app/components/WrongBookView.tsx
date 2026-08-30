'use client';

import type { CollectionItem } from '@/lib/collection-items';
import ReviewCollectionView from './questions/ReviewCollectionView';

interface WrongBookViewProps {
  initialItems: CollectionItem[];
  degraded?: boolean;
}

export default function WrongBookView({ initialItems, degraded }: WrongBookViewProps) {
  return <ReviewCollectionView kind="wrong-book" initialItems={initialItems} degraded={degraded} />;
}
