import React from 'react';

import { CloudflareTunnel, TunnelInfo } from './types';
import { Notify } from './notify';
import * as api from './api';

import { Icon } from '@patternfly/react-core';
import ExclamationCircleIcon from '@patternfly/react-icons/dist/esm/icons/exclamation-circle-icon';
import CheckCircleIcon from '@patternfly/react-icons/dist/esm/icons/check-circle-icon';
import {
    Table, Caption, Thead, Tbody, Tr, Th, Td,
} from '@patternfly/react-table';

type Props = {
    notify: Notify;
}

type State = {
    tunnels: CloudflareTunnel[] | null;
    error: string | null;
    busy: string | null;
    selected: string | null;
    info: TunnelInfo | null;
    infoLoading: boolean;
    infoError: string | null;
    showCreate: boolean;
    createName: string;
    createHostname: string;
    routeHost: string;
    confirmDelete: string | null;
}

export class TunnelsTab extends React.Component<Props, State> {
    state: State = {
        tunnels: null,
        error: null,
        busy: null,
        selected: null,
        info: null,
        infoLoading: false,
        infoError: null,
        showCreate: false,
        createName: '',
        createHostname: '',
        routeHost: '',
        confirmDelete: null,
    }

    constructor(props: Props) {
        super(props);
        this.refresh();
    }

    refresh = () => {
        return api.listTunnels()
            .then(tunnels => this.setState({ tunnels, error: null }))
            .catch(e => this.setState({ error: String(e.message || e) }));
    }

    openInfo = (tunnel: CloudflareTunnel) => {
        this.setState({ selected: tunnel.name, info: null, infoLoading: true, infoError: null });
        api.tunnelInfo(tunnel.name)
            .then(info => this.setState({ info, infoLoading: false }))
            .catch(e => this.setState({ infoError: String(e.message || e), infoLoading: false }));
    }

    closeInfo = () => this.setState({ selected: null, info: null, infoError: null });

    doCreate = () => {
        const name = this.state.createName.trim();
        if (!name)
            return;
        this.setState({ busy: 'create' });
        api.createTunnel(name)
            .then(output => {
                const match = output.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
                const id = match ? match[1] : name;
                const hostname = this.state.createHostname.trim();
                if (hostname) {
                    return api.routeDns(name, hostname)
                        .then(() => this.props.notify('success', `Tunnel created`, `${name} (${id}) with DNS ${hostname} -> tunnel`))
                        .catch(e => this.props.notify('warning', `Tunnel ${name} created, but DNS routing failed`, String(e.message || e)));
                }
                this.props.notify('success', 'Tunnel created', `${name} (${id})`);
            })
            .catch(e => this.props.notify('danger', 'Could not create tunnel', String(e.message || e)))
            .then(() => {
                this.setState({ busy: null, showCreate: false, createName: '', createHostname: '' });
                this.refresh();
            });
    }

    doRoute = (tunnel: string) => {
        const hostname = this.state.routeHost.trim();
        if (!hostname)
            return;
        this.setState({ busy: tunnel });
        api.routeDns(tunnel, hostname, true)
            .then(() => {
                this.props.notify('success', 'DNS route created', `${hostname} -> ${tunnel}`);
                this.setState({ routeHost: '' });
            })
            .catch(e => this.props.notify('danger', 'Could not route DNS', String(e.message || e)))
            .then(() => {
                this.setState({ busy: null });
                this.refresh();
            });
    }

    doDelete = (tunnel: CloudflareTunnel) => {
        this.setState({ busy: tunnel.name });
        api.deleteTunnel(tunnel.name, true)
            .then(() => {
                this.props.notify('success', 'Tunnel deleted', tunnel.name);
                this.setState({ confirmDelete: null });
                if (this.state.selected === tunnel.name)
                    this.closeInfo();
            })
            .catch(e => this.props.notify('danger', 'Could not delete tunnel', String(e.message || e)))
            .then(() => {
                this.setState({ busy: null });
                this.refresh();
            });
    }

    renderCreateForm() {
        return (
            <div className="cf-panel">
                <h3>Create tunnel</h3>
                <div className="cf-field">
                    <label>Tunnel name</label>
                    <input
                        type="text"
                        value={this.state.createName}
                        placeholder="my-tunnel"
                        onChange={e => this.setState({ createName: e.target.value })} />
                </div>
                <div className="cf-field">
                    <label>DNS hostname <span className="cf-hint">(optional, e.g. app.example.com)</span></label>
                    <input
                        type="text"
                        value={this.state.createHostname}
                        placeholder="app.example.com"
                        onChange={e => this.setState({ createHostname: e.target.value })} />
                </div>
                <div className="cf-actions">
                    <button
                        className="cf-btn cf-btn-primary"
                        disabled={this.state.busy === 'create' || !this.state.createName.trim()}
                        onClick={this.doCreate}>
                        {this.state.busy === 'create' ? 'Creating...' : 'Create'}
                    </button>
                    <button
                        className="cf-btn"
                        onClick={() => this.setState({ showCreate: false, createName: '', createHostname: '' })}>
                        Cancel
                    </button>
                </div>
            </div>
        );
    }

    renderInfo() {
        const { info, infoLoading, infoError } = this.state;
        const colos = api.connectorColos(info);
        return (
            <div className="cf-panel">
                <div className="cf-panel-head">
                    <h3>Details</h3>
                    <button className="cf-btn cf-btn-sm" onClick={this.closeInfo}>Close</button>
                </div>
                {infoLoading && <p>Loading tunnel info...</p>}
                {infoError && <p className="cf-error">{infoError}</p>}
                {info && (
                    <div>
                        <dl className="cf-dl">
                            <dt>Name</dt><dd>{info.name}</dd>
                            <dt>ID</dt><dd className="cf-mono">{info.id}</dd>
                            <dt>Created</dt><dd>{api.formatTime(info.createdAt)}</dd>
                            <dt>Active edge</dt><dd>{colos || 'none'}</dd>
                        </dl>
                        <div className="cf-field">
                            <label>Route DNS hostname to this tunnel</label>
                            <div className="cf-inline">
                                <input
                                    type="text"
                                    value={this.state.routeHost}
                                    placeholder="app.example.com"
                                    onChange={e => this.setState({ routeHost: e.target.value })} />
                                <button
                                    className="cf-btn"
                                    disabled={!this.state.routeHost.trim() || this.state.busy === info.name}
                                    onClick={() => this.doRoute(info.name)}>
                                    Route DNS
                                </button>
                            </div>
                        </div>
                        <h4>Connectors</h4>
                        {(!info.conns || info.conns.length === 0)
                            ? <p>No active connectors.</p>
                            : (
                                <table className="cf-table">
                                    <thead>
                                        <tr>
                                            <th>Connector ID</th><th>Version</th><th>Arch</th>
                                            <th>Origin IP</th><th>Edge</th><th>Running since</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {info.conns.map(c => {
                                            const edges = (c.conns || []).map(e => e.colo_name).join(', ');
                                            const origin = (c.conns && c.conns[0] && c.conns[0].origin_ip) || '-';
                                            return (
                                                <tr key={c.id}>
                                                    <td className="cf-mono">{c.id}</td>
                                                    <td>{c.version || '-'}</td>
                                                    <td>{c.arch || '-'}</td>
                                                    <td>{origin}</td>
                                                    <td>{edges || '-'}</td>
                                                    <td>{api.formatTime(c.run_at)}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            )}
                    </div>
                )}
            </div>
        );
    }

    render() {
        const { tunnels, error, selected, confirmDelete } = this.state;

        return (
            <div>
                <div className="cf-toolbar">
                    <button className="cf-btn" onClick={this.refresh}>Refresh</button>
                    <button
                        className="cf-btn cf-btn-primary"
                        onClick={() => this.setState({ showCreate: !this.state.showCreate, confirmDelete: null })}>
                        Create tunnel
                    </button>
                </div>

                {error && <p className="cf-error">{error}</p>}
                {tunnels == null && !error && <p>Loading...</p>}
                {tunnels != null && tunnels.length === 0 && <p>No Cloudflare tunnels found.</p>}

                {this.state.showCreate && this.renderCreateForm()}

                {tunnels != null && tunnels.length > 0 && (
                    <Table aria-label="Cloudflare tunnels" variant='compact' borders={false}>
                        <Caption>Cloudflare tunnels</Caption>
                        <Thead>
                            <Tr>
                                <Th></Th>
                                <Th>Name</Th>
                                <Th>ID</Th>
                                <Th>Created</Th>
                                <Th>Connections</Th>
                                <Th>Actions</Th>
                            </Tr>
                        </Thead>
                        <Tbody>
                            {tunnels.map(tunnel => (
                                <Tr key={tunnel.id}>
                                    <Td>
                                        {tunnel.connections && tunnel.connections.length > 0
                                            ? <Icon status="success"><CheckCircleIcon /></Icon>
                                            : <Icon status="danger"><ExclamationCircleIcon /></Icon>}
                                    </Td>
                                    <Td>{tunnel.name}</Td>
                                    <Td className="cf-mono">{tunnel.id}</Td>
                                    <Td>{api.formatTime(tunnel.created_at)}</Td>
                                    <Td>
                                        {(tunnel.connections || []).map((c, i) => c.colo_name).join(', ') || '-'}
                                    </Td>
                                    <Td>
                                        {confirmDelete === tunnel.name
                                            ? (
                                                <span className="cf-inline">
                                                    <button
                                                        className="cf-btn cf-btn-danger cf-btn-sm"
                                                        disabled={this.state.busy === tunnel.name}
                                                        onClick={() => this.doDelete(tunnel)}>
                                                        Confirm delete
                                                    </button>
                                                    <button
                                                        className="cf-btn cf-btn-sm"
                                                        onClick={() => this.setState({ confirmDelete: null })}>
                                                        Cancel
                                                    </button>
                                                </span>
                                            )
                                            : (
                                                <span className="cf-inline">
                                                    <button
                                                        className="cf-btn cf-btn-sm"
                                                        onClick={() => this.openInfo(tunnel)}>
                                                        Info
                                                    </button>
                                                    <button
                                                        className="cf-btn cf-btn-sm cf-btn-danger"
                                                        onClick={() => this.setState({ confirmDelete: tunnel.name })}>
                                                        Delete
                                                    </button>
                                                </span>
                                            )}
                                    </Td>
                                </Tr>
                            ))}
                        </Tbody>
                    </Table>
                )}

                {selected && this.renderInfo()}
            </div>
        );
    }
}
