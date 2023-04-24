import { create } from 'zustand';

interface AppState {
  ctr: number,
  increase: (by: number) => void
};

export const useAppStore = create<AppState>()((set) => ({
  ctr: 0,
  increase: (by: number) => set((state) => ({ ctr: state.ctr + by })),
}))