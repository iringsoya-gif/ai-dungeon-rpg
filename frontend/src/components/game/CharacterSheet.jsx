export default function CharacterSheet({ character, onClose }) {
  if (!character) return null
  const { name, class: cls, background, level, xp, xp_to_next, stats, inventory, quests, status_effects, location } = character

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-white">{name}</h2>
            <p className="text-gray-400 text-sm">{cls} · Lv.{level || 1}</p>
            <p className="text-gray-600 text-xs mt-1">{background}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 text-xl leading-none">×</button>
        </div>

        <div className="mb-4">
          <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-2">능력치</h3>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "HP", value: `${stats?.hp ?? 0} / ${stats?.max_hp ?? 0}`, color: "text-red-400" },
              { label: "MP", value: `${stats?.mp ?? 0} / ${stats?.max_mp ?? 0}`, color: "text-blue-400" },
              { label: "힘", value: stats?.strength ?? 0, color: "text-orange-400" },
              { label: "지능", value: stats?.intelligence ?? 0, color: "text-purple-400" },
              { label: "민첩", value: stats?.agility ?? 0, color: "text-green-400" },
              { label: "카리스마", value: stats?.charisma ?? 0, color: "text-yellow-400" },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-gray-800 rounded-lg px-3 py-2 flex justify-between items-center">
                <span className="text-gray-400 text-xs">{label}</span>
                <span className={`font-semibold text-sm ${color}`}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>경험치</span>
            <span>{xp || 0} / {xp_to_next || 100}</span>
          </div>
          <div className="h-2 bg-gray-800 rounded-full">
            <div
              className="h-2 bg-yellow-500 rounded-full transition-all"
              style={{ width: `${Math.min(100, ((xp || 0) / (xp_to_next || 100)) * 100)}%` }}
            />
          </div>
        </div>

        <div className="mb-4">
          <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-1">현재 위치</h3>
          <p className="text-gray-300 text-sm">{location || '???'}</p>
        </div>

        {status_effects?.length > 0 && (
          <div className="mb-4">
            <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-2">상태이상</h3>
            <div className="flex flex-wrap gap-1">
              {status_effects.map((e, i) => (
                <span key={i} className="bg-purple-900/50 text-purple-300 border border-purple-700/50 rounded px-2 py-0.5 text-xs">{e}</span>
              ))}
            </div>
          </div>
        )}

        {inventory?.length > 0 && (
          <div className="mb-4">
            <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-2">인벤토리 ({inventory.length})</h3>
            <div className="grid grid-cols-2 gap-1">
              {inventory.map((item, i) => (
                <div key={i} className="bg-gray-800 rounded px-2 py-1.5 text-xs text-gray-300">{item}</div>
              ))}
            </div>
          </div>
        )}

        {quests?.length > 0 && (
          <div>
            <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-2">퀘스트 ({quests.length})</h3>
            <ul className="space-y-1">
              {quests.map((q, i) => (
                <li key={i} className="text-xs text-gray-300 flex items-start gap-1.5">
                  <span className="text-yellow-500 mt-0.5 flex-shrink-0">◆</span>
                  <span>{q}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}