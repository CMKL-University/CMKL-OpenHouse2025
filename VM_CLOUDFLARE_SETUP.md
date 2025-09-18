# VM + CloudFlare CDN Setup for Large GLTF Models

## Overview
Host large GLTF files on your VM with CloudFlare CDN acceleration for `openharty.cmkl.ac.th`.

## Step 1: VM Server Setup

### Upload Model Files to VM
```bash
# Create model directory on VM
sudo mkdir -p /var/www/openharty/model/Innovation_key
sudo mkdir -p /var/www/openharty/model/Wonder_key
sudo mkdir -p /var/www/openharty/model/magic_key

# Upload the large files that are excluded from Vercel:
# - model/Innovation_key/in1.gltf (43MB)
# - model/Innovation_key/in4.gltf (77MB)
# - model/register.gltf (57MB)
# - model/registration.mind (required for AR)

# Set permissions
sudo chown -R www-data:www-data /var/www/openharty
sudo chmod -R 755 /var/www/openharty
```

### Nginx Configuration
Create `/etc/nginx/sites-available/openharty-models`:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name openharty.cmkl.ac.th;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name openharty.cmkl.ac.th;

    # SSL Configuration (CloudFlare handles this, but backup)
    ssl_certificate /etc/ssl/certs/openharty.crt;
    ssl_certificate_key /etc/ssl/private/openharty.key;
    ssl_protocols TLSv1.2 TLSv1.3;

    # Document root
    root /var/www/openharty;
    index index.html;

    # CloudFlare Real IP headers
    set_real_ip_from 103.21.244.0/22;
    set_real_ip_from 103.22.200.0/22;
    set_real_ip_from 103.31.4.0/22;
    set_real_ip_from 104.16.0.0/13;
    set_real_ip_from 104.24.0.0/14;
    set_real_ip_from 108.162.192.0/18;
    set_real_ip_from 131.0.72.0/22;
    set_real_ip_from 141.101.64.0/18;
    set_real_ip_from 162.158.0.0/15;
    set_real_ip_from 172.64.0.0/13;
    set_real_ip_from 173.245.48.0/20;
    set_real_ip_from 188.114.96.0/20;
    set_real_ip_from 190.93.240.0/20;
    set_real_ip_from 197.234.240.0/22;
    set_real_ip_from 198.41.128.0/17;
    real_ip_header CF-Connecting-IP;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # CORS headers for AR models (CRITICAL!)
    location ~* \.(gltf|bin|mind|glb)$ {
        # Allow CloudFlare and your main domain
        add_header Access-Control-Allow-Origin "*" always;
        add_header Access-Control-Allow-Methods "GET, HEAD, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control" always;
        add_header Access-Control-Expose-Headers "Content-Length, Content-Range" always;

        # Handle preflight requests
        if ($request_method = 'OPTIONS') {
            add_header Access-Control-Allow-Origin "*";
            add_header Access-Control-Allow-Methods "GET, HEAD, OPTIONS";
            add_header Access-Control-Max-Age 86400;
            add_header Content-Type "text/plain; charset=utf-8";
            add_header Content-Length 0;
            return 204;
        }

        # CloudFlare caching optimization
        add_header Cache-Control "public, max-age=31536000, immutable";
        expires 1y;

        # Enable range requests for large files
        add_header Accept-Ranges bytes;

        # Correct MIME types
        location ~* \.gltf$ {
            add_header Content-Type "model/gltf+json";
        }
        location ~* \.bin$ {
            add_header Content-Type "application/octet-stream";
        }
        location ~* \.mind$ {
            add_header Content-Type "application/octet-stream";
        }

        try_files $uri =404;
    }

    # Health check
    location /health {
        access_log off;
        return 200 "VM + CloudFlare CDN OK\n";
        add_header Content-Type text/plain;
    }

    # Block sensitive files
    location ~ /\. {
        deny all;
    }

    # Logging
    access_log /var/log/nginx/openharty-access.log;
    error_log /var/log/nginx/openharty-error.log;
}
```

### Enable the Configuration
```bash
# Link the site
sudo ln -s /etc/nginx/sites-available/openharty-models /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

## Step 2: CloudFlare Configuration

### DNS Settings
1. **A Record**: `openharty.cmkl.ac.th` → Your VM IP
2. **Enable Proxy**: Orange cloud icon (CDN enabled)

### CloudFlare Page Rules
Create these rules in CloudFlare dashboard:

**Rule 1: Cache Everything for Models**
- URL: `openharty.cmkl.ac.th/model/*`
- Settings:
  - Cache Level: Cache Everything
  - Edge Cache TTL: 1 year
  - Browser Cache TTL: 1 year

**Rule 2: CORS Headers**
- URL: `openharty.cmkl.ac.th/model/*.gltf`
- Settings:
  - Add Header: `Access-Control-Allow-Origin: *`

### CloudFlare Caching Rules
In **Rules** > **Transform Rules**:
```
If URI Path contains "/model/"
Then:
  - Cache TTL: 1 year
  - Cache by device type: Off
  - Bypass cache on cookie: Off
```

## Step 3: Update Scanner.html for Hybrid Loading

```javascript
// Configuration for model sources
const MODEL_SOURCES = {
  // Large files from VM + CloudFlare
  large: 'https://openharty.cmkl.ac.th',
  // Small files from Vercel (already deployed)
  small: ''
};

// Model source mapping
const MODEL_CONFIG = {
  'register.gltf': MODEL_SOURCES.large,           // 57MB - VM
  'Innovation_key/in1.gltf': MODEL_SOURCES.large, // 43MB - VM
  'Innovation_key/in4.gltf': MODEL_SOURCES.large, // 77MB - VM
  'Innovation_key/in2.gltf': MODEL_SOURCES.small, // 4MB - Vercel
  'Innovation_key/in3.gltf': MODEL_SOURCES.small, // 28MB - Vercel
  'registration.mind': MODEL_SOURCES.large,       // Required - VM
};

// Dynamic path resolution
function getModelPath(modelPath) {
  const source = MODEL_CONFIG[modelPath] || MODEL_SOURCES.small;
  return source ? `${source}/model/${modelPath}` : `model/${modelPath}`;
}
```

## Step 4: Testing & Verification

### Test VM Direct Access
```bash
# Test model file accessibility
curl -I https://openharty.cmkl.ac.th/model/register.gltf

# Check CORS headers
curl -H "Origin: https://openhouse.cmkl.ac.th" \
     -H "Access-Control-Request-Method: GET" \
     -X OPTIONS https://openharty.cmkl.ac.th/model/register.gltf

# Test CloudFlare caching
curl -I https://openharty.cmkl.ac.th/model/register.gltf | grep -i cf-cache
```

### Browser Console Test
```javascript
// Test from browser on openhouse.cmkl.ac.th
fetch('https://openharty.cmkl.ac.th/model/register.gltf')
  .then(r => console.log('VM CDN Response:', r.status, r.headers))
  .catch(e => console.error('CDN Error:', e));
```

## Step 5: Monitoring & Optimization

### CloudFlare Analytics
- Monitor cache hit ratio (aim for >95%)
- Check bandwidth usage
- Monitor response times

### VM Monitoring
```bash
# Check nginx access logs
sudo tail -f /var/log/nginx/openharty-access.log

# Monitor bandwidth
sudo iftop -i eth0 -P

# Check disk usage
df -h /var/www/openharty
```

### Performance Commands
```bash
# Test download speed
wget --progress=bar --limit-rate=1m https://openharty.cmkl.ac.th/model/register.gltf

# Test from different locations
curl -w "@curl-format.txt" -o /dev/null -s https://openharty.cmkl.ac.th/model/register.gltf
```

## Expected Benefits

1. **Global Performance**: CloudFlare's 300+ edge locations
2. **Cost Efficiency**: VM handles origin, CloudFlare handles traffic
3. **Reliability**: CloudFlare caching + VM redundancy
4. **Scalability**: Automatic scaling via CloudFlare
5. **Control**: Full control over large model files

## Troubleshooting

**Common Issues:**
1. **CORS errors**: Check nginx CORS headers and CloudFlare settings
2. **SSL errors**: Ensure CloudFlare SSL mode is "Full" or "Full (strict)"
3. **Cache misses**: Verify CloudFlare page rules are active
4. **Slow loading**: Check VM bandwidth and CloudFlare analytics

Your AR app will now load large models efficiently from VM + CloudFlare while keeping small models on Vercel!