# Nginx Virtual Host For StockGalaxy

Use this guide to serve the compiled React frontend from Nginx while proxying API calls to the Node/Express backend. The same steps work for local development and for a production Linux server (Ubuntu/Debian examples are shown below).

## 1. Prerequisites

- Node.js 18+ and npm installed.
- Nginx installed (`sudo apt install nginx`).
- A DNS record (on a server) or a `/etc/hosts` entry (on localhost) pointing the desired hostname to the machine.

## 2. Build The Frontend

```bash
cd /var/www/stock-galaxy/frontend
npm install
npm run build
```

The static assets will be generated in `frontend/build`, which we will expose via Nginx.

## 3. Prepare And Start The Backend

```bash
cd /var/www/stock-galaxy/backend
npm install
PORT=5000 FRONTEND_URL=http://stockgalaxy.local NODE_ENV=production node index.js
```

Replace `stockgalaxy.local` with the hostname you plan to use. In production you would typically run the backend with a supervisor such as `pm2` or a systemd unit.

## 4. Create The Nginx Server Block

Create `/etc/nginx/sites-available/stockgalaxy.conf` with the contents below (adjust the `server_name`, `root`, and port numbers if needed):

```nginx
server {
    listen 80;
    server_name stockgalaxy.local;

    root /var/www/stock-galaxy/frontend/build;
    index index.html;

    location / {
        try_files $uri /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:5000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    error_log /var/log/nginx/stockgalaxy.error.log;
    access_log /var/log/nginx/stockgalaxy.access.log;
}
```

Notes:

- `try_files $uri /index.html;` ensures React Router handles client-side routes.
- The `/api/` block proxies every API request to the Express server that listens on port `5000`.
- For HTTPS, wrap the server block with `listen 443 ssl;` and reference your TLS certificates.

## 5. Enable The Site

```bash
sudo ln -s /etc/nginx/sites-available/stockgalaxy.conf /etc/nginx/sites-enabled/stockgalaxy.conf
sudo nginx -t
sudo systemctl reload nginx
```

If you are running locally, add a hosts entry:

```bash
echo "127.0.0.1 stockgalaxy.local" | sudo tee -a /etc/hosts
```

Now you can open `http://stockgalaxy.local` and Nginx will serve the built frontend while forwarding `/api` calls to the Node backend.
