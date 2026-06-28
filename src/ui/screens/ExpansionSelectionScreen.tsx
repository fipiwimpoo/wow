import { useAppStore } from '../../core/state/store';

export function ExpansionSelectionScreen() {
  const setScreen = useAppStore(state => state.setScreen);
  const setExpansions = useAppStore(state => state.setExpansions);
  const selectedExpansions = useAppStore(state => state.selectedExpansions);

  const toggleExpansion = (id: string) => {
    if (selectedExpansions.includes(id)) {
      setExpansions(selectedExpansions.filter(e => e !== id));
    } else {
      setExpansions([...selectedExpansions, id]);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-900 text-white p-4">
      <h2 className="text-3xl font-bold mb-8 text-yellow-500 uppercase text-center">Selección de Expansiones</h2>
      
      <div className="flex flex-col gap-4 mb-8 w-full max-w-md">
        <label className="flex items-center gap-3 p-4 bg-neutral-800 rounded border border-neutral-700 cursor-pointer">
          <input type="checkbox" checked readOnly className="w-5 h-5 accent-yellow-500" />
          <span className="text-xl">Juego Base (Obligatorio)</span>
        </label>
        
        <label className="flex items-center gap-3 p-4 bg-neutral-800 rounded border border-neutral-700 cursor-pointer hover:bg-neutral-700 transition-colors">
          <input 
            type="checkbox" 
            checked={selectedExpansions.includes('shadow_of_war')}
            onChange={() => toggleExpansion('shadow_of_war')}
            className="w-5 h-5 accent-yellow-500" 
          />
          <span className="text-xl">Shadow of War</span>
        </label>

        <label className="flex items-center gap-3 p-4 bg-neutral-800 rounded border border-neutral-700 cursor-pointer hover:bg-neutral-700 transition-colors">
          <input 
            type="checkbox" 
            checked={selectedExpansions.includes('burning_crusade')}
            onChange={() => toggleExpansion('burning_crusade')}
            className="w-5 h-5 accent-yellow-500" 
          />
          <span className="text-xl">The Burning Crusade</span>
        </label>
      </div>

      <div className="flex gap-4">
        <button 
          onClick={() => setScreen('home')}
          className="px-6 py-3 bg-neutral-700 hover:bg-neutral-600 text-white font-bold rounded shadow transition-colors"
        >
          Volver
        </button>
        <button 
          onClick={() => setScreen('players')}
          className="px-6 py-3 bg-blue-700 hover:bg-blue-600 text-white font-bold rounded shadow transition-colors"
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}
