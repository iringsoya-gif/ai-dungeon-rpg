export default function StatusPanel({ character, onOpenSheet }) {
  if (!character) return null
  const { stats, inventory, quests, location, level, xp, xp_to_next, in_battle, status_effects } = character
  if (!stats) return null

  const hpPct = Math.max(0, Math.min(100, (stats.hp / (stats.max_hp || 1)) * 100))
  const mpPct = Math.max(0, Math.min(100, (stats.mp / (stats.max_mp || 1)) * 100))
  const xpPct = Math.max(0, Math.min(100, ((xp || 0) / (xp_to_next || 100)) * 100))

  return (
    <div className="bg-gray-900 border-l border-gray-800 w-64 flex-shrink-0 p-4 flex flex-col gap-3 overflow-y-auto text-xs">
      {/* 캐릭터 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold text-white text-sm">{character.name}</p>
          <p className="text-gray-500">{character.class} Lv.{level || 1}</p>
        </div>
        <button
          onClick={onOpenSheet}
          className="text-gray-500 hover:text-gray-300 border border-gray-700 rounded px-2 py-1"
        >
          시트
        </button>
      </div>

      {in_battle && (
        <div className="bg-red-950 border border-red-700 rounded px-2 py-1 text-red-300 text-center animate-pulse">
          ⚔️ 전투 중
        </div>
      )}

      {/* HP */}
      <div>
        <div className="flex justify-between mb-1"><span className="text-gray-500">HP</span><span className="text-gray-400">{stats.hp}/{stats.max_hp}</span></div>
        <div className="h-1.5 bg-gray-800 rounded-full">
          <div className="h-1.5 bg-red-500 rounded-full transition-all" style={{ width: `${hpPct}%` }} />
        </div>
      </div>

      {/* MP */}
      <div>
        <div className="flex justify-between mb-1"><span className="text-gray-500">MP</span><span className="text-gray-400">{stats.mp}/{stats.max_mp}</span></div>
        <div className="h-1.5 bg-gray-800 rounded-full">
          <div className="h-1.5 bg-blue-500 rounded-full transition-all" style={{ width: `${mpPct}%` }} />
        </div>
      </div>

      {/* XP */}
      <div>
        <div className="flex justify-between mb-1"><span className="text-gray-500">XP</span><span className="text-gray-400">{xp || 0}/{xp_to_next || 100}</span></div>
        <div className="h-1.5 bg-gray-800 rounded-full">
          <div className="h-1.5 bg-yellow-500 rounded-full transition-all" style={{ width: `${xpPct}%` }} />
        </div>
      </div>

      {/* 위치 */}
      <div>
        <p className="text-gray-500 mb-1">🗺️ 위치</p>
        <p className="text-gray-300">{location || '???'}</p>
      </div>

      {/* 상태이상 */}
      {status_effects?.length > 0 && (
        <div>
          <p className="text-gray-500 mb-1">✨ 상태</p>
          <div className="flex flex-wrap gap-1">
            {status_effects.map((e, i) => (
              <span key={i} className="bg-purple-900/50 text-purple-300 border border-purple-700/50 rounded px-1.5 py-0.5">{e}</span>
            ))}
          </div>
        </div>
      )}

      {/* 인벤토리 */}
      <div>
        <p className="text-gray-500 mb-1">🎒 인벤토리 ({inventory?.length || 0})</p>
        <ul className="space-y-1">
          {(inventory || []).map((item, i) => (
            <li key={i} className="text-gray-400 bg-gray-800 rounded px-2 py-1 truncate" title={item}>{item}</li>
          ))}
        </ul>
      </div>

      {/* 퀘스트 */}
      {quests?.length > 0 && (
        <div>
          <p className="text-gray-500 mb-1">📋 퀘스트 ({quests.length})</p>
          <ul className="space-y-1">
            {quests.map((q, i) => (
              <li key={i} className="text-gray-400 flex items-start gap-1">
                <span className="text-yellow-500 mt-0.5">◆</span>
                <span>{q}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}