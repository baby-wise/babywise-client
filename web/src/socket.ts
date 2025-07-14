import { IP, PORT } from '@env'
// Con .env (requiere recompilar cuando se cambia)
const SIGNALING_URL = `ws://${IP}:${PORT}`

//Usar este para dev lo podes cambiar sin necesidad de recompilar
//const SIGNALING_URL = `ws://192.168.0.2:3001`

export default SIGNALING_URL;