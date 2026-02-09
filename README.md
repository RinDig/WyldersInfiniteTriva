# 🧠 Wylder's Infinite Trivia

An AI-powered trivia app that generates fresh, fascinating quizzes on any topic. Built for curious minds.

## How It Works

1. Pick a topic (Science, Space, Animals, History, etc.)
2. Choose difficulty (Easy → Expert)
3. Hit "Generate Quiz" — Claude creates 35 unique questions
4. Answer multiple choice, true/false, fill-in-the-blank, and image-based questions
5. Learn something new with every answer!

**Rate limited to 10 quizzes per week** to keep API costs manageable.

---

## Setup Guide

### Step 1: Deploy the Cloudflare Worker (protects your API key)

You need a free Cloudflare account and Node.js installed.

```bash
# Install Wrangler CLI
npm install -g wrangler

# Login to Cloudflare
npx wrangler login

# Navigate to the worker folder
cd worker

# Add your Anthropic API key as a secret
npx wrangler secret put ANTHROPIC_API_KEY
# (paste your key when prompted)

# Deploy the worker
npx wrangler deploy
```

After deploying, Wrangler will print your Worker URL. It looks like:
```
https://wylders-trivia-api.YOUR-SUBDOMAIN.workers.dev
```

**Save this URL — you'll need it.**

#### Optional: Add server-side rate limiting

```bash
# Create a KV namespace
npx wrangler kv namespace create "RATE_LIMIT"
```

This prints a namespace ID. Edit `worker/wrangler.toml`, uncomment the KV section, and paste the ID.

Then redeploy: `npx wrangler deploy`

### Step 2: Deploy the Frontend to GitHub Pages

1. Create a new GitHub repo called `wylders-trivia`
2. Push this code:
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR-USERNAME/wylders-trivia.git
git branch -M main
git push -u origin main
```
3. Go to **Settings → Pages** in your GitHub repo
4. Under "Build and deployment", select **GitHub Actions**
5. The workflow will run automatically on push

Your app will be live at: `https://YOUR-USERNAME.github.io/wylders-trivia/`

### Step 3: Configure the App

1. Open your deployed app
2. Click the ⚙️ gear icon (top right)
3. Paste your Cloudflare Worker URL
4. Save — you're ready to play!

---

## Project Structure

```
├── src/
│   ├── main.jsx          # React entry point
│   ├── App.jsx           # Main app (all components)
│   └── styles.css        # Global styles
├── public/
│   └── index.html        # HTML template
├── worker/
│   ├── index.js          # Cloudflare Worker (API proxy)
│   └── wrangler.toml     # Worker config
├── .github/workflows/
│   └── deploy.yml        # GitHub Actions → GitHub Pages
├── vite.config.js        # Vite build config
└── package.json
```

## Costs

- **Cloudflare Worker**: Free tier (100K requests/day)
- **GitHub Pages**: Free
- **Anthropic API**: ~$0.15-0.30 per quiz generation (35 questions)
- **At 10 quizzes/week**: ~$1.50-3.00/week max

Set a monthly spend limit in the [Anthropic Console](https://console.anthropic.com/settings/limits) for peace of mind.
