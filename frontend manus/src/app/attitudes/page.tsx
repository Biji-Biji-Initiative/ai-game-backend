import AIAttitudeAssessment from '@/features/assessment/AIAttitudeAssessment';
import GamePhaseWrapper from '@/components/game/GamePhaseWrapper';
import { GamePhase } from '@/store/useGameStore';

export default function AttitudesPage() {
  return (
    <div className="container max-w-5xl mx-auto p-4 my-8">
      <div className="flex flex-col items-center mb-8">
        <h1 className="text-3xl font-bold text-center mb-2">Your AI Attitudes</h1>
        <p className="text-gray-600 dark:text-gray-300 text-center max-w-2xl">
          Understanding your perspective on artificial intelligence helps us identify your unique human edge.
          There are no right or wrong answers - be honest about your views.
        </p>
      </div>
      
      <GamePhaseWrapper targetPhase={GamePhase.ATTITUDES}>
        <AIAttitudeAssessment />
      </GamePhaseWrapper>
    </div>
  );
}
