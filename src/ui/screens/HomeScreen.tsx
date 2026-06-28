import { useAppStore } from '../../core/state/store';

export function HomeScreen() {
  const setScreen = useAppStore(state => state.setScreen);
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-900 text-white p-4">
      <h1 className="text-4xl md:text-6xl font-bold mb-8 text-center text-yellow-500 tracking-widest uppercase">
        World of Warcraft
        <span className="block text-2xl md:text-3xl text-neutral-300 mt-2">The Board Game</span>
        <span className="block text-lg md:text-xl text-neutral-500 mt-1">Digital Edition</span>
      </h1>
      <button 
        onClick={() => setScreen('expansions')}
        className="px-8 py-4 bg-red-800 hover:bg-red-700 text-white font-bold rounded shadow-lg text-xl transition-colors"
      >
        Nueva Partida
      </button>
    </div>
  );
}
