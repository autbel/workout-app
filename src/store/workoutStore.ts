import { create } from 'zustand';
import type { Exercise } from '@/src/types';

export interface CopiedSets {
  exerciseName: string;
  sets: { reps: string; weightKg: string }[];
}

interface WorkoutStore {
  /** AddExerciseScreen → WorkoutScreen へ渡す種目キュー */
  pendingExercises: Exercise[];
  pendingTemplateId: string | null;
  pendingTemplateName: string | null;
  addPending: (exercises: Exercise[], templateId?: string, templateName?: string) => void;
  clearPending: () => void;
  /** ExerciseHistoryScreen → WorkoutScreen へ渡すコピーセット */
  copiedSets: CopiedSets | null;
  setCopiedSets: (data: CopiedSets | null) => void;
  /** TemplateExercisePickerScreen → TemplateEditScreen へ渡す選択種目 */
  pickedTemplateExercise: { id: string; name: string } | null;
  setPickedTemplateExercise: (ex: { id: string; name: string } | null) => void;
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
  copiedSets: null,
  setCopiedSets: (data) => set({ copiedSets: data }),
  pickedTemplateExercise: null,
  setPickedTemplateExercise: (ex) => set({ pickedTemplateExercise: ex }),
}));
