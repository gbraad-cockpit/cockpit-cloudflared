// Low level helpers around the Cockpit bridge and the cloudflared CLI.

import { CloudflareTunnel, Connector, ServiceUnit, TunnelInfo } from './types';

const CF_PATH = '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin';

// Quote an argument so it can be safely embedded in a /bin/sh command line.
function shQuote(value: string): string {
    return "'" + String(value).replace(/'/g, "'\\''") + "'";
}

// cockpit.spawn is jQuery-style; wrap it in a real promise.
function spawn(argv: any, options: any = {}): Promise<string> {
    return new Promise((resolve, reject) => {
        cockpit.spawn(argv, options)
            .done((data: string) => resolve(data))
            .fail((error: any, data?: string) => {
                const detail = (data || (error && error.message) || String(error) || '').toString().trim();
                reject(new Error(detail || 'Command failed'));
            });
    });
}

// Run cloudflared through a shell with an explicit PATH so it is found even
// when it lives in /usr/local/bin (the bridge PATH may not include it).
export function cloudflared(args: string[], options: any = {}): Promise<string> {
    const script = 'export PATH="' + CF_PATH + ':$PATH"; exec cloudflared ' + args.map(shQuote).join(' ');
    return spawn(['/bin/sh', '-c', script], options);
}

export function systemctl(args: string[], options: any = {}): Promise<string> {
    return spawn(['systemctl'].concat(args), options);
}

export function journalctl(args: string[], options: any = {}): Promise<string> {
    return spawn(['journalctl'].concat(args), options);
}

// ---- Tunnels ------------------------------------------------------------

export async function listTunnels(): Promise<CloudflareTunnel[]> {
    const out = await cloudflared(['tunnel', 'list', '-o', 'json']);
    const parsed = JSON.parse(out);
    return Array.isArray(parsed) ? parsed : [];
}

export async function tunnelInfo(nameOrId: string): Promise<TunnelInfo> {
    const out = await cloudflared(['tunnel', 'info', '--output', 'json', nameOrId]);
    return JSON.parse(out);
}

export function createTunnel(name: string): Promise<string> {
    return cloudflared(['tunnel', 'create', name]);
}

export function deleteTunnel(nameOrId: string, force = true): Promise<string> {
    const args = ['tunnel', 'delete'];
    if (force)
        args.push('-f');
    args.push(nameOrId);
    return cloudflared(args);
}

export function routeDns(tunnel: string, hostname: string, overwrite = false): Promise<string> {
    const args = ['tunnel', 'route', 'dns'];
    if (overwrite)
        args.push('-f');
    args.push(tunnel, hostname);
    return cloudflared(args);
}

export function validateIngress(configPath: string): Promise<string> {
    return cloudflared(['tunnel', '--config', configPath, 'ingress', 'validate']);
}

// ---- Services -----------------------------------------------------------

function parseSystemdOutput(out: string): string[] {
    const names = new Set<string>();
    out.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (!trimmed)
            return;
        const name = trimmed.split(/\s+/)[0];
        if (name && name.endsWith('.service'))
            names.add(name);
    });
    return Array.from(names);
}

export async function listServiceUnits(): Promise<string[]> {
    const names = new Set<string>();
    try {
        parseSystemdOutput(await systemctl(['list-unit-files', 'cloudflared*.service', '--no-legend', '--plain']))
            .forEach(n => names.add(n));
    } catch (e) { /* ignore */ }
    try {
        parseSystemdOutput(await systemctl(['list-units', '--type=service', '--all', '--no-legend', '--plain', 'cloudflared*']))
            .forEach(n => names.add(n));
    } catch (e) { /* ignore */ }
    return Array.from(names).sort();
}

export async function unitStatus(name: string): Promise<ServiceUnit> {
    const out = await systemctl([
        'show', name,
        '-p', 'Description',
        '-p', 'ActiveState',
        '-p', 'SubState',
        '-p', 'UnitFileState',
        '-p', 'MainPID',
        '-p', 'MemoryCurrent',
        '-p', 'ActiveEnterTimestamp',
    ]);
    const map: Record<string, string> = {};
    out.split('\n').forEach(line => {
        const idx = line.indexOf('=');
        if (idx > 0)
            map[line.slice(0, idx)] = line.slice(idx + 1);
    });
    return {
        name,
        description: map.Description,
        activeState: map.ActiveState,
        subState: map.SubState,
        unitFileState: map.UnitFileState,
        mainPid: map.MainPID,
        memory: map.MemoryCurrent,
        activeEnterTimestamp: map.ActiveEnterTimestamp,
    };
}

export function unitAction(action: string, name: string): Promise<string> {
    return systemctl([action, name], { superuser: 'try' });
}

export function unitLogs(name: string, lines = 200): Promise<string> {
    return journalctl(['-u', name, '-n', String(lines), '--no-pager'], { superuser: 'try' });
}

// ---- Config file --------------------------------------------------------

export function readFile(path: string): Promise<string> {
    return new Promise((resolve, reject) => {
        cockpit.file(path, { superuser: 'try' }).read()
            .done((content: string) => resolve(content == null ? '' : content))
            .fail((error: string) => reject(new Error(String(error))));
    });
}

export function writeFile(path: string, content: string): Promise<void> {
    return new Promise((resolve, reject) => {
        cockpit.file(path, { superuser: 'try' }).replace(content)
            .done(() => resolve())
            .fail((error: string) => reject(new Error(String(error))));
    });
}

// ---- Formatting ---------------------------------------------------------

export function formatBytes(value?: string): string {
    if (!value || value === '[not set]')
        return '-';
    const bytes = Number(value);
    if (!isFinite(bytes) || bytes < 0)
        return '-';
    if (bytes < 1024)
        return bytes + ' B';
    const units = ['KiB', 'MiB', 'GiB', 'TiB'];
    let v = bytes / 1024;
    let i = 0;
    while (v >= 1024 && i < units.length - 1) {
        v /= 1024;
        i++;
    }
    return v.toFixed(1) + ' ' + units[i];
}

export function formatTime(value?: string): string {
    if (!value || value === 'n/a' || value === '')
        return '-';
    const date = new Date(value);
    if (isNaN(date.getTime()))
        return value;
    return date.toLocaleString();
}

export function connectorColos(info?: TunnelInfo | null): string {
    if (!info || !info.conns)
        return '';
    const colos: string[] = [];
    info.conns.forEach((c: Connector) => {
        (c.conns || []).forEach(edge => {
            if (colos.indexOf(edge.colo_name) === -1)
                colos.push(edge.colo_name);
        });
    });
    return colos.join(', ');
}
