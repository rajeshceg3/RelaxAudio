const CACHE_NAME = 'soundscape-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/src/css/main.css',
  '/src/js/main.js',
  '/src/js/components/SoundscapePlayer.js',
  '/src/js/components/SoundButton.js',
  '/src/js/components/VolumeSlider.js',
  '/src/js/audio/AudioController.js',
  '/manifest.json',
  '/assets/audio/heavy-rain.mp3',
  '/assets/audio/ocean-waves.mp3',
  '/assets/audio/strong-wind.mp3',
  '/assets/audio/forest-ambience.mp3',
  '/assets/audio/fireplace-crackling.mp3'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Service Worker: Caching assets');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('Service Worker: Clearing old cache');
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        return response;
      }
      return fetch(event.request);
    })
  );
});
