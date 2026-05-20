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
                <b-row class="px-2">
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
                </b-row>
                
                <b-card img-alt="Card image" class="mt-2 mb-3 no-padding">
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
                </b-card>
            </div>
        </b-container>
    </div>
</template>
<script>
export default {
    middleware: ['check-auth','auth'],
    layout: 'admin',
    components:{
    },
    mounted(){
		var self = this;
		this.initload();

        //console.log(this.$store.getters.getUserinfo.access_key);
	},
    data() {
        return {
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

                    self.zones = [];

                    self.items = response.data.result.devices;

                    response.data.result.zones.forEach(function(item){
                        var i = 1;
                        if(!self.checkzone(item.id)){
                            self.zones.push({sno:i++, zone: item.id, areacode:item.areacode, title: item.short_title, total_device: 0, total_device_on: 0, total_device_off:0, total_disconencted: 0, total_device_connected: 0});
                        }
                    });

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
							self.total_device_connected += 1;
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

                        self.zones.forEach(function(zone_item){
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
                        });
					});
                    self.total_disconnected = self.total_device - self.total_device_connected;
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
</style>