#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

// Types
interface Location {
  name: string;
  latitude: number;
  longitude: number;
}

interface LocationsData {
  locations: Location[];
}

interface DailyForecast {
  date: string;
  weatherCode: number;
  weatherDescription: string;
  temperatureMax: number;
  temperatureMin: number;
  precipitationSum: number;
  windSpeedMax: number;
}

// Weather code descriptions
const WEATHER_CODES: Record<number, string> = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Depositing rime fog",
  51: "Light drizzle",
  53: "Moderate drizzle",
  55: "Dense drizzle",
  56: "Light freezing drizzle",
  57: "Dense freezing drizzle",
  61: "Slight rain",
  63: "Moderate rain",
  65: "Heavy rain",
  66: "Light freezing rain",
  67: "Heavy freezing rain",
  71: "Slight snow fall",
  73: "Moderate snow fall",
  75: "Heavy snow fall",
  77: "Snow grains",
  80: "Slight rain showers",
  81: "Moderate rain showers",
  82: "Violent rain showers",
  85: "Slight snow showers",
  86: "Heavy snow showers",
  95: "Thunderstorm",
  96: "Thunderstorm with slight hail",
  99: "Thunderstorm with heavy hail",
};

// Config directory
const CONFIG_DIR = path.join(os.homedir(), ".config", "stella2211-open-meteo-mcp");
const LOCATIONS_FILE = path.join(CONFIG_DIR, "locations.json");

// Ensure config directory exists
function ensureConfigDir(): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

// Read locations from file
function readLocations(): LocationsData {
  ensureConfigDir();
  if (!fs.existsSync(LOCATIONS_FILE)) {
    return { locations: [] };
  }
  try {
    const data = fs.readFileSync(LOCATIONS_FILE, "utf-8");
    return JSON.parse(data) as LocationsData;
  } catch {
    return { locations: [] };
  }
}

// Write locations to file
function writeLocations(data: LocationsData): void {
  ensureConfigDir();
  fs.writeFileSync(LOCATIONS_FILE, JSON.stringify(data, null, 2), "utf-8");
}

// Add a location
function addLocation(name: string, latitude: number, longitude: number): string {
  const data = readLocations();

  // Check if location with same name exists
  if (data.locations.some(loc => loc.name.toLowerCase() === name.toLowerCase())) {
    throw new Error(`Location "${name}" already exists`);
  }

  // Validate coordinates
  if (latitude < -90 || latitude > 90) {
    throw new Error("Latitude must be between -90 and 90");
  }
  if (longitude < -180 || longitude > 180) {
    throw new Error("Longitude must be between -180 and 180");
  }

  data.locations.push({ name, latitude, longitude });
  writeLocations(data);
  return `Location "${name}" added successfully`;
}

// Delete a location
function deleteLocation(name: string): string {
  const data = readLocations();
  const index = data.locations.findIndex(loc => loc.name.toLowerCase() === name.toLowerCase());

  if (index === -1) {
    throw new Error(`Location "${name}" not found`);
  }

  data.locations.splice(index, 1);
  writeLocations(data);
  return `Location "${name}" deleted successfully`;
}

// List locations (names only for privacy)
function listLocations(): string[] {
  const data = readLocations();
  return data.locations.map(loc => loc.name);
}

// Get location by name
function getLocation(name: string): Location | undefined {
  const data = readLocations();
  return data.locations.find(loc => loc.name.toLowerCase() === name.toLowerCase());
}

// Geocoding result type
interface GeocodingResult {
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  admin1?: string; // State/Province
}

// Search for a location using Open-Meteo Geocoding API
async function searchGeocode(query: string): Promise<GeocodingResult[]> {
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name", query);
  url.searchParams.set("count", "5");
  url.searchParams.set("language", "en");
  url.searchParams.set("format", "json");

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error(`Geocoding API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as {
    results?: Array<{
      name: string;
      latitude: number;
      longitude: number;
      country: string;
      admin1?: string;
    }>;
  };

  if (!data.results || data.results.length === 0) {
    return [];
  }

  return data.results.map(r => ({
    name: r.name,
    latitude: r.latitude,
    longitude: r.longitude,
    country: r.country,
    admin1: r.admin1,
  }));
}

// Add location by search (privacy-preserving: coordinates not returned to AI)
async function addLocationBySearch(
  locationName: string,
  searchQuery: string
): Promise<string> {
  const results = await searchGeocode(searchQuery);

  if (results.length === 0) {
    throw new Error(`No locations found for "${searchQuery}"`);
  }

  // Use the first (most relevant) result
  const result = results[0];
  if (!result) {
    throw new Error(`No locations found for "${searchQuery}"`);
  }

  // Add the location (coordinates are stored but not returned)
  addLocation(locationName, result.latitude, result.longitude);

  // Return success message with location info but WITHOUT coordinates
  const locationInfo = result.admin1
    ? `${result.name}, ${result.admin1}, ${result.country}`
    : `${result.name}, ${result.country}`;

  return `Location "${locationName}" added successfully (found: ${locationInfo})`;
}

// Fetch weather forecast
async function fetchForecast(location: Location): Promise<DailyForecast[]> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", location.latitude.toString());
  url.searchParams.set("longitude", location.longitude.toString());
  url.searchParams.set("daily", "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max");
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("forecast_days", "7");

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error(`Failed to fetch weather data: ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as {
    daily: {
      time: string[];
      weather_code: number[];
      temperature_2m_max: number[];
      temperature_2m_min: number[];
      precipitation_sum: number[];
      wind_speed_10m_max: number[];
    };
  };

  const forecasts: DailyForecast[] = [];
  for (let i = 0; i < data.daily.time.length; i++) {
    const date = data.daily.time[i];
    const weatherCode = data.daily.weather_code[i];
    const temperatureMax = data.daily.temperature_2m_max[i];
    const temperatureMin = data.daily.temperature_2m_min[i];
    const precipitationSum = data.daily.precipitation_sum[i];
    const windSpeedMax = data.daily.wind_speed_10m_max[i];

    if (
      date === undefined ||
      weatherCode === undefined ||
      temperatureMax === undefined ||
      temperatureMin === undefined ||
      precipitationSum === undefined ||
      windSpeedMax === undefined
    ) {
      continue;
    }

    forecasts.push({
      date,
      weatherCode,
      weatherDescription: WEATHER_CODES[weatherCode] ?? "Unknown",
      temperatureMax,
      temperatureMin,
      precipitationSum,
      windSpeedMax,
    });
  }

  return forecasts;
}

// Create MCP server
const server = new Server(
  {
    name: "open-meteo-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "add_location_by_search",
        description: "Add a new location by searching for a city or place name. This is the recommended way to add locations as coordinates are handled internally and never exposed. Use this instead of add_location whenever possible.",
        inputSchema: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "A friendly name to save this location as (e.g., 'Home', 'Office', 'Parents House')",
            },
            search_query: {
              type: "string",
              description: "The city or place name to search for (e.g., 'Tokyo', 'New York', 'London')",
            },
          },
          required: ["name", "search_query"],
        },
      },
      {
        name: "add_location",
        description: "Add a new location with exact latitude and longitude. Only use this if you have specific coordinates. Prefer add_location_by_search for privacy.",
        inputSchema: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "A friendly name for this location (e.g., 'Home', 'Office')",
            },
            latitude: {
              type: "number",
              description: "Latitude of the location (-90 to 90)",
            },
            longitude: {
              type: "number",
              description: "Longitude of the location (-180 to 180)",
            },
          },
          required: ["name", "latitude", "longitude"],
        },
      },
      {
        name: "delete_location",
        description: "Delete a saved location by name",
        inputSchema: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "The name of the location to delete",
            },
          },
          required: ["name"],
        },
      },
      {
        name: "list_locations",
        description: "List all saved location names (coordinates are not shown for privacy)",
        inputSchema: {
          type: "object",
          properties: {},
          required: [],
        },
      },
      {
        name: "get_forecast",
        description: "Get 7-day weather forecast for a saved location. Only the location name is required - coordinates are retrieved locally for privacy.",
        inputSchema: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "The name of the saved location",
            },
          },
          required: ["name"],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "add_location_by_search": {
        const { name: locName, search_query: searchQuery } = args as {
          name: string;
          search_query: string;
        };
        const result = await addLocationBySearch(locName, searchQuery);
        return {
          content: [{ type: "text", text: result }],
        };
      }

      case "add_location": {
        const { name: locName, latitude, longitude } = args as {
          name: string;
          latitude: number;
          longitude: number;
        };
        const result = addLocation(locName, latitude, longitude);
        return {
          content: [{ type: "text", text: result }],
        };
      }

      case "delete_location": {
        const { name: locName } = args as { name: string };
        const result = deleteLocation(locName);
        return {
          content: [{ type: "text", text: result }],
        };
      }

      case "list_locations": {
        const locations = listLocations();
        if (locations.length === 0) {
          return {
            content: [{ type: "text", text: "No locations saved. Use add_location to add a new location." }],
          };
        }
        return {
          content: [{ type: "text", text: `Saved locations:\n${locations.map(l => `- ${l}`).join("\n")}` }],
        };
      }

      case "get_forecast": {
        const { name: locName } = args as { name: string };
        const location = getLocation(locName);

        if (!location) {
          throw new Error(`Location "${locName}" not found. Use list_locations to see available locations.`);
        }

        const forecasts = await fetchForecast(location);

        // Format forecast without exposing coordinates
        const forecastText = forecasts.map(f =>
          `${f.date}: ${f.weatherDescription}\n` +
          `  Temperature: ${f.temperatureMin}°C ~ ${f.temperatureMax}°C\n` +
          `  Precipitation: ${f.precipitationSum}mm\n` +
          `  Max Wind Speed: ${f.windSpeedMax}km/h`
        ).join("\n\n");

        return {
          content: [{ type: "text", text: `7-Day Weather Forecast for "${location.name}":\n\n${forecastText}` }],
        };
      }

      default:
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }
  } catch (error) {
    if (error instanceof McpError) {
      throw error;
    }
    return {
      content: [{ type: "text", text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
