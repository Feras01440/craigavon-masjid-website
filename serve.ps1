# ============================================================================
# Craigavon Masjid website — local preview server
# Run:  powershell -ExecutionPolicy Bypass -File serve.ps1
# Then open  http://localhost:8420  in your browser. Ctrl+C to stop.
# (No installation needed — uses Windows' built-in HttpListener.)
# ============================================================================
param([int]$Port = 8420)

$root = $PSScriptRoot
$mime = @{
  ".html" = "text/html; charset=utf-8"
  ".css"  = "text/css; charset=utf-8"
  ".js"   = "text/javascript; charset=utf-8"
  ".json" = "application/json"
  ".svg"  = "image/svg+xml"
  ".png"  = "image/png"
  ".jpg"  = "image/jpeg"
  ".webp" = "image/webp"
  ".woff2"= "font/woff2"
  ".xml"  = "application/xml"
  ".txt"  = "text/plain; charset=utf-8"
  ".webmanifest" = "application/manifest+json"
  ".ico"  = "image/x-icon"
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Host "Serving $root at http://localhost:$Port/  (Ctrl+C to stop)"

try {
  while ($listener.IsListening) {
    $ctx = $listener.GetContext()
    try {
      $reqPath = [System.Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath)
      if ($reqPath.EndsWith("/")) { $reqPath += "index.html" }
      $file = Join-Path $root ($reqPath -replace "/", "\").TrimStart("\")
      $full = [System.IO.Path]::GetFullPath($file)

      $ok = $full.StartsWith($root, [System.StringComparison]::OrdinalIgnoreCase) -and (Test-Path $full -PathType Leaf)
      if (-not $ok) {
        $ctx.Response.StatusCode = 404
        $notFound = Join-Path $root "404.html"
        if (Test-Path $notFound) { $full = $notFound } else { $full = $null }
      }

      if ($full) {
        $ext = [System.IO.Path]::GetExtension($full).ToLower()
        $ctx.Response.ContentType = if ($mime.ContainsKey($ext)) { $mime[$ext] } else { "application/octet-stream" }
        $bytes = [System.IO.File]::ReadAllBytes($full)
        $ctx.Response.ContentLength64 = $bytes.Length
        if ($ctx.Request.HttpMethod -ne "HEAD") {
          $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
        }
      }
    } catch {
      try { $ctx.Response.StatusCode = 500 } catch {}
    } finally {
      try { $ctx.Response.Close() } catch {}
    }
  }
} finally {
  $listener.Stop()
}
