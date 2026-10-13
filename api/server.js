const crypto = require("node:crypto");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const webRoot = path.join(projectRoot, "dist", "pageturner", "browser");
const books = require("./books.json");
const genres = new Set(["Fiction", "Fantasy", "Science", "Personal Growth"]);
const users = new Map();
const emailOwners = new Map();
const sessions = new Map();
const suggestions = [];
const liveBookCache = new Map();
const liveBookCacheTtl = 5 * 60 * 1000;
const sessionCookie = "pageturner_session";
const portArgument = process.argv.find((argument) => argument.startsWith("--port="));
const port = Number(portArgument?.slice("--port=".length) || process.env.PORT || 3000);
const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
};

function inferGenre(subjects, preferredGenre) {
  if (preferredGenre) return preferredGenre;
  const subjectText = subjects
    .filter((subject) => typeof subject === "string")
    .join(" ")
    .toLocaleLowerCase();
  if (subjectText.includes("fantasy")) return "Fantasy";
  if (subjectText.includes("science fiction") || subjectText.includes("science")) return "Science";
  if (subjectText.includes("self-help") || subjectText.includes("personal development")) {
    return "Personal Growth";
  }
  if (subjectText.includes("fiction")) return "Fiction";
  return "Books";
}

function sendJson(response, statusCode, body, headers = {}) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    ...headers,
  });
  response.end(JSON.stringify(body));
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    let tooLarge = false;

    request.on("data", (chunk) => {
      if (tooLarge) return;
      body += chunk;
      if (body.length > 32_000) tooLarge = true;
    });
    request.on("end", () => {
      if (tooLarge) {
        const error = new Error("Request body is too large.");
        error.statusCode = 413;
        reject(error);
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch {
        const error = new Error("Request body must be valid JSON.");
        error.statusCode = 400;
        reject(error);
      }
    });
    request.on("error", reject);
  });
}

function getSessionUser(request) {
  const cookie = request.headers.cookie || "";
  const token = cookie.split(";").map((part) => part.trim())
    .find((part) => part.startsWith(`${sessionCookie}=`))
    ?.slice(sessionCookie.length + 1);
  const userId = token ? sessions.get(token) : undefined;
  return userId ? [...users.values()].find((user) => user.id === userId) : undefined;
}

function publicUser(user) {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    username: user.username,
    genre: user.genre,
  };
}

function sessionHeaders(token, maxAge = 60 * 60 * 24 * 7) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return {
    "Set-Cookie": `${sessionCookie}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${secure}`,
  };
}

function createSession(response, user) {
  const token = crypto.randomBytes(32).toString("hex");
  sessions.set(token, user.id);
  sendJson(response, 200, { user: publicUser(user) }, sessionHeaders(token));
}

async function handleApi(request, response, url) {
  if (request.method === "GET" && url.pathname === "/api/books/text") {
    response.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Today's pick: The Alchemist by Paulo Coelho — a story about following your dreams.");
    return;
  }
  if (request.method === "GET" && url.pathname === "/api/books") {
    sendJson(response, 200, books);
    return;
  }
  if (request.method === "GET" && url.pathname === "/api/live-books") {
    const query = (url.searchParams.get("q") || "").trim();
    const genre = (url.searchParams.get("genre") || "").trim();
    const page = Number(url.searchParams.get("page") || "1");
    const limit = 20;
    if (query.length > 120 || !Number.isInteger(page) || page < 1 || page > 100 ||
        (genre && !genres.has(genre))) {
      sendJson(response, 400, { error: "Enter a shorter search, valid genre, and page between 1 and 100." });
      return;
    }

    const searchQuery = query || (genre ? `subject:${genre}` : "subject:fiction");
    const cacheKey = `${searchQuery.toLocaleLowerCase()}:${genre}:${page}`;
    const cached = liveBookCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      sendJson(response, 200, cached.result, { "X-Data-Source": "cache" });
      return;
    }

    const params = new URLSearchParams({
      q: searchQuery,
      fields: "key,title,author_name,first_publish_year,cover_i,subject",
      page: String(page),
      limit: String(limit),
    });
    let upstream;
    try {
      upstream = await fetch(`https://openlibrary.org/search.json?${params}`, {
        headers: { "User-Agent": "PageTurnerBookRecommendations/1.0" },
        signal: AbortSignal.timeout(10_000),
      });
    } catch (error) {
      const failure = new Error("Open Library could not be reached. Please try again shortly.");
      failure.statusCode = 502;
      throw failure;
    }
    if (!upstream.ok) {
      const failure = new Error(`Open Library returned an error (${upstream.status}). Please try again.`);
      failure.statusCode = 502;
      throw failure;
    }
    const data = await upstream.json();
    if (!Array.isArray(data.docs)) {
      const failure = new Error("Open Library returned an invalid book search response.");
      failure.statusCode = 502;
      throw failure;
    }
    const liveBooks = data.docs.flatMap((item) => {
      if (typeof item.key !== "string" || typeof item.title !== "string" || !item.title.trim()) return [];
      const key = item.key.startsWith("/") ? item.key : `/${item.key}`;
      const subjects = Array.isArray(item.subject) ? item.subject : [];
      const matchingGenre = inferGenre(subjects, genre);
      return [{
        id: `openlibrary:${key}`,
        title: item.title.trim(),
        author: Array.isArray(item.author_name) && typeof item.author_name[0] === "string"
          ? item.author_name[0]
          : "Unknown author",
        genre: matchingGenre,
        description: typeof item.first_publish_year === "number"
          ? `First published ${item.first_publish_year}.`
          : "Book record from the Open Library live catalogue.",
        ...(Number.isInteger(item.cover_i) && item.cover_i > 0
          ? { coverUrl: `https://covers.openlibrary.org/b/id/${item.cover_i}-M.jpg` }
          : {}),
        ...(Number.isInteger(item.first_publish_year)
          ? { firstPublishedYear: item.first_publish_year }
          : {}),
        openLibraryUrl: `https://openlibrary.org${key}`,
      }];
    });
    const result = {
      books: liveBooks,
      total: typeof data.numFound === "number" ? data.numFound : liveBooks.length,
      page,
      limit,
    };
    liveBookCache.set(cacheKey, { result, expiresAt: Date.now() + liveBookCacheTtl });
    if (liveBookCache.size > 100) {
      const oldestKey = liveBookCache.keys().next().value;
      if (oldestKey) liveBookCache.delete(oldestKey);
    }
    sendJson(response, 200, result, { "X-Data-Source": "openlibrary" });
    return;
  }
  if (request.method === "GET" && url.pathname === "/api/books.xml") {
    const xml = await fs.promises.readFile(path.join(projectRoot, "data", "books.xml"));
    response.writeHead(200, { "Content-Type": "application/xml; charset=utf-8" });
    response.end(xml);
    return;
  }
  if (request.method === "GET" && url.pathname === "/api/books.dtd") {
    const dtd = await fs.promises.readFile(path.join(projectRoot, "data", "books.dtd"));
    response.writeHead(200, { "Content-Type": "application/xml-dtd; charset=utf-8" });
    response.end(dtd);
    return;
  }
  if (request.method === "GET" && url.pathname === "/api/me") {
    const user = getSessionUser(request);
    sendJson(response, 200, { user: user ? publicUser(user) : null });
    return;
  }
  if (request.method === "POST" && url.pathname === "/api/register") {
    const data = await readJson(request);
    const fullName = typeof data.fullName === "string" ? data.fullName.trim() : "";
    const email = typeof data.email === "string" ? data.email.trim().toLowerCase() : "";
    const username = typeof data.username === "string" ? data.username.trim().toLowerCase() : "";
    const genre = typeof data.genre === "string" ? data.genre : "";
    const password = typeof data.password === "string" ? data.password : "";
    if (!fullName || fullName.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
        !/^[a-z0-9_]{3,30}$/.test(username) || !genres.has(genre) ||
        password.length < 8 || password.length > 128) {
      sendJson(response, 400, { error: "Enter a name, valid email, username (3–30 letters/numbers/underscores), genre, and password of at least 8 characters." });
      return;
    }
    if (users.has(username) || emailOwners.has(email)) {
      sendJson(response, 409, { error: "That username or email is already registered." });
      return;
    }
    const salt = crypto.randomBytes(16);
    const user = {
      id: crypto.randomUUID(),
      fullName,
      email,
      username,
      genre,
      salt,
      passwordHash: crypto.scryptSync(password, salt, 64),
    };
    users.set(username, user);
    emailOwners.set(email, username);
    createSession(response, user);
    return;
  }
  if (request.method === "POST" && url.pathname === "/api/login") {
    const data = await readJson(request);
    const username = typeof data.username === "string" ? data.username.trim().toLowerCase() : "";
    const password = typeof data.password === "string" ? data.password : "";
    const user = users.get(username);
    if (!user || password.length === 0 || password.length > 128 ||
        !crypto.timingSafeEqual(user.passwordHash, crypto.scryptSync(password, user.salt, 64))) {
      sendJson(response, 401, { error: "Username or password is incorrect." });
      return;
    }
    createSession(response, user);
    return;
  }
  if (request.method === "POST" && url.pathname === "/api/logout") {
    const cookie = request.headers.cookie || "";
    const token = cookie.split(";").map((part) => part.trim())
      .find((part) => part.startsWith(`${sessionCookie}=`))
      ?.slice(sessionCookie.length + 1);
    if (token) sessions.delete(token);
    sendJson(response, 200, { message: "You have been logged out." }, sessionHeaders("", 0));
    return;
  }
  if (request.method === "PUT" && url.pathname === "/api/profile") {
    const user = getSessionUser(request);
    if (!user) {
      sendJson(response, 401, { error: "Log in before updating your profile." });
      return;
    }
    const data = await readJson(request);
    if (typeof data.genre !== "string" || !genres.has(data.genre)) {
      sendJson(response, 400, { error: "Choose a valid favorite genre." });
      return;
    }
    user.genre = data.genre;
    sendJson(response, 200, { user: publicUser(user) });
    return;
  }
  if (request.method === "GET" && url.pathname === "/api/recommendations") {
    sendJson(response, 200, suggestions);
    return;
  }
  if (request.method === "POST" && url.pathname === "/api/recommendations") {
    const data = await readJson(request);
    const reader = typeof data.reader === "string" ? data.reader.trim() : "";
    const title = typeof data.title === "string" ? data.title.trim() : "";
    const author = typeof data.author === "string" ? data.author.trim() : "";
    const genre = typeof data.genre === "string" ? data.genre : "";
    if (!reader || reader.length > 100 || !title || title.length > 120 ||
        !author || author.length > 100 || !genres.has(genre)) {
      sendJson(response, 400, { error: "Enter a reader name, book title, author, and valid genre." });
      return;
    }
    const suggestion = {
      id: crypto.randomUUID(),
      reader,
      title,
      author,
      genre,
      submittedAt: new Date().toISOString(),
    };
    suggestions.unshift(suggestion);
    sendJson(response, 201, {
      message: `Thanks, ${reader}. Your book recommendation was received.`,
      suggestion,
    });
    return;
  }

  sendJson(response, 404, { error: "API endpoint not found." });
}

async function serveApp(request, response, url) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { Allow: "GET, HEAD" });
    response.end("Method not allowed");
    return;
  }
  if (!fs.existsSync(webRoot)) {
    response.writeHead(503, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("The app has not been built yet. Run npm run build, then npm start.");
    return;
  }

  let requestedPath;
  try {
    requestedPath = decodeURIComponent(url.pathname);
  } catch {
    response.writeHead(400);
    response.end("Bad request");
    return;
  }

  let filePath = path.resolve(webRoot, `.${requestedPath === "/" ? "/index.html" : requestedPath}`);
  if (!filePath.startsWith(`${webRoot}${path.sep}`) && filePath !== path.join(webRoot, "index.html")) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }
  try {
    const contents = await fs.promises.readFile(filePath);
    response.writeHead(200, {
      "Content-Type": contentTypes[path.extname(filePath)] || "application/octet-stream",
    });
    response.end(request.method === "HEAD" ? undefined : contents);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    if (path.extname(requestedPath)) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }
    filePath = path.join(webRoot, "index.html");
    const index = await fs.promises.readFile(filePath);
    response.writeHead(200, { "Content-Type": contentTypes[".html"] });
    response.end(request.method === "HEAD" ? undefined : index);
  }
}

const server = http.createServer((request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
  const handler = url.pathname.startsWith("/api/")
    ? handleApi(request, response, url)
    : serveApp(request, response, url);
  handler.catch((error) => {
    const statusCode = error.statusCode || 500;
    if (statusCode >= 500) console.error("Request failed:", error);
    if (!response.headersSent) {
      sendJson(response, statusCode, {
        error: statusCode >= 500 ? "The server could not complete the request." : error.message,
      });
    } else {
      response.destroy(error);
    }
  });
});

server.listen(port, () => {
  console.log(`PageTurner is running at http://localhost:${port}`);
});
