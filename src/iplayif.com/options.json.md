options.json
============

Here are all the options you can set in data/options.json

```json
{
  "cache_control_age": 604800,
  "cdn_domain": "cdn.iplayif.com",
  "https": false,
  "nginx": {
    "reload_time": 360
  },
  "proxy": {
    "max_size": 100000000
  }
}
```

- cache_control_age: (int seconds) time to set for the Cache-Control header
- cdn_domain: (str) domain to use as CDN proxy source
- https: (bool) whether to enable HTTPS
- nginx: nginx options
  - reload_time: (int minutes) period to reload nginx (to check for certificate changes)
- proxy: Parchment proxy options
  - max_size: (int bytes) maximum size of files to proxy