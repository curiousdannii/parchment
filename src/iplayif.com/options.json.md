options.json
============

Here are all the options you can set in data/options.json

```json
{
  "cache_control_age": 604800,
  "cdn_domain": "cdn.iplayif.com",
  "certbot": {
    "email": "user@domain.com",
    "renew_time": 720,
    "test": true,
  },
  "domain": "localhost",
  "front_page": {
    "index_update_time": 10,
  },
  "https": false,
  "metadata": {
    "max_age": 24,
    "max_size": 200000000,
  },
  "nginx": {
    "reload_time": 360
  },
  "proxy": {
    "max_size": 100000000
  },
  "secondary_domain": "proxy.localhost",
  "www": true
}
```

- cache_control_age: (int seconds) time to set for the Cache-Control header
- cdn_domain: (str) domain to use as CDN proxy source
- certbot: options for certbot
  - email: (str) email address for certbot notifications (required for HTTPS)
  - rewew_time: (int minutes) period to rewew certificate
  - test: (bool) obtain a test certificate from the Let's Encrypt staging server
- domain: (str) the main domain of the app
- front_page: front page options
  - index_update_time: (int minutes) how frequently to check if the front page HTML has changed
- https: (bool) whether to enable HTTPS
- metadata: metadata cache options
  - max_age: (int hours) maximum age to keep items in the cache
  - max_size: (int bytes) maximum size of the metadata cache from cover images
- nginx: nginx options
  - reload_time: (int minutes) period to reload nginx (to check for certificate changes)
- proxy: Parchment proxy options
  - max_size: (int bytes) maximum size of files to proxy
- secondary_domain: (str) a secondary domain
- www: (bool) whether to handle the www. subdomain