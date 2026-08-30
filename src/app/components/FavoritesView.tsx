'use client';

import type { CollectionItem } from '@/lib/collection-items';
import ReviewCollectionView from './questions/ReviewCollectionView';

interface FavoritesViewProps {
  initialItems: CollectionItem[];
  degraded?: boolean;
}

export default function FavoritesView({ initialItems, degraded }: FavoritesViewProps) {
  return <ReviewCollectionView kind="favorites" initialItems={initialItems} degraded={degraded} />;
}
