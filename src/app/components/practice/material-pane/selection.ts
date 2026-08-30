import type { PassageAnnotation } from '@/lib/types';

export type PendingSelection = {
  paragraphIndex: number;
  startOffset: number;
  endOffset: number;
  text: string;
  x: number;
  y: number;
};

function getParagraphElement(node: Node | null) {
  const element = node instanceof Element ? node : node?.parentElement;
  return element?.closest<HTMLElement>('[data-passage-paragraph]') ?? null;
}

function getTextOffset(container: HTMLElement, targetNode: Node, targetOffset: number) {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let offset = 0;
  let current = walker.nextNode();

  while (current) {
    if (current === targetNode) {
      return offset + targetOffset;
    }

    offset += current.textContent?.length ?? 0;
    current = walker.nextNode();
  }

  return offset;
}

export function getSelectionInParagraph() {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) return null;

  const range = selection.getRangeAt(0);
  const startParagraph = getParagraphElement(range.startContainer);
  const endParagraph = getParagraphElement(range.endContainer);

  if (!startParagraph || !endParagraph || startParagraph !== endParagraph) return null;

  const paragraphIndex = Number(startParagraph.dataset.passageParagraph);
  if (Number.isNaN(paragraphIndex)) return null;

  const rawStart = getTextOffset(startParagraph, range.startContainer, range.startOffset);
  const rawEnd = getTextOffset(startParagraph, range.endContainer, range.endOffset);
  const startOffset = Math.min(rawStart, rawEnd);
  const endOffset = Math.max(rawStart, rawEnd);
  const text = startParagraph.textContent?.slice(startOffset, endOffset).trim() ?? '';

  if (!text) return null;

  return {
    paragraphIndex,
    startOffset,
    endOffset,
    text,
  };
}

export function hasOverlap(
  annotations: PassageAnnotation[],
  next: Pick<PassageAnnotation, 'paragraphIndex' | 'startOffset' | 'endOffset'>
) {
  return annotations.some(
    (annotation) =>
      annotation.paragraphIndex === next.paragraphIndex &&
      Math.max(annotation.startOffset, next.startOffset) < Math.min(annotation.endOffset, next.endOffset)
  );
}
