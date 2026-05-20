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
                            <b-breadcrumb-item active>Daily Operational Report</b-breadcrumb-item>
                        </b-breadcrumb>
                    </b-col>
                    <b-col class="text-right">
                        <download-excel class="btn btn-dark btn-sm rounded-pill" :data="json_data" :fields="json_fields" header="Daily Operational Report" :subheader="excel_subheader" :before-generate="startDownloadExcel" worksheet="REPORT" name="daily-operational-report.xls">
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
                                        <!--<label for="inline-form-input-name" class="mr-sm-2">Pump: </label>
                                        <b-form-select v-model="deviceid" :options="devices" value-field="imei_no" text-field="location" size="sm" class="mr-sm-3">
                                            <b-form-select-option value="0">--- Select Device ---</b-form-select-option>
                                        </b-form-select>-->
                                        <label for="inline-form-input-name" class="mr-sm-2">Date: </label>
                                        <b-form-datepicker v-model="datefrom" class="mr-sm-2" size="sm" :date-format-options="{ year: 'numeric', month: '2-digit', day: '2-digit' }"></b-form-datepicker>
                                        <!--<label for="inline-form-input-name" class="mr-sm-2">    To: </label>
                                        <b-form-datepicker v-model="dateto" class="mr-sm-2" size="sm" :date-format-options="{ year: 'numeric', month: '2-digit', day: '2-digit' }"></b-form-datepicker>
                                        <b-form-timepicker v-model="timefrom" class="mr-sm-2" hour12="false" label-hours="Hours" size="sm" locale="en"></b-form-timepicker>-->
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
            recordUrl: process.env.apiUrl+'daily-operational-report',

            zones: [],
            subzones: [],
	        devices: [],
            zone: 0,
            ward: 0,
            items: [],
            fields: [
                { key: 'sno', label: 'S No'},
                { key: 'location', label: 'Location'},
                { key: 'power_hrs', label: 'Power ON'},
                { key: 'failure_hrs', label: 'Power OFF'},
                { key: 'on_hrs', label: 'Pump ON Hrs'},
                { key: 'off_hrs', label: 'Pump OFF Hrs'},
                { key: 'auto_mode_hrs', label: 'Auto Hrs'},
                { key: 'manual_mode_hrs', label: 'Manual Hrs'},
                { key: 'trip_mode_hrs', label: 'Trip Hrs'},
                { key: 'consumption', label: 'Consumption'}
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
                "Location": "location",
                "Power ON": "power_hrs",
                "Power OFF": "failure_hrs",
                "Pump ON Hrs": "on_hrs",
                "Pump OFF Hrs": "off_hrs",
                "Auto Hrs": "auto_mode_hrs",
                "Manual Hrs": "manual_mode_hrs",
                "Trip Hrs": "trip_mode_hrs",
                "Consumption": "consumption"
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
        pad (str, max) {
            var self = this;
            str = str.toString();
            return str.length < max ? self.pad("0" + str, max) : str;
        },
        loadRecords(){
            var self = this;
            
            self.$axios.post(self.recordUrl, {
                accesskey: self.$store.getters.getUserinfo.access_key,
                datefrom: self.datefrom,
            })
            .then(function (response) {
                self.items = [];
                var i = 0;
                if(response.data.error == 0 || response.data.error == '0'){
                    var records = response.data.result.records;
                    
                    records.forEach(function(item){
                        item.sno = ++i;

                        var sec = self.pad(item.power_hrs % 60, 2);
                        var min = self.pad(parseInt(item.power_hrs / 60) % 60 , 2);
                        var hrs = self.pad(parseInt(item.power_hrs/3600), 2);
                        item.power_hrs = hrs+":"+min+":"+sec;

                        var sec = self.pad(item.failure_hrs % 60, 2);
                        var min = self.pad(parseInt(item.failure_hrs / 60) % 60 , 2);
                        var hrs = self.pad(parseInt(item.failure_hrs/3600), 2);
                        item.failure_hrs = hrs+":"+min+":"+sec;
                        
                        var sec = self.pad(item.on_hrs % 60, 2);
                        var min = self.pad(parseInt(item.on_hrs / 60) % 60 , 2);
                        var hrs = self.pad(parseInt(item.on_hrs/3600), 2);
                        item.on_hrs = hrs+":"+min+":"+sec;
                        
                        var sec = self.pad(item.off_hrs % 60, 2);
                        var min = self.pad(parseInt(item.off_hrs / 60) % 60 , 2);
                        var hrs = self.pad(parseInt(item.off_hrs/3600), 2);
                        item.off_hrs = hrs+":"+min+":"+sec;
                        
                        var sec = self.pad(item.auto_mode_hrs % 60, 2);
                        var min = self.pad(parseInt(item.auto_mode_hrs / 60) % 60 , 2);
                        var hrs = self.pad(parseInt(item.auto_mode_hrs/3600), 2);
                        item.auto_mode_hrs = hrs+":"+min+":"+sec;
                        
                        var sec = self.pad(item.manual_mode_hrs % 60, 2);
                        var min = self.pad(parseInt(item.manual_mode_hrs / 60) % 60 , 2);
                        var hrs = self.pad(parseInt(item.manual_mode_hrs/3600), 2);
                        item.manual_mode_hrs = hrs+":"+min+":"+sec;

                        item.consumption = parseInt(item.kwh_max) - parseInt(item.kwh_min);
                        if(item.kwh_max > 100 && item.kwh_min == 0){
                            item.kwh_min = item.kwh_max;
                            item.consumption = '(E)';
                        }
                        if(item.kwh_min > 100 && item.kwh_max == 0){
                            item.kwh_max = item.kwh_min;
                            item.consumption = '(E)';
                        }
                        
                        self.json_data.push({sno: item.sno, location: item.location, power_hrs: item.power_hrs, failure_hrs: item.failure_hrs, on_hrs: item.on_hrs, off_hrs: item.off_hrs, auto_mode_hrs: item.auto_mode_hrs, manual_mode_hrs: item.manual_mode_hrs, trip_mode_hrs: item.trip_mode_hrs, consumption: item.consumption});
                        
					});
                    
                    self.items = records;
                    self.totalRows = self.items.length;
                }

                /*var ctr = 0;
				self.fields = [];
				self.fields.push({ key: 'feeder_pillar_no', label: 'FP No.', stickyColumn: true, isRowHeader: true, variant: 'info' });
				self.fields.push({ key: 'location', label: 'Location', stickyColumn: true, isRowHeader: true, variant: 'dark', class:'m-w-250'});
                self.fields.push({ key: 'no_of_fittings', label: 'No of Lights' });
				_dates.forEach(function(date){
					ctr++;
					self.fields.push({'key': date, 'label': self.$moment(date).format('DD-MM-YYYY'), class: 'text-right'});
					if(_dates.length != ctr){
						self.fields.push({'key': date+'-c', 'label': '(C)', class: 'text-center'});
					}  
				})*/
            })
            .catch(function (error) {
                alert(error);
            });
        },
        startDownloadExcel(){
            var self = this;
            this.excel_subheader = ["Date: "+self.$moment(self.datefrom).format('DD-MM-YYYY')]
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
					{ text: 'Daily Operation Report', style: 'heading' },
                    { text: 'Date: '+ self.$moment(self.datefrom).format('DD-MM-YYYY'), style: 'subheading' },
                    {
						layout: 'lightHorizontalLines',
						table: {
							headerRows: 1,
                            widths: [ '*', 'auto', '*', '*', '*', '*', '*', '*', '*', '*' ],
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
						alignment: 'center',
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
			pdfMake.createPdf(docDefinition).download("daily-operational-report-"+uniq+".pdf");
		},
    }
    
}
</script>
<style scoped>

</style>