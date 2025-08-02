# Deploy

## Install
 - Instalar [ngrok](https://dashboard.ngrok.com/get-started/setup/windows) y agregar el path al .exe a PATH env var
 - Instalar entorno React native
 - cd BabyWiseAPI && npm install
 - cd BabyWiseUI && npm install

 ## Run Dev

 ### Consola 1: Backend server
 npm run dev

 ### Consola 2: Expose local api to public domain
 ngrok http --url=amused-top-sole.ngrok-free.app 3001

 ### Consola 3: React native metro bundler
 npx react-native start

 ### Consola 4: React native android build
 npx react-native run-android
 

