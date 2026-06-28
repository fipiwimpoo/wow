
export function MonsterEncounterDetails({ monsters, onClose }: { monsters: any[], onClose: () => void }) {
  return (
    <div className="fixed top-0 right-0 h-full w-80 bg-neutral-900 border-l border-neutral-700 shadow-xl p-4 z-[100] text-white">
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-bold">Encounter Details</h2>
        <button onClick={onClose}>Close</button>
      </div>
      <div className="space-y-4">
         {/* Detail list */}
         {monsters.map((m, i) => <div key={i} className="border-b border-neutral-800 pb-2">
            <p className="font-bold">{m.name}</p>
            <p className="text-xs text-neutral-400">Variant: {m.variant}</p>
         </div>)}
      </div>
    </div>
  );
}
