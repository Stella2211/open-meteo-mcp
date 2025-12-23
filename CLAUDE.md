# Open-Meteo MCP Server

Privacy-focused MCP server for weather forecasts using Open-Meteo API.

## Project Structure

```
src/index.ts    - MCP server implementation
dist/           - Built JavaScript output
```

## Usage

Run directly from GitHub:

```bash
npx github:Stella2211/open-meteo-mcp
bunx github:Stella2211/open-meteo-mcp
```

## Development

Use Bun for development:

```bash
bun install          # Install dependencies
bun run build        # Build (runs tsc)
bun run start        # Run the server
```

## Available Tools

| Tool | Description | Privacy |
|------|-------------|---------|
| `add_location_by_search` | Add location by city name search | Coordinates hidden from AI |
| `add_location` | Add location with lat/lon | Coordinates visible to AI |
| `delete_location` | Delete a saved location | - |
| `list_locations` | List saved location names | Coordinates hidden |
| `get_forecast` | Get 7-day weather forecast | Coordinates hidden |

## APIs Used

- **Weather**: `https://api.open-meteo.com/v1/forecast`
- **Geocoding**: `https://geocoding-api.open-meteo.com/v1/search`

## Config Location

`~/.config/stella2211-open-meteo-mcp/locations.json`

## Testing MCP Server

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}
{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}' | node dist/index.js
```
