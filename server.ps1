$source = @"
using System;
using System.IO;
using System.Net;
using System.Threading;
using System.Collections.Generic;

public class FastServer {
    private HttpListener listener;
    private string rootDir;
    private Dictionary<string, string> mimeTypes = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase) {
        { ".html", "text/html; charset=utf-8" },
        { ".htm", "text/html; charset=utf-8" },
        { ".css", "text/css; charset=utf-8" },
        { ".js", "application/javascript; charset=utf-8" },
        { ".json", "application/json; charset=utf-8" },
        { ".jpg", "image/jpeg" },
        { ".jpeg", "image/jpeg" },
        { ".png", "image/png" },
        { ".webp", "image/webp" },
        { ".svg", "image/svg+xml" },
        { ".ico", "image/x-icon" }
    };

    public int Start(string root, int primaryPort) {
        rootDir = Path.GetFullPath(root);
        int[] ports = new int[] { primaryPort, 5000, 8080, 5050 };
        
        foreach (int p in ports) {
            try {
                listener = new HttpListener();
                listener.Prefixes.Add("http://localhost:" + p + "/");
                listener.Prefixes.Add("http://127.0.0.1:" + p + "/");
                listener.Start();
                Console.WriteLine("FastServer started at http://localhost:" + p + "/");
                ThreadPool.QueueUserWorkItem(ListenLoop);
                return p;
            } catch {
                if (listener != null) {
                    try { listener.Close(); } catch {}
                }
            }
        }
        throw new Exception("Could not bind to any port");
    }

    private void ListenLoop(object state) {
        while (listener != null && listener.IsListening) {
            try {
                var context = listener.GetContext();
                ThreadPool.QueueUserWorkItem(ProcessRequest, context);
            } catch {
                break;
            }
        }
    }

    private void ProcessRequest(object state) {
        var context = (HttpListenerContext)state;
        try {
            string rawPath = context.Request.Url.LocalPath.TrimStart('/');
            if (string.IsNullOrEmpty(rawPath)) rawPath = "index.html";
            string decodedPath = Uri.UnescapeDataString(rawPath).Replace('/', Path.DirectorySeparatorChar);
            string filePath = Path.Combine(rootDir, decodedPath);

            if (File.Exists(filePath)) {
                string ext = Path.GetExtension(filePath).ToLower();
                string mime = mimeTypes.ContainsKey(ext) ? mimeTypes[ext] : "application/octet-stream";
                context.Response.ContentType = mime;
                context.Response.StatusCode = 200;
                context.Response.AddHeader("Access-Control-Allow-Origin", "*");

                // Strictly disable cache on HTML, CSS, JS so updates reflect immediately
                if (ext == ".html" || ext == ".htm" || ext == ".js" || ext == ".css") {
                    context.Response.AddHeader("Cache-Control", "no-cache, no-store, must-revalidate");
                    context.Response.AddHeader("Pragma", "no-cache");
                    context.Response.AddHeader("Expires", "0");
                } else {
                    context.Response.AddHeader("Cache-Control", "public, max-age=86400");
                }

                using (var fs = new FileStream(filePath, FileMode.Open, FileAccess.Read, FileShare.Read)) {
                    context.Response.ContentLength64 = fs.Length;
                    fs.CopyTo(context.Response.OutputStream);
                }
            } else {
                context.Response.StatusCode = 404;
                byte[] notFound = System.Text.Encoding.UTF8.GetBytes("404 Not Found");
                context.Response.ContentLength64 = notFound.Length;
                context.Response.OutputStream.Write(notFound, 0, notFound.Length);
            }
        } catch {
        } finally {
            try {
                context.Response.OutputStream.Close();
                context.Response.Close();
            } catch {}
        }
    }

    public void Stop() {
        if (listener != null) {
            listener.Stop();
            listener.Close();
        }
    }
}
"@

Add-Type -TypeDefinition $source

$root = $PSScriptRoot
if (-not $root) { $root = (Get-Location).Path }

$server = New-Object FastServer
$activePort = $server.Start($root, 3000)
Write-Host "ACTIVE_PORT: $activePort"

try {
    while ($true) {
        Start-Sleep -Seconds 1
    }
} finally {
    $server.Stop()
}
