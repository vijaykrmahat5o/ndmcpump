<template>
    <div class="flex-grow-1" style="margin-top:75px">
        <b-container fluid class="min-h-screen">
            <div>
                <b-row class="p-0 mb-5">
                    <b-col>
                        <b-breadcrumb class="mb-0">
                            <b-breadcrumb-item :to="'/'+$store.getters.getUserinfo.dashboard">
                                <font-awesome-icon :icon="['fas', 'home']" class="icon"/>
                                Home
                            </b-breadcrumb-item>
                            <b-breadcrumb-item :to="'/'+$store.getters.getUserinfo.dashboard+'/farrukhabad'">
                                 Pumps 
                            </b-breadcrumb-item>
                            <b-breadcrumb-item active>Pump Details <b>{{ livedata.location }}</b></b-breadcrumb-item>
                        </b-breadcrumb>
                    </b-col>
                </b-row>
               <!--  <b-row class="p-0 m-0">
                    <b-col>
                        <h2 class="text-center">Nagar Palika Parishad Farrukhabad</h2>
                        <h3 class="text-center"><i>{{ livedata.location }}</i></h3>
                    </b-col>
                </b-row> -->
                <b-row>
                    <b-col>
                        <b-table show-empty small striped outlined head-variant="dark" :items="records_metering" :fields="fields_metering">
                            <template v-slot:cell(value)="row">
                                <b>{{ row.value }}</b>
                            </template>
                        </b-table>
                        <p class="mb-1 text-right">
                            <b-button size="sm" pill variant="outline-dark">Update Schedule</b-button>
                        </p>
                        <b-table show-empty sticky-header small striped outlined head-variant="dark" :items="records_schedule" :fields="fields_schedule">
                            <!--<template #thead-top="data">
                                <b-tr>
                                    <b-th variant="primary"></b-th>
                                    <b-th variant="danger" class="text-right" colspan="2">Type 3</b-th>
                                </b-tr>
                            </template>-->
                        </b-table>
                    </b-col>
                    <b-col>
                        <b-table show-empty sticky-header small striped outlined head-variant="dark" :items="records_pumpstatus" :fields="fields_pumpstatus">
                            <template v-slot:cell(value)="row">
                                <b-badge pill variant="success" v-if="row.value == 1">AUTO</b-badge>
                                <b-badge pill variant="danger" v-else-if="row.value == 0">MANUAL</b-badge>
                            </template>
                        </b-table>
                        <p>
                            <b-img v-if="pump_status == 'ON'" src="/green_pump.jpg" center fluid ></b-img>
                            <b-img v-else src="/yellow_pump.jpg" center fluid ></b-img>
                        </p>
                        
                        <b-table show-empty sticky-header small striped outlined head-variant="dark" :items="records_powerreading" :fields="fields_powerreading">
                            <template v-slot:cell(value)="row">
                                <b-badge pill variant="success" v-if="row.value == '1'">ON</b-badge>
                                <b-badge pill variant="danger" v-else-if="row.value == '0'">OFF</b-badge>
                                <b v-else>{{ row.value }}</b>
                            </template>
                        </b-table>
                        <b-table show-empty sticky-header small striped outlined head-variant="dark" :items="records_devicestatus" :fields="fields_devicestatus">
                            <template v-slot:cell(value)="row">
                                <b>{{ row.value }}</b>
                            </template>
                        </b-table>
                    </b-col>
			    </b-row>
            </div>
            <!--<b-modal id="schedule-model" title="Update Schedule" ok-only>
				<b-container fluid>
					<b-row class="mb-1r">
						<b-col cols="4" class="text-right">IMEI :</b-col>
						<b-col cols="8">{{schedule.imei_no}}</b-col>
					</b-row>
					<b-row class="mb-1r">
						<b-col cols="4" class="text-right">Zone :</b-col>
						<b-col cols="8">{{selectedItem.ulb_id}}</b-col>
					</b-row>
					<b-row class="mb-1r">
						<b-col cols="4" class="text-right">Feeder Pillor No :</b-col>
						<b-col cols="8">{{selectedItem.feeder_pillar_no}}</b-col>
					</b-row>
					<b-row class="mb-1r">
						<b-col cols="4" class="text-right">Ward No :</b-col>
						<b-col cols="8">{{selectedItem.ward_no}}</b-col>
					</b-row>
				</b-container>
				<template v-slot:modal-footer="{ ok, close, hide }">
					<div v-if="$root.chkperm('page_devices','maintenance')">
						<b-button size="sm" variant="warning" v-if="selectedItem.maintenance == 0" @click="hide('maintenance_on')">Maintenance ON</b-button>
						<b-button size="sm" variant="warning" v-else @click="hide('maintenance_off')">Maintenance OFF</b-button>
					</div>
					<b-button size="sm" variant="danger" @click="close()">Cancel</b-button>
					<b-button size="sm" variant="success" @click="ok()">Ok</b-button>
				</template>
			</b-modal>-->
        </b-container>
    </div>
</template>
<script>

export default {
    middleware: ['check-auth','auth'],
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
            interval: '',
            zoom: 12,
            pagesizes: [10, 20, 50, 100, 500, 1000, 2000],
            perpage: 10,
            currentpage: 1,
            zone: {},
            total_device: 0,
            total_device_on: 0,
            total_device_off: 0,
            total_device_trip: 0,
            total_disconnected: 0,
            conn_status: 0,
            pump_status: '',
            schedule: [],
            livedata: {},
            filter: '',
            filterselected: 'ALL', 
            currentpage: 0,
            filteroptions: [{text:'All', value:'ALL'}, {text:'Connected', value:"CONNECT"}, {text:'Disconnected', value:"DISCONNECT"}, {text:'Power ON', value:"PWRON"}, {text:'Power OFF', value:"PWROFF"}, {text:'Pumps ON', value:"PUMPON"}, {text:'Pumps OFF', value:"PUMPOFF"}, {text:'Pumps Trip', value:"PUMPTRIP"}, {text:'Pumps Auto Mode', value:"AUTO"}, {text:'Pumps Manual Mode', value:"MANUAL"}],
            selecteditem: {
                name: ''
            },
            filteredrecords: [],
            recordUrl: process.env.apiUrl+'pump-data',
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
            records_metering: [
                { label: 'Amp R', value: '32.1 A' }
            ],
            fields_metering: [
                { key: 'label', label: 'Metering', class:'text-left'},
                { key: 'value', label: '', class:'text-right'}
            ],
            records_devicestatus: [
            ],
            fields_devicestatus: [
                { key: 'label', label: 'Device Status', class:'text-left'},
                { key: 'value', label: '', class:'text-right'}
            ],
            records_pumpstatus: [
                { label: 'Pump Mode', value: 0 }
            ],
            fields_pumpstatus: [
                { key: 'label', label: 'Pump Status', class:'text-left'},
                { key: 'value', label: '', class:'text-right'}
            ],
            records_powerreading: [
                { label: 'Power', value: 1 },
                { label: 'KWH', value: 145467 },
                { label: 'Offset', value: '0.00' }
            ],
            fields_powerreading: [
                { key: 'label', label: 'Power Reading', class:'text-left'},
                { key: 'value', label: '', class:'text-right'}
            ],
            records_schedule: [
                { label: 'Option', on: 'ON(hrs)', off: 'OFF(hrs)' },
            ],
            fields_schedule: [
                { key: 'label', label: 'Pump Schedule', class:'text-left'},
                { key: 'on', label: '', class:'text-right'},
                { key: 'off', label: '', class:'text-right'}
            ],
        }
    },
    layout: 'admin',
    methods: {
        display(str){
            this.selecteditem.name = str;
        },
        filterTitle: function (subzoneid) {
			var self = this;
			return self.subzones.filter(function (item) {
				if(item.id == subzoneid){
					return true;
				}
			})[0].title;
		},
        onFilterDevices(){
			this.filteredrecords = this.filterDevices(this.devices);
			this.totalrows = this.filteredrecords.length;
			this.currentpage = 1;
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
        initload(){
            var self = this;
            
            self.$axios.post(self.recordUrl, {
                accesskey: self.$store.getters.getUserinfo.access_key,
                station_no: self.$route.params.id
            })
            .then(function (response) {
                if(response.data.error == 0 || response.data.error == '0'){
                    self.livedata = response.data.result.livedata;
                    
                    if(self.livedata == undefined){
                        return;
                    }

					self.records_metering = [
						{'label': 'Amp R', 'value': (self.livedata.amp_r/1000).toFixed(1)},
						{'label': 'Amp Y', 'value': (self.livedata.amp_y/1000).toFixed(1)},
						{'label': 'Amp B', 'value': (self.livedata.amp_b/1000).toFixed(1)},
						{'label': 'Voltage R', 'value': (self.livedata.voltage_r/1000).toFixed(1)},
						{'label': 'Voltage Y', 'value': (self.livedata.voltage_y/1000).toFixed(1)},
						{'label': 'Voltage B', 'value': (self.livedata.voltage_b/1000).toFixed(1)},
						{'label': 'Voltage (R+Y)', 'value': ((parseFloat(self.livedata.voltage_r) + parseFloat(self.livedata.voltage_y))/1000).toFixed(1)},
						{'label': 'Voltage (Y+B)', 'value': ((parseFloat(self.livedata.voltage_y) + parseFloat(self.livedata.voltage_b))/1000).toFixed(1)},
						{'label': 'Voltage (B+R)', 'value': ((parseFloat(self.livedata.voltage_r) + parseFloat(self.livedata.voltage_b))/1000).toFixed(1)},
					];
					self.records_devicestatus = [
						{'label': 'SL Voltage', 'value': self.livedata.sl_voltage+'V'},
						{'label': 'IO Stamp', 'value': self.$moment('20'+self.livedata.io_stamp).format('DD-MM-YYYY HH:mm:ss')},
						{'label': 'Data Stamp', 'value': self.$moment('20'+self.livedata.data_stamp).format('DD-MM-YYYY HH:mm:ss')},
					];


					var curdatetime = self.$moment();
					var dbdatetime = self.$moment(self.livedata.update_time);
					var duration = 0;
					var minutes = 0;
					if(curdatetime > dbdatetime){
						duration = self.$moment.duration(curdatetime.diff(dbdatetime));
					}else{
						duration = self.$moment.duration(dbdatetime.diff(curdatetime));
					}
					minutes = duration.asMinutes();
					
					if(minutes < 720){
						self.conn_status = 1;
					}else{
						self.conn_status = 0;
					}

                    var supply = 0;
                    if(self.livedata.sl_voltage == 12){
                        supply = 1;
                    }

                    self.records_powerreading = [
                        { label: 'Power', value: supply },
                        { label: 'KWH', value: (self.livedata.kwh)?self.livedata.kwh:'00' },
                        { label: 'Offset', value: '0.00' }
                    ];

                    var auto_manual = '';
                    if(self.livedata.inputs != null){
                        if(self.livedata.inputs.charAt(2) == 1){
                            auto_manual = 1;
                        }else{
                            auto_manual = 0;
                        }
                    }else{
                        auto_manual = '';
                    }


                    if(self.livedata.outputs != null){
                        if(self.livedata.outputs.charAt(0) == 1){
                            self.pump_status = 'ON';
                        }else{
                            self.pump_status = 'OFF'; 
                        }
                    }else{
                        self.pump_status = 'N/A';
                    }
                    self.records_pumpstatus = [
                        { label: 'Pump Mode', value: auto_manual }
                    ];
                    

                    self.interval = setTimeout(self.initload, 30*1000);
                }else{
                    self.$store.dispatch('logoutUser', {}).then((status) => {
                        if(status){
                            self.$router.push('/login');
                        }else{
                            alert('error');
                        }
                    });
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