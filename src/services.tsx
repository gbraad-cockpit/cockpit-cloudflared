import React from 'react';

import { ServiceUnit } from './types';
import { Notify } from './notify';
import * as api from './api';

type Props = {
    notify: Notify;
}

type State = {
    units: ServiceUnit[] | null;
    error: string | null;
    busy: string | null;
    logsUnit: string | null;
    logs: string | null;
    logsError: string | null;
}

export class ServicesTab extends React.Component<Props, State> {
    state: State = {
        units: null,
        error: null,
        busy: null,
        logsUnit: null,
        logs: null,
        logsError: null,
    }

    constructor(props: Props) {
        super(props);
        this.refresh();
    }

    refresh = () => {
        return api.listServiceUnits()
            .then(names => Promise.all(names.map(name => api.unitStatus(name))))
            .then(units => this.setState({ units, error: null }))
            .catch(e => this.setState({ error: String(e.message || e) }));
    }

    doAction = (action: string, name: string) => {
        this.setState({ busy: name });
        api.unitAction(action, name)
            .then(() => this.props.notify('success', `systemctl ${action} ${name}`, 'Command completed'))
            .catch(e => this.props.notify('danger', `systemctl ${action} ${name} failed`, String(e.message || e)))
            .then(() => {
                this.setState({ busy: null });
                this.refresh();
            });
    }

    showLogs = (name: string) => {
        this.setState({ logsUnit: name, logs: null, logsError: null });
        api.unitLogs(name)
            .then(logs => this.setState({ logs }))
            .catch(e => this.setState({ logsError: String(e.message || e) }));
    }

    renderBadge(unit: ServiceUnit) {
        const active = unit.activeState === 'active' && (unit.subState === 'running' || unit.subState === 'exited');
        return <span className={active ? 'cf-badge cf-badge-ok' : 'cf-badge cf-badge-bad'}>
            {unit.activeState}{unit.subState ? ' (' + unit.subState + ')' : ''}
        </span>;
    }

    render() {
        const { units, error, busy, logsUnit, logs, logsError } = this.state;

        return (
            <div>
                <div className="cf-toolbar">
                    <button className="cf-btn" onClick={this.refresh}>Refresh</button>
                </div>

                {error && <p className="cf-error">{error}</p>}
                {units == null && !error && <p>Loading...</p>}
                {units != null && units.length === 0 && <p>No cloudflared systemd units found.</p>}

                {units != null && units.length > 0 && (
                    <table className="cf-table">
                        <thead>
                            <tr>
                                <th>Unit</th><th>Status</th><th>Enabled</th>
                                <th>PID</th><th>Memory</th><th>Since</th><th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {units.map(unit => (
                                <tr key={unit.name}>
                                    <td>
                                        <div className="cf-strong">{unit.name}</div>
                                        <div className="cf-hint">{unit.description || ''}</div>
                                    </td>
                                    <td>{this.renderBadge(unit)}</td>
                                    <td>{unit.unitFileState || '-'}</td>
                                    <td>{unit.mainPid && unit.mainPid !== '0' ? unit.mainPid : '-'}</td>
                                    <td>{api.formatBytes(unit.memory)}</td>
                                    <td>{unit.activeState === 'active' ? api.formatTime(unit.activeEnterTimestamp) : '-'}</td>
                                    <td>
                                        <span className="cf-inline cf-inline-wrap">
                                            <button className="cf-btn cf-btn-sm" disabled={busy === unit.name}
                                                onClick={() => this.doAction('start', unit.name)}>Start</button>
                                            <button className="cf-btn cf-btn-sm" disabled={busy === unit.name}
                                                onClick={() => this.doAction('stop', unit.name)}>Stop</button>
                                            <button className="cf-btn cf-btn-sm" disabled={busy === unit.name}
                                                onClick={() => this.doAction('restart', unit.name)}>Restart</button>
                                            {unit.unitFileState === 'enabled'
                                                ? <button className="cf-btn cf-btn-sm" disabled={busy === unit.name}
                                                    onClick={() => this.doAction('disable', unit.name)}>Disable</button>
                                                : <button className="cf-btn cf-btn-sm" disabled={busy === unit.name || unit.unitFileState === 'static'}
                                                    onClick={() => this.doAction('enable', unit.name)}>Enable</button>}
                                            <button className="cf-btn cf-btn-sm" onClick={() => this.showLogs(unit.name)}>Logs</button>
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                {logsUnit && (
                    <div className="cf-panel">
                        <div className="cf-panel-head">
                            <h3>Logs: {logsUnit}</h3>
                            <span className="cf-inline">
                                <button className="cf-btn cf-btn-sm" onClick={() => this.showLogs(logsUnit)}>Reload</button>
                                <button className="cf-btn cf-btn-sm" onClick={() => this.setState({ logsUnit: null, logs: null, logsError: null })}>Close</button>
                            </span>
                        </div>
                        {logsError && <p className="cf-error">{logsError}</p>}
                        {logs == null && !logsError && <p>Loading logs...</p>}
                        {logs != null && <pre className="cf-pre">{logs || '(no log entries)'}</pre>}
                    </div>
                )}
            </div>
        );
    }
}
