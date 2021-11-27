#!/usr/bin/env node

import {readdir, writeFile} from 'fs/promises';

const cacheKey = Date.now();
const files = await readdir('dist/web');

const code = `
const CACHE_NAME="${cacheKey}";
const urls = [".", ${files.map(file => `"dist/web/${file}"`).join(',')}];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        return cache.addAll(urls);
      }).then(() => console.log("[ServiceWorker] installed, possibly waiting"))
  );
});

self.addEventListener('fetch', function(event) {
  event.respondWith((async () => {
    if (event.request.mode === "navigate" &&
      event.request.method === "GET" &&
      registration.waiting &&
      (await clients.matchAll()).length < 2
    ) {
      registration.waiting.postMessage('skipWaiting');
      console.log("[ServiceWorker] refreshing and skipping waiting");
      return new Response("", {headers: {"Refresh": "0"}});
    }
    return await caches.match(event.request) ||
      fetch(event.request);
  })());
});

self.addEventListener('activate', function(e) {
  console.log('[ServiceWorker] Activate');
  e.waitUntil(
    caches.keys().then(keyList => Promise.all(keyList.map(key => {
      if (key !== CACHE_NAME) {
        console.log("[ServiceWorker] deleting", key);
        return caches.delete(key);
      }
    })))
  );
});

self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') {
    console.log("[ServiceWorker]", CACHE_NAME, 'skipWaiting');
    skipWaiting();
  }
});
`;

await writeFile('serviceworker.js', code, 'utf8');
