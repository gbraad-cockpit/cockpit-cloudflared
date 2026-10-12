import React from 'react';

import { Notify, NotifyVariant } from './notify';
import { TunnelsTab } from './tunnels';
import { ServicesTab } from './services';
import { ConfigTab } from './config';

import { Alert } from '@patternfly/react-core';

type Tab = 'tunnels' | 'services' | 'config';

type Notice = {
    variant: NotifyVariant;
    title: string;
    detail?: string;
    key: number;
}

type ApplicationState = {
    tab: Tab;
    notice: Notice | null;
}

export class Application extends React.Component<{}, ApplicationState> {
    state: ApplicationState = {
        tab: 'tunnels',
        notice: null,
    }

    private noticeKey = 0;

    notify: Notify = (variant, title, detail) => {
        this.noticeKey += 1;
        this.setState({ notice: { variant, title, detail, key: this.noticeKey } });
    }

    renderTabs() {
        const tabs: { id: Tab; label: string }[] = [
            { id: 'tunnels', label: 'Tunnels' },
            { id: 'services', label: 'Services' },
            { id: 'config', label: 'Config' },
        ];
        return (
            <div className="cf-tabs">
                {tabs.map(t => (
                    <button
                        key={t.id}
                        className={'cf-tab' + (this.state.tab === t.id ? ' cf-tab-active' : '')}
                        onClick={() => this.setState({ tab: t.id })}>
                        {t.label}
                    </button>
                ))}
            </div>
        );
    }

    render() {
        const { tab, notice } = this.state;

        return (
            <div className="cf-app">
                <h1>Cloudflare tunnels</h1>

                {notice && (
                    <div className="cf-notice">
                        <Alert
                            variant={notice.variant}
                            isInline
                            title={notice.title}
                            actionClose={<button className="cf-btn cf-btn-sm" onClick={() => this.setState({ notice: null })}>Dismiss</button>}>
                            {notice.detail}
                        </Alert>
                    </div>
                )}

                {this.renderTabs()}

                <div className="cf-tab-body">
                    {tab === 'tunnels' && <TunnelsTab notify={this.notify} />}
                    {tab === 'services' && <ServicesTab notify={this.notify} />}
                    {tab === 'config' && <ConfigTab notify={this.notify} />}
                </div>
            </div>
        );
    }
}
