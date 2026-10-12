import React from 'react';

import { Notify } from './notify';
import * as api from './api';

type Props = {
    notify: Notify;
}

type State = {
    path: string;
    content: string | null;
    original: string | null;
    loading: boolean;
    busy: string | null;
    error: string | null;
}

const DEFAULT_PATH = '/etc/cloudflared/config.yml';

export class ConfigTab extends React.Component<Props, State> {
    state: State = {
        path: DEFAULT_PATH,
        content: null,
        original: null,
        loading: false,
        busy: null,
        error: null,
    }

    constructor(props: Props) {
        super(props);
        this.load();
    }

    load = () => {
        this.setState({ loading: true, error: null });
        return api.readFile(this.state.path)
            .then(content => this.setState({ content, original: content, loading: false }))
            .catch(e => this.setState({ error: String(e.message || e), loading: false }));
    }

    validate = () => {
        this.setState({ busy: 'validate' });
        api.validateIngress(this.state.path)
            .then(() => this.props.notify('success', 'Config is valid', this.state.path))
            .catch(e => this.props.notify('danger', 'Config validation failed', String(e.message || e)))
            .then(() => this.setState({ busy: null }));
    }

    save = () => {
        if (this.state.content == null)
            return;
        this.setState({ busy: 'save' });
        api.writeFile(this.state.path, this.state.content)
            .then(() => {
                this.props.notify('success', 'Config saved', this.state.path);
                this.setState({ original: this.state.content });
            })
            .catch(e => this.props.notify('danger', 'Could not save config', String(e.message || e)))
            .then(() => this.setState({ busy: null }));
    }

    restartService = () => {
        this.setState({ busy: 'restart' });
        api.unitAction('restart', 'cloudflared.service')
            .then(() => this.props.notify('success', 'cloudflared.service restarted', 'Changes applied'))
            .catch(e => this.props.notify('danger', 'Could not restart cloudflared.service', String(e.message || e)))
            .then(() => this.setState({ busy: null }));
    }

    render() {
        const { path, content, original, loading, busy, error } = this.state;
        const dirty = content != null && original != null && content !== original;

        return (
            <div>
                <div className="cf-field">
                    <label>Config file</label>
                    <div className="cf-inline">
                        <input
                            type="text"
                            className="cf-grow"
                            value={path}
                            onChange={e => this.setState({ path: e.target.value })} />
                        <button className="cf-btn" disabled={loading} onClick={this.load}>Load</button>
                    </div>
                    <p className="cf-hint">
                        Default: <code>{DEFAULT_PATH}</code>. Saving needs administrator (root) privileges.
                    </p>
                </div>

                {error && <p className="cf-error">{error}</p>}
                {loading && <p>Loading...</p>}

                {content != null && !loading && (
                    <div>
                        <textarea
                            className="cf-textarea"
                            spellCheck={false}
                            value={content}
                            onChange={e => this.setState({ content: e.target.value })} />
                        <div className="cf-actions">
                            <button className="cf-btn" disabled={busy != null} onClick={this.validate}>
                                {busy === 'validate' ? 'Validating...' : 'Validate'}
                            </button>
                            <button className="cf-btn cf-btn-primary" disabled={busy != null || !dirty} onClick={this.save}>
                                {busy === 'save' ? 'Saving...' : (dirty ? 'Save changes' : 'Saved')}
                            </button>
                            <button className="cf-btn" disabled={busy != null} onClick={this.restartService}>
                                {busy === 'restart' ? 'Restarting...' : 'Restart cloudflared.service'}
                            </button>
                            {dirty && <span className="cf-hint">Unsaved changes</span>}
                        </div>
                    </div>
                )}
            </div>
        );
    }
}
