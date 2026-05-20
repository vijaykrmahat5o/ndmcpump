<template>
    <div class="flex-grow-1" style="margin-top:75px">
        <b-container fluid class="min-h-screen">
            <div>
                <b-row class="pb-3">
                    <b-col cols="4" class="text-center">
                       
                        <b-breadcrumb class="mb-0">
                            <b-breadcrumb-item :to="'/'+$store.getters.getUserinfo.dashboard">
                                <font-awesome-icon :icon="['fas', 'home']" class="icon"/>
                                Home
                            </b-breadcrumb-item>
                            <b-breadcrumb-item active>Pumps Dashboard </b-breadcrumb-item>
                        </b-breadcrumb>
                    </b-col>
                    <b-col cols="6">
                        <h2>{{ location_title }}<!-- {{ selectedItem.instrument }} --></h2>
                    </b-col>
                    <b-col cols="2" class="text-right">
                        <b-button variant="dark" pill @click="showAddModal()">Add Pump</b-button>
                        <!--<b-button variant="dark" pill >Export</b-button>-->
                    </b-col>
                </b-row>
                <b-row class="px-2">
                    <b-col class="px-2" cols="12" lg="3" md="4" sm="6" xs="12">
                        <b-card img-alt="Card image" img-left class="info-box mb-3" @click="filterselected = 'ALL';" bg-variant="primary" text-variant="white">
                            <h6>Total Pumps</h6>
                            <b-card-text>
                                {{total_device}}
                            </b-card-text>
                            <font-awesome-icon :icon="['fas', 'list-ol']" size="2x" class="icon light"/>
                        </b-card>
                    </b-col>
                    <b-col class="px-2" cols="12" lg="3" md="4" sm="6" xs="12">
                        <b-card img-alt="Card image" img-left class="info-box mb-3" @click="filterselected = 'CONNECT';" bg-variant="success" text-variant="white">
                            <h6>Total Connected</h6>
                            <b-card-text>
                                {{total_device - total_disconnected}} 
                            </b-card-text>
                            <font-awesome-icon :icon="['fas', 'plug']" size="2x" class="icon light"/>
                        </b-card>
                    </b-col>
                    <b-col class="px-2" cols="12" lg="3" md="4" sm="6" xs="12">
                        <b-card img-alt="Card image" img-left class="info-box mb-3" @click="filterselected = 'DISCONNECT';" bg-variant="danger" text-variant="white">
                            <h6>Total Disconnected</h6>
                            <b-card-text>
                                {{total_disconnected}} 
                            </b-card-text>
                            <font-awesome-icon :icon="['fas', 'tachometer-alt']" size="2x" class="icon light"/>
                        </b-card>
                    </b-col>
                    <b-col class="px-2" cols="12" lg="3" md="4" sm="6" xs="12">
                        <b-card img-alt="Card image" img-left class="info-box mb-3" @click="filterselected = 'PUMPON';" bg-variant="success" text-variant="white">
                            <h6>Total Pumps ON</h6>
                            <b-card-text>
                                {{total_device_on}} 
                            </b-card-text>
                            <font-awesome-icon :icon="['fas', 'check']" size="2x" class="icon light"/>
                        </b-card>
                    </b-col>
                    <b-col class="px-2" cols="12" lg="3" md="4" sm="6" xs="12">
                        <b-card img-alt="Card image" img-left class="info-box mb-3" bg-variant="warning" text-variant="white">
                            <h6>Total Pumps OFF</h6>
                            <b-card-text>
                                {{total_device_off}} <small>({{ ((total_device_off/total_device)*100).toFixed(2) }}%)</small>
                            </b-card-text>
                            <font-awesome-icon :icon="['fas', 'exclamation-triangle']" size="2x" class="icon light"/>
                        </b-card>
                    </b-col>
                    <b-col class="px-2" cols="12" lg="3" md="4" sm="6" xs="12">
                        <b-card img-alt="Card image" img-left class="info-box mb-3" bg-variant="secondary" text-variant="white">
                            <h6>Total Devices Trip</h6>
                            <b-card-text>
                                {{total_device_trip}} <small></small>
                            </b-card-text>
                            <font-awesome-icon :icon="['fas', 'faucet']" size="2x" class="icon light"/>
                        </b-card>
                    </b-col>
                    
                </b-row>
                <div img-alt="Card image" class="mt-2 mb-3 no-padding">
                    <b-row class="my-3">
                        <b-col cols="12" md="1">
                            <span class="mr-2">Show</span>
                            <b-form-select v-model="perpage" id="perPageSelect" :options="pagesizes" size="sm">
                            </b-form-select>
                        </b-col>
                        <b-col cols="12" md="3">
                            <span class="mr-2">Filter</span>
                            <b-form-select v-model="filterselected" :options="filteroptions" size="sm" @change="onFilterDevices()">
                            </b-form-select>
                        </b-col>
                        <b-col cols="12" md="3">
                            <!-- <span class="mr-2">Subzones</span>
                            <b-form-select v-model="subzone_selected" size="sm" @change="onFilterDevices()">
                                <b-form-select-option value="0">All</b-form-select-option>
                                <b-form-select-option v-for="item in subzoneslist()" v-bind:key="item.id" :value="item.id" >{{item.title}}</b-form-select-option>
                            </b-form-select> -->
                        </b-col>
                        <b-col cols="12" md="3" class="offset-lg-2">
                            <span class="mr-2">Search</span>
                            <b-form-group class="mb-0">
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
                    <b-row class="d-md-none">
                        <b-col cols="4" lg="3">
                            <span class="mr-2">{{currentpage}} - {{(perpage>filteredrecords.length)?filteredrecords.length:perpage}} ({{filteredrecords.length}})</span>
                        </b-col>
                        <b-col cols="8" lg="9">
                            <b-pagination v-model="currentpage" pills :total-rows="filteredrecords.length" :per-page="perpage" align="right" size="sm" prev-text="Prev" next-text="Next" first-number last-number></b-pagination>
                        </b-col>
                    </b-row>
                    <b-table striped sticky-header outlined responsive hover stacked="md" :items="filteredrecords" :fields="fields" :current-page="currentpage" :per-page="perpage" :filter="filter" :filterIncludedFields="filterOn" :sort-by.sync="sortBy" :sort-desc.sync="sortDesc" :sort-direction="sortDirection" @filtered="onFiltered">
                        
                        <template v-slot:cell(location)="row">
                            <b-link :to="'/pump/'+row.item.station_no"><span :id="'l-'+row.item.id" pill variant="success">{{row.value}}</span></b-link>


                                <b-popover
                                :target="`l-${row.item.id}`"
                                title="Location"
                                triggers="hover focus">
                                {{row.item.location}}													
                                </b-popover>
                        </template>
                        <template v-slot:cell(subzone)="row">
                            {{ row.value }}
                        </template>
                        <template v-slot:cell(station_no)="row">
                            <b-link :to="'/pump/'+row.value"><b>{{ row.value }}</b></b-link>
                        </template>
                        <template v-slot:cell(supply)="row">
                            <img src="/power-on.svg" v-if="row.value == 'ON'" style="max-width:20px; max-height:20px;">
                            <img src="/power-off.svg" v-else style="max-width:20px; max-height:20px;">
                        </template>
                        <template v-slot:cell(pump_status)="row">
                            <b-badge pill variant="success" v-if="row.value == 'ON'">ON</b-badge>
                            <b-badge pill variant="danger" v-else>OFF</b-badge>
                        </template>
                        <template v-slot:cell(device_trip)="row">
                            <b-badge pill variant="danger" v-if="row.value == 'TRIP'">Trip</b-badge>
                            <b-badge pill variant="success" v-else>Healthy</b-badge>
                        </template>
                        <template v-slot:cell(auto_manual)="row">
                            <b-badge pill variant="success" v-if="row.value == 'AUTO'">AUTO</b-badge>
                            <b-badge pill variant="danger" v-else>MANUAL</b-badge>
                        </template>
                        <template v-slot:cell(connection_status)="row">
                            <b-badge pill variant="success" v-if="row.value == 1">CONNECTED</b-badge>
                            <b-badge pill variant="danger" v-else>DISCONNECTED</b-badge>
                        </template>
                        <template v-slot:cell(total_disconnected)="row">
                            {{row.value}} <small>({{ (100 - (row.item.total_connected/row.item.total_device)*100).toFixed(2) }}%)</small>
                        </template>
                        <template v-slot:cell(tank_imei_no)="row">
                            <span :id="'t-'+row.item.id" pill variant="success">
                                <b-link :to="'/tank/details/'+row.value"><b>{{row.item.tank_location}}</b></b-link>
                            </span>
                                <b-popover
                                :target="`t-${row.item.id}`"
                                title="Tank Location"
                                triggers="hover focus">
                                {{row.item.tank_location}}													
                                </b-popover>
                        </template>


                        <template v-slot:cell(action)="row">
                            <b-button pill variant="primary" class="mr-1 my-1 icon-btn" @click="showUpdateModal(row.item, row.index, $event.target)" size="sm">
                                <font-awesome-icon :icon="['fas', 'pencil-alt']" size="1x" class="icon"/>
                            </b-button>
                        </template>
                    </b-table>
                    <b-row class="">
                        <b-col cols="6">
                            <span class="mr-2">Showing {{currentpage}} to {{(perpage>filteredrecords.length)?filteredrecords.length:perpage}} of {{filteredrecords.length}} entries</span>
                        </b-col>
                        <b-col cols="6">
                            <b-pagination v-model="currentpage" pills :total-rows="filteredrecords.length" :per-page="perpage" align="right" size="sm" prev-text="Prev" next-text="Next" first-number last-number></b-pagination>
                        </b-col>
                    </b-row>
                </div>
                <b-row class="my-3">
                    <b-col>
                       
                        <gmap-map :center="center" :zoom="zoom" class="googlemap">
                            <gmap-info-window :options="infoOptions" :position="infoWindowPos" :opened="infoWindowOpen" @closeclick="infoWindowOpen=false"></gmap-info-window>
                            <gmap-marker :key="index" v-for="(m, index) in markers" :position="m.position" :clickable="true" :icon="m.icon" @click="toogleMarkerInfoWindow(m,index)"></gmap-marker>
                        </gmap-map>
                    </b-col>
                </b-row>
            </div>
        </b-container>
        <!-- ****************** ADD PUMP MODEL ******************** -->
        <b-modal id="edit-model" :title="(selectedItem.id > 0)?'Edit Pump':'Add Pump'" size="xl" ok-only @hidden="resetSelectedItem" @ok="modalSubmit">
			<b-container fluid>
				<b-row class="mb-1">
					<b-col>
						<b-alert show variant="secondary" class="header-title py-2">Device Information</b-alert>
						<b-form-group label="Pump Imei" label-for="imei-input" label-cols="4" label-size="sm" label-align-sm="right" invalid-feedback="Imei is required">
							<b-form-input id="imei-input" v-model="selectedItem.imei_no" :disabled="selectedItem.id > 0" required></b-form-input>
						</b-form-group>
                        <b-form-group label="New Imei" label-for="imei-input" label-cols="4" label-size="sm" label-align-sm="right" v-if="selectedItem.id > 0">
							<b-form-input id="imei-input" v-model="selectedItem.new_imei_no"></b-form-input>
						</b-form-group>
						<b-form-group label="Station" label-for="imei-input" label-cols="4" label-size="sm" label-align-sm="right" invalid-feedback="Station No. is required">
							<b-form-input id="imei-input" v-model="selectedItem.station_no" required></b-form-input>
						</b-form-group>
						<b-form-group label="Mobile" label-for="ccms-input" label-cols="4" label-size="sm" label-align-sm="right">
							<b-form-input id="mobile-input" v-model="selectedItem.mobile_no" :disabled="selectedItem.id > 0" required></b-form-input>
						</b-form-group>
                        <b-form-group label="New Mobile" label-for="ccms-input" label-cols="4" label-size="sm" label-align-sm="right" v-if="selectedItem.id > 0">
							<b-form-input id="mobile-input" v-model="selectedItem.new_mobile_no"></b-form-input>
						</b-form-group>
						<b-form-group label="Device ID" label-cols="4" label-size="sm" label-align-sm="right" invalid-feedback="Device no is required">
							<b-form-input id="imei-input" v-model="selectedItem.device_no" required></b-form-input>
						</b-form-group>
						<b-form-group label="Location" label-for="ward-input" label-cols="4" label-size="sm" label-align-sm="right">
							<b-form-input id="location-input" v-model="selectedItem.location" required></b-form-input>
						</b-form-group>
						<b-form-group label="Meter Type" label-for="metertype-input" label-cols="4" label-size="sm" label-align-sm="right">
                            <b-form-select v-model="selectedItem.meter_type">
                                <b-form-select-option value="0">--- Select Meter Type ---</b-form-select-option>
                                <b-form-select-option v-for="item in meter_typeList" v-bind:key="item.id" :value="item.code" >{{item.title}}</b-form-select-option>
                            </b-form-select>
						</b-form-group>
					</b-col>
					<b-col>
                        <b-alert show variant="secondary" class="header-title py-2">Zone Information</b-alert>
						<b-form-group label="Zone" label-for="load-input" label-cols="4" label-size="sm" label-align-sm="right">
                            <b-form-select v-model="selectedItem.zone">
                                <b-form-select-option value="0">--- Select Zone ---</b-form-select-option>
                                <b-form-select-option v-for="item in zones" v-bind:key="item.id" :value="item.id" >{{item.title}}</b-form-select-option>
                            </b-form-select>
						</b-form-group>
						<b-form-group label="Sub zone" label-for="ward-input" label-cols="4" label-size="sm" label-align-sm="right">
                            <b-form-select v-model="selectedItem.subzone">
                                <b-form-select-option value="0">--- Select Sub Zone ---</b-form-select-option>
                                <b-form-select-option v-for="item in filterSubzones()" v-bind:key="item.id" :value="item.id" >{{item.title}}</b-form-select-option>
                            </b-form-select>
						</b-form-group>

						<b-alert show variant="secondary" class="header-title py-2">Map Information</b-alert>
						<b-form-group label="Latitude" label-for="load-input" label-cols="4" label-size="sm" label-align-sm="right">
							<b-form-input v-model="selectedItem.latitude" required></b-form-input>
						</b-form-group>
						<b-form-group label="Longitude" label-for="ward-input" label-cols="4" label-size="sm" label-align-sm="right">
							<b-form-input v-model="selectedItem.longitude" required></b-form-input>
						</b-form-group>
					</b-col>
                    <b-col>
                        <b-alert show variant="secondary" class="header-title py-2">Instrument</b-alert>
                        <b-form-group label="Using sub-components:" v-slot="{ ariaDescribedby }">
                            <b-form-checkbox-group
                                id="checkbox-group-2"
                                v-model="selectedItem.instrument"
                                :aria-describedby="ariaDescribedby"
                                name="flavour-2"                               
                                @change="checkInstrument($event)"
                            >
                                <b-form-checkbox value="flowmeter">Flowmeter</b-form-checkbox>
                                <b-form-checkbox value="levelsensor">Tank/Level Sensor</b-form-checkbox>
                                <b-form-checkbox value="depthsensor">Depth Sendor</b-form-checkbox>                            
                            </b-form-checkbox-group>
                        </b-form-group>
                    </b-col>
                    <b-col v-if="showFlowmeter">
                    <b-alert show variant="secondary" class="header-title py-2">Flow Information</b-alert>
                   <!--  <b-form-group
                    label="Flow Imei"
                    label-for="level-input"
                    label-cols="4"
                    label-size="sm"
                    label-align-sm="right"
                    >
                    <b-form-input id="level-input" v-model="selectedItem.flow_imei_no" required></b-form-input>
                    </b-form-group> -->
                    <b-form-group
                    label="Min Flow"
                    label-for="level-input"
                    label-cols="4"
                    label-size="sm"
                    label-align-sm="right"
                    >
                    <b-form-input id="level-input" v-model="selectedItem.min_flow" required></b-form-input>
                    </b-form-group>
                    <b-form-group
                    label="Max Flow"
                    label-for="level-input"
                    label-cols="4"
                    label-size="sm"
                    label-align-sm="right"
                    >
                    <b-form-input id="level-input" v-model="selectedItem.max_flow" required></b-form-input>
                    </b-form-group>
                    <b-form-group
                    label="Min Voltage"
                    label-for="level-input"
                    label-cols="4"
                    label-size="sm"
                    label-align-sm="right"
                    >
                    <b-form-input id="level-input" v-model="selectedItem.min_voltage" required></b-form-input>
                    </b-form-group>
                    <b-alert show variant="secondary" class="header-title py-2">Pressure Information</b-alert>
                    <b-form-group
                    label="Min Pressure"
                    label-for="level-input"
                    label-cols="4"
                    label-size="sm"
                    label-align-sm="right"
                    >
                    <b-form-input id="level-input" v-model="selectedItem.min_pressure" required></b-form-input>
                    </b-form-group>
                    <b-form-group
                    label="Max Pressure"
                    label-for="level-input"
                    label-cols="4"
                    label-size="sm"
                    label-align-sm="right"
                    >
                    <b-form-input id="level-input" v-model="selectedItem.max_pressure" required></b-form-input>
                    </b-form-group>
                    <b-form-group
                    label="Min Voltage"
                    label-for="level-input"
                    label-cols="4"
                    label-size="sm"
                    label-align-sm="right"
                    >
                    <b-form-input id="level-input" v-model="selectedItem.min_voltage_pressure" required></b-form-input>
                    </b-form-group>
                    </b-col>

				</b-row>
			</b-container>
			<form ref="form" @submit.stop.prevent="handleSubmit">
				
			</form>
			<template v-slot:modal-footer="{ ok, close }">
				<b-button size="sm" variant="danger" @click="close()">Cancel</b-button>
				<b-button size="sm" variant="success" @click="ok()">{{(selectedItem.id > 0)?'Update':'Submit'}}</b-button>
			</template>
		</b-modal>


    </div>
</template>
<script>

export default {
    middleware: ['check-auth','auth'],
    name:'dashboard_pump_list',
    mounted(){
		var self = this;
		this.initload();
	},
    unmounted(){
        console.log('unmounted');
        clearTimeout(this.interval);
    },
    data() {
        return {
            zoom: 12,
            pagesizes: [10, 20, 50, 100, 500, 1000, 2000],
            perpage: 10,
            currentpage: 1,
            zone: {},
            zones:[],
            location_title: '',
            total_device: 0,
            total_device_on: 0,
            total_device_off: 0,
            total_device_trip: 0,
            total_disconnected: 0,
            zone_selected: 0,
            subzone_selected: 0,
            filter: '',
            filterselected: 'ALL', 
            /* currentpage: 0, */
            filteroptions: [{text:'All', value:'ALL'}, {text:'Connected', value:"CONNECT"}, {text:'Disconnected', value:"DISCONNECT"}, {text:'Power ON', value:"PWRON"}, {text:'Power OFF', value:"PWROFF"}, {text:'Pumps ON', value:"PUMPON"}, {text:'Pumps OFF', value:"PUMPOFF"}, {text:'Pumps Trip', value:"PUMPTRIP"}, {text:'Pumps Auto Mode', value:"AUTO"}, {text:'Pumps Manual Mode', value:"MANUAL"}],
            selecteditem: {
                name: ''
            },
            filteredrecords: [],
            recordUrl: process.env.apiUrl+'devices',
            insertUrl: process.env.apiUrl+'add-pump',
            updateUrl: process.env.apiUrl+'update-pump',
            fields: [
                { key: 'sno', label: 'SNo' },
             
                { key: 'imei_no', label: 'Imei No.', sortable: true },
                { key: 'mobile_no', label: 'Mobile.', sortable: true },                
                /* { key: 'subzone_title', label: 'Subzone', sortable: true }, */
               // { key: 'instrument', label: 'Instrument', class: 'text-bold' },
                { key: 'location', label: 'Location', class: 'text-bold' },
               /*  { key: 'station_no', label: 'Station', class: 'text-left' }, */
                { key: 'supply', label: 'Power Supply' },
                { key: 'pump_status', label: 'Pump Status' },
                { key: 'device_trip', label: 'Trip' },
                { key: 'auto_manual', label: 'Auto/Manual' },
                { key: 'connection_status', label: 'Connection Status'},
                { key: 'update_time', label: 'Timestamp', class: 'text-left' },
               /*  { key: 'tank_imei_no', label: 'Tank', class: 'text-left' }, */
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
            ],
            selectedItem: {
				id: 0,
                new_imei_no: '',
				station_no: '',
                mobile_no: '',
                device_no: '',
                location: '',
                zone: 0,
                subzone: 0,
				meter_type:'',
                instrument:{}
			},
			emptyItem: {
				id: 0
			},
	        markers: [],
			places: [],
			currentPlace: null,
			infoWindowPos: null,
			infoWindowOpen: false,
	        center: { lat: 0, lng: 0 },
		    infoOptions: {
				content: '',
				pixelOffset: {
					width: 0,
					height: -35
				}
			},
            filterOn: [],
            sortBy: '',
			sortDesc: false,
			sortDirection: 'asc',
            //instrument:[],
            showFlowmeter:false,
            meter_typeList:[],
            /*  instrument:{
            'flowmeter':0,
            'LevelSensor':0,
            'depthSensor':0
            }*/
        } 
    },
    layout: 'admin',
    methods: {
        /***************** START DATA TABLE */

        /******************* END DATA TABLE */
        toogleMarkerInfoWindow(marker, index){
            console.log("NNNNN");
			this.infoWindowPos = marker.position;
			this.infoOptions.content = marker.infotext;
			if(this.currentMarkerIndex == index){
				this.infoWindowOpen = !this.infoWindowOpen;
			}else{
				this.infoWindowOpen = true;
				this.currentMarkerIndex = index;
			}
		},
        onFilterSubzone(){

        },
        filterSubzones(){
            var self = this;
			if(self.subzones){
				return self.subzones.filter(function (item) {
					return item.zone_id  == self.selectedItem.zone;
				})
			}else{
				return [];
			}
        },
        subzoneslist(){
            var self = this;
			if(self.subzones){
				return self.subzones.filter(function (item) {
					return item.zone_id  == self.zone_selected;
				})
			}else{
				return [];
			}
        },
        display(str){
            this.selecteditem.name = str;
        },
        /*filterTitle: function (subzoneid) {
			var self = this;
			return self.subzones.filter(function (item) {
				if(item.id == subzoneid){
					return true;
				}
			})[0].title;
		},*/
        filterTitle: function () {
			var self = this;
			return self.zones.filter(function (item) {
				if(item.code == self.$route.params.id){
					return true;
				}
			})[0].title;
		},
        timeout: function(){
            setTimeout(this.onFilterDevices, 5000);
        },
        showAddModal(){
			this.selectedItem = Object.assign({}, this.emptyItem);
			this.$root.$emit('bv::show::modal', 'edit-model');
		},
        showUpdateModal(item, index, button) {
           // var self = this;           
			this.selectedItem = Object.assign({}, item);
           this.checkInstrument();            
			this.$root.$emit('bv::show::modal', 'edit-model', button)
		},
        onFilterDevices(){
			this.filteredrecords = this.filterDevices(this.filterBySubzone(this.devices));
			this.totalrows = this.filteredrecords.length;
			this.currentpage = 1;
		},
        filterBySubzone(devices){
            var self = this;
			return devices.filter(function (d) {
				var valid = false;
                
				if(self.subzone_selected == 0){
					valid = true;
				}else if(self.subzone_selected === d.subzone){
					valid = true;
				}
                if(valid){
					return d;
				}
            });
        },
        filterDevices(devices){
			var self = this;
			return devices.filter(function (d) {
				var valid = false;
                
				if(self.filterselected == 'ALL'){
					valid = true;
				}else if(self.filterselected == 'DISCONNECT'){
					if(d.connection_status == 0){
						valid = true;
					}
				}else if(self.filterselected == 'CONNECT'){
					if(d.connection_status == 1){
						valid = true;
					}
				}else if(self.filterselected == 'PWRON'){
					if(d.supply == 'ON'){
						valid = true;
					}
				}else if(self.filterselected == 'PWROFF'){
					if(d.supply == 'OFF'){
						valid = true;
					}
				}else if(self.filterselected == 'PUMPON'){
					if(d.pump_status == 'ON'){
						valid = true;
					}
				}else if(self.filterselected == 'PUMPOFF'){
					if(d.pump_status == 'OFF'){
						valid = true;
					}
				}else if(self.filterselected == 'PUMPTRIP'){
					if(d.device_trip == 'TRIP'){
						valid = true;
					}
				}else if(self.filterselected == 'AUTO'){
					if(d.auto_manual == 'AUTO'){
						valid = true;
					}
				}else if(self.filterselected == 'MANUAL'){
					if(d.auto_manual == 'MANUAL'){
						valid = true;
					}
				}
				if(valid){
					return d;
				}
                
			});
		},
        resetSelectedItem(){
			var self = this;
			self.selectedItem = Object.assign({}, self.emptyItem);
		},
        modalSubmit(bvModalEvt){
			var self = this;
			self.loading = true;
			bvModalEvt.preventDefault();

			var submitUrl = "";
			if(self.selectedItem.id == 0){
				submitUrl = self.insertUrl;
			}else{
				submitUrl = self.updateUrl;
			}

			self.$axios.post(submitUrl, {
				accesskey: self.$store.getters.getUserinfo.access_key,
				data: self.selectedItem
			})
			.then(function (response) {
				if(response.data.error == 0 || response.data.error == '0'){
					self.$bvModal.hide('edit-model');
					self.$bvToast.toast(response.data.message, {
						title: 'Status',
						toaster: 'b-toaster-bottom-right',
						autoHideDelay: 5000,
						variant: 'warning',
						solid: true,
						appendToast: true
					});
					self.initload();
				}
			})
			.catch(function (error) {
				alert(error);
			});
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
        initload(){
            var self = this;

            
            self.$axios.post(self.recordUrl, {
                accesskey: self.$store.getters.getUserinfo.access_key,
                areacode: self.$route.params.id
            })
            .then(function (response) {
                if(response.data.error == 0 || response.data.error == '0'){
                    /*self.total_device = 0;
                    self.total_connected = 0;
                    self.total_disconnected = 0;

                    self.zones = response.data.result.zones;
                    self.subzones = response.data.result.subzones;
                    self.items = response.data.result.devices;
                    self.items.forEach(function(item){
						self.total_device += parseInt(item.total_device);
                        self.total_connected += parseInt(item.total_connected);

                        item.subzone = self.subzones.filter(function (_d) {
                            if(_d.id == item.subzone){
                                return true;
                            }
                        })[0].title;
					});
                    self.total_disconnected = self.total_device - self.total_connected;*/
                }

                var sno = 1;

                if(response.data.error == 0 || response.data.error == '0'){
                    self.total_device = 0;
                    self.total_device_on = 0;
                    self.total_device_off = 0;
                    self.total_device_trip = 0;
                    self.total_disconnected = 0;
                 
                    if(!isNaN(response.data.result) || response.data.result!='' ){

                        self.devices = response.data.result.devices;
                        self.zones = response.data.result.zones;
                        self.subzones = response.data.result.subzones;
                        self.meter_typeList = response.data.result.meter_type;

                        /* self.zones.forEach(element => {
                            if(element.code == self.$route.params.id){
                                selectedItem.zone = 
                                break;
                            }
                        });*/

                        self.zones.forEach(element => {
                            if(element.code == self.$route.params.id){
                                self.zone_selected = element.id;
                            }
                        });
                        
                        
                        self.last_sync_time = self.$moment().format('DD-MM-YYYY HH:mm:ss');

                        var min_lat = 100;
                        var min_lng = 100;
                        var max_lat = 0;
                        var max_lng = 0;

                        self.connected_devices = 0;
                        self.poweroff_devices = 0;

                        self.markers = [];

                        var curdatetime = self.$moment();
                        var conn_status = 1;
                            var dbdatetime = '';
                            var duration = '';
                            var minutes = '';

                            self.total_device = self.devices.length;
                            for (var i = 0; i < self.devices.length; i++) {
                                
                                var d = self.devices[i];
                            // console.log('instrument:',self.devices[i].instrument);
                                if(d.instrument!=''){
                                        self.devices[i].instrument = JSON.parse(d.instrument);
                                    }else{
                                        self.devices[i].instrument=[];
                                    } 

                            // console.log('d.update_time:',d.update_time);
                                if(d.update_time != ""){
                                    dbdatetime = self.$moment(d.update_time);
                                    
                                    if(curdatetime > dbdatetime){
                                        duration = self.$moment.duration(curdatetime.diff(dbdatetime));
                                    }else{
                                        duration = self.$moment.duration(dbdatetime.diff(curdatetime));
                                    }
                                    minutes = duration.asMinutes();
                                        
                                    if(minutes < 720){
                                        conn_status = 1;
                                    }else{
                                        conn_status = 0;
                                    }
                                    /* if(d.data_status == 0){
                                        conn_status = 0;
                                    } */
                                }else{
                                    conn_status = 0;
                                }

                                if(conn_status == 0){
                                    self.total_disconnected += 1;
                                }
                                //console.log('conn_status:',conn_status,'minutes=====',minutes);
                                
                                d.connection_status = conn_status;
                                self.connected_devices += conn_status;

                                d.subzone_title = self.subzones.filter(function (_d) {
                                    if(_d.id == d.subzone){
                                        return true;
                                    }
                                })[0].title;

                                if(d.sl_voltage == "0" || d.sl_voltage == 0){
                                    self.poweroff_devices += 1;
                                }

                                if(d.auto != null){
                                    if(d.auto == 1){
                                        d.auto_manual = 'AUTO';
                                    }else{
                                        d.auto_manual = 'MANUAL';
                                    }
                                }else{
                                    d.auto_manual = 'N/A';
                                }

                                
                                if(d.trip != null){
                                    if(d.trip == 1){
                                        d.device_trip = 'TRIP';
                                        self.total_device_trip += 1;
                                    }else{
                                        d.device_trip = '';
                                    }
                                }else{
                                    d.device_trip = '';
                                }

                                if(d.sl_voltage == 120){
                                    d.supply = 'ON';
                                }else{
                                    d.supply = 'OFF';
                                }
                                
                                if(d.outputs != null){
                                    if(d.outputs == 1){
                                        d.pump_status = 'ON';

                                        self.total_device_on += 1;
                                    }else{
                                        d.pump_status = 'OFF';

                                        self.total_device_off += 1; 
                                    }
                                }else{
                                    d.pump_status = 'N/A';
                                }
                                

                                if(d.latitude != 'NaN' && d.latitude != 'undefined' && d.latitude != ''){
                                    if(d.location_type == 'ESR'){
                                        self.total_esr += 1;


                                    }
                                    if(d.location_type == 'GSR'){
                                        self.total_gsr += 1;
                                    }

                                    var msg = '<b>Location</b> : '+d.location+'<br><b>Latitude :</b> '+d.latitude+'<br><b>Longitude :</b> '+d.longitude+'<br><b>Last Updated Time :</b> '+self.$moment(d.update_time).format('DD-MM-YYYY HH:mm:ss');

                                    min_lat = Math.min(parseFloat(d.latitude), min_lat);
                                    min_lng = Math.min(parseFloat(d.longitude), min_lng);

                                    max_lat = Math.max(parseFloat(d.latitude), max_lat);
                                    max_lng = Math.max(parseFloat(d.longitude), max_lng);

                                // var blueurl = "https://www.fablurs.com/flag-blue.png";
                                    //var redurl = "https://www.fablurs.com/flag-red.png";
                                    //var greenurl = "https://www.fablurs.com/flag-green.png";
                                    var blueurl = "http://matrixmeters.com/icon/pin-blue.png";
                                    var redurl = "http://matrixmeters.com/icon/pin-red.png";
                                    var greenurl = "http://matrixmeters.com/icon/pin-green.png";
                                    var iconurl = greenurl;
                                    if(d.analoginput < 500){
                                        if(d.analoginput < 200){
                                            iconurl = redurl;
                                        }else{
                                            iconurl = blueurl;
                                        }
                                    }
                                    self.addMarker(parseFloat(self.devices[i].latitude), parseFloat(self.devices[i].longitude), msg, iconurl);
                                }

                                d.sno = sno++;
                            }
                            self.center = { lat: min_lat + (max_lat - min_lat)/2, lng: min_lng + (max_lng - min_lng)/2 };
                        
                        self.filteredrecords = self.filterDevices(self.devices);
                        //alert(self.filteredrecords.length);
                        self.totalRows = self.filteredrecords.length;
                        self.currentPage = 1;

                        self.location_title = self.zones.filter(function (item) {
                            if(item.code == self.$route.params.id){
                                return true;
                            }
                        })[0].title;

                        setTimeout(self.initload, 60*1000);

                    }
                }else{
                    self.$store.dispatch('logoutUser', {}).then((status) => {
                        if(status){
                            self.$router.push('/login');
                        }else{
                            alert('error');
                        }
                    });
                    //self.$root.forceLogout(response.data.message);
                }
            })
            .catch(function (error) {
                alert(error);
            });
        },
        onFiltered(filteredItems) {
			this.totalRows = filteredItems.length;
			this.currentPage = 1;
		},
        checkInstrument: function(e) {
                this.showFlowmeter=false;
                console.log(this.selectedItem.instrument,e);
                 this.selectedItem.instrument.forEach(item=>{
                    //console.log('item::'+item);
                    if(item=='flowmeter'){
                        this.showFlowmeter=true;
                    }
                }); 
            }
        
    }
}
</script>
<style scoped>
.heading{
    font-size: 24px !important;
    margin-bottom: 0px;
}
</style>