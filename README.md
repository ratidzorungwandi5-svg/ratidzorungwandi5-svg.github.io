# Invest Horizon

This repository hosts a live finance and education dashboard for tracking stock prices, trading simulated live orders, and using an assistant for investment and learning questions.

## Features

- Live NYSE price updates using Stooq CSV fetches.
- Optional Finnhub WebSocket real-time feed when a key is provided.
- Simulated live stock price mode when no API key is available.
- Portfolio management with cash, buy/sell actions, holdings, and market value.
- A live trade feed simulator showing volume, trade count, and average trade size.
- Interactive games: stock trading, matching, trivia, and portfolio allocation.
- An investment chatbot with simulated responses and optional OpenAI smart mode.

## Files

- `index.html` — homepage content and UI structure
- `styles.css` — page layout, stock board, portfolio, games, and chat styles
- `script.js` — stock updates, portfolio behavior, simulated trades, games, and chatbot logic

## Usage

1. Open `index.html` in a browser.
2. In **NYSE Live Prices**, click `Refresh now` to load the latest prices.
3. Enter a Finnhub API key and click `Connect Live` for a streaming feed.
4. Click `Simulate` to run built-in simulated stock price updates.
5. In **Live Trading Activity**, use the portfolio panel to buy and sell tracked symbols.
6. Use the **Investment Chatbot** in simulated mode or smart mode with an OpenAI API key.

## Notes

- Client-side API keys are insecure for public deployment. Use a backend proxy for production.
- The assistant offers general guidance only, not personalized financial advice.
- This project is designed to run as a static frontend site.

## Publish

1. Commit and push to the `main` branch.
2. Enable GitHub Pages in repository settings.
3. Choose `main` branch and `/` folder as the source.

Your site should be available at `https://ratidzorungwandi5-svg.github.io/` once published.
