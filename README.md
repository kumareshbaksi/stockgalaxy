[![](https://github.com/kumareshbaksi/stockgalaxy/blob/main/frontend/public/images/readme-image.png?raw=true)](https://stockgalaxy.in/)
<br />

<p align="center">
  <img src="https://img.shields.io/badge/Chart.js-FF6384?style=for-the-badge&logo=chartdotjs&logoColor=white">
  <img src="https://img.shields.io/badge/-Express-373737?style=for-the-badge&logo=Express&logoColor=white">
  <img src="https://img.shields.io/badge/fontawesome-538DD7?style=for-the-badge&logo=fontawesome&logoColor=white">
  <img src="https://img.shields.io/badge/html5-%23E34F26.svg?style=for-the-badge&logo=html5&logoColor=white">
  <img src="https://img.shields.io/badge/jQuery-0769AD?style=for-the-badge&logo=jquery&logoColor=white">
  <img src="https://img.shields.io/badge/-MongoDB-13aa52?style=for-the-badge&logo=mongodb&logoColor=white">
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB">
</p>


# About

[StockGalaxy](https://stockgalaxy.in) is a minimalistic and customizable platform for tracking and analyzing stocks. It offers a unique way to view indian stock market, portfolio management tools, an account system to save your watchlists. StockGalaxy aims to provide a straightforward yet comprehensive experience by unobtrusively displaying stock information and delivering feedback on price changes, volume, and other market indicators. Whether you’re a casual investor or a seasoned trader, StockGalaxy strives to be your reliable companion for staying on top of market trends and making informed investment decisions.

# Features

- **View sector-wise stocks in a bubble chart**: Quickly visualize market performance by sector, helping you identify trends and growth opportunities at a glance.  
- **Filtering options**: Filter market stocks sector-wise (as well as by price range or volume) to quickly zero in on the data that matters most to you.
- **Create your own portfolio**: Easily manage a personalized collection of stocks, track their performance, and keep an eye on potential investments.  
- **Create a shortcut to your portfolio**: Access your custom portfolio with a single click or tap, saving you time and making it simpler to monitor your holdings.

# Bug report or Feature request

If you encounter a bug or have a feature request, [send us an email](mailto:baksikuaresh@gmail.com), [create an issue](https://github.com/kumareshbaksi/stockgalaxy/issues).

# Want to Contribute?

Refer to [CONTRIBUTING.md](./docs/CONTRIBUTING.md).

# Host Locally With Nginx

Use the steps below (or see the detailed guide in [docs/nginx-virtual-host.md](./docs/nginx-virtual-host.md)) to serve the React build through your own Nginx instance while proxying the API to the Node backend.

1. **Build the frontend**
   ```bash
   cd /var/www/stock-galaxy/frontend
   npm install
   npm run build
   ```

2. **Start the backend**  
   Set the frontend origin and port so CORS stays in sync with Nginx:
   ```bash
   cd /var/www/stock-galaxy/backend
   npm install
   FRONTEND_URL=http://stockgalaxy.local \
   PORT=5000 \
   NODE_ENV=production \
   node index.js
   ```

3. **Create the Nginx server block** (`/etc/nginx/sites-available/stockgalaxy.local.conf`)
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

4. **Enable & reload**
   ```bash
   sudo ln -s /etc/nginx/sites-available/stockgalaxy.local.conf /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```

5. **Point the hostname to localhost**
   ```bash
   echo "127.0.0.1 stockgalaxy.local" | sudo tee -a /etc/hosts
   ```

6. **Optional:** Override the frontend’s API URL via `REACT_APP_API_BASE_URL` before running `npm run build` if the backend is hosted elsewhere.

# Code of Conduct

Before contributing to this repository, please read the [code of conduct](./docs/CODE_OF_CONDUCT.md).

# Security

To report a security vulnerability, please refer to [SECURITY.md](./docs/SECURITY.md).
