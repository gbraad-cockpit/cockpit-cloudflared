Cloudflare tunnels for Cockpit
==============================

!["Prompt"](https://raw.githubusercontent.com/gbraad/assets/gh-pages/icons/prompt-icon-64.png)

Cockpit application to **manage** Cloudflare tunnels and the local
`cloudflared` service — not just view them.

![Screenshot](./docs/screenshot.png)

Features
--------

The application is organised in three tabs:

**Tunnels**
- List tunnels with a live connection status and the edge colo(s) in use
- Create a new tunnel (optionally routing a DNS hostname to it)
- Show connector details (connector ID, version, arch, origin IP, edge)
- Route a DNS hostname to an existing tunnel
- Delete a tunnel (with a confirmation step)

**Services**
- Discover all `cloudflared*.service` systemd units
- Show state, enabled/disabled, PID, memory and start time
- Start, stop, restart, enable and disable units
- View recent journal logs for a unit

**Config**
- View and edit the cloudflared configuration (default `/etc/cloudflared/config.yml`)
- Validate the ingress rules before applying
- Save the file (requires administrator privileges) and restart the service

Requirements
------------

- [Cockpit](https://cockpit-project.org/) (137+)
- `cloudflared` available on the system (e.g. `/usr/local/bin/cloudflared`)
- A Cloudflare origin certificate (`~/.cloudflared/cert.pem`) to manage tunnels.
  Log in once with:

  ```sh
  cloudflared tunnel login
  ```

Build and install
-----------------

```sh
npm install
npm run build
```

Then copy the build output to a Cockpit package directory:

```sh
sudo mkdir -p /usr/local/share/cockpit/cloudflared
sudo cp -r dist/. /usr/local/share/cockpit/cloudflared/
```

Reload Cockpit (Ctrl+Shift+R) afterwards.

For development you can symlink instead of copying:

```sh
npm run linkusr   # -> /usr/local/share/cockpit/cloudflared
```

Notes
-----

- Actions that change system state — `systemctl` operations and saving the
  config file — require administrative privileges and will prompt for
  escalation inside Cockpit.
- Tunnel management commands (`create`, `route dns`, `delete`, `info`) run as
  the logged-in Cockpit user and use that user's `~/.cloudflared/cert.pem`.

Authors
-------

| [!["Gerard Braad"](http://gravatar.com/avatar/e466994eea3c2a1672564e45aca844d0.png?s=60)](http://gbraad.nl "Gerard Braad <me@gbraad.nl>") |
|---|
| [@gbraad](https://gbraad.nl/social)  |

Tunnel/service/config management UI added by [@dulumina](https://github.com/dulumina).
