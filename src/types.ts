export type CloudflareTunnel = {
    id:          string;
    name:        string;
    created_at:  string;
    deleted_at:  string;
    connections: Connection[];
}

export type Connection = {
    colo_name:            string;
    id:                   string;
    is_pending_reconnect: boolean;
    origin_ip:            string;
    opened_at:            string;
}

export type TunnelInfo = {
    id:         string;
    name:       string;
    createdAt?: string;
    conns?:     Connector[];
}

export type Connector = {
    id:        string;
    version?:  string;
    arch?:     string;
    run_at?:   string;
    conns?:    EdgeConnection[];
}

export type EdgeConnection = {
    colo_name:            string;
    id?:                  string;
    is_pending_reconnect?: boolean;
    origin_ip:            string;
    opened_at:            string;
}

export type ServiceUnit = {
    name:                 string;
    description?:         string;
    activeState:          string;
    subState:             string;
    unitFileState:        string;
    mainPid?:             string;
    memory?:              string;
    activeEnterTimestamp?: string;
}

export enum ColoName {
    Ams = "AMS",
    Bru = "BRU",
    Iad = "IAD",
    Lax = "LAX",
    Ord = "ORD",
    Sjc = "SJC",
}
