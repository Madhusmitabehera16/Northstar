const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8"
};

function safePath(urlPath) {
  const cleanPath = urlPath === "/" ? "/index.html" : urlPath;
  const resolvedPath = path.normalize(path.join(ROOT, cleanPath));
  return resolvedPath.startsWith(ROOT) ? resolvedPath : null;
}

http
  .createServer((req, res) => {
    const filePath = safePath(req.url.split("?")[0]);

    if (!filePath) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }

    fs.readFile(filePath, (error, data) => {
      if (error) {
        res.writeHead(error.code === "ENOENT" ? 404 : 500, {
          "Content-Type": "text/plain; charset=utf-8"
        });
        res.end(error.code === "ENOENT" ? "Not found" : "Server error");
        return;
      }

      const extension = path.extname(filePath).toLowerCase();
      res.writeHead(200, {
        "Content-Type": MIME_TYPES[extension] || "application/octet-stream"
      });
      res.end(data);
    });
  })
  .listen(PORT, () => {
    console.log(`Finance dashboard running at http://localhost:${PORT}`);
  });
