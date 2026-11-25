import { useState } from 'react';
import type { TabDocument } from '@/domain/tab/types';
import type { TabTimingInspection, TabTimingTarget } from '@/domain/tab/timing-inspection';
import styles from './timing-inspection.module.css';

export function TimingInspectionPanel({ report, document, onNavigate, onClose }: {
    report: TabTimingInspection; document: TabDocument;
    onNavigate: (target: TabTimingTarget, origin: HTMLButtonElement) => void;
    onClose: () => void;
}) {
    const [shown, setShown] = useState({ invalid: 25, missing: 25 });
    return <section className={styles.panel} aria-label="Timing inspection">
        <div className={styles.heading}><p role="status">{report.timingInput === 'none'
            ? 'Free timing'
            : report.timingInput === 'unreadable' ? 'Score unreadable'
                : report.summary.missing ? 'Timing incomplete' : 'Timing supplied'}
            {report.summary.invalid === 0 && ' · No notation issues'}</p>
            <details className={styles.scope}>
                <summary>About this check</summary>
                <p className={styles.hint}>Written timing and structure only. Missing values are optional information.
                    Sounding overlap, ties in time and durations across barlines are not assessed.</p>
            </details>
            <button type="button" className={styles.action} aria-label="Close timing check" onClick={onClose}>Close</button></div>
        {(['invalid', 'missing'] as const).map(kind => {
            const issues = report.issues.filter(issue => issue.kind === kind);
            if (!issues.length) return null;
            return <details key={kind}>
                <summary>{kind === 'invalid' ? 'Check notation' : 'Not supplied'} · {issues.length}</summary>
                <ul>{issues.slice(0, shown[kind]).map((issue, index) => {
                    const target = issue.target;
                    const matches = target ? document.moments.filter(moment => moment.id === target.momentId) : [];
                    const moment = matches.length === 1 ? matches[0] : undefined;
                    const note = target?.noteId && moment?.notes.filter(note => note.id === target.noteId);
                    const available = Boolean(moment && (!target?.noteId || (note && note.length === 1)));
                    const location = moment ? `Bar ${moment.measure} · Position ${document.moments.indexOf(moment) + 1}${target?.string !== undefined ? ` · String ${target.string + 1}` : ''}` : 'Score';
                    return <li key={`${issue.code}-${index}`}>
                        <span>{issue.message}</span>
                        <button type="button" className={styles.action} disabled={!available}
                            onClick={event => target && onNavigate(target, event.currentTarget)}>{location}</button>
                    </li>;
                })}</ul>
                {issues.length > shown[kind] && <button type="button" className={styles.action}
                    onClick={() => setShown(previous => ({ ...previous, [kind]: previous[kind] + 25 }))}>Show next 25</button>}
            </details>;
        })}
    </section>;
}
