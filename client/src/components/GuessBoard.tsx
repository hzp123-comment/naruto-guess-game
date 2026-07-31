import { memo } from 'react';
import {
  AttributeFeedback,
  HiddenAttributeFeedback,
  MultiplayerGuessFeedback,
} from '../types';
import { useTranslation } from 'react-i18next';

function Cell({
  attr,
  label,
  bool,
  isArray,
}: {
  attr: AttributeFeedback | HiddenAttributeFeedback;
  label: string;
  bool?: boolean;
  isArray?: boolean;
}) {
  const { t } = useTranslation();
  if (!('value' in attr)) {
    return (
      <td className={`${attr.level} masked-cell`} data-label={label}>
        {attr.hint && attr.level !== 'correct' && (
          <span className="dir">?</span>
        )}
      </td>
    );
  }
  
  let text: string;
  if (bool) {
    text = attr.value ? t('common.yes') : t('common.no');
  } else if (isArray && Array.isArray(attr.value)) {
    text = attr.value.length > 0 ? attr.value.join(', ') : '-';
  } else {
    text = String(attr.value);
  }
  
  return (
    <td className={attr.level} data-label={label}>
      {text}
    </td>
  );
}

/** 猜测反馈表:每行一次猜测的逐属性对比 */
function GuessBoard({ guesses }: { guesses: MultiplayerGuessFeedback[] }) {
  const { t } = useTranslation();
  const columns = [
    t('guess.columns.nickname'),
    t('guess.columns.village'),
    t('guess.columns.familyOrg'),
    t('guess.columns.rank'),
    t('guess.columns.status'),
    t('guess.columns.eyeTechnique'),
    t('guess.columns.hasKekkei'),
    t('guess.columns.isJinchuriki'),
  ];
  
  return (
    <div className="game-table-wrap">
      <table className="game-table">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {guesses.map((g, i) => (
            <tr
              key={'hidden' in g ? `hidden-${i}` : `${g.playerId}-${i}`}
              className={`${i === guesses.length - 1 ? 'row-latest' : ''} ${g.correct ? 'row-correct' : ''}`}
            >
              <td
                className={`name ${g.correct ? 'correct' : ''} ${'hidden' in g ? 'masked-cell' : ''}`}
                data-label={columns[0]}
              >
                {'hidden' in g ? null : g.nickname}
              </td>
              <Cell attr={g.attributes.village} label={columns[1]} />
              <Cell attr={g.attributes.familyOrg} label={columns[2]} isArray />
              <Cell attr={g.attributes.rank} label={columns[3]} />
              <Cell attr={g.attributes.status} label={columns[4]} />
              <Cell attr={g.attributes.eyeTechnique} label={columns[5]} />
              <Cell attr={g.attributes.hasKekkei} label={columns[6]} bool />
              <Cell attr={g.attributes.isJinchuriki} label={columns[7]} bool />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default memo(GuessBoard);
