# RxBurnScout

**Hourly Burn Condition Monitor — Open Source**

A personal tool for land managers to identify prescribed burn windows using hourly NWS forecast data. Unlike systems that rely on daily averages or percentage-based scoring, RxBurnScout checks whether ALL weather parameters co-exist within your defined ranges for each hour, then identifies windows of consecutive viable hours that meet your minimum duration.

**A True North Seed Project initiative.**

## What It Does

1. You configure **burn units** — each with a location, fuel type, weather parameter ranges, and a minimum number of consecutive hours you need.
2. The app fetches **hourly forecast data** from the National Weather Service API (free, public, no key needed).
3. Every hour is checked: do **all** parameters pass simultaneously? One out-of-range value = that hour fails. No averaging, no percentages.
4. Consecutive passing hours are grouped into **burn windows**. A window must meet your minimum duration threshold to count.
5. You get a **7-day outlook** showing which days have viable windows, and can drill into any day to see the full hourly breakdown.

## What It Does NOT Do

- It does not tell you when to burn. It identifies conditions that match your parameters. The decision is always yours.
- It does not send alerts (yet). The alert module is being developed separately.
- It is not designed for organizational use. This is a tool for individual land managers.


## Key Concepts: How Burn Windows Are Identified

RxBurnScout identifies potential burn windows by evaluating weather conditions hour by hour, then looking for consecutive hours that meet all your requirements. Three rules work together to determine whether a window qualifies.

### 1. Hourly Evaluation

Each forecast hour is evaluated independently. Conditions are not averaged across the day: favorable morning winds do not compensate for unfavorable afternoon winds. Every hour must stand on its own.

### 2. All-Parameter Pass Logic

For an hour to pass, **every configured weather parameter must be within its defined range**. If even one parameter falls outside its range, that hour fails. Only passing hours can contribute to a burn window.

### 3. Consecutive Hours and Minimum Duration

Passing hours are grouped into consecutive windows. A window qualifies only if it meets your minimum duration threshold — the number of consecutive passing hours you require.

You set this threshold to reflect your burn needs. For example, a 4-acre grassy meadow might require a 3-hour window, while a 35-acre woodland might require 6 hours.

**The result:** RxBurnScout identifies potential burn windows in which all configured weather parameters remain within range for the required number of consecutive hours.

### 7-Day Forecast Horizon

The NWS publishes hourly forecasts out to roughly 7 days. RxBurnScout deliberately limits analysis to 7 days, because hour-by-hour forecasts become much less reliable beyond that range. Always confirm conditions with the latest forecast and on-site observations before burning.

### Multiple Burn Units

Each burn unit has its own location, parameter ranges, and minimum window duration. The same forecast can produce different results for different units — a prairie burn with a 4-hour minimum might show a window while a woodland burn needing 6 hours might not.

---

## Data & Privacy

- **No accounts required** for the standalone version. Data stays in your browser.
- **The sync server** stores only your burn unit configurations (unit name, coordinates, parameter ranges). No personal information is collected.
- **Sync tokens** are generated client-side and never transmitted except to your own sync server.
- **NWS API calls** are made directly from your browser to api.weather.gov. Weather data never passes through the sync server.


---  FOR DEVELOPERS ---

## Deployment Guide

RxBurnScout has two components:

| Component | What It Is | Required? |
|-----------|-----------|-----------|
| **Frontend** (`index.html`) | The app itself — runs in the browser | Yes |
| **Sync Server** (`cloudflare-worker.js`) | Saves your burn units so you can open them on other devices | Optional |

The frontend works completely standalone. It stores your burn units in your browser's local storage. The sync server is only needed if you want your burn units on more than one device or browser.

---

Option A: Frontend Only (Simplest)
This provides a fully functional app with browser-local storage. No account or backend server is required to use the app.

Running locally
The index.html file is self-contained, with no build step, frameworks, or external JavaScript dependencies. You can open it directly in a compatible browser. Weather forecasts and location searches still require an internet connection.


Hosting online
You can publish index.html through a static web host so that other land managers can access the app using a URL. Options include Netlify and Cloudflare Pages.


Deploying with Netlify
1. Sign in to Netlify.
2. Create a new site using manual deployment, or connect the GitHub repository for automatic deployments.
3. For manual deployment, upload a folder containing index.html.
4. For GitHub-connected deployment, use the repository root as the publish directory; no build command is needed.
5. Open the resulting site URL and test the app.
With GitHub-connected deployment, Netlify can automatically publish changes pushed to the connected branch.


Alternative: Cloudflare Pages
Cloudflare Pages can also host the standalone frontend. Follow the Cloudflare Pages documentation, using the static asset upload option.


One important distinction: the app's local storage belongs to the particular browser and device. Publishing the app online does not synchronize burn units between members or devices; that requires the optional sync server.

### Option B: Frontend + Sync Server

If you want your burn units available across devices/browsers, deploy `cloudflare-worker.js` as your own sync server.

#### Step 1: Create a KV Namespace

1. In the Cloudflare dashboard, go to **Workers & Pages** → **KV**.
2. Click **Create a namespace**.
3. Name it `RXBURN_KV`.
4. Note the namespace — you'll need it in Step 3.

#### Step 2: Create the Sync Server Worker

1. Go to **Workers & Pages** → **Create** → **Worker**.
2. Name it (e.g., `rxburnscout-sync`).
3. Click **Deploy** (this creates a placeholder).
4. Click **Edit code**.
5. Delete the placeholder code and paste the entire contents of `cloudflare-worker.js`.
6. Click **Deploy**.

#### Step 3: Bind the KV Namespace

1. Go to your Worker's page → **Settings** → **Bindings**.
2. Click **Add** → **KV Namespace**.
3. Set the **Variable name** to exactly: `RXBURN_KV`
4. Select the KV namespace you created in Step 1.
5. Click **Save**.

#### Step 4: Connect the Frontend

1. Open your deployed RxBurnScout app in a browser.
2. Go to the **Settings** tab.
3. In the **Sync Server URL** field, enter your Worker URL (e.g., `https://rxburnscout-sync.your-subdomain.workers.dev`).
4. Click **Connect**.
5. The app will register a sync token and push your existing units to the server.
6. **Save your sync token** — this is how you access your data from another device.

#### Accessing From Another Device

1. Open RxBurnScout on the new device.
2. Go to **Settings** → enter the same Sync Server URL → click **Connect**.
3. Paste your saved token into the **Restore from Token** field.
4. Click **Restore** — your burn units will be pulled from the server.

---

## Available Weather Parameters

These come from the standard NWS hourly forecast endpoint (the National Weather Service API):

| Parameter | Unit | Notes |
|-----------|------|-------|
| Wind Speed | mph | Parsed from NWS range strings (e.g., "5 to 10 mph" → 7.5) |
| Wind Direction | compass | 16-point compass (N, NNE, NE, etc.) — optional filter |
| Relative Humidity | % | Direct from NWS |
| Precipitation Probability | % | Direct from NWS |
| Temperature | °F | Direct from NWS |

### Not Yet Available (Future Versions)

These parameters are critical for prescribed fire but require data sources beyond the standard NWS hourly endpoint:

- **Mixing Height** — Available through NWS fire weather forecasts or SPC mesoanalysis
- **Haines Index** — Derivable from upper-air data
- **Transport Winds** — Available through fire weather products

We're actively researching how to integrate these. The architecture is designed to accommodate additional parameters without restructuring.

-
---

## Tech Stack

- **Frontend:** Vanilla HTML/CSS/JS — no frameworks, no build tools, no dependencies
- **Sync Server:** Cloudflare Worker (Service Worker syntax) with KV storage
- **Forecast Data:** National Weather Service API (free, public)
- **Location Search:** OpenStreetMap Nominatim (free, public)
- **Hosting:** Cloudflare Pages (free tier)

Total hosting cost: **$0**

---

## Roadmap

- [ ] Mixing height, Haines Index, transport winds (fire weather data integration)
- [ ] Post-burn condition monitoring (24-72hr outlook after a burn window)
- [ ] Automated email/SMS alerts (separate module, cron-triggered)
- [ ] Burn log / history tracking
- [ ] Multi-user sharing (view-only links for burn units)

---

## License

GPL 3.0

---

## Contributing

This project is developed openly. If you're interested in contributing — especially if you have experience with fire weather data sources, prescribed burn operations, or Cloudflare Workers — please join our team.


## Community and Collaboration

RxBurnScout is intended to grow through the private-landowner prescribed burn community, where collaboration and shared experience are essential. If you use, adapt, or build upon this project, we'd love to hear from you.

Please consider sharing how you're using RxBurnScout, what you've changed, and what you've learned. Your ideas and experience may help us improve the tool or inspire a better approach for the broader prescribed burn community.

We welcome collaboration, feedback, and contributions. You are also welcome to pursue a different direction if you've found a better way to solve the problem. We'd be interested in learning from your work and exploring opportunities to collaborate.
