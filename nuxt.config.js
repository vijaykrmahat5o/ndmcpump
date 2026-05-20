export default {
  // Global page headers: https://go.nuxtjs.dev/config-head
  head: {
    title: 'Remote Monitoring & Control System',
    htmlAttrs: {
      lang: 'en'
    },
    meta: [
      { charset: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { hid: 'description', name: 'description', content: '' },
      { name: 'format-detection', content: 'telephone=no' }
    ],
    link: [
      { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
      { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css?family=Roboto:300,400,500,700|Poppins:400,500,600,700'}
    ]
  },
  ssr: false,
  env: {
   //apiUrl: 'http://farrukhabad.water.live:5001/wms-api/',
   apiUrl: 'http://ndmc.water.live:35006/wms-api/', 
   
   // apiUrl: 'http://119.18.52.29:3000/wms-api/',
  },
  // Global CSS: https://go.nuxtjs.dev/config-css
  css: [
    '../assets/css/main.scss'
  ],

  // Plugins to run before rendering page: https://go.nuxtjs.dev/config-plugins
  plugins: [
    {src:"~plugins/vue2-google-maps.js"}
  ],

  // Auto import components: https://go.nuxtjs.dev/config-components
  components: true,

  // Modules for dev and build (recommended): https://go.nuxtjs.dev/config-modules
  buildModules: [
    '@nuxtjs/moment'
  ],

  // Modules: https://go.nuxtjs.dev/config-modules
  modules: [
    ['nuxt-fontawesome', {
      imports: [
       {
         set: '@fortawesome/free-solid-svg-icons',
         icons: ['fas']
       },
       {
         set:'@fortawesome/free-brands-svg-icons',
         icons: ['fab']
       }
     ]
    }
    ],
    'bootstrap-vue/nuxt',
    '@nuxtjs/axios',
    'nuxt-socket-io'
  ],
  io: {
    sockets: [
      {
        name: 'main', // A unique name for the connection
        url: 'http://103.211.219.183:35009', // Your server URL
        path: 'http://103.211.219.183:35009',
        default: true,
        reconnection: true,
        reconnectionAttempts: 10, // Retry 10 times before failing
        reconnectionDelay: 5000, // Wait 5s before retrying
        
      },
    ],
  },
  axios: {},
  // Build Configuration: https://go.nuxtjs.dev/config-build
  build: {
    
    vendor:["vue2-google-maps"]
  }
}
