/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect } from 'react';
import { HomeScreen } from './ui/screens/HomeScreen';
import { ExpansionSelectionScreen } from './ui/screens/ExpansionSelectionScreen';
import { PlayerCountScreen } from './ui/screens/PlayerCountScreen';
import { ClassSelectionScreen } from './ui/screens/ClassSelectionScreen';
import { MainGameScreen } from './ui/screens/MainGameScreen';
import { useAppStore } from './core/state/store';
import { useCharacterStore } from './core/state/characterStore';
import { ensureCardsLoaded } from './core/models/character';
import { ErrorBoundary } from './ui/components/ErrorBoundary';

export default function App() {
  const currentScreen = useAppStore(state => state.currentScreen);
  const setScreen = useAppStore(state => state.setScreen);
  const loadCharacter = useCharacterStore(state => state.loadCharacter);

  useEffect(() => {
    // Force loading of cards and character from local storage on mount
    ensureCardsLoaded();
    loadCharacter();
    (window as any).setAppScreen = setScreen;
  }, [loadCharacter, setScreen]);

  return (
    <ErrorBoundary>
      {currentScreen === 'home' && <HomeScreen />}
      {currentScreen === 'expansions' && <ExpansionSelectionScreen />}
      {currentScreen === 'players' && <PlayerCountScreen />}
      {currentScreen === 'classes' && <ClassSelectionScreen />}
      {currentScreen === 'game' && <MainGameScreen />}
    </ErrorBoundary>
  );
}
