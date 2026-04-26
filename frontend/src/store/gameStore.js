import { create } from 'zustand'

export const useGameStore = create((set) => ({
  game:        null,
  histories:   [],
  streamText:  '',

  setGame: (data) => {
    const { histories, ...game } = data
    set({ game, histories: histories || [] })
  },

  addHistory: (entry) => set((s) => ({ histories: [...s.histories, entry] })),

  updateCharacter: (character) =>
    set((s) => ({ game: s.game ? { ...s.game, character } : null })),

  appendStream: (text) => set((s) => ({ streamText: s.streamText + text })),
  clearStream:  ()     => set({ streamText: '' }),
}))