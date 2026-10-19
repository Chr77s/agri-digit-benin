import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api, rows } from '../../shared/api/client';
import type { Consent, Paginated } from '../../shared/api/types';
import { Alert, Badge, Button, Card, EmptyState, Icon, Modal, PageHeader, QueryState, fmtDate, toast } from '../../shared/ui';
import { ListenGhost } from '../producers/producerKit';

const useConsents = () =>
  useQuery({ queryKey: ['consents'], queryFn: async () => rows(await api<Paginated<Consent> | Consent[]>('/consents/mine')) });
const useWithdraw = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => api(`/consents/${id}/withdraw`, { method: 'POST', body: {} }), onSuccess: () => qc.invalidateQueries({ queryKey: ['consents'] }) });
};
/** Le partage pour le crédit se redonne par son propre endpoint (POST /credit/consent). */
const useGrantCredit = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: () => api('/credit/consent', { method: 'POST', body: {} }), onSuccess: () => qc.invalidateQueries({ queryKey: ['consents'] }) });
};

const purposeOf = (c: Consent) => String(c.type ?? c.purpose ?? 'donnees_personnelles');

export function ConsentsPage() {
  const { t } = useTranslation();
  const q = useConsents();
  const w = useWithdraw();
  const grant = useGrantCredit();
  const [confirm, setConfirm] = useState<Consent | null>(null);

  const doWithdraw = () => {
    if (!confirm) return;
    w.mutate(confirm.id, { onSuccess: () => { setConfirm(null); toast({ text: t('consents.withdrawn') }); } });
  };

  return (
    <>
      <PageHeader title={t('nav.consents')} desc={t('consents.desc')} crumbs={[{ label: t('nav.home'), to: '/' }, { label: t('nav.consents') }]}
        actions={<ListenGhost text={t('consents.listen')} />} />
      <div className="split">
        <div className="stack" style={{ ['--gap' as string]: '20px' }}>
          <Card title={t('consents.given')}>
            <div aria-live="polite">
              {grant.isSuccess && <Alert tone="ok">{t('consents.granted')}</Alert>}
              {grant.error && <Alert tone="danger">{grant.error.message}</Alert>}
            </div>
            <QueryState q={q}>
              {(d) => {
                const creditActive = d.some((c) => purposeOf(c) === 'credit' && !c.withdrawn_at);
                return (
                  <>
                    {d.length === 0 && <EmptyState icon="shield-check" title={t('consents.empty')} />}
                    {d.map((c) => {
                      const purpose = purposeOf(c);
                      const withdrawn = !!c.withdrawn_at;
                      const given = fmtDate(String(c.accepted_at ?? c.created_at ?? ''));
                      return (
                        <div key={c.id} className="cs">
                          <div>
                            <h3>{t(`consents.purpose.${purpose}`, purpose)} {withdrawn ? <Badge tone="neutral">{t('consents.withdrawnBadge')}</Badge> : <Badge tone="ok">{t('consents.active')}</Badge>}</h3>
                            <p className="small muted num">
                              {t(c.channel ? 'consents.detailChannel' : 'consents.detail', { version: String(c.text_version ?? 'v1'), date: given, channel: String(c.channel ?? '') })}
                              {withdrawn && ` · ${t('consents.withdrawnOn', { date: fmtDate(c.withdrawn_at) })}`}
                            </p>
                            {!withdrawn && <p className="small mt-1.5">{t(`consents.why.${purpose}`, { defaultValue: '' })}</p>}
                          </div>
                          {!withdrawn && <Button variant="danger" onClick={() => { w.reset(); setConfirm(c); }}>{t(`consents.withdrawBtn.${purpose}`, { defaultValue: t('consents.withdraw') })}</Button>}
                          {withdrawn && purpose === 'credit' && !creditActive && <Button variant="secondary" busy={grant.isPending} onClick={() => grant.mutate()}>{t('consents.giveAgain')}</Button>}
                        </div>
                      );
                    })}
                    {!d.some((c) => purposeOf(c) === 'credit') && (
                      <div className="cs">
                        <div>
                          <h3>{t('consents.purpose.credit')} <Badge tone="neutral">{t('consents.notGiven')}</Badge></h3>
                          <p className="small mt-1.5">{t('credit.shareText')}</p>
                        </div>
                        <Button variant="secondary" busy={grant.isPending} onClick={() => grant.mutate()}>{t('credit.acceptShare')}</Button>
                      </div>
                    )}
                  </>
                );
              }}
            </QueryState>
          </Card>
          <Card title={t('consents.accessTitle')} sub={t('consents.accessSub')}>
            <p className="small">{t('consents.accessText')}</p>
            <p className="small mt-2"><Link to="/contestations">{t('consents.accessReport')}</Link></p>
          </Card>
        </div>
        <Card tone="tint" title={t('consents.rightsTitle')}>
          <ul className="list">
            <li className="list-item"><span className="li-icon"><Icon name="eye" /></span><span className="li-main"><span className="li-title">{t('consents.rightSee')}</span><span className="li-meta">{t('consents.rightSeeText')} <Link to="/profil">{t('profile.title')}</Link>.</span></span></li>
            <li className="list-item"><span className="li-icon"><Icon name="download" /></span><span className="li-main"><span className="li-title">{t('consents.rightCopy')}</span><span className="li-meta">{t('consents.rightCopyText')}</span></span></li>
            <li className="list-item"><span className="li-icon"><Icon name="lock" /></span><span className="li-main"><span className="li-title">{t('consents.rightLocal')}</span><span className="li-meta">{t('consents.rightLocalText')}</span></span></li>
          </ul>
          <Button variant="secondary" block icon="download" className="mt-3" onClick={() => toast({ type: 'demo', text: t('consents.copyDemo') })}>{t('consents.copyBtn')}</Button>
          <p className="hint mt-2.5">{t('consents.dpo')}</p>
        </Card>
      </div>
      <Modal open={!!confirm} onClose={() => setConfirm(null)} title={confirm ? t('consents.confirmTitle', { name: t(`consents.purpose.${purposeOf(confirm)}`, purposeOf(confirm)) }) : ''}
        footer={<>
          <Button variant="ghost" onClick={() => setConfirm(null)}>{t('consents.keep')}</Button>
          <Button variant="dangerSolid" busy={w.isPending} onClick={doWithdraw}>{t('consents.withdrawShort')}</Button>
        </>}>
        <p>{confirm && t(`consents.confirmText.${purposeOf(confirm)}`, { defaultValue: t('consents.confirmTextDefault') })}</p>
        {w.error && <div className="mt-3"><Alert tone="danger" live>{w.error.message}</Alert></div>}
      </Modal>
    </>
  );
}
