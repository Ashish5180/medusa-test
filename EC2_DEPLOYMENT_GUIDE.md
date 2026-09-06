# ☁️ Amazon EC2 Production Deployment Guide

A step-by-step, production-grade guide to deploying this **Medusa v2 PERN backend** on an **Amazon Web Services (AWS) EC2 Ubuntu instance** with **PM2**, **Nginx reverse proxy**, and **free SSL (Certbot)**.

---

## 📑 Table of Contents
1. [Architecture Overview](#1-architecture-overview)
2. [Prerequisites & Recommended EC2 Specs](#2-prerequisites--recommended-ec2-specs)
3. [Step 1: Launch & Configure EC2 Instance](#step-1-launch--configure-ec2-instance)
4. [Step 2: Connect via SSH & Server Preparation](#step-2-connect-via-ssh--server-preparation)
5. [Step 3: Setup Swap Memory (Crucial for Low RAM)](#step-3-setup-swap-memory-crucial-for-low-ram)
6. [Step 4: Install Node.js 20 & Global Tools](#step-4-install-nodejs-20--global-tools)
7. [Step 5: Clone Repository & Configure Environment](#step-5-clone-repository--configure-environment)
8. [Step 6: Build Application & Run Migrations](#step-6-build-application--run-migrations)
9. [Step 7: Setup PM2 Process Manager (24/7 Uptime)](#step-7-setup-pm2-process-manager-247-uptime)
10. [Step 8: Configure Nginx as Reverse Proxy](#step-8-configure-nginx-as-reverse-proxy)
11. [Step 9: Setup Free HTTPS/SSL with Let's Encrypt](#step-9-setup-free-httpsssl-with-lets-encrypt)
12. [Step 10: Automated Deployment Script (`deploy.sh`)](#step-10-automated-deployment-script-deploysh)
13. [Monitoring & Troubleshooting](#11-monitoring--troubleshooting)

---

## 1. Architecture Overview

```
[ Mobile App / Storefront Client ]
               │
               ▼  (HTTPS Port 443)
       [ Nginx Reverse Proxy ]
               │
               ▼  (Localhost Port 9000)
    [ Medusa v2 Backend (PM2) ]
               │
               ▼  (SSL Connection Pooling)
   [ Neon Cloud / RDS PostgreSQL ]
```

---

## 2. Prerequisites & Recommended EC2 Specs

| Component | Minimum Spec | Recommended Production Spec |
| :--- | :--- | :--- |
| **Operating System** | Ubuntu 22.04 / 24.04 LTS | Ubuntu 24.04 LTS (x86_64 / arm64) |
| **Instance Type** | `t3.small` (2 vCPU, 2 GB RAM) | `t3.medium` (2 vCPU, 4 GB RAM) |
| **Storage** | 20 GB gp3 SSD | 30–50 GB gp3 SSD |
| **Domain Name** | Optional (can use Elastic IP) | Registered domain (e.g. `api.yourbrand.com`) |
| **Database** | Neon PostgreSQL (Serverless) | Neon PostgreSQL or AWS RDS Postgres 15+ |

> [!IMPORTANT]
> If you choose the AWS Free Tier (`t2.micro` or `t3.micro` with only 1 GB RAM), you **MUST** configure **Swap Memory** (Step 3), otherwise `npm install` and `npm run build` will crash due to Out-Of-Memory (OOM).

---

## Step 1: Launch & Configure EC2 Instance

1. Open the [AWS Management Console](https://console.aws.amazon.com/ec2/) and navigate to **EC2** &rarr; **Launch Instance**.
2. **Name**: `medusa-production-backend`
3. **Application and OS Images**: **Ubuntu 24.04 LTS** (64-bit x86).
4. **Instance Type**: Select `t3.small` (or `t3.medium`).
5. **Key Pair (Login)**:
   - Create a new key pair or select an existing one (e.g., `medusa-key.pem`).
   - Download and keep this file safe.
6. **Network Settings (Security Group)**:
   Ensure the following inbound firewall rules are added:

   | Type | Protocol | Port | Source | Description |
   | :--- | :--- | :--- | :--- | :--- |
   | **SSH** | TCP | `22` | `My IP` (or `0.0.0.0/0`) | Secure command-line access |
   | **HTTP** | TCP | `80` | `0.0.0.0/0` (Anywhere) | Web traffic & SSL challenge |
   | **HTTPS**| TCP | `443`| `0.0.0.0/0` (Anywhere) | Secure encrypted traffic |

7. **Storage**: Set size to at least **20 GiB (gp3)**.
8. Click **Launch Instance**.
9. **Assign an Elastic IP (Recommended)**:
   - In EC2 sidebar &rarr; **Network & Security** &rarr; **Elastic IPs**.
   - Click **Allocate Elastic IP address** &rarr; **Allocate**.
   - Actions &rarr; **Associate Elastic IP address** &rarr; Select your newly launched instance.  
     *(This ensures your server IP never changes when rebooted).*

---

## Step 2: Connect via SSH & Server Preparation

On your local machine, open the terminal in the directory where your `.pem` key is located:

```bash
# 1. Set correct permissions for key
chmod 400 medusa-key.pem

# 2. Connect to EC2 instance (replace with your Elastic IP)
ssh -i medusa-key.pem ubuntu@YOUR_EC2_PUBLIC_IP
```

Once connected to the server, update all operating system packages:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git build-essential ufw
```

---

## Step 3: Setup Swap Memory (Crucial for Low RAM)

Swap space allows Linux to use disk space as virtual memory when RAM is full, preventing builds from crashing.

```bash
# 1. Create a 2GB swap file
sudo fallocate -l 2G /swapfile

# 2. Secure file permissions
sudo chmod 600 /swapfile

# 3. Mark as swap and activate
sudo mkswap /swapfile
sudo swapon /swapfile

# 4. Make swap permanent across reboots
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# 5. Verify swap is active
free -h
```

---

## Step 4: Install Node.js 20 & Global Tools

Install the active LTS version of Node.js (v20.x) and PM2:

```bash
# 1. Add NodeSource Node.js 20 repository
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# 2. Install Node.js
sudo apt install -y nodejs

# 3. Verify Node & NPM versions
node -v   # Should output v20.x.x
npm -v    # Should output 10.x+

# 4. Install PM2 process manager globally
sudo npm install -g pm2
```

---

## Step 5: Clone Repository & Configure Environment

Clone your GitHub repository into the web directory:

```bash
# 1. Create app directory
sudo mkdir -p /var/www
sudo chown -R ubuntu:ubuntu /var/www
cd /var/www

# 2. Clone your repository
git clone https://github.com/Ashish5180/medusa-test.git backend
cd backend

# 3. Create your production .env file
nano .env
```

Paste your production environment variables inside `.env`:

```env
NODE_ENV=production
PORT=9000

# 1. Database Connection (Neon Cloud PostgreSQL)
DATABASE_URL=postgresql://neondb_owner:YOUR_PASSWORD@ep-bold-bread-b3orqjpk.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require

# 2. Security Secrets (Use random 32+ character strings)
JWT_SECRET=e8d2f6a1b5c49081734289abcdef0123456789abcdef0123456789abcdef
COOKIE_SECRET=9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba
AUTH_MFA_ENCRYPTION_KEY=7125699bd65cd5f81e4e5d476e7db6aced2378b513cae984d95a3d0b2bdc03d3

# 3. CORS Whitelisting
STORE_CORS=http://localhost:3000,https://your-storefront.com
ADMIN_CORS=http://localhost:3000,https://your-admin.com
AUTH_CORS=http://localhost:3000,https://your-storefront.com
```

Save and exit (`Ctrl + O` &rarr; `Enter` &rarr; `Ctrl + X`).

---

## Step 6: Build Application & Run Migrations

```bash
# 1. Install all dependencies (including devDependencies needed for build)
npm install --include=dev

# 2. Apply all PostgreSQL migrations (tables for appointments, rentals, events)
npx medusa db:migrate

# 3. Sync remote links
npx medusa db:sync-links

# 4. Build the production Medusa server
npm run build
```

Verify that the build outputs:
```text
info:    Backend build completed successfully
```

---

## Step 7: Setup PM2 Process Manager (24/7 Uptime)

PM2 keeps your Medusa backend running in the background, restarts it automatically if an unhandled exception occurs, and restores it on server reboots.

### 1. Create PM2 Ecosystem File
In `/var/www/backend`:

```bash
cat << 'EOF' > ecosystem.config.js
module.exports = {
  apps: [
    {
      name: "medusa-backend",
      script: "npm",
      args: "run start",
      cwd: "/var/www/backend",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1500M",
      env: {
        NODE_ENV: "production",
        PORT: 9000,
      },
    },
  ],
};
EOF
```

### 2. Start Service with PM2
```bash
# Start backend
pm2 start ecosystem.config.js

# Check status
pm2 status

# Save current PM2 process list
pm2 save

# Setup PM2 to auto-start on EC2 system boot
pm2 startup
# (Run the generated 'sudo env PATH=...' command shown in your terminal output)
```

---

## Step 8: Configure Nginx as Reverse Proxy

Nginx will receive external traffic on ports 80/443 and proxy it to Medusa running on port 9000.

### 1. Install Nginx
```bash
sudo apt install -y nginx
```

### 2. Configure Nginx Virtual Host
```bash
sudo nano /etc/nginx/sites-available/medusa
```

Paste the following configuration (replace `api.yourdomain.com` with your actual domain name or EC2 Public IP):

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;  # Or your EC2 Elastic IP

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:9000;
        proxy_http_version 1.1;

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

### 3. Enable Site & Restart Nginx
```bash
# Enable the configuration
sudo ln -sf /etc/nginx/sites-available/medusa /etc/nginx/sites-enabled/

# Remove default site
sudo rm -f /etc/nginx/sites-enabled/default

# Test configuration syntax
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

Now, opening `http://YOUR_EC2_PUBLIC_IP/health` in your browser will return `OK`!

---

## Step 9: Setup Free HTTPS/SSL with Let's Encrypt

If you have a domain pointed to your EC2 Elastic IP via DNS (A-record for `api.yourdomain.com` &rarr; `YOUR_EC2_IP`):

```bash
# 1. Install Certbot and Nginx plugin
sudo apt install -y certbot python3-certbot-nginx

# 2. Obtain and install SSL Certificate automatically
sudo certbot --nginx -d api.yourdomain.com

# 3. Follow the prompts (enter your email, accept terms)
```

Certbot will automatically modify `/etc/nginx/sites-available/medusa`, redirect HTTP to HTTPS, and schedule automatic certificate renewal.

---

## Step 10: Automated Deployment Script (`deploy.sh`)

Whenever you push new code to GitHub, deploy updates seamlessly by creating a zero-friction script on the EC2 instance:

```bash
# Create deploy script in /var/www/backend
nano /var/www/backend/deploy.sh
```

Paste this content:

```bash
#!/bin/bash
set -e

echo "🚀 Starting Medusa Deployment..."
cd /var/www/backend

# 1. Pull latest code from GitHub
git pull origin main

# 2. Install any new dependencies
npm install --include=dev

# 3. Run database migrations
npx medusa db:migrate
npx medusa db:sync-links

# 4. Rebuild the server
npm run build

# 5. Reload PM2 process with zero downtime
pm2 reload medusa-backend

echo "✅ Deployment completed successfully!"
```

Make it executable:
```bash
chmod +x /var/www/backend/deploy.sh
```

Now, anytime you want to update your live EC2 backend:
```bash
/var/www/backend/deploy.sh
```

---

## 11. Monitoring & Troubleshooting

### View Real-Time Application Logs
```bash
# View all recent logs
pm2 logs medusa-backend

# View streaming live logs
pm2 logs medusa-backend --lines 100
```

### View Nginx Access & Error Logs
```bash
# Nginx errors
sudo tail -f /var/log/nginx/error.log

# Nginx requests
sudo tail -f /var/log/nginx/access.log
```

### Server Resource Utilization
```bash
# Monitor CPU & Memory in terminal
pm2 monit

# Disk usage
df -h

# Memory & Swap usage
free -h
```

### How to Restart Services
```bash
# Restart Medusa
pm2 restart medusa-backend

# Restart Nginx
sudo systemctl restart nginx
```
