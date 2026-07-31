import { ReactNode, useEffect } from 'react';
import { MapPin, Users, Star, Heart, Eye, Droplets, Flame } from 'lucide-react';
import ModalPortal from './ModalPortal';
import { useTranslation } from 'react-i18next';

export interface AnswerInfo {
  nickname: string;
  village: string;
  familyOrg: string[];
  rank: string;
  status: string;
  eyeTechnique: string;
  hasKekkei: boolean;
  isJinchuriki: boolean;
}

/** 角色信息表(答案卡片/查询结果共用) */
export function PlayerInfoTable({ answer }: { answer: AnswerInfo }) {
  const { t } = useTranslation();
  const rows: [ReactNode, string, ReactNode][] = [
    [<MapPin size={14} key="i" />, t('guess.columns.village'), answer.village || '-'],
    [<Users size={14} key="i" />, t('guess.columns.familyOrg'), answer.familyOrg?.length ? answer.familyOrg.join(', ') : '-'],
    [<Star size={14} key="i" />, t('guess.columns.rank'), answer.rank || '-'],
    [<Heart size={14} key="i" />, t('guess.columns.status'), answer.status || '-'],
    [<Eye size={14} key="i" />, t('guess.columns.eyeTechnique'), answer.eyeTechnique || '-'],
    [<Droplets size={14} key="i" />, t('guess.columns.hasKekkei'), answer.hasKekkei ? t('common.yes') : t('common.no')],
    [<Flame size={14} key="i" />, t('guess.columns.isJinchuriki'), answer.isJinchuriki ? t('common.yes') : t('common.no')],
  ];
  return (
    <table className="player-info-table">
      <tbody>
        {rows.map(([icon, label, value]) => (
          <tr key={label}>
            <td className="label">
              {icon}
              {label}
            </td>
            <td className="value">{value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

interface Props {
  title: string;
  answer: AnswerInfo | null;
  extra?: ReactNode;
  actions: ReactNode;
  onClose?: () => void;
  tone?: 'win' | 'lose';
}

/** 结算/答案遮罩卡片 */
export default function AnswerOverlay({ title, answer, extra, actions, onClose, tone }: Props) {
  useEffect(() => {
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = oldOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  return (
    <ModalPortal>
      <div
        className="overlay"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) onClose?.();
        }}
      >
        <div
          className={`overlay-card${tone ? ` overlay-card-${tone}` : ''}`}
          role="dialog"
          aria-modal="true"
        >
          <h2>{title}</h2>
          {extra}
          {answer && (
            <>
              <p className="answer-name">{answer.nickname}</p>
              <PlayerInfoTable answer={answer} />
            </>
          )}
          <div className="btns">{actions}</div>
        </div>
      </div>
    </ModalPortal>
  );
}
