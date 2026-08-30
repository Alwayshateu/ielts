import { BookOpenText, Headphones, Microphone, PenNib } from '@phosphor-icons/react';
import type { PracticeUnit } from '@/lib/types';

export function getMaterialMeta(unit: PracticeUnit) {
  if (unit.material_type === 'audio') {
    return {
      Icon: Headphones,
      label: 'Listening Section',
      hintTarget: 'Transcript',
      annotationTitle: 'Transcript 标注',
      emptyLabel: 'Audio placeholder',
      emptyDescription: '正式 Listening MVP 会接入 audio_url、播放进度和 transcript 同步。当前先用 transcript 预览“一段音频 + 多题组”的界面结构。',
      tone: 'sky',
    };
  }

  if (unit.material_type === 'writing_prompt') {
    return {
      Icon: PenNib,
      label: 'Writing Task',
      hintTarget: 'Prompt',
      annotationTitle: 'Prompt 标注',
      emptyLabel: 'Writing workspace preview',
      emptyDescription: '正式 Writing MVP 会接入字数目标、rubric、自评和反馈记录。当前先用本地草稿预览 Task response 流程。',
      tone: 'amber',
    };
  }

  if (unit.material_type === 'speaking_prompt') {
    return {
      Icon: Microphone,
      label: 'Speaking Session',
      hintTarget: 'Cue card',
      annotationTitle: 'Cue card 标注',
      emptyLabel: 'Speaking rehearsal preview',
      emptyDescription: '正式 Speaking MVP 会接入准备计时、录音、转写和反馈。当前先用文字要点预览 Part 2 回答流程。',
      tone: 'rose',
    };
  }

  return {
    Icon: BookOpenText,
    label: 'Reading Passage',
    hintTarget: 'Passage',
    annotationTitle: 'Passage 标注',
    emptyLabel: null,
    emptyDescription: null,
    tone: 'emerald',
  };
}
