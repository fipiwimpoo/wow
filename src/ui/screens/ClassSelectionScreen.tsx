import { useState, useMemo } from 'react';
import { useAppStore } from '../../core/state/store';
import { useCharacterStore } from '../../core/state/characterStore';
import { 
  CLASS_PROGRESSION_TABLE, 
  CLASS_COLORS
} from '../../core/models/character';
import { OFFICIAL_CHARACTER_SHEETS, OfficialCharacterSheet } from '../../data/officialCharacters';
import { 
  Shield, 
  Sparkles, 
  Heart, 
  Zap, 
  User, 
  ArrowRight, 
  ArrowLeft, 
  Check, 
  Flame, 
  BookOpen, 
  ChevronRight 
} from 'lucide-react';

export function ClassSelectionScreen() {
  const setScreen = useAppStore(state => state.setScreen);
  const createCharacter = useCharacterStore(state => state.createCharacter);

  // Flow steps: 1 = Faction Selection, 2 = Character Sheet/Hero Selection, 3 = Name/Confirm
  const [step, setStep] = useState(1);
  const [selectedFaction, setSelectedFaction] = useState<'ALLIANCE' | 'HORDE' | null>(null);
  const [selectedHeroId, setSelectedHeroId] = useState<string | null>(null);
  const [charName, setCharName] = useState('');

  // Derived selections
  const filteredHeroes = useMemo(() => {
    if (!selectedFaction) return [];
    return OFFICIAL_CHARACTER_SHEETS.filter(hero => hero.faction === selectedFaction);
  }, [selectedFaction]);

  const selectedHero = useMemo(() => {
    if (!selectedHeroId) return null;
    return OFFICIAL_CHARACTER_SHEETS.find(hero => hero.id === selectedHeroId) || null;
  }, [selectedHeroId]);

  const classColor = useMemo(() => {
    if (!selectedHero) return '#F59E0B'; // amber default
    return CLASS_COLORS[selectedHero.classId] || '#F59E0B';
  }, [selectedHero]);

  // Handle faction selection
  const handleSelectFaction = (faction: 'ALLIANCE' | 'HORDE') => {
    setSelectedFaction(faction);
    setSelectedHeroId(null); // Reset hero if faction changes
    setStep(2);
  };

  // Handle hero selection
  const handleSelectHero = (heroId: string) => {
    setSelectedHeroId(heroId);
    setStep(3);
  };

  // Confirm and create character
  const handleConfirmCreation = () => {
    if (!selectedHero) return;
    const finalName = charName.trim() || selectedHero.displayName;
    
    // Pass the whole hero object or just the ID if we update characterStore
    // For now let's assume we update characterStore to handle this
    createCharacter(finalName, selectedHero.id);
    setScreen('game');
  };

  const stepsList = [
    { num: 1, label: 'Facción' },
    { num: 2, label: 'Ficha de Héroe' },
    { num: 3, label: 'Detalles y Confirmación' }
  ];

  return (
    <div className="flex flex-col min-h-screen bg-neutral-950 text-white font-sans select-none">
      {/* Upper Bar */}
      <header className="p-4 bg-neutral-900 border-b border-neutral-800 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-yellow-500" />
          <h2 className="text-xl font-extrabold tracking-wider text-yellow-500 uppercase">
            Creación de Personaje
          </h2>
        </div>
        <button 
          onClick={() => {
            if (step > 1) {
              setStep(prev => prev - 1);
            } else {
              setScreen('players');
            }
          }}
          className="flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors border border-neutral-700 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          {step > 1 ? 'Atrás' : 'Cancelar'}
        </button>
      </header>

      {/* Progress Steps Indicator */}
      <div className="bg-neutral-900/40 py-4 border-b border-neutral-900">
        <div className="max-w-2xl mx-auto px-4 flex justify-between items-center">
          {stepsList.map((s, idx) => {
            const isCompleted = step > s.num;
            const isActive = step === s.num;
            return (
              <div key={s.num} className="flex items-center flex-1 last:flex-initial">
                <div className="flex items-center gap-2">
                  <div 
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border transition-all ${
                      isCompleted 
                        ? 'bg-yellow-500 border-yellow-500 text-neutral-950' 
                        : isActive 
                        ? 'bg-neutral-800 border-yellow-500 text-yellow-400 font-black scale-105' 
                        : 'bg-neutral-950 border-neutral-800 text-neutral-500'
                    }`}
                  >
                    {isCompleted ? <Check className="w-4 h-4" /> : s.num}
                  </div>
                  <span 
                    className={`text-xs font-bold uppercase tracking-wider hidden sm:inline ${
                      isActive ? 'text-yellow-500' : isCompleted ? 'text-neutral-300' : 'text-neutral-500'
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
                {idx < stepsList.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-4 ${isCompleted ? 'bg-yellow-500/50' : 'bg-neutral-800'}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Screen Body */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-6 flex flex-col justify-center">
        
        {/* STEP 1: FACTION SELECTION */}
        {step === 1 && (
          <div className="flex flex-col items-center gap-8 max-w-4xl mx-auto w-full py-8">
            <div className="text-center">
              <h3 className="text-2xl font-black text-neutral-100 tracking-tight uppercase">
                1. Elige tu Facción
              </h3>
              <p className="text-neutral-500 text-sm mt-2 max-w-md">
                Las facciones oficiales definen qué fichas de personaje preimpresas tendrás disponibles para jugar.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 w-full mt-4">
              {/* Alliance Card */}
              <button
                onClick={() => handleSelectFaction('ALLIANCE')}
                id="faction-alliance-btn"
                className="group relative flex flex-col items-center text-center p-8 rounded-2xl bg-gradient-to-b from-blue-950/20 to-neutral-900 border-2 border-blue-900/40 hover:border-blue-500 transition-all hover:scale-[1.02] shadow-2xl cursor-pointer"
              >
                <div className="absolute top-4 right-4 bg-blue-500/10 border border-blue-500/30 text-blue-400 text-[10px] font-black uppercase px-2.5 py-1 rounded">
                  La Alianza
                </div>
                <div className="w-20 h-20 rounded-full bg-blue-950/50 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform mb-6">
                  <Shield className="w-10 h-10 fill-blue-500/10" />
                </div>
                <h4 className="text-2xl font-black tracking-wide text-blue-400 uppercase">
                  Alliance
                </h4>
                <p className="text-xs text-neutral-400 mt-3 leading-relaxed max-w-xs">
                  Bajo el estandarte del León dorado, los defensores de Azeroth luchan por la justicia, el orden y la Luz Sagrada.
                </p>
                <div className="mt-6 flex items-center gap-1.5 text-xs text-blue-400 font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                  <span>Seleccionar Héroes</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </button>

              {/* Horde Card */}
              <button
                onClick={() => handleSelectFaction('HORDE')}
                id="faction-horde-btn"
                className="group relative flex flex-col items-center text-center p-8 rounded-2xl bg-gradient-to-b from-red-950/20 to-neutral-900 border-2 border-red-950/40 hover:border-red-600 transition-all hover:scale-[1.02] shadow-2xl cursor-pointer"
              >
                <div className="absolute top-4 right-4 bg-red-500/10 border border-red-500/30 text-red-400 text-[10px] font-black uppercase px-2.5 py-1 rounded">
                  La Horda
                </div>
                <div className="w-20 h-20 rounded-full bg-red-950/50 border border-red-500/30 flex items-center justify-center text-red-500 group-hover:scale-110 transition-transform mb-6">
                  <Flame className="w-10 h-10 fill-red-500/10" />
                </div>
                <h4 className="text-2xl font-black tracking-wide text-red-500 uppercase">
                  Horde
                </h4>
                <p className="text-xs text-neutral-400 mt-3 leading-relaxed max-w-xs">
                  Impulsados por el honor y la supervivencia, los clanes indómitos luchan ferozmente para forjar su destino.
                </p>
                <div className="mt-6 flex items-center gap-1.5 text-xs text-red-400 font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                  <span>Seleccionar Héroes</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: CHARACTER SHEET / HERO SELECTION */}
        {step === 2 && (
          <div className="flex flex-col gap-6 py-4 animate-fade-in">
            <div className="text-center sm:text-left flex flex-col sm:flex-row justify-between items-center border-b border-neutral-900 pb-4 gap-2">
              <div>
                <span className={`text-xs font-black uppercase tracking-wider ${selectedFaction === 'ALLIANCE' ? 'text-blue-400' : 'text-red-400'}`}>
                  Fichas Oficiales · {selectedFaction === 'ALLIANCE' ? 'Alliance' : 'Horde'}
                </span>
                <h3 className="text-2xl font-black text-neutral-100 uppercase mt-0.5">
                  2. Elige tu Hoja de Personaje Preimpresa
                </h3>
              </div>
              <button 
                onClick={() => setStep(1)}
                className="text-xs text-yellow-500 hover:underline font-bold"
              >
                Cambiar Facción
              </button>
            </div>

            {/* Ficha card grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredHeroes.map((hero) => {
                const isSelected = selectedHeroId === hero.id;
                const heroColor = CLASS_COLORS[hero.classId] || '#ffffff';

                return (
                  <button
                    key={hero.id}
                    id={`hero-card-${hero.id}`}
                    onClick={() => handleSelectHero(hero.id)}
                    style={{ borderColor: isSelected ? heroColor : 'rgba(38, 38, 38, 0.5)' }}
                    className={`p-5 rounded-xl border text-left bg-neutral-900/60 hover:bg-neutral-900 hover:scale-[1.01] transition-all flex flex-col justify-between gap-4 cursor-pointer relative overflow-hidden group`}
                  >
                    {/* Top strip of class color */}
                    <div style={{ backgroundColor: heroColor }} className="absolute top-0 left-0 right-0 h-1" />

                    <div>
                      {/* Race & Class display */}
                      <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500 block">
                        {hero.race} · {hero.classId}
                      </span>
                      <h4 className="text-lg font-black text-white mt-1 group-hover:text-yellow-500 transition-colors">
                        {hero.displayName}
                      </h4>
                      <p className="text-xs text-neutral-400 mt-2 line-clamp-2 leading-relaxed">
                        {hero.description}
                      </p>
                    </div>

                    {/* Stats & Power block */}
                    <div className="flex flex-col gap-2.5 pt-3 border-t border-neutral-900/60">
                      <div className="flex gap-4">
                        <div className="flex items-center gap-1.5">
                          <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500/20" />
                          <span className="text-xs font-black text-red-400">{hero.hp} HP</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5 text-blue-500 fill-blue-500/20" />
                          <span className="text-xs font-black text-blue-400">{hero.energy} EN</span>
                        </div>
                      </div>

                      {/* Racial Power brief */}
                      <div className="bg-neutral-950/60 p-2.5 rounded border border-neutral-800">
                        <span className="text-[9px] font-black text-yellow-500 uppercase tracking-widest flex items-center gap-1">
                          <Sparkles className="w-2.5 h-2.5" />
                          {hero.racialPowerName}
                        </span>
                        <p className="text-[10px] text-neutral-400 mt-1 line-clamp-2 italic">
                          "{hero.racialPowerDescription}"
                        </p>
                      </div>
                    </div>

                    {/* Action prompt */}
                    <div className="text-[10px] font-bold text-yellow-500/80 group-hover:text-yellow-500 flex items-center gap-1 mt-1 justify-end">
                      <span>Elegir Héroe</span>
                      <ArrowRight className="w-3 h-3" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 3: DETAILS AND FINAL CONFIRMATION */}
        {step === 3 && selectedHero && (
          <div className="flex flex-col lg:flex-row gap-8 py-4 items-stretch animate-fade-in">
            
            {/* Column Left: Customization form & Progression Table */}
            <div className="flex-1 flex flex-col gap-6">
              
              {/* Back prompt */}
              <button 
                onClick={() => setStep(2)}
                className="text-xs text-neutral-400 hover:text-white flex items-center gap-1.5 font-bold self-start cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Elegir otra ficha de personaje
              </button>

              {/* Title & Lore */}
              <div>
                <span className={`text-xs font-black uppercase tracking-widest ${selectedHero.faction === 'ALLIANCE' ? 'text-blue-400' : 'text-red-400'}`}>
                  Resumen de Convocatoria · {selectedHero.faction === 'ALLIANCE' ? 'Alianza' : 'Horda'}
                </span>
                <h3 className="text-3xl font-black text-neutral-100 uppercase mt-1">
                  {selectedHero.displayName}
                </h3>
                <p className="text-sm text-neutral-400 mt-2 max-w-xl leading-relaxed">
                  {selectedHero.description}
                </p>
              </div>

              {/* Character naming */}
              <div className="bg-neutral-900/40 p-5 rounded-xl border border-neutral-900 flex flex-col gap-3">
                <label htmlFor="hero-name-input" className="text-xs font-black uppercase text-neutral-400 tracking-wider flex items-center gap-2">
                  <User className="w-4 h-4 text-neutral-500" />
                  Nombre del Héroe (Opcional)
                </label>
                <input
                  type="text"
                  id="hero-name-input"
                  placeholder={`Ej: ${selectedHero.displayName}`}
                  value={charName}
                  onChange={(e) => setCharName(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-yellow-600 transition-colors"
                  maxLength={20}
                />
                <span className="text-[10px] text-neutral-500 italic">
                  Si se deja vacío, se usará el nombre canónico de la ficha: "{selectedHero.displayName}"
                </span>
              </div>

              {/* Allowed Slots & Progression info */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="bg-neutral-900/20 p-4 rounded-xl border border-neutral-900/60 flex flex-col gap-2">
                  <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">
                    Slots de Equipamiento Permitidos
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1.5 text-neutral-300">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      <span>Main Hand</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-neutral-300">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      <span>Off Hand</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-neutral-300">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      <span>Armor</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-neutral-300">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      <span>Trinket</span>
                    </div>
                  </div>
                </div>

                <div className="bg-neutral-900/20 p-4 rounded-xl border border-neutral-900/60 flex flex-col gap-2">
                  <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">
                    Equipamiento Inicial
                  </span>
                  <p className="text-xs text-neutral-400 italic">
                    Sin equipo inicial equipado. Deberás adquirir armas y armaduras de nivel 1 completando misiones iniciales.
                  </p>
                </div>
              </div>

              {/* Table Progression view */}
              <div className="flex flex-col gap-2.5">
                <h4 className="text-xs font-black text-neutral-400 uppercase tracking-widest">
                  TABLA DE PROGRESIÓN OFICIAL (NIVEL 1–6)
                </h4>
                <div className="bg-neutral-950 rounded-xl border border-neutral-900 divide-y divide-neutral-900/50 text-xs">
                  <div className="grid grid-cols-3 p-2.5 text-neutral-500 font-extrabold uppercase text-[10px]">
                    <span>Nivel</span>
                    <span className="text-center">Vida Max</span>
                    <span className="text-right">Energía Max</span>
                  </div>
                  {[1, 2, 3, 4, 5, 6].map(lvl => {
                    const prog = CLASS_PROGRESSION_TABLE[selectedHero.classId]?.[lvl] || { maxHealth: 0, maxEnergy: 0 };
                    const isCurrent = lvl === 1;
                    return (
                      <div 
                        key={lvl} 
                        className={`grid grid-cols-3 p-3 ${isCurrent ? 'bg-yellow-500/10 font-bold text-yellow-400' : 'text-neutral-400'}`}
                      >
                        <span>Nivel {lvl} {isCurrent && '✓'}</span>
                        <span className="text-center text-red-400 font-semibold">{prog.maxHealth} HP</span>
                        <span className="text-right text-blue-400 font-semibold">{prog.maxEnergy} EN</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Column Right: Interactive Ficha Sheet Preview Card */}
            <div className="w-full lg:w-[400px] flex flex-col gap-6">
              
              <div className="bg-neutral-900 rounded-2xl border border-neutral-800 overflow-hidden relative shadow-2xl flex-1 flex flex-col justify-between">
                <div>
                  {/* Class glow strip */}
                  <div style={{ backgroundColor: classColor }} className="h-2 w-full" />
                  
                  <div className="p-6 flex flex-col gap-5">
                    
                    {/* Header of sheet */}
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-xs font-black uppercase tracking-widest text-neutral-500 block">
                          {selectedHero.race} · {selectedHero.classId}
                        </span>
                        <h4 className="text-2xl font-black text-white mt-1">
                          {charName.trim() || selectedHero.displayName}
                        </h4>
                      </div>
                      <div className="bg-neutral-850 text-yellow-500 px-3 py-1 rounded border border-neutral-700 text-xs font-black">
                        NIVEL 1
                      </div>
                    </div>

                    {/* Stats Panel */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-neutral-950/60 p-3 rounded-xl border border-neutral-800 flex items-center gap-3">
                        <div className="bg-red-950/50 p-2 rounded-lg text-red-500">
                          <Heart className="w-5 h-5 fill-red-500/20" />
                        </div>
                        <div>
                          <span className="text-[9px] text-neutral-500 block uppercase font-bold">Vida Inicial</span>
                          <span className="text-lg font-black text-red-400">
                            {selectedHero.hp} HP
                          </span>
                        </div>
                      </div>

                      <div className="bg-neutral-950/60 p-3 rounded-xl border border-neutral-800 flex items-center gap-3">
                        <div className="bg-blue-950/50 p-2 rounded-lg text-blue-500">
                          <Zap className="w-5 h-5 fill-blue-500/20" />
                        </div>
                        <div>
                          <span className="text-[9px] text-neutral-500 block uppercase font-bold">Energía Inicial</span>
                          <span className="text-lg font-black text-blue-400">
                            {selectedHero.energy} EN
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Racial power section */}
                    <div className="bg-neutral-950/40 p-4 rounded-xl border border-neutral-800/80">
                      <div className="flex items-center gap-1.5 text-xs font-black text-yellow-500 mb-1.5">
                        <Sparkles className="w-4 h-4 text-yellow-500" />
                        <span className="uppercase tracking-wide">{selectedHero.racialPowerName}</span>
                      </div>
                      <p className="text-xs text-neutral-300 leading-relaxed italic">
                        "{selectedHero.racialPowerDescription}"
                      </p>
                    </div>

                    {/* Ficha Preview placeholder */}
                    <div className="bg-neutral-950/60 border border-neutral-800 rounded-lg p-3 text-center flex flex-col items-center justify-center py-6 gap-2">
                      <BookOpen className="w-5 h-5 text-neutral-600" />
                      <span className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold">Layout de Ficha</span>
                      <span className="text-xs font-semibold text-neutral-400 bg-neutral-900 px-2 py-0.5 rounded">
                        {selectedHero.sheetKey}
                      </span>
                    </div>

                  </div>
                </div>

                {/* Confirm Trigger Button */}
                <div className="p-6 bg-neutral-950/30 border-t border-neutral-800/50">
                  <button
                    onClick={handleConfirmCreation}
                    id="confirm-creation-btn"
                    style={{ backgroundColor: classColor }}
                    className="w-full py-4 rounded-xl text-neutral-950 font-black text-sm tracking-wider uppercase flex items-center justify-center gap-2 hover:brightness-110 active:brightness-95 transition-all shadow-xl cursor-pointer"
                  >
                    <span>Invocar Héroe</span>
                    <ArrowRight className="w-4 h-4 text-neutral-950 font-bold" />
                  </button>
                </div>

              </div>

            </div>

          </div>
        )}

      </div>
    </div>
  );
}
