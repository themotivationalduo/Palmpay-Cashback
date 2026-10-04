/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  let registry = {};

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + ".js", parentUri).href;
    return registry[uri] || (
      
        new Promise(resolve => {
          if ("document" in self) {
            const script = document.createElement("script");
            script.src = uri;
            script.onload = resolve;
            document.head.appendChild(script);
          } else {
            nextDefineUri = uri;
            importScripts(uri);
            resolve();
          }
        })
      
      .then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`);
        }
        return promise;
      })
    );
  };

  self.define = (depsNames, factory) => {
    const uri = nextDefineUri || ("document" in self ? document.currentScript.src : "") || location.href;
    if (registry[uri]) {
      // Module is already loading or loaded.
      return;
    }
    let exports = {};
    const require = depUri => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require
    };
    registry[uri] = Promise.all(depsNames.map(
      depName => specialDeps[depName] || require(depName)
    )).then(deps => {
      factory(...deps);
      return exports;
    });
  };
}
define(['./workbox-afac4cd2'], (function (workbox) { 'use strict';

  self.skipWaiting();
  workbox.clientsClaim();
  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "registerSW.js",
    "revision": "1872c500de691dce40960bb85481de07"
  }, {
    "url": "pwa-maskable-512x512.png",
    "revision": "100a16e33c76eb5b54c6384f66e400ab"
  }, {
    "url": "pwa-512x512.png",
    "revision": "100a16e33c76eb5b54c6384f66e400ab"
  }, {
    "url": "pwa-192x192.png",
    "revision": "6271a23ac95f37bff5ba4f5a5765fd67"
  }, {
    "url": "palmpay-logo.svg",
    "revision": "0e69d1b9e95c5e281750f1e1560c4e9e"
  }, {
    "url": "palmpay-logo.png",
    "revision": "30573dd43622089e0af8d9f1d5c88eab"
  }, {
    "url": "palmpay-logo-transparent.png",
    "revision": "d2d1d492489088f29e47aaa82bc8f269"
  }, {
    "url": "palmpay-logo-png_seeklogo-480404.png",
    "revision": "30573dd43622089e0af8d9f1d5c88eab"
  }, {
    "url": "palmpay-logo-exact-transparent.png",
    "revision": "2608ac8ac7c984140733cf3487c1824e"
  }, {
    "url": "palmpay-icon-transparent.png",
    "revision": "6c3e1e87e62c0c7eb49a2fab221f4939"
  }, {
    "url": "palmpay-icon-exact.png",
    "revision": "100a16e33c76eb5b54c6384f66e400ab"
  }, {
    "url": "palmpay-icon-badge.png",
    "revision": "100a16e33c76eb5b54c6384f66e400ab"
  }, {
    "url": "link-preview.svg",
    "revision": "33a2e390c0698f7c296329f50d730f4a"
  }, {
    "url": "link-preview.png",
    "revision": "c1684c4a33363d9291451cb5c147e5b4"
  }, {
    "url": "index.html",
    "revision": "d011e331348bfc99ad4b4cd5af9b2690"
  }, {
    "url": "icon.svg",
    "revision": "4b686a3204daa5911cf5a7dfa035ee79"
  }, {
    "url": "favicon.png",
    "revision": "2adb78b1d62344d4a99fb5eaf66caf81"
  }, {
    "url": "apple-touch-icon.png",
    "revision": "e8aaf6a8e26ce27ae0a4d9f777a97ca3"
  }, {
    "url": "assets/index-CF5o4K6f.js",
    "revision": null
  }, {
    "url": "assets/index-BLs0HdVM.css",
    "revision": null
  }, {
    "url": "apple-touch-icon.png",
    "revision": "e8aaf6a8e26ce27ae0a4d9f777a97ca3"
  }, {
    "url": "icon.svg",
    "revision": "4b686a3204daa5911cf5a7dfa035ee79"
  }, {
    "url": "palmpay-icon-exact.png",
    "revision": "100a16e33c76eb5b54c6384f66e400ab"
  }, {
    "url": "pwa-192x192.png",
    "revision": "6271a23ac95f37bff5ba4f5a5765fd67"
  }, {
    "url": "pwa-512x512.png",
    "revision": "100a16e33c76eb5b54c6384f66e400ab"
  }, {
    "url": "pwa-maskable-512x512.png",
    "revision": "100a16e33c76eb5b54c6384f66e400ab"
  }, {
    "url": "manifest.webmanifest",
    "revision": "09546d888830cb59d1868e3f9d91a8de"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("index.html")));
  workbox.registerRoute(/^https:\/\/fonts\.googleapis\.com\/.*/i, new workbox.CacheFirst({
    "cacheName": "google-fonts-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 10,
      maxAgeSeconds: 31536000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');
  workbox.registerRoute(/^https:\/\/fonts\.gstatic\.com\/.*/i, new workbox.CacheFirst({
    "cacheName": "gstatic-fonts-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 10,
      maxAgeSeconds: 31536000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');

}));
