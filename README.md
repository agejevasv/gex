# GEX - SPX Gamma Exposure

A lightweight visualization tool for SPX Gamma Exposure (GEX) of zero days to expiration options (0DTE).

<a href="https://agejevasv.github.io/gex">
  <img width="2288" height="1761" alt="gex" src="https://github.com/user-attachments/assets/e4df7f8c-07c2-41e3-ba27-463404066b8e" />
</a>

**[Live Demo](https://agejevasv.github.io/gex)**

## Features

- Light-weight, no build required, only JavaScript
- Almost Real-time (15 min delay) SPX gamma exposure visualization
- Net GEX (based on both Open Interest and Volume) and separate Calls/Puts views
- Responsive design for desktop and mobile

## Setup

### 1. Deploy the CORS Proxy

The app requires a CBOE proxy (due to CORS restrictions). A quick and easy way is to create a Cloudflare Worker:

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/) → Workers & Pages → Create Worker
2. Copy the contents of `worker/worker.js` into the worker editor
3. Deploy and note your worker URL (e.g., `https://your-worker.your-subdomain.workers.dev`)

### 2. Configure the App

Update `config.js` with your worker URL:

```js
export default {
  "apiUrl": "https://your-worker.your-subdomain.workers.dev",
  // ...
};
```

### 3. Run Locally

Serve the files with any static server:

```bash
npx serve .
```

## License

MIT
