import { useState } from 'react';
import { Search as SearchIcon, User } from 'lucide-react';
import Page from '../components/Page';
import GuessInputBar from '../components/GuessInputBar';
import { PlayerInfoTable } from '../components/AnswerOverlay';
import { api, errMsg } from '../api/client';
import { PlayerInfo } from '../types';
import { toast } from '../components/Toast';
import { useTranslation } from 'react-i18next';

/** 查角色:底部输入 + 自动补全,选中后在上方展示角色卡片 */
export default function Search() {
  const { t } = useTranslation();
  const [player, setPlayer] = useState<PlayerInfo | null>(null);

  const lookup = async (nickname: string) => {
    try {
      const res = await api.get<PlayerInfo[]>('/players', {
        params: { search: nickname },
      });
      const exact =
        res.data.find((p) => p.nickname.toLowerCase() === nickname.toLowerCase()) ??
        res.data[0] ??
        null;
      setPlayer(exact);
    } catch (err) {
      toast.error(errMsg(err));
    }
  };

  return (
    <Page
      title={t('search.title')}
      icon={<SearchIcon size={17} />}
      dock={
        <GuessInputBar
          onPick={(p) => void lookup(p.nickname)}
          placeholder={t('search.placeholder')}
          buttonText={t('search.button')}
        />
      }
    >
      <div className="player-search-content">
        {player ? (
          <div className="card">
            <h3>
              <User size={15} color="#6366f1" />
              {player.nickname}
              <span className="muted" style={{ fontWeight: 400 }}>
                {player.village} · {player.rank}
              </span>
            </h3>
            <PlayerInfoTable
              answer={{
                nickname: player.nickname,
                village: player.village,
                familyOrg: player.family_org,
                rank: player.rank,
                status: player.status,
                eyeTechnique: player.eye_technique,
                hasKekkei: player.has_kekkei,
                isJinchuriki: player.is_jinchuriki,
              }}
            />
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--text-light)' }}>
            <SearchIcon size={32} strokeWidth={1.5} />
            <p>{t('search.empty')}</p>
            <p style={{ fontSize: '0.8rem' }}>{t('search.fuzzy')}</p>
          </div>
        )}
      </div>
    </Page>
  );
}
