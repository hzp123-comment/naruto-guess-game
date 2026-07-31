import { FormEvent, useEffect, useId, useRef, useState } from 'react';
import { X } from 'lucide-react';
import ModalPortal from '../ModalPortal';
import { toast } from '../Toast';
import { useTranslation } from 'react-i18next';
import DifficultyMultiSelect from './DifficultyMultiSelect';

export interface PlayerForm {
  id?: number;
  nickname: string;
  village: string;
  family_org: string;
  rank: string;
  status: string;
  eye_technique: string;
  has_kekkei: boolean;
  is_jinchuriki: boolean;
  difficulties: string[];
  is_enabled: boolean;
}

export const emptyPlayer: PlayerForm = {
  nickname: '',
  village: '木叶隐村',
  family_org: '[]',
  rank: '中忍',
  status: '存活',
  eye_technique: '无',
  has_kekkei: false,
  is_jinchuriki: false,
  difficulties: ['normal'],
  is_enabled: true,
};

interface Props {
  initial: PlayerForm;
  difficultyKeys: string[];
  onSubmit: (form: PlayerForm) => Promise<void>;
  onCancel: () => void;
}

export default function PlayerEditForm({ initial, difficultyKeys, onSubmit, onCancel }: Props) {
  const { t } = useTranslation();
  const [form, setForm] = useState<PlayerForm>(initial);
  const [saving, setSaving] = useState(false);
  const titleId = useId();
  const firstInputRef = useRef<HTMLInputElement>(null);
  const set = (patch: Partial<PlayerForm>) => setForm((current) => ({ ...current, ...patch }));

  useEffect(() => {
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    firstInputRef.current?.focus();
    return () => {
      document.body.style.overflow = oldOverflow;
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !saving) onCancel();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [onCancel, saving]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await onSubmit(form);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('admin.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalPortal>
      <div
        className="admin-player-backdrop"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget && !saving) onCancel();
        }}
      >
        <div className="admin-player-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId}>
          <div className="admin-player-dialog-heading">
            <div>
              <h2 id={titleId}>{form.id ? t('admin.editPlayer', { player: form.nickname }) : t('admin.addPlayer')}</h2>
              <p>{t('admin.formDescription')}</p>
            </div>
            <button className="confirm-close" type="button" aria-label={t('common.close')} onClick={onCancel} disabled={saving}>
              <X size={18} />
            </button>
          </div>

          <form onSubmit={submit}>
          <div className="admin-player-form-grid">
            <label className="admin-player-field">
              <span>{t('admin.playerNickname')}</span>
              <input ref={firstInputRef} className="input" value={form.nickname} onChange={(event) => set({ nickname: event.target.value })} required />
            </label>
            <label className="admin-player-field">
              <span>{t('admin.village')}</span>
              <input className="input" value={form.village} onChange={(event) => set({ village: event.target.value })} required />
            </label>
            <label className="admin-player-field">
              <span>{t('admin.familyOrg')}</span>
              <input className="input" value={form.family_org} onChange={(event) => set({ family_org: event.target.value })} placeholder='["宇智波一族"]' />
            </label>
            <label className="admin-player-field">
              <span>{t('admin.rank')}</span>
              <input className="input" value={form.rank} onChange={(event) => set({ rank: event.target.value })} />
            </label>
            <label className="admin-player-field">
              <span>{t('admin.status')}</span>
              <input className="input" value={form.status} onChange={(event) => set({ status: event.target.value })} />
            </label>
            <label className="admin-player-field">
              <span>{t('admin.eyeTechnique')}</span>
              <input className="input" value={form.eye_technique} onChange={(event) => set({ eye_technique: event.target.value })} />
            </label>
          </div>

          <div className="admin-player-flags">
            <div className="admin-player-difficulty-field">
              <span className="admin-player-flag-label">{t('admin.difficulties')}</span>
              <DifficultyMultiSelect
                options={difficultyKeys}
                value={form.difficulties}
                onChange={(difficulties) => set({ difficulties })}
              />
            </div>
            <label><input type="checkbox" checked={form.has_kekkei} onChange={(event) => set({ has_kekkei: event.target.checked })} />{t('admin.hasKekkei')}</label>
            <label><input type="checkbox" checked={form.is_jinchuriki} onChange={(event) => set({ is_jinchuriki: event.target.checked })} />{t('admin.isJinchuriki')}</label>
            <label><input type="checkbox" checked={form.is_enabled} onChange={(event) => set({ is_enabled: event.target.checked })} />{t('admin.enabledPlayer')}</label>
          </div>

          <div className="admin-player-dialog-actions">
            <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={saving}>{t('common.cancel')}</button>
            <button className="btn btn-green" disabled={saving || form.difficulties.length === 0}>{saving ? t('admin.saving') : form.id ? t('admin.saveChanges') : t('admin.addPlayer')}</button>
          </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
}
