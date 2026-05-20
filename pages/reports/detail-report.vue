<template>
    <div class="fluid" style="margin-top:75px">
        <div class="d-flex flex-row min-h-screen">
            <div class="px-3 flex-fill">
                <b-row class="pb-2">
                    <b-col cols="auto">
                        <b-breadcrumb class="mb-0">
                            <b-breadcrumb-item to="/dashboard/">
                                <font-awesome-icon :icon="['fas', 'home']" class="icon"/>
                                Home
                            </b-breadcrumb-item>
                            <b-breadcrumb-item active>Detail Report</b-breadcrumb-item>
                        </b-breadcrumb>
                    </b-col>
                    <b-col class="text-right">
                        <download-excel class="btn btn-dark btn-sm rounded-pill" :data="json_data" :fields="json_fields" header="Detail Report" :subheader="excel_subheader" :before-generate="startDownloadExcel" worksheet="REPORT" name="detail-report.xls">
                            Download XLS
                        </download-excel>
                        <b-button variant="dark" pill class="mr-2" @click="downloadPDF()" size="sm">Download PDF</b-button>
                    </b-col>
                </b-row>
                <b-row>
				<b-col class="col-md-12 col-sm-12 col-xs-12">
					<div class="container-box">
                        <b-card img-alt="Card image" class="mt-2 mb-3 no-padding">
                            <b-row class="px-3 my-3">
                                <b-col lg="12">
                                    <b-form inline>
                                        <label for="inline-form-input-name" class="mr-sm-2">Pump: </label>
                                        <b-form-select v-model="deviceid" :options="devices" value-field="imei_no" text-field="location" size="sm" class="mr-sm-3">
                                            <b-form-select-option value="0">--- Select Device ---</b-form-select-option>
                                        </b-form-select>
                                        <label for="inline-form-input-name" class="mr-sm-2">From: </label>
                                        <b-form-datepicker v-model="datefrom" class="mr-sm-2" size="sm" :date-format-options="{ year: 'numeric', month: '2-digit', day: '2-digit' }"></b-form-datepicker>
                                        <!--<b-form-timepicker v-model="timefrom" class="mr-sm-2" hour12="false" label-hours="Hours" size="sm" locale="en"></b-form-timepicker>-->
                                        <label for="inline-form-input-name" class="mr-sm-2">To: </label>
                                        <b-form-datepicker v-model="dateto" class="mr-sm-2" size="sm" :date-format-options="{ year: 'numeric', month: '2-digit', day: '2-digit' }"></b-form-datepicker>
                                        <!--<b-form-timepicker v-model="timeto" class="mr-sm-2" hour12="false" label-hours="Hours" size="sm" locale="en"></b-form-timepicker>-->
                                        <b-button pill variant="primary" size="sm" @click="loadRecords()" target="_blank" download>Submit</b-button>
                                    </b-form>
                                </b-col>
                            </b-row>
                            <b-table striped hover :items="items" :fields="fields" :current-page="currentpage" :per-page="perpage">                                
                                <template v-slot:cell(status)="row">
                                    <b-badge pill variant="success" v-if="row.value == 1">CONNECTED</b-badge>
                                    <b-badge pill variant="danger" v-else>DISCONNECTED</b-badge>
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
						<!--<b-row class="px-3 pt-3">
							<b-col md="12">
                                <line-chart ref="chart_voltage" :height="300"/>
                            </b-col>
						</b-row>
                        <b-row class="px-3 pt-3">
							<b-col md="12">
                                <line-chart ref="chart_current" :height="300"/>
                            </b-col>
						</b-row>
                        <b-row class="px-3 pt-3">
							<b-col md="12">
                                <line-chart ref="chart_kwh" :height="200"/>
                            </b-col>
						</b-row>-->
					</div>
				</b-col>
			</b-row>
            </div>
            
        </div>
        
    </div>
</template>
<script>
import JsonExcel from "vue-json-excel";
export default {
    middleware: ['check-auth','auth'],
    components: {
        'downloadExcel': JsonExcel
    },
    data() {
        return {
            datefrom: this.$moment().subtract(1,'day').format('YYYY-MM-DD'),
            dateto: this.$moment().format('YYYY-MM-DD'),
	        initUrl: process.env.apiUrl+'device-list',
            recordUrl: process.env.apiUrl+'detail-report',
	
            zones: [],
            subzones: [],
	        devices: [],
            zone: 0,
            ward: 0,
            items: [],
            fields: [
                { key: 'sno', label: 'S No'},
                { key: 'data_stamp', label: 'Data Stamp'},
                { key: 'voltage_r', label: 'Volt. R'},
                { key: 'voltage_y', label: 'Volt. Y'},
                { key: 'voltage_b', label: 'Volt. B'},
                { key: 'amp_r', label: 'Amp. R'},
                { key: 'amp_y', label: 'Amp. Y'},
                { key: 'amp_b', label: 'Amp. B'},
                { key: 'kwh', label: 'KWH'},
                { key: 'sl_voltage', label: 'Supply'},
                { key: 'auto_manual', label: 'Auto Status'},
                { key: 'device_trip', label: 'Trip Status'},
                { key: 'pump_status', label: 'Pump Status'},
                { key: 'insert_time', label: 'Update Time'}
            ],
            deviceid: 0,
            perpage: 13,
            currentpage: 1,
            filteroptions: [{text:'All', value:-1}, {text:'Connected', value:1}, {text:'Disconnected', value:0}, {text:'Data Fault', value:2}, {text:'Pending', value:3}],
            filter: null,
            totalrows: 0,
            excel_subheader: [],
            json_fields: {
                "S No": "sno",
                "Data Stamp": "data_stamp",
                "Supply": "sl_voltage",
                "Voltage R": "voltage_r",
                "Voltage Y": "voltage_y",
                "Voltage B": "voltage_b",
                "Amp R": "amp_r",
                "Amp Y": "amp_y",
                "Amp B": "amp_b",
                "Auto Status": "auto_manual",
                "Trip Status": "device_trip",
                "Pump Status": "pump_status"
            },
            json_data: [
            ],
            json_meta: [
                [
                    {
                    key: "charset",
                    value: "utf-8",
                    },
                ],
            ],
        }
    },
    layout: 'admin',
    mounted(){
        this.loadInit();
	},
    methods: {
        loadInit(){
            var self = this;
            
            self.$axios.post(self.initUrl, {
                accesskey: self.$store.getters.getUserinfo.access_key
            })
            .then(function (response) {
                self.items = [];
                if(response.data.error == 0 || response.data.error == '0'){
                    self.devices = response.data.result.devices;
                    self.zones = response.data.result.zones;
                    self.subzones = response.data.result.subzones;
                }
            })
            .catch(function (error) {
                alert(error);
            });
        },
        loadRecords(){
            var self = this;
            
            self.$axios.post(self.recordUrl, {
                accesskey: self.$store.getters.getUserinfo.access_key,
                imeino: self.deviceid,
                datefrom: self.datefrom,
                dateto: self.dateto
            })
            .then(function (response) {
                self.items = [];
                if(response.data.error == 0 || response.data.error == '0'){
                    self.customer = response.data.result.customer;
                    var list = response.data.result.records;
                    var i = 1;
                    self.json_data = [];
                    list.forEach(element => {
                        element.sno = i++;

                        element.voltage_r = (element.voltage_r/1000).toFixed(1);
                        element.voltage_y = (element.voltage_y/1000).toFixed(1);
                        element.voltage_b = (element.voltage_b/1000).toFixed(1);

                        element.amp_r = (element.amp_r/1000).toFixed(1);
                        element.amp_y = (element.amp_y/1000).toFixed(1);
                        element.amp_b = (element.amp_b/1000).toFixed(1);

                        if(element.sl_voltage == "12"){
                            element.sl_voltage = "ON";
                        }else{
                            element.sl_voltage = "OFF";
                        }

                        var d = element;

                        if(d.inputs != null){
                            if(d.inputs.charAt(2) == 1){
                                d.auto_manual = 'AUTO';
                            }else{
                                d.auto_manual = 'MANUAL';
                            }
                        }else{
                            d.auto_manual = 'N/A';
                        }

                        if(d.inputs != null){
                            if(d.inputs.charAt(1) == 1){
                                d.device_trip = 'TRIP';
                            }else{
                                d.device_trip = 'N/A';
                            }
                        }else{
                            d.device_trip = 'N/A';
                        }

                        if(d.outputs != null){
                            if(d.outputs.charAt(0) == 1){
                                d.pump_status = 'ON';

                                self.total_device_on += 1;
                            }else{
                                d.pump_status = 'OFF';

                                self.total_device_off += 1; 
                            }
                        }else{
                            d.pump_status = 'N/A';
                        }
                        
                        self.json_data.push({sno: element.sno, data_stamp: self.$moment('20'+element.data_stamp).format('DD-MM-YYYY hh:mm'), voltage_r: element.voltage_r, voltage_y: element.voltage_y, voltage_b: element.voltage_b, amp_r: element.amp_r, amp_y: element.amp_y, amp_b: element.amp_b, sl_voltage: element.sl_voltage, auto_manual: d.auto_manual, device_trip: d.device_trip, pump_status: d.pump_status});
                    });
                    self.items = list;
                }
            })
            .catch(function (error) {
                alert(error);
            });
        },
        startDownloadExcel(){
            var self = this;
            this.excel_subheader = ["Address: "]
        },
		downloadPDF(){
			var self = this;

			var pdfMake = require('pdfmake/build/pdfmake.js');
			var pdfFonts = require('pdfmake/build/vfs_fonts.js');
			pdfMake.vfs = pdfFonts.pdfMake.vfs;

			var pdfdata = new Array();
			var data = new Array();
            for (const property in self.json_fields) {
                data.push(property);
            }
			
			pdfdata.push(data);
			for(var i=0; i<self.json_data.length; i++){
				data = new Array();
				for (const property in self.json_fields) {
                    //console.log(self.json_fields[property]+' '+self.json_data[i][self.json_fields[property]]);
                    data.push(self.json_data[i][self.json_fields[property]]);
                }
				pdfdata.push(data);
			}
			
            
			var d = new Date();
			var uniq = d.getFullYear()+'-'+d.getMonth()+'-'+d.getDate()+'-'+d.getTime();
			var docDefinition = {
				content: [
					{ text: 'Detail Report', style: 'heading' },
                    { text: 'Location: ', style: 'subheading' },
                    {
						layout: 'lightHorizontalLines',
						table: {
							headerRows: 1,
                            widths: [ '*', 'auto', '*', '*', '*', '*', '*', '*', '*', '*', '*', '*' ],
							body: pdfdata
						}
					}
				],
				styles: {
					heading: {
						fontSize: 20,
						alignment: 'center',
						lineHeight: 1,
						bold: true
					},
                    subheading: {
                        fontSize: 14,
						alignment: 'left',
						lineHeight: 1,
						bold: false
                    }
				},
				defaultStyle: {
					fontSize: 10,
					bold: false
				},
				pageOrientation: 'landscape',
			};
			pdfMake.createPdf(docDefinition).download("detail-report-"+uniq+".pdf");
		},
    }
    
}
</script>
<style scoped>

</style>