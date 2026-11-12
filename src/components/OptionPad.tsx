import type { AnswerOption } from '@/engine/engine';

export interface OptionPadProps {
  options: AnswerOption[];
  eliminated: string[];
  onAnswer: (id: string) => void;
}

export function OptionPad({ options, eliminated, onAnswer }: OptionPadProps) {
  return (
    <section className="option-pad" aria-label="층 선택지">
      <h2>몇 층일까요?</h2>
      <div className="option-list">
        {options.map((option, index) => {
          const removed = eliminated.includes(option.id);
          return (
            <button
              className={`option${removed ? ' eliminated' : ''}`}
              key={option.id}
              type="button"
              disabled={removed}
              onClick={() => onAnswer(option.id)}
              style={{ minHeight: 56 }}
            >
              <span className="option-number" aria-hidden="true">{removed ? '✗' : index + 1}</span>
              <span className="option-name">{option.label}</span>
              {removed && <small>아니에요</small>}
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default OptionPad;
