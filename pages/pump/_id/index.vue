<template>
    <div class="flex-grow-1" style="margin-top:75px">
        <b-container fluid class="min-h-screen">
            <div>
                <b-row class="p-0 mb-5">
                    <b-col>
                        <b-breadcrumb class="mb-0">
                            <b-breadcrumb-item :to="'/'+$store.getters.getUserinfo.dashboard">
                                <font-awesome-icon :icon="['fas', 'home']" class="icon"/>
                                Home <!-- {{ $store.getters.getUserinfo.group_id }} -->
                            </b-breadcrumb-item>
                            <b-breadcrumb-item :to="'/'+$store.getters.getUserinfo.dashboard">
                                 Pumps
                            </b-breadcrumb-item>
                            <b-breadcrumb-item active>Pump Details <b>{{ livedata.location }}</b></b-breadcrumb-item>
                        </b-breadcrumb>
                    </b-col>
                </b-row>
                <b-row class="p-0 m-0">
                    <b-col>
                        <h2 class="text-center">New Delhi Municipal Council</h2>
                        <h3 class="text-center"><i>{{ livedata.location }}</i></h3>
                    </b-col>
                    
                </b-row> 
                <b-row>
                    <b-col class="m-1 text-right">
                     <span v-if="action == 'wating'">Connecting...</span> 
                    <b-button variant="success" pill class="btn-shadow-only px-3 mr-2" size="sm" @click="startfunc()"
                        >PUMP START</b-button
                    >
                    <b-button variant="danger" pill class="btn-shadow-only px-3" size="sm" @click="stopfunc()"
                        >PUMP STOP</b-button
                    >
                    </b-col>
                </b-row>
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

                         
                        <p v-if="trip==1" >                           
                            <b-img src="/red_pump.png" center fluid ></b-img>
                        </p>
                        <p v-else >
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
    name:'pumpDetails',
    layout: 'admin',
    mounted(){
		var self = this;
		this.initload();
        //alert('step');
           /*const socket = this.$nuxtSocket({ name: 'main' });  
          socket.on("connect", () => {
              //  alert('step1');
                console.log("===================== Connected with socket ID:", socket.id);
            });
            socket.on("connect_error", (err) => {
               // alert('step2');
                console.error("=====================Socket Connection Error:", err);
            }); */

/* 
            const socket = this.$nuxtSocket({
            name: "main",
            transports: ["websocket"], // Force WebSocket transport
            upgrade: false, // Disable polling
            path: "http://103.211.219.183:35009", 
            reconnection: true,
             reconnectionAttempts: 10, // Retry 10 times before failing
            reconnectionDelay: 5000, // Wait 5s before retrying// Ensure correct path
            });
            socket.on("connect", () => {
            console.log("✅ Connected with ID:", socket.id);
            });
            socket.on("connect_error", (err) => {
            console.error("❌ WebSocket connection error:", err);
            }); */

        
	},
    unmounted(){
        console.log('unmounted');
        clearTimeout(this.interval);
    },
    sockets: {
        connect() {
        this.is_connected = "Connected";
        console.log("socket connected");
        //this.reloaddata();
        },
        liverecord(data) {
        console.log("-- data is coming --");
        console.log(JSON.stringify(data));
        },
        disconnect() {
        this.is_connected = "Disconnected";
        console.log("socket disconnected");
        },
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
            trip:0,
            schedule: [],
            livedata: {},
            filter: '',
            filterselected: 'ALL', 
            currentpage: 0,
            imei_no:'',
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
               /*  { label: 'KWH', value: 145467 }, */
               /*  { label: 'Offset', value: '0.00' } */
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
            action:'',
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
                    self.imei_no = self.livedata.imei_no;
					self.records_metering = [
						/*{'label': 'Amp R', 'value': (self.livedata.amp_r/10).toFixed(1)},
						{'label': 'Amp Y', 'value': (self.livedata.amp_y/10).toFixed(1)},
						{'label': 'Amp B', 'value': (self.livedata.amp_b/10).toFixed(1)},
						 {'label': 'Voltage R', 'value': (self.livedata.voltage_r/10).toFixed(1)},
						{'label': 'Voltage Y', 'value': (self.livedata.voltage_y/10).toFixed(1)},
						{'label': 'Voltage B', 'value': (self.livedata.voltage_b/10).toFixed(1)}, */
                        {'label': 'Amp R', 'value': Number(self.livedata.amp_r).toFixed(2)},
						{'label': 'Amp Y', 'value': Number(self.livedata.amp_y).toFixed(2)},
						{'label': 'Amp B', 'value': Number(self.livedata.amp_b).toFixed(2)},
						{'label': 'Voltage (R+Y)', 'value': Number(self.livedata.voltage_r).toFixed(2)},
						{'label': 'Voltage (Y+B)', 'value':Number(self.livedata.voltage_y).toFixed(2)},
						{'label': 'Voltage (B+R)', 'value': Number(self.livedata.voltage_r).toFixed(2)},
					];
                    var slV =0;
                    if(self.livedata.sl_voltage==120){
                        slV =24;
                    }

					self.records_devicestatus = [
						{'label': 'SL Voltage', 'value': slV+'V'},
						/* {'label': 'IO Stamp', 'value': self.$moment(self.livedata.io_stamp).format('DD-MM-YYYY HH:mm:ss')}, */
						{'label': 'Data Stamp', 'value': self.$moment(self.livedata.data_stamp).format('DD-MM-YYYY HH:mm:ss')},
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
                    if(self.livedata.sl_voltage == 120){
                        supply = 1;
                    }

                    self.records_powerreading = [
                        { label: 'Power', value: supply },
                        /* { label: 'KWH', value: (self.livedata.kwh)?self.livedata.kwh:'00' }, */
                        /* { label: 'Offset', value: '0.00' } */
                    ];
                    self.trip=self.livedata.trip;
                    var auto_manual = '';
                    if(self.livedata.auto ==1){
                        auto_manual =1;
                    }else{
                        auto_manual = 0;
                    }


                     if(self.livedata.outputs != null){
                        if(self.livedata.outputs == 1){
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
        startfunc() {
            var self = this;

            this.$bvModal
                .msgBoxConfirm("Do you want to start Pump?", {
                title: "Please Confirm",
                size: "sm",
                buttonSize: "sm",
                okVariant: "danger",
                okTitle: "YES",
                cancelTitle: "NO",
                footerClass: "p-2",
                hideHeaderClose: false,
                centered: true,
                })
                .then((value) => {
                if (value) {
                    console.log('imei:',self.imei_no);

                  self.action = "wating";
                    /*   const socket = this.$nuxtSocket({ name: 'main' });
                    socket.emit("setcommand", "START", self.imei_no); */

                    const socket = this.$nuxtSocket({ name: 'main', transports: ["websocket"],upgrade: false, });
                    socket.emit("setcommand", { command: "START", imei: self.imei_no }, (response) => {
                    console.log("✅ Server Response:", response);
                    if (response.status === 'success') {
                        self.action = '';
                        self.$bvToast.toast(response.message, {
                            title: 'Pump status',
                            toaster: 'b-toaster-bottom-right',
                            autoHideDelay: 5000,
                            variant: 'success',
                            solid: true,
                            appendToast: true
                        });
 
                    } else {
                        self.action = '';
                        console.error("❌ Failed to start pump:", response.message);
                        self.$bvToast.toast(response.message, {
                            title: 'Pump status',
                            toaster: 'b-toaster-bottom-right',
                            autoHideDelay: 5000,
                            variant: 'warning',
                            solid: true,
                            appendToast: true
                        });

                    }
                    });

                    
                }
                })
                .catch((err) => {
                console.log(err);
                // An error occurred
                });
            },
            stopfunc() {
                var self = this;

                this.$bvModal
                    .msgBoxConfirm("Do you want to stop Pump?", {
                    title: "Please Confirm",
                    size: "sm",
                    buttonSize: "sm",
                    okVariant: "danger",
                    okTitle: "YES",
                    cancelTitle: "NO",
                    footerClass: "p-2",
                    hideHeaderClose: false,
                    centered: true,
                    })
                    .then((value) => {
                    if (value) {
                        self.action = "wating";
                        const socket = this.$nuxtSocket({ name: 'main', transports: ["websocket"],upgrade: false, });
                        socket.emit("setcommand", { command: "STOP", imei: self.imei_no }, (response) => {
                        console.log("✅ Server Response:", response);
                        if (response.status === 'success') {
                            self.action = '';
                            self.$bvToast.toast(response.message, {
                                title: 'Pump status',
                                toaster: 'b-toaster-bottom-right',
                                autoHideDelay: 5000,
                                variant: 'success',
                                solid: true,
                                appendToast: true
                            });
    
                        } else {
                            self.action = '';
                            console.error("❌ Failed to start pump:", response.message);
                            self.$bvToast.toast(response.message, {
                                title: 'Pump status',
                                toaster: 'b-toaster-bottom-right',
                                autoHideDelay: 5000,
                                variant: 'warning',
                                solid: true,
                                appendToast: true
                            });

                        }
                        });





                    
                    // var de = socket.emit("setcommand", "STOP", self.imei_no);

                        /* var de = socket.emit("setcommand", { command: "STOP", imei: self.imei_no });
                        console.log(de); */
                    }
                    })
                    .catch((err) => {
                    console.log(err);
                    // An error occurred
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