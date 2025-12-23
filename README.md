# @stella2211/open-meteo-mcp

Privacy-focused Open-Meteo MCP server for weather forecasts.

## Features

- Get 7-day weather forecasts from Open-Meteo API
- Search locations by city name (geocoding built-in)
- Store location coordinates locally (not exposed to AI)
- AI only sees location names, never coordinates
- Cross-platform support (Windows, macOS, Linux)

## Installation

```bash
npx @stella2211/open-meteo-mcp
```

## Claude Desktop Configuration

Add to your Claude Desktop config file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "open-meteo": {
      "command": "npx",
      "args": ["@stella2211/open-meteo-mcp"]
    }
  }
}
```

## Tools

### add_location_by_search (Recommended)
Add a new location by searching for a city or place name. Coordinates are resolved internally and never exposed to the AI.

```
Example: Add "Home" by searching for "Tokyo"
```

### add_location
Add a new location with exact latitude and longitude. Use only when you have specific coordinates.

### delete_location
Delete a saved location by name.

### list_locations
List all saved location names (coordinates are hidden for privacy).

### get_forecast
Get 7-day weather forecast for a saved location by name.

## Privacy Design

This MCP server is designed to minimize AI exposure to location coordinates:

1. **Adding locations**: Use `add_location_by_search` to search by city name. The server internally resolves coordinates via Open-Meteo Geocoding API and stores them locally.
2. **Listing locations**: Only location names are returned, never coordinates.
3. **Getting forecasts**: The server retrieves coordinates from local storage internally.

The AI only sees coordinates if you explicitly use `add_location` with latitude/longitude.

## Data Storage

Location data is stored in:
- **macOS/Linux**: `~/.config/stella2211-open-meteo-mcp/locations.json`
- **Windows**: `%USERPROFILE%\.config\stella2211-open-meteo-mcp\locations.json`

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run locally
npm start
```

## License

MIT
