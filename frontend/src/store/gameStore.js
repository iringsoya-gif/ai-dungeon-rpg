import { create } from 'zustand'

export const useGameStore = create((set) => ({
  game:             null,
  histories:        [],
  streamText:       '',
  levelUpNotif:     0,        // new level number on level-up, 0 = no notif
  visitedLocations: [],

  setGame: (data) => {
    const { histories, ...game } = data
    const loc = game.character?.location
    set({
      game,
      histories:        histories || [],
      visitedLocations: loc ? [loc] : [],
      levelUpNotif:     0,
    })
  },

  addHistory: (entry) => set((s) => ({ histories: [...s.histories, entry] })),

  updateCharacter: (character) =>
    set((s) => {
      const prevLevel = s.game?.character?.level ?? 0
      const newLevel  = character?.level ?? 0
      const loc       = character?.location
      const visited   = s.visitedLocations
      return {
        game:             s.game ? { ...s.game, character } : null,
        levelUpNotif:     newLevel > prevLevel ? newLevel : s.levelUpNotif,
        visitedLocations: loc && !visited.includes(loc) ? [...visited, loc] : visited,
      }
    }),

  clearLevelUp: () => set({ levelUpNotif: 0 }),

  updateWorld: (world) =>
    set((s) => ({ game: s.game ? { ...s.game, world } : null })),

  updateSnapshotTurn: (snapshot_turn) =>
    set((s) => ({ game: s.game ? { ...s.game, snapshot_turn } : null })),

  updateGameStatus: (status) =>
    set((s) => ({ game: s.game ? { ...s.game, status } : null })),

  appendStream: (text) => set((s) => ({ streamText: s.streamText + text })),
  clearStream:  ()     => set({ streamText: '' }),
}))
