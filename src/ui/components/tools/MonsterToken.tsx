
export function MonsterToken({ monsterId, count, color, portraitUrl }: { monsterId: string; count: number; color: string; portraitUrl: string | null }) {
  return (
    <div className="relative flex items-center justify-center">
      <div 
        className="w-8 h-8 rounded-full border-2 border-white overflow-hidden shadow-md"
        style={{ borderColor: color }}
      >
        {portraitUrl ? (
          <img src={portraitUrl} alt="Monster" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-neutral-700 flex items-center justify-center text-[10px] text-white">?</div>
        )}
      </div>
      <div className="absolute -top-1 -right-1 bg-black text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border border-white">
        {count}
      </div>
    </div>
  );
}
