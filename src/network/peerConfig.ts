const PEERJS_CONFIG = {
  host: '0.peerjs.com',
  port: 443,
  secure: true,
  debug: import.meta.env.DEV ? 3 : 0,
}

export { PEERJS_CONFIG }