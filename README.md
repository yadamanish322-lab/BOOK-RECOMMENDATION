# PageTurner Book Recommendation System

PageTurner is one integrated book discovery app—not a collection of weekly
projects. It combines the lab requirements into a single Angular application
and Node.js API.

## Features

- Responsive home, login, registration, reader profile, and book catalogue pages
- Reactive forms with browser-side and server-side validation
- Account registration and login with password hashing and an HTTP-only session
  cookie
- Search and genre-based book recommendations, powered by a typed
  TypeScript recommendation engine
- Live book searches with covers, authors, publication years, and Open Library
  links from the Open Library Search API
- Reusable Angular book cards, components, data binding, and client-side routes
- Asynchronous plain-text, JSON, and XML requests, plus a POST recommendation
  form
- XML catalogue data and its DTD in `data/`
- Thirteen sample books shared by the catalogue and API

## Run locally

Use Node.js 22.22.3+ or 24.15.0+, then run these commands from the repository
root:

```sh
npm install
npm run dev
```

Open **http://localhost:4200**. The Angular dev server proxies `/api` requests
to the local Node.js API. On the catalogue page, choose **Live Open Library**
to search current external book records; use **Sample collection** to return to
the included offline sample catalogue. Live search needs an internet
connection. Stop both processes with Ctrl+C.

To run the built application on **http://localhost:3000**:

```sh
npm start
```

`npm start` builds the Angular app and starts the API and web server together.

## Data and demo accounts

The sample book catalogue is in `api/books.json`; the same books are provided
in `data/books.xml` and described by `data/books.dtd`. Live search requests are
proxied by the local API and cached for five minutes to avoid excessive
upstream requests. Reader accounts,
sessions, and submitted recommendations are held in memory for demonstration,
so they are cleared when the server stops. Passwords are hashed before they
are kept in memory and are never included in URLs or browser storage. Do not
use real passwords in this demo.

## Main source folders

```text
src/app/components/   Shared Angular UI components
src/app/models/       Book and reader TypeScript interfaces
src/app/pages/        Home, catalogue, login, registration, and profile routes
src/app/services/     API clients, auth, and recommendation logic
api/                  Node.js API and sample JSON catalogue
data/                 XML catalogue and DTD
```
