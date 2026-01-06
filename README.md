# GEX - SPX Gamma Exposure

A lightweight visualization tool for SPX Gamma Exposure (GEX) of zero days to expiration options (0DTE).

**[Live Demo](https://agejevasv.github.io/gex)**

## Features

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
