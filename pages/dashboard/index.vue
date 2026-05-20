<template>
    <div class="flex-grow-1" style="margin-top:75px">
        <b-container fluid class="min-h-screen">
            <div class="">
                <b-row class="pb-3">
                    <b-col cols="auto">
                        <b-breadcrumb class="mb-0">
                            <b-breadcrumb-item to="/dashboard/">
                                <font-awesome-icon :icon="['fas', 'home']" class="icon"/>
                                Home
                            </b-breadcrumb-item>
                        </b-breadcrumb>
                    </b-col>
                    <b-col>
                        <h4 class="mb-0 mt-1 text-center">DASHBOARD</h4>
                    </b-col>
                    <b-col cols="auto" class="text-right">
                        <!--<b-button variant="dark" pill >Export</b-button>-->
                    </b-col>
                </b-row>

                <b-row>
                    <b-col class="border-1">
                        <b-row class="px-2">
                            <b-col class="px-2" col-lg>
                                <b-card img-alt="Card image" img-left class="info-box mb-3">
                                    <h6>Total Pumps</h6>
                                    <b-card-text>
                                        {{total_device}}
                                    </b-card-text>
                                    <img class="card-img" src="/pump.jpeg"/>
                                </b-card>
                            </b-col>
                            <b-col class="px-2">
                                <b-card img-alt="Card image" img-left class="info-box mb-3">
                                    <h6>Total Pumps Connected</h6>
                                    <b-card-text>
                                        {{total_connected}}
                                    </b-card-text>
                                    <img class="card-img" src="/pump.jpeg"/>
                                </b-card>
                            </b-col>
                            <b-col class="px-2">
                                <b-card img-alt="Card image" img-left class="info-box mb-3">
                                    <h6>Total Pumps Disconnected</h6>
                                    <b-card-text>
                                        {{total_disconnected}}
                                    </b-card-text>
                                    <img class="card-img" src="/pump.jpeg"/>
                                </b-card>
                            </b-col>
                        </b-row>
                        <b-row class="px-2">
                            <b-col class="px-2">
                                <b-card img-alt="Card image" img-left class="info-box mb-3">
                                    <h6>Total Pumps ON</h6>
                                    <b-card-text>
                                        {{total_device_on}}
                                    </b-card-text>
                                    <img class="card-img" src="/pump.jpeg"/>
                                </b-card>
                            </b-col>
                                <b-col class="px-2">
                                    <b-card img-alt="Card image" img-left class="info-box mb-3">
                                        <h6>Total Pumps OFF</h6>
                                        <b-card-text>
                                            {{total_device_off}}
                                        </b-card-text>
                                        <img class="card-img" src="/pump.jpeg"/>
                                    </b-card>
                                </b-col>

                        </b-row>
                    </b-col>

                    <b-col>
                        <b-row class="px-2">
                            <b-col class="px-2">
                                <b-card img-alt="Card image" img-left class="info-box mb-3">
                                    <h6>Total Tanks</h6>
                                    <b-card-text>
                                        {{total_tank}}
                                    </b-card-text>
                                    <img class="card-img" src="/level.jpg"/>
                                </b-card>
                            </b-col>
                            <b-col class="px-2">
                                <b-card img-alt="Card image" img-left class="info-box mb-3">
                                    <h6>Total Tank Connected</h6>
                                    <b-card-text>
                                        {{total_tank_connected}} 
                                    </b-card-text>
                                    <img class="card-img" src="/level.jpg"/>
                                </b-card>
                            </b-col>
                            <b-col class="px-2">
                                <b-card img-alt="Card image" img-left class="info-box mb-3">
                                    <h6>Total Tank Disconnected</h6>
                                    <b-card-text>
                                        {{total_tank_disconnected}} 
                                    </b-card-text>
                                    <img class="card-img" src="/level.jpg"/>
                                </b-card>
                            </b-col>
                            
                        </b-row>
                    </b-col>
                </b-row>

                

               

                

                <b-row class="px-2">
                    <b-col class="px-2">
                        <b-card img-alt="Card image" img-left class="info-box mb-3">
                            <h2>Pumps Monitoring</h2>
                                <center>
                                    <NuxtLink :to="'/dashboard/ndmc'" class="nav-link">
                                        <b-button>
                                            Go to Pumps Dashboard
                                        </b-button>
                                    </NuxtLink>
                                </center>
                            <img class="card-img" id="img" src="/pump.jpeg"/>
                            
                        </b-card>
                    </b-col>
                    <b-col class="px-2">
                        <b-card img-alt="Card image" img-left class="info-box mb-3">
                            <h2>Tank Level</h2>
                                <center>
                                    <NuxtLink :to="'/tank/ndmc'" class="nav-link">
                                        <b-button>
                                            Go to Tank Dashboard
                                        </b-button>
                                    </NuxtLink>
                                </center>
                            <img class="card-img" id="img" src="/level.jpg"/>
                        </b-card>
                    </b-col>
                </b-row>

                <b-row class="px-3">
                    <b-col class="m-0 p-0">
                        <b-card img-alt="Card image" img-left class="info-box mb-3">
                        <gmap-map :center="center" :zoom="zoom" class="googlemap">
                            <gmap-info-window :options="infoOptions" :position="infoWindowPos" :opened="infoWindowOpen" @closeclick="infoWindowOpen=false"></gmap-info-window>
                            <gmap-marker :key="index" v-for="(m, index) in markers" :position="m.position" :clickable="true" :icon="m.icon" @click="toogleMarkerInfoWindow(m,index)"></gmap-marker>
                        </gmap-map>
                         
                        </b-card>
                    </b-col>
                </b-row>

                <!-- <b-row class="px-2">
                    <b-col class="px-2">
                        <b-card img-alt="Card image" img-left class="info-box mb-3">
                            <h6>Total Pumps</h6>
                            <b-card-text>
                                {{total_device}}
                            </b-card-text>
                            <img class="card-img" src="/pump.png"/>
                        </b-card>
                    </b-col>
                    <b-col class="px-2">
                        <b-card img-alt="Card image" img-left class="info-box mb-3">
                            <h6>Total Pumps ON</h6>
                            <b-card-text>
                                {{total_device_on}}
                            </b-card-text>
                            <img class="card-img" src="/pump.png"/>
                        </b-card>
                    </b-col>
                    <b-col class="px-2">
                        <b-card img-alt="Card image" img-left class="info-box mb-3">
                            <h6>Total Pumps OFF</h6>
                            <b-card-text>
                                {{total_device_off}}
                            </b-card-text>
                            <img class="card-img" src="/pump.png"/>
                        </b-card>
                    </b-col>
                    <b-col class="px-2">
                        <b-card img-alt="Card image" img-left class="info-box mb-3">
                            <h6>Connection Loss</h6>
                            <b-card-text>
                                {{total_disconnected}} 
                            </b-card-text>
                            <img class="card-img" src="/pump.png"/>
                        </b-card>
                    </b-col>
                </b-row> -->
                
                <!-- <b-card img-alt="Card image" class="mt-2 mb-3 no-padding">
                    <b-row class="px-3 my-3">
                        <b-col lg="4">
                            <span class="mr-2">Show</span>
                            <b-form-select v-model="perpage" id="perPageSelect" :options="pagesizes" size="sm" class="w-25">
                            </b-form-select>
                            <span class="ml-2">entries</span>
                        </b-col>
                        <b-col lg="4">
                        </b-col>
                        <b-col lg="4">
                            <b-form-group label="Search" label-cols-sm="3" label-align-sm="right" label-size="sm" label-for="filterInput" class="mb-0">
                                <b-input-group size="sm">
                                    <b-form-input v-model="filter" type="search" id="filterInput" placeholder="Type to Search">
                                    </b-form-input>
                                    <b-input-group-append>
                                        <b-button :disabled="!filter" @click="filter = ''">Clear</b-button>
                                    </b-input-group-append>
                                </b-input-group>
                            </b-form-group>
                        </b-col>
                    </b-row>
                    <b-table striped hover :items="zones" :fields="fields">
                        <template v-slot:cell(title)="row">
                            <b-link :to="'/dashboard/'+row.item.areacode">{{ row.value }}</b-link>
                        </template>
                        <template v-slot:cell(total_ward)="row">
                            <b-badge :to="'/wards/'+item" pill variant="primary" v-for="item in row.item.ward_areacode.split(',').sort()" v-bind:key="item" class="mr-1">{{item}}</b-badge>
                        </template>
                        
                        <template v-slot:cell(status)="row">
                            <b-badge pill variant="success" v-if="row.value == 1">CONNECTED</b-badge>
                            <b-badge pill variant="danger" v-else>DISCONNECTED</b-badge>
                        </template>
                        <template v-slot:cell(total_disconnected)="row">
                            {{row.value}} <small>({{ (100 - (row.item.total_connected/row.item.total_device)*100).toFixed(2) }}%)</small>
                        </template>
                    </b-table>
                    <b-row class="px-3">
                        <b-col lg="6">
                            <span class="mr-2">Showing {{currentpage}} to {{(perpage>items.length)?items.length:perpage}} of {{items.length}} entries</span>
                        </b-col>
                        <b-col lg="3" offset-md="3">
                            <b-pagination v-model="currentpage" pills :total-rows="items.length" :per-page="perpage" align="right" size="sm" prev-text="Prev" next-text="Next" first-number last-number></b-pagination>
                        </b-col>
                    </b-row>
                </b-card> -->
            </div>
        </b-container>
    </div>
</template>
<script>
export default {
    middleware: ['check-auth','auth'],
    layout: 'admin',
    name:'Dashboard',
    components:{
    },
    mounted(){
		var self = this;
		this.initload();

        //console.log(this.$store.getters.getUserinfo.access_key);
	},
    data() {
        return {
            center: {lng: 10.2, lat: 10},
           // center: { lat: 27.387049, lng: 79.588127 },
            zoom: 12,
            currentLocation: {},
            circleOptions: {
            },
            locations: [
            {
                id: 1,
                lat: 44.933076,
                lng: 15.629058
            },
            {
                id: 2,
                lat: 45.815,
                lng: "15.9819"
            },
            {
                id: 3,
                lat: "45.12",
                lng: "16.21"
            }
            ],
            pins: {
            selected: "",
            notSelected: ""
            },
            mapStyle: [],
            clusterStyle: [
            {
                url: "https://developers.google.com/maps/documentation/javascript/examples/markerclusterer/m1.png",
                width: 56,
                height: 56,
                textColor: "#fff"
            }
            ],
            infoOptions: {
            content: '',
            pixelOffset: {
                width: 0,
                height: -35
            }
            },
            infoWindowPos: null,
            infoWindowOpen: false,
            currentMarkerIndex: null,
            markers: [],           
            total_device_on:0,
            total_device_off:0,            
            pagesizes: [10, 20, 50, 100, 500, 1000, 2000],
            perpage: 10,
            currentpage: 1,
            total_ward: 0,
            total_device: 0,
            total_connected: 0,
            total_disconnected: 0,
            filteroptions: [{text:'All', value:-1}, {text:'Connected', value:1}, {text:'Disconnected', value:0}, {text:'Data Fault', value:2}, {text:'Pending', value:3}],
            selecteditem: {
                name: ''
            },
            filter: [],
            zones: [],
            recordUrl: process.env.apiUrl+'dashboard-zones',
            fields: [
                { key: 'sno', label: 'S.No'},
                { key: 'title', label: 'Zone' },
                { key: 'total_device', label: 'Total Pumps' },
                { key: 'total_device_on', label: 'Total Pumps ON' },
                { key: 'total_device_off', label: 'Total Pumps OFF' },
                { key: 'total_disconencted', label: 'Connection Loss' },
                { key: 'action', label: '', class: 'text-right' },
            ],
            items: [],
            total_tank : 0,
            total_tank_on : 0,
            total_tank_off :0,
            total_tank_connected:0,
            total_tank_disconnected : 0,
            tanks_items:[],
            markers_tank: [],
            menu: [
                {
                    header: true,
                    title: 'Main Navigation',
                    hiddenOnCollapse: true
                },
                {
                    href: '/dashboard',
                    title: 'Dashboard',
                    icon: 'fa fa-user'
                },
                {
                    href: '/login',
                    title: 'Charts',
                    icon: 'fa fa-chart-area',
                    child: [
                        {
                            href: '/charts/sublink',
                            title: 'Sub Link'
                        }
                    ]
                }
            ]
        }
    },
    methods: {
        display(str){
            this.selecteditem.name = str;
        },
        toogleMarkerInfoWindow(marker, index){
            //console.log("NNNNN");
			this.infoWindowPos = marker.position;
			this.infoOptions.content = marker.infotext;
			if(this.currentMarkerIndex == index){
				this.infoWindowOpen = !this.infoWindowOpen;
			}else{
				this.infoWindowOpen = true;
				this.currentMarkerIndex = index;
			}
		},
        checkzone(param){
            var self = this;
            var found = false;
            if(self.zones.length > 0){
                self.zones.forEach(function(item){
                    if(item.zone == param.zone){
                        found = true;
                    }
                });
            }
            
            return found;
        },
        addMarker(lat, lng, infotext, iconurl) {
			const marker = {
				lat: lat,
				lng: lng
			};
			this.markers.push({ position: marker, infotext: infotext, icon: {url:iconurl,size: {width: 30, height: 45, f: 'px', b: 'px'}, scaledSize: {width: 30, height: 45, f: 'px', b: 'px',}} });
			//this.markers.push({ position: marker, infotext: infotext, icon: {url:iconurl} });
			//this.places.push(this.currentPlace);
			this.center = marker;
			this.currentPlace = null;
		},
        addMarkertank(lat, lng, infotext, iconurl) {
			const marker = {
				lat: lat,
				lng: lng
			};
			this.markers.push({ position: marker, infotext: infotext, icon: {url:iconurl,size: {width: 30, height: 45, f: 'px', b: 'px'}, scaledSize: {width: 30, height: 45, f: 'px', b: 'px',}} });
			//this.markers.push({ position: marker, infotext: infotext, icon: {url:iconurl} });
			//this.places.push(this.currentPlace);
			this.center = marker;
			this.currentPlace = null;
		},
        initload(){
            var self = this;
            
            self.$axios.post(self.recordUrl, {
                accesskey: this.$store.getters.getUserinfo.access_key
            })
            .then(function (response) {
                if(response.data.error == 0 || response.data.error == '0'){
                    self.total_device = 0;
                    self.total_ward = 0;
                    self.total_device_on = 0;
                    self.total_device_off = 0;
                    self.total_disconnected = 0;
                    var min_lat = 100;
                    var min_lng = 100;
                    var max_lat = 0;
                    var max_lng = 0;
                    self.markers = [];
                    self.zones = [];


                    self.items = response.data.result.devices;
                    self.tanks_items = response.data.result.tanks;

                    response.data.result.zones.forEach(function(item){
                        var i = 1;
                        if(!self.checkzone(item.id)){
                            self.zones.push({sno:i++, zone: item.id, areacode:item.areacode, title: item.short_title, total_device: 0, total_device_on: 0, total_device_off:0, total_disconencted: 0, total_device_connected: 0});
                        }
                    });
                    if(self.items.length>0){
                        self.items.forEach(function(item){
                            self.total_device += 1;
                            //self.total_ward += parseInt(item.total_ward);
                            //self.total_connected += parseInt(item.total_connected);

                            var curdatetime = self.$moment(response.data.result.time); // i will replace this with server time by passing time in api
                            var conn_status = 1;
                            var dbdatetime = '';
                            var duration = '';
                            var minutes = '';
                            
                            
                            if(item.update_time == "" || item.update_time == null || item.update_time == 'null' || item.update_time.length < 10){
                                conn_status = 3;
                            }else{
                                dbdatetime = self.$moment(item.update_time);
                                
                                if(curdatetime > dbdatetime){
                                    duration = self.$moment.duration(curdatetime.diff(dbdatetime));
                                }else{
                                    duration = self.$moment.duration(dbdatetime.diff(curdatetime));
                                }
                                minutes = duration.asMinutes();
                                var disconnection_time = 30;
                                if(minutes < disconnection_time){
                                    conn_status = 1;
                                }else{
                                    conn_status = 0;
                                }
                            }
                            
                            item.connection_status = conn_status;
                            
                            if(conn_status == 1){
                                self.total_connected += 1;
                            }

                            if(item.outputs != null){
                                if(item.outputs.charAt(0) == 1){
                                    item.pump_on = 1;
                                    item.pump_off = 0;
                                    self.total_device_on += 1;
                                }else{
                                    item.pump_on = 0;
                                    item.pump_off = 0;
                                    self.total_device_off += 1; 
                                }
                            }

                            //self.total_device_off = self.total_device - self.total_device_on;

                            /* self.zones.forEach(function(zone_item){
                                if(zone_item.zone == item.zone){
                                    zone_item.total_device++;
                                    if(item.connection_status == 1){
                                        zone_item.total_device_connected += 1;
                                    }
                                    if(item.pump_on){
                                        zone_item.total_device_on++;
                                    }
                                    if(item.pump_off){
                                        zone_item.total_device_off++;
                                    }
                                    zone_item.total_disconnected = zone_item.total_device - zone_item.total_device_connected;
                                }
                            }); */


                            if(item.latitude != 'NaN' && item.latitude != 'undefined' && item.latitude != ''){
                                    var msg = '<b>Location</b> : '+item.location+'<br><b>Latitude :</b> '+item.latitude+'<br><b>Longitude :</b> '+item.longitude+'<b>Last Updated Time :</b> '+self.$moment(item.update_time).format('DD-MM-YYYY HH:mm:ss');

                                    min_lat = Math.min(parseFloat(item.latitude), min_lat);
                                    min_lng = Math.min(parseFloat(item.longitude), min_lng);

                                    max_lat = Math.max(parseFloat(item.latitude), max_lat);
                                    max_lng = Math.max(parseFloat(item.longitude), max_lng);

                                // var blueurl = "https://www.fablurs.com/flag-blue.png";
                                    //var redurl = "https://www.fablurs.com/flag-red.png";
                                    //var greenurl = "https://www.fablurs.com/flag-green.png";


                                    var blueurl = "http://matrixmeters.com/icon/pin-blue.png";
                                    var redurl = "http://matrixmeters.com/icon/pin-red.png";
                                    var greenurl = "http://matrixmeters.com/icon/pin-green.png";
                                    //var whiteurl = "http://matrixmeters.com/icon/pin-white.png";

                                    var iconurl = greenurl;
                                    if(item.analoginput < 500){
                                        if(item.analoginput < 200){
                                            iconurl = redurl;
                                        }else{
                                            iconurl = blueurl;
                                        }
                                    }
                                    self.addMarker(parseFloat(item.latitude), parseFloat(item.longitude), msg, iconurl);
                                }



                        });
                    }
                    self.total_disconnected = self.total_device - self.total_connected;
                    //self.center = { lat: min_lat + (max_lat - min_lat)/2, lng: min_lng + (max_lng - min_lng)/2 };


                    /* ******************* T A N K S  OPERATION & MAP  ******************** */
                    self.total_tank = 0;
                    self.total_tank_on = 0;
                    self.total_tank_off = 0;
                    self.total_tank_connected=0;
                    self.total_tank_disconnected = 0;
                    var min_lat_tank = 100;
                    var min_lng_tank = 100;
                    var max_lat_tank = 0;
                    var max_lng_tank = 0;
                    self.tanks_items.forEach(function(item){
						self.total_tank += 1;
                        

                        var curdatetime = self.$moment(response.data.result.time); // i will replace this with server time by passing time in api
						var conn_tank_status = 1;
						var dbdatetime = '';
						var duration = '';
						var minutes = '';
						
						
						if(item.update_time == "" || item.update_time == null || item.update_time == 'null' || item.update_time.length < 10){
							conn_tank_status = 3;
						}else{
							dbdatetime = self.$moment(item.update_time);
							
							if(curdatetime > dbdatetime){
								duration = self.$moment.duration(curdatetime.diff(dbdatetime));
							}else{
								duration = self.$moment.duration(dbdatetime.diff(curdatetime));
							}
							minutes = duration.asMinutes();
							var disconnection_time = 30;
							if(minutes < disconnection_time){
								conn_tank_status = 1;
							}else{
								conn_tank_status = 0;
							}
						}
						
						item.connection_status = conn_tank_status;
                        
						if(conn_tank_status == 1){
							self.total_tank_connected += 1;
						}

                        if(item.outputs != null){
                            if(item.outputs.charAt(0) == 1){
                                item.pump_on = 1;
                                item.pump_off = 0;
                                self.total_tank_on += 1;
                            }else{
                                item.pump_on = 0;
                                item.pump_off = 0;
                                self.total_tank_off += 1; 
                            }
                        }

                        //self.total_device_off = self.total_device - self.total_device_on;

                       


                        if(item.latitude != 'NaN' && item.latitude != 'undefined' && item.latitude != ''){
                                var msg = '<div style="font-size: 15px;text-align: center; background: #122464d6; color: #fff; padding: 5px; border-radius: 5px;"><b>Tank / Lavel </b></div>: <b>Imei No: '+item.imei_no+'</b><br><b>Location</b> : '+item.location+'<br><b>Latitude :</b> '+item.latitude+'<br><b>Longitude :</b> '+item.longitude+'<br><b>Last Updated Time :</b> '+self.$moment(item.update_time).format('DD-MM-YYYY HH:mm:ss');

                                min_lat_tank = Math.min(parseFloat(item.latitude), min_lat);
                                min_lng_tank = Math.min(parseFloat(item.longitude), min_lng);

                                max_lat_tank = Math.max(parseFloat(item.latitude), max_lat);
                                max_lng_tank = Math.max(parseFloat(item.longitude), max_lng);

                               // var blueurl = "https://www.fablurs.com/flag-blue.png";
								//var redurl = "https://www.fablurs.com/flag-red.png";
								//var greenurl = "https://www.fablurs.com/flag-green.png";


                                var blueurl = "http://matrixmeters.com/icon/pin-blue.png";
							    var redurl = "http://matrixmeters.com/icon/pin-red.png";
							    var greenurl = "http://matrixmeters.com/icon/pin-green.png";
							    //var whiteurl = "http://matrixmeters.com/icon/pin-white.png";

                                var iconurl = greenurl;
                                if(item.analoginput < 500){
                                    if(item.analoginput < 200){
                                        iconurl = redurl;
                                    }else{
                                        iconurl = blueurl;
                                    }
                                }
                                self.addMarkertank(parseFloat(item.latitude), parseFloat(item.longitude), msg, iconurl);
                            }



					});

                    self.total_tank_disconnected = self.total_tank - self.total_tank_connected;

                }else{
                    self.$router.push('/login');
                }
            })
            .catch(function (error) {
                alert(error);
            });
        },
    }
}
</script>
<style scoped>
.heading{
    font-size: 24px !important;
    margin-bottom: 0px;
}
#img{
    width: 100px !important;
    background-color: color(srgb red green blue);
}
</style>