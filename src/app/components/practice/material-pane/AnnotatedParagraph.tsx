import type { ReactNode } from 'react';
import type { PassageAnnotation } from '@/lib/types';

export function AnnotatedParagraph({
  paragraph,
  paragraphIndex,
  annotations,
  onSelectAnnotation,
}: {
  paragraph: string;
  paragraphIndex: number;
  annotations: PassageAnnotation[];
  onSelectAnnotation: (annotation: PassageAnnotation) => void;
}) {
  const paragraphAnnotations = annotations
    .filter((annotation) => annotation.paragraphIndex === paragraphIndex)
    .filter((annotation) => paragraph.slice(annotation.startOffset, annotation.endOffset) === annotation.text)
    .sort((a, b) => a.startOffset - b.startOffset);

  const parts: ReactNode[] = [];
  let cursor = 0;

  paragraphAnnotations.forEach((annotation) => {
    if (annotation.startOffset < cursor) return;

    if (annotation.startOffset > cursor) {
      parts.push(paragraph.slice(cursor, annotation.startOffset));
    }

    const className = annotation.kind === 'note'
      ? 'rounded-md bg-amber-100 px-0.5 text-amber-950 underline decoration-amber-500/70 decoration-dotted underline-offset-4'
      : 'rounded-md bg-yellow-200/80 px-0.5 text-ink';

    parts.push(
      <span
        key={annotation.id}
        role="button"
        tabIndex={0}
        className={`${className} cursor-pointer transition-shadow hover:shadow-[0_0_0_2px_rgba(245,158,11,0.25)] focus:outline-none focus:ring-2 focus:ring-amber-400/60`}
        title={annotation.note ?? 'Highlighted locally'}
        onClick={() => onSelectAnnotation(annotation)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onSelectAnnotation(annotation);
          }
        }}
      >
        {annotation.text}
      </span>
    );

    cursor = annotation.endOffset;
  });

  if (cursor < paragraph.length) {
    parts.push(paragraph.slice(cursor));
  }

  return <>{parts}</>;
}
