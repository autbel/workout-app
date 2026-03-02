import { create } from 'zustand';
import type { Exercise } from '@/src/types';

interface WorkoutStore {
  /** AddExerciseScreen → WorkoutScreen へ渡す種目キュー */
  pendingExercises: Exercise[];
  pendingTemplateId: string | null;
  pendingTemplateName: string | null;
  addPending: (exercises: Exercise[], templateId?: string, templateName?: string) => void;
  clearPending: () => void;
}

export const useWorkoutStore = create<WorkoutStore>((set) => ({
  pendingExercises: [],
  pendingTemplateId: null,
  pendingTemplateName: null,
  addPending: (exercises, templateId, templateName) =>
    set((state) => ({
      pendingExercises: [...state.pendingExercises, ...exercises],
      pendingTemplateId: templateId ?? state.pendingTemplateId,
      pendingTemplateName: templateName ?? state.pendingTemplateName,
    })),
  clearPending: () => set({ pendingExercises: [], pendingTemplateId: null, pendingTemplateName: null }),
}));
