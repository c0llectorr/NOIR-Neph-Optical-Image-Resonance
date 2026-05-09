import "dotenv/config";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { fileURLToPath } from "url";
import axios from "axios";
import cors from "cors";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(cors());

  app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    res.on("finish", () => {
      // Only log API calls, assets in production, or errors
      const isApi = req.url.startsWith("/api");
      const isSource = req.url.startsWith("/src/");
      const isHealth = req.url === "/api/health";
      if (res.statusCode >= 400 || (isApi && !isSource && !isHealth)) {
        console.log(`[${timestamp}] ${req.method} ${req.originalUrl || req.url} ${res.statusCode} - Ref: ${req.headers.referer || 'none'}`);
      }
    });
    next();
  });

  app.use(express.json({ limit: "50mb" }));

  // Define API Router
  const apiRouter = express.Router();

  // Add no-cache headers to all API responses
  apiRouter.use((req, res, next) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    next();
  });

  apiRouter.get("/health", (req, res) => {
    console.log(`[Health Check] pinged at ${new Date().toISOString()}`);
    res.json({ status: "ok", timestamp: new Date().toISOString(), mode: process.env.NODE_ENV || 'development' });
  });

  // iTunes Proxy
  apiRouter.get("/itunes-search", async (req, res) => {
    const { term } = req.query;
    if (!term || typeof term !== 'string') return res.status(400).json({ error: "Term is required" });

    // Clean term: remove special characters that might confuse the search
    const cleanTerm = term.replace(/[(){}[\]]/g, '').trim();

    console.log(`[iTunes Proxy] Searching for: "${cleanTerm}" (original: "${term}")`);

    try {
      const search = async (currTerm: string, country?: string) => {
        const params: any = {
          term: currTerm,
          media: "music",
          entity: "song",
          limit: 20
        };
        if (country) params.country = country;

        return axios.get("https://itunes.apple.com/search", {
          params,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          },
          timeout: 8000
        });
      };

      // Try multiple strategies
      let response = await search(cleanTerm);
      
      // Strategy 1: Global search failed or few results? try US
      if (!response.data.results || response.data.results.length < 2) {
        console.log(`[iTunes Proxy] Low results for "${cleanTerm}", trying US...`);
        const usResp = await search(cleanTerm, "US");
        if (usResp.data.results && usResp.data.results.length > response.data.results.length) {
          response = usResp;
        }
      }

      // Strategy 2: If still no results, try cleaning the term even more (remove 'by', ' - ', etc.)
      if (!response.data.results || response.data.results.length === 0) {
        const simplerTerm = cleanTerm.split(/ - | by /i)[0].trim();
        if (simplerTerm !== cleanTerm) {
          console.log(`[iTunes Proxy] Trying simpler term: "${simplerTerm}"`);
          const simpleResp = await search(simplerTerm);
          if (simpleResp.data.results && simpleResp.data.results.length > 0) {
            response = simpleResp;
          }
        }
      }

      const results = response.data.results || [];
      console.log(`[iTunes Proxy] Returning ${results.length} results for "${cleanTerm}"`);

      // Tag results with helpful flags
      const enhancedResults = results.map((r: any) => ({
        ...r,
        _isPlayable: !!r.previewUrl
      }));

      res.json({ results: enhancedResults });
    } catch (error: any) {
      console.error("[iTunes Search] API Error:", error.message);
      res.status(500).json({ error: "Failed to fetch from iTunes", details: error.message });
    }
  });

  // Audio Proxy
  apiRouter.get("/proxy-audio", async (req, res) => {
    const { url } = req.query;
    if (!url || typeof url !== 'string') return res.status(400).send("URL is required");

    try {
      const headers: Record<string, string> = {
        'User-Agent': req.headers['user-agent'] || 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'audio/*, */*',
        'Referer': 'https://www.apple.com/',
        'Origin': 'https://www.apple.com',
        'Connection': 'keep-alive',
        'Accept-Encoding': 'identity'
      };

      if (req.headers.range) {
        headers['Range'] = req.headers.range;
      }

      const response = await axios({
        method: 'get',
        url: url,
        responseType: 'stream',
        timeout: 45000,
        headers,
        validateStatus: (status) => status >= 200 && status < 400, 
        maxRedirects: 15
      });

      const contentType = response.headers['content-type'] as string | undefined;
      if (contentType && typeof contentType === 'string' && contentType.includes('text/html')) {
         return res.status(415).send("Target URL is not audio");
      }

      const headersToForward = [
        'content-type',
        'content-length',
        'accept-ranges',
        'content-range',
        'cache-control',
        'last-modified',
        'etag'
      ];

      headersToForward.forEach(header => {
        if (response.headers[header]) {
          res.setHeader(header, response.headers[header] as string);
        }
      });

      res.status(response.status);
      response.data.pipe(res);
      
      response.data.on('error', (err: any) => {
        if (!res.headersSent) res.status(502).send("Stream error");
      });

      res.on('close', () => {
        if (response.data && response.data.destroy) {
          response.data.destroy();
        }
      });
    } catch (error: any) {
      if (!res.headersSent) {
        res.status(500).send("Failed to proxy audio");
      }
    }
  });

  // Final 404 handler for API router
  apiRouter.use((req, res) => {
    console.warn(`[Server] API 404: ${req.method} ${req.originalUrl}`);
    res.status(404).json({ 
      error: "Not Found", 
      message: `API route not found: ${req.originalUrl}` 
    });
  });

  // Mount API router
  app.use("/api", apiRouter);

  // Fallback for /api that didn't match in apiRouter
  app.use("/api", (req, res) => {
    console.warn(`[Server] API 404 fallback: ${req.method} ${req.originalUrl}`);
    res.status(404).json({ 
      error: "Not Found", 
      message: `API route reached fallback: ${req.originalUrl}` 
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      const url = req.originalUrl || req.url;
      // Exclude gemini-api-proxy from being caught as an internal API 404
      const isApi = (url.includes("/api") || url.startsWith("/api")) && !url.includes("gemini-api-proxy");
      const acceptsHtml = req.headers.accept?.includes("text/html");
      const hasExtension = path.extname(url.split('?')[0]).length > 1;

      if (isApi || (hasExtension && !acceptsHtml)) {
        return res.status(404).json({ 
          error: "Not Found", 
          message: `Resource not found: ${url}`
        });
      }

      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  // Global error handler
  app.use((err: any, req: any, res: any, next: any) => {
    console.error("[Global Error]", err);
    res.status(500).json({ error: "Internal Server Error", message: err.message });
  });
}

startServer();
