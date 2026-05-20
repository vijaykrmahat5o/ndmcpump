import Vue from 'vue'
import * as VueGoogleMaps from '~/node_modules/vue2-google-maps'
import GmapCluster from '~/node_modules/vue2-google-maps/dist/components/cluster';
Vue.use(VueGoogleMaps, {
  load: {
    key: 'AIzaSyBDIAVDv7xjBCJEpiBYVHCwG6sby08x6Cc',
    libraries: 'places',
  },
})
Vue.component('GmapCluster', GmapCluster)
