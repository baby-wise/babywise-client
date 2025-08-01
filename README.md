# Deploy

## Install
 - Instalar [LiveKit-Server](https://github.com/livekit/livekit/releases/tag/v1.9.0) y agregar el bin a variable de entorno
 - Instalar entorno React native
 - cd BabyWiseAPI && npm install
 - cd BabyWiseUI && npm install

 ## Run

 ### Consola 1: Media server
 livekit-server --dev --bind 0.0.0.0 --config livekit-config.yaml

 ### Consola 2: Backend server
 npm run dev

 ### Consola 3: React native metro bundler
 npx react-native start

 ### Consola 4: React native android build
 npx react-native run-android
 

