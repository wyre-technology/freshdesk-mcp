# Freshdesk MCP Server

[![Build Status](https://github.com/WYRE-AI/freshdesk-mcp/actions/workflows/release.yml/badge.svg)](https://github.com/WYRE-AI/freshdesk-mcp/actions/workflows/release.yml)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)

A [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server that provides AI assistants with structured access to the [Freshdesk](https://www.freshdesk.com) customer support platform — tickets, contacts, companies, agents, groups, the knowledge base, and SLA/business-hours configuration.

> **Note:** This project is maintained by [Wyre Technology](https://github.com/WYRE-AI). It wraps the published [`@wyre-technology/node-freshdesk`](https://github.com/WYRE-AI/node-freshdesk) SDK.

## Quick Start

The primary deployment is through the **WYRE MCP Gateway**, which hosts the containerized server and injects per-request credentials. To run it yourself:

**Claude Code (CLI):**

```bash
claude mcp add freshdesk-mcp \
  -e FRESHDESK_DOMAIN=your-subdomain \
  -e FRESHDESK_API_KEY=your-api-key \
  -- npx -y github:WYRE-AI/freshdesk-mcp
```

`FRESHDESK_DOMAIN` is the part before `.freshdesk.com` (for `https://acme.freshdesk.com` it is `acme`). Find your `FRESHDESK_API_KEY` in the Freshdesk portal under **Profile Settings**.

## Features

- **🔌 MCP Protocol Compliance**: Tools, prompts, and elicitation support
- **🎫 Full Helpdesk Coverage**: Tickets, contacts, companies, agents, groups, solutions, SLA policies, business hours, and canned responses
- **🌳 Decision-Tree Navigation**: Start at `freshdesk_navigate`, enter a domain to reveal its tools, and `freshdesk_back` to return — keeping the tool list small and focused
- **⚠️ Destructive-Action Guardrails**: Irreversible and high-impact tools are clearly flagged and confirmed via elicitation before they run
- **🔒 Secure Authentication**: HTTP Basic Auth with your Freshdesk API key (domain + key)
- **🌐 Dual Transport**: stdio (local) and Streamable HTTP (remote/Docker/gateway)
- **🐳 Docker Ready**: Containerized deployment with HTTP transport and health checks

## Connecting via the Gateway

When `AUTH_MODE=gateway`, the server reads credentials from request headers injected by the WYRE MCP Gateway:

| Header | Maps to | Description |
|--------|---------|-------------|
| `x-freshdesk-domain` | `FRESHDESK_DOMAIN` | Freshdesk account subdomain |
| `x-freshdesk-api-key` | `FRESHDESK_API_KEY` | Freshdesk API key |

Each request is stateless: the gateway provides the credentials, the server rebuilds its Freshdesk client, and tool discovery (`tools/list`) works even before credentials are present.

## Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `FRESHDESK_DOMAIN` | Account subdomain (before `.freshdesk.com`) | — |
| `FRESHDESK_API_KEY` | Freshdesk API key | — |
| `MCP_TRANSPORT` | Transport mode (`stdio` or `http`) | `stdio` |
| `MCP_HTTP_PORT` | HTTP server port | `8080` |
| `AUTH_MODE` | Auth mode (`env` or `gateway`) | `env` |
| `LOG_LEVEL` | Log level (`debug`, `info`, `warn`, `error`) | `info` |

## Tool Overview

The server uses **decision-tree navigation**. At the top level you see only `freshdesk_navigate`, `freshdesk_back`, and `freshdesk_status`. Call `freshdesk_navigate` with a domain to reveal that domain's tools; call `freshdesk_back` to return to the top.

| Domain | Tools |
|--------|-------|
| **tickets** | search, list, get, create, update, reply, add_note, list_conversations, update_conversation, delete\*, delete_conversation\* |
| **contacts** | search, list, get, create, update, autocomplete, make_agent†, restore, send_invite, merge†, soft_delete†, hard_delete\* |
| **companies** | search, list, get, create, update, autocomplete, delete\* |
| **agents** | list, get, me, create, update, delete\* |
| **groups** | list, get, create, update, delete\* |
| **solutions** | categories / folders / articles: list, get, create, update, delete\* |
| **sla-business** | SLA policies (list, create, update), business hours (list, get), canned responses (list_folders, get_folder, list_responses) |

`*` = **Tier A** (irreversible delete) — flagged `⚠ DESTRUCTIVE — IRREVERSIBLE`, requires confirmation.
`†` = **Tier B** (high-impact reversible) — flagged `⚠ HIGH-IMPACT`, requires confirmation.

Read tools (search/list/get/autocomplete/status) carry no warning and are marked read-only.

`freshdesk_status` performs a live connectivity check by calling `agents/me`.

## Docker Deployment

See [docker-compose.yml](docker-compose.yml). Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
# Edit .env: FRESHDESK_DOMAIN and FRESHDESK_API_KEY
docker compose up -d
```

The build installs `@wyre-technology/node-freshdesk` from GitHub Packages via a
BuildKit npmrc secret (never baked into a layer):

```bash
printf '@wyre-ai:registry=https://npm.pkg.github.com\n@wyre-technology:registry=https://npm.pkg.github.com\n//npm.pkg.github.com/:_authToken=%s\n' "$(gh auth token)" > /tmp/.npmrc
docker build --secret id=npmrc,src=/tmp/.npmrc -t freshdesk-mcp .
rm /tmp/.npmrc
```

## Development

```bash
export NODE_AUTH_TOKEN=$(gh auth token)   # to install @wyre-technology/node-freshdesk
npm install
npm run build       # Build the project
npm run dev         # Watch mode
npm run test        # Run tests
npm run lint        # Type-check
npm run clean       # Remove dist/
```

## Testing

```bash
npm test            # Run test suite
npm run test:watch  # Watch mode
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

Apache 2.0 — Copyright WYRE Technology
