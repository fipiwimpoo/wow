import { useAppStore } from '../../core/state/store';

export function PlayerCountScreen() {
  const setScreen = useAppStore(state => state.setScreen);
  const playerCount = useAppStore(state => state.playerCount);
  const setPlayerCount = useAppStore(state => state.setPlayerCount);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-900 text-white p-4">
      <h2 className="text-3xl font-bold mb-8 text-yellow-500 uppercase text-center">Cantidad de Jugadores</h2>
      
      <div className="flex flex-wrap justify-center gap-4 mb-8">
        {[2, 3, 4, 5, 6].map(num => (
          <button
            key={num}
            onClick={() => setPlayerCount(num)}
            className={`w-16 h-16 text-2xl font-bold rounded shadow transition-colors ${
              playerCount === num ? 'bg-yellow-600 text-white' : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
            }`}
          >
            {num}
          </button>
        ))}
      </div>

      <div className="flex gap-4">
        <button 
          onClick={() => setScreen('expansions')}
          className="px-6 py-3 bg-neutral-700 hover:bg-neutral-600 text-white font-bold rounded shadow transition-colors"
        >
          Volver
        </button>
        <button 
          onClick={() => setScreen('classes')}
          className="px-6 py-3 bg-blue-700 hover:bg-blue-600 text-white font-bold rounded shadow transition-colors"
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}
