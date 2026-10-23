import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Badge, Button, Card, Checkbox, Dialog, EmptyState, Field, Input, PageHeader, QueryState, Select, Skeleton, Table, Tabs, fieldError, fmtDate, fmtNum, toast } from '../../shared/ui';
import { useDepartments, usePlaceName } from '../../shared/api/ref';
import { useAuth } from '../auth/AuthContext';
import {
  TRAINING_AUDIENCES, TRAINING_THEMES, useAttendance, useCreateTraining, useRegistrants, useRegistration, useTrainingReport, useTrainings,
  type Registrant, type Training, type TrainingReportRow,
} from './api';
import { FormError, gap, isoDay } from './FormError';

const ACTORS = ['producteur', 'transformateur', 'distributeur', 'gestionnaire_cooperative'];
const MANAGERS = ['agent_atda', 'admin_maep'];

/** Formations : séances par département, inscription volontaire des acteurs, présence enregistrée par l'agent, rapport. */
export function TrainingsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [adding, setAdding] = useState(false);
  const canCreate = MANAGERS.includes(user?.role ?? '');
  const staff = canCreate || user?.role === 'responsable_programme';
  const list = <Sessions />;
  return (
    <>
      <PageHeader title={t('mk.train.title')} desc={t(staff ? 'mk.train.descStaff' : 'mk.train.desc')} crumbs={[{ label: t('nav.home'), to: '/' }, { label: t('nav.trainings') }]}
        actions={canCreate ? <Button icon="plus" onClick={() => setAdding(true)}>{t('mk.train.add')}</Button> : undefined} />
      {staff ? (
        <Tabs label={t('mk.train.title')} tabs={[{ id: 'sessions', label: t('mk.train.tabSessions'), content: list }, { id: 'report', label: t('mk.train.tabReport'), content: <Report /> }]} />
      ) : list}
      {adding && <TrainingDialog onClose={() => setAdding(false)} />}
    </>
  );
}

function Sessions() {
  const { t } = useTranslation();
  const q = useTrainings();
  return (
    <QueryState q={q} empty={(d) => d.length === 0} emptyText={<div className="card"><EmptyState title={t('mk.train.empty')} icon="calendar">{t('mk.train.emptyHelp')}</EmptyState></div>}>
      {(d) => <div className="grid-fit" style={{ '--min': '320px' } as React.CSSProperties}>{d.map((s) => <SessionCard key={s.id} s={s} />)}</div>}
    </QueryState>
  );
}

function SessionCard({ s }: { s: Training }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const place = usePlaceName();
  const reg = useRegistration();
  const [people, setPeople] = useState(false);
  const past = s.date < isoDay();
  const actor = ACTORS.includes(user?.role ?? '');
  const mine = s.my_registration;
  return (
    <Card title={s.title} sub={`${fmtDate(s.date)} · ${s.place} · ${place(s.department)}`} actions={past ? <Badge tone="draft">{t('mk.train.past')}</Badge> : s.seats_left === 0 ? <Badge tone="wait">{t('mk.train.full')}</Badge> : undefined}>
      <div className="stack" style={gap(10)}>
        <p className="small"><b>{t(`mk.train.theme.${s.theme}`)}</b> · {t('mk.train.audience')} {s.audience.map((a) => t(`roles.${a}`)).join(', ')}</p>
        <p className="small">{t('mk.train.seats', { left: s.seats_left, total: s.seats })}{s.manage && <> · {t('mk.train.counts', { registered: s.registered, present: s.present ?? 0, absent: s.absent ?? 0 })}</>}</p>
        {actor && mine && (
          <p><Badge tone={mine.attended === true ? 'ok' : mine.attended === false ? 'bad' : 'wait'}>{t(mine.attended === true ? 'mk.train.attended' : mine.attended === false ? 'mk.train.absent' : 'mk.train.registered')}</Badge></p>
        )}
        <FormError error={reg.error} />
        <div className="cluster">
          {actor && !past && !mine && <Button icon="check" busy={reg.isPending} disabled={s.seats_left === 0} onClick={() => reg.mutate({ id: s.id, join: true }, { onSuccess: () => toast(t('mk.train.joined')) })}>{t('mk.train.join')}</Button>}
          {actor && mine && mine.attended === null && s.date > isoDay() && (
            <Button variant="ghost" busy={reg.isPending} onClick={() => reg.mutate({ id: s.id, join: false }, { onSuccess: () => toast(t('mk.train.left')) })}>{t('mk.train.leave')}</Button>
          )}
          {s.manage && <Button variant="secondary" icon="users" onClick={() => setPeople(true)}>{t('mk.train.people')}</Button>}
        </div>
      </div>
      {people && <PeopleDialog s={s} onClose={() => setPeople(false)} />}
    </Card>
  );
}

/** Liste des inscrits ; la présence s'enregistre à partir du jour de la formation. */
function PeopleDialog({ s, onClose }: { s: Training; onClose: () => void }) {
  const { t } = useTranslation();
  const q = useRegistrants(s.id);
  const mark = useAttendance(s.id);
  const early = s.date > isoDay();
  return (
    <Dialog open onClose={onClose} title={t('mk.train.peopleTitle', { title: s.title })} footer={<Button variant="ghost" onClick={onClose}>{t('common.close')}</Button>}>
      <div className="stack" style={gap(12)}>
        {early && <Alert tone="info">{t('mk.train.attendanceLater')}</Alert>}
        <QueryState q={q} empty={(d) => d.length === 0} emptyText={<p className="muted">{t('mk.train.noRegistrants')}</p>}>
          {(d) => (
            <Table<Registrant> caption={t('mk.train.peopleTitle', { title: s.title })} rowKey={(r) => r.id} data={d} pageSize={10}
              columns={[
                { key: 'name', label: t('common.name'), primary: true, render: (r) => <><span className="cell-main">{r.name}</span><span className="cell-sub">{t(`roles.${r.role}`)}</span></> },
                { key: 'attended', label: t('mk.train.present'), render: (r) => (
                  <Checkbox label={t('mk.train.presentFor', { name: r.name })} checked={r.attended === true} disabled={early || mark.isPending}
                    onChange={(e) => mark.mutate({ registration: r.id, present: e.target.checked }, { onSuccess: () => void q.refetch() })} />
                ) },
              ]} />
          )}
        </QueryState>
        <FormError error={mark.error} />
      </div>
    </Dialog>
  );
}

function Report() {
  const { t } = useTranslation();
  const place = usePlaceName();
  const q = useTrainingReport(true);
  if (!q.data) return <div className="card"><Skeleton lines={3} /></div>;
  const { results, total } = q.data;
  const pct = (r: TrainingReportRow) => (r.attendance_pct === null ? t('common.notAvailable') : `${r.attendance_pct} %`);
  return (
    <Card title={t('mk.train.reportTitle')} sub={t('mk.train.reportSub')}>
      {results.length === 0 ? <p className="muted">{t('mk.train.reportEmpty')}</p> : (
        <Table<TrainingReportRow & { id: string }> caption={t('mk.train.reportTitle')} rowKey={(r) => r.id} exportName="formations" pageSize={12}
          data={[...results.map((r) => ({ ...r, id: r.department ?? '' })), { ...total, id: 'total', department: '' }]}
          columns={[
            { key: 'department', label: t('common.department'), primary: true, render: (r) => (r.id === 'total' ? <b>{t('mk.train.total')}</b> : place(r.department)), csv: (r) => r.department },
            { key: 'sessions', label: t('mk.train.sessions'), num: true, render: (r) => fmtNum(r.sessions) },
            { key: 'seats', label: t('mk.train.seatsCol'), num: true, render: (r) => fmtNum(r.seats) },
            { key: 'registered', label: t('mk.train.registeredCol'), num: true, render: (r) => fmtNum(r.registered) },
            { key: 'present', label: t('mk.train.presentCol'), num: true, render: (r) => fmtNum(r.present) },
            { key: 'absent', label: t('mk.train.absentCol'), num: true, render: (r) => fmtNum(r.absent) },
            { key: 'to_record', label: t('mk.train.toRecord'), num: true, render: (r) => fmtNum(r.to_record) },
            { key: 'attendance_pct', label: t('mk.train.rate'), num: true, render: pct, csv: (r) => r.attendance_pct },
          ]} />
      )}
    </Card>
  );
}

function TrainingDialog({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const deps = useDepartments();
  const m = useCreateTraining();
  const agent = user?.role === 'agent_atda';
  const [v, setV] = useState({ title: '', theme: 'transformation', department: agent ? user?.department ?? '' : '', date: '', place: '', seats: '' });
  const [audience, setAudience] = useState<string[]>(['transformateur', 'distributeur']);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const toggle = (a: string) => setAudience(audience.includes(a) ? audience.filter((x) => x !== a) : [...audience, a]);
  const err = (k: string) => errs[k] ?? fieldError(m.error, k);
  return (
    <Dialog open onClose={onClose} title={t('mk.train.add')} footer={<><Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button><Button type="submit" form="f-training" busy={m.isPending}>{t('common.save')}</Button></>}>
      <form id="f-training" noValidate className="stack" onSubmit={(e) => {
        e.preventDefault();
        const er: Record<string, string> = {};
        const seats = Number(v.seats);
        if (v.title.trim().length < 3) er.title = t('mk.train.errTitle');
        if (!v.department) er.department = t('mk.train.errDepartment');
        if (!v.date || v.date < isoDay()) er.date = t('mk.train.errDate');
        if (v.place.trim().length < 2) er.place = t('mk.train.errPlace');
        if (!Number.isInteger(seats) || seats < 1 || seats > 1000) er.seats = t('mk.train.errSeats');
        if (!audience.length) er.audience = t('mk.train.errAudience');
        setErrs(er);
        if (Object.keys(er).length) return;
        m.mutate({ title: v.title.trim(), theme: v.theme, department: v.department, date: v.date, place: v.place.trim(), seats, audience }, { onSuccess: () => { toast(t('mk.train.created')); onClose(); } });
      }}>
        <Field label={t('mk.train.titleLabel')} error={err('title')}>{(p) => <Input {...p} value={v.title} maxLength={150} onChange={(e) => setV({ ...v, title: e.target.value })} />}</Field>
        <div className="form-grid">
          <Field label={t('mk.train.themeLabel')} error={err('theme')}>{(p) => <Select {...p} value={v.theme} onChange={(e) => setV({ ...v, theme: e.target.value })} options={TRAINING_THEMES.map((k) => ({ value: k, label: t(`mk.train.theme.${k}`) }))} />}</Field>
          <Field label={t('common.department')} error={err('department')} hint={agent ? t('mk.train.ownDepartment') : undefined}>{(p) => (
            <Select {...p} value={v.department} disabled={agent && !!user?.department} onChange={(e) => setV({ ...v, department: e.target.value })} placeholder={t('common.choose')} options={(deps.data ?? []).map((d) => ({ value: d.code, label: d.name }))} />
          )}</Field>
          <Field label={t('common.date')} error={err('date')}>{(p) => <Input {...p} type="date" min={isoDay()} value={v.date} onChange={(e) => setV({ ...v, date: e.target.value })} />}</Field>
          <Field label={t('mk.train.seatsLabel')} error={err('seats')}>{(p) => <Input {...p} inputMode="numeric" className="input-num" value={v.seats} onChange={(e) => setV({ ...v, seats: e.target.value.replace(/\D/g, '') })} />}</Field>
        </div>
        <Field label={t('mk.train.placeLabel')} error={err('place')}>{(p) => <Input {...p} value={v.place} maxLength={150} onChange={(e) => setV({ ...v, place: e.target.value })} />}</Field>
        <fieldset className="fieldset">
          <legend className="label">{t('mk.train.audienceLabel')}</legend>
          <div className="cluster" style={gap(12)}>{TRAINING_AUDIENCES.map((a) => <Checkbox key={a} label={t(`roles.${a}`)} checked={audience.includes(a)} onChange={() => toggle(a)} />)}</div>
          {err('audience') && <p className="field-error" role="alert">{err('audience')}</p>}
        </fieldset>
        <FormError error={m.error} />
      </form>
    </Dialog>
  );
}
