<template>
	 <div class="flex-grow-1 min-h-screen p-5" style="margin-top:15px" > 
    <b-row class="pb-3">
        <b-col cols="auto">
            <b-breadcrumb class="mb-0" v-if="$store.getters.getUserinfo.group_id==1">
                <b-breadcrumb-item to="/dashboard/">
                    <font-awesome-icon :icon="['fas', 'home']" class="icon"/>
                    Home 
                </b-breadcrumb-item>
                <b-breadcrumb-item :to="'/tank/farrukhabad'">Tank Level Reports</b-breadcrumb-item>
                
            </b-breadcrumb>
            <b-breadcrumb v-else class="mb-0" >
                <b-breadcrumb-item :to="'/'+$store.getters.getUserinfo.dashboard">
                    <font-awesome-icon :icon="['fas', 'home']" class="icon"/>
                    Home 
                </b-breadcrumb-item>
                
                <b-breadcrumb-item active> Level Reports</b-breadcrumb-item>
            </b-breadcrumb>
        </b-col>
        
    </b-row> 
		<!-- <top-header></top-header> -->
		<b-container fluid>
			<b-row class="mt-3 mb-2">
				<b-col class="col-md-6 col-sm-6 col-xs-6 text-left">
					<h4>Level Reports</h4>
				</b-col>
				<b-col class="col-md-6 col-sm-6 col-xs-6 text-right">
					<b-button variant="dark" pill class="mr-2" @click="downloadcsv()">Download</b-button>
				</b-col>
			</b-row>
		</b-container>
		<b-container fluid>
			<b-card>
				<b-form inline>
					<label for="inline-form-input-name" class="mr-sm-2">Imei ID: </label>
                    <b-form-select v-model="imeino" size="sm" class="mr-3">
                        <b-form-select-option value="0">--- Select State ---</b-form-select-option>
                        <b-form-select-option v-for="item in devices" v-bind:key="item.id" :value="item.imei_no">{{item.location}}</b-form-select-option>
                    </b-form-select>
					<label for="inline-form-input-name" class="mr-sm-2">From: </label>
					<b-form-datepicker v-model="datefrom" class="mr-sm-2" size="sm" :date-format-options="{ year: 'numeric', month: '2-digit', day: '2-digit' }"></b-form-datepicker>
					<label for="inline-form-input-name" class="mr-sm-2">To: </label>
					<b-form-datepicker v-model="dateto" class="mr-sm-2" size="sm" :date-format-options="{ year: 'numeric', month: '2-digit', day: '2-digit' }"></b-form-datepicker>
					<b-button pill variant="dark" size="sm" @click="loadRecords()" target="_blank" download>Submit</b-button>
				</b-form>
			</b-card>
		</b-container>
		<b-container fluid>
			<b-row>
				<b-col class="col-md-12 col-sm-12 col-xs-12">
					<div class="container-box">
						<b-row class="mt-4">
							<b-col lg="6" class="text-left">
								<span class="mr-2">Show</span>
								<b-form-select v-model="perPage" id="perPageSelect" :options="pageOptions" size="sm" class="w-25">
								</b-form-select>
								<span class="ml-2">entries</span>
							</b-col>
							<b-col lg="4" offset-md="2">
							</b-col>
						</b-row>
						<b-row class="pt-3">
							<b-col lg="12">
								<b-table show-empty sticky-header small striped outlined id="my-table" stacked="md" :items="records" :fields="fields" :current-page="currentPage" :per-page="perPage" :filter="filter" :filterIncludedFields="filterOn" :sort-by.sync="sortBy" :sort-desc.sync="sortDesc" :sort-direction="sortDirection" @filtered="onFiltered">
									
									<!-- <template v-slot:cell(sr_no)="row">
										<span> {{ row.index+1 }}</span>
										
									</template> -->
									
									<template v-slot:cell(status)="row">
										<b-badge pill variant="danger" v-if="row.value == 0">PROCESSING</b-badge>
										<b-badge pill variant="success" v-else>COMPLETE</b-badge>
									</template>
									<template v-slot:cell(actions)="row">
										<b-button pill variant="primary" class="mr-1" :href="$root.httpurl+'exports/'+row.item.link" @click="download(row.item.id)" download><b-icon icon="arrow-down" scale="1.5"></b-icon>XLS</b-button>
										<b-button pill variant="primary" class="mr-1" :href="$root.httpurl+'exports/'+row.item.link.replace('.csv','.pdf')" @click="download(row.item.id)" target="blank" download><b-icon icon="arrow-down" scale="1.5"></b-icon>PDF</b-button>
									</template>
								</b-table>
							</b-col>
						</b-row>
						<b-row class="px-3">
							<b-col lg="6">
								<span class="mr-2 text-left">Showing {{currentPage}} to {{(perPage>records.length)?records.length:perPage}} of {{records.length}} entries</span>
							</b-col>
							<b-col lg="3" offset-md="3">
								<b-pagination v-model="currentPage" pills :total-rows="totalRows" :per-page="perPage" align="right" size="sm" prev-text="Prev" next-text="Next" first-number last-number></b-pagination>
							</b-col>
						</b-row>
					</div>
				</b-col>
			</b-row>

			
			<b-modal id="my-model" :title="modelTitle" ok-only @hidden="resetSelectedItem" @ok="modalSubmit">
				<form ref="form" @submit.stop.prevent="handleSubmit">
					<b-form-group label="State" label-cols="3" label-size="sm" label-align-sm="right" v-if="$route.params.reporttype=='overload' || $route.params.reporttype=='ulb' || $route.params.reporttype=='analysis'">
						<b-form-select v-model="selectedItem.state" @change="selectedItem.district=0; selectedItem.ulb=0" >
							<b-form-select-option value="0">--- Select State ---</b-form-select-option>
							<b-form-select-option v-for="item in $root.state_options" v-bind:key="item.id" :value="item.value">{{item.text}}</b-form-select-option>
						</b-form-select>
					</b-form-group>
                    <b-form-group label="District" label-cols="3" label-size="sm" label-align-sm="right" v-if="$route.params.reporttype=='overload' || $route.params.reporttype=='ulb' || $route.params.reporttype=='analysis'">
						<b-form-select v-model="selectedItem.district" @change="selectedItem.ulb=0">
							<b-form-select-option value="0">--- Select District ---</b-form-select-option>
							<b-form-select-option v-for="item in filterZone(zones)" v-bind:key="item.id" :value="item.id">{{item.title}}</b-form-select-option>
						</b-form-select>
					</b-form-group>
					<b-form-group label="ULB" label-cols="3" label-size="sm" label-align-sm="right" v-if="$route.params.reporttype=='overload' || $route.params.reporttype=='ulb' || $route.params.reporttype=='analysis'">
						<b-form-select v-model="selectedItem.ulb" :disabled="selectedItem.id > 0">
							<b-form-select-option value="0">--- Select ULB ---</b-form-select-option>
							<b-form-select-option v-for="item in filterULB(zones)" v-bind:key="item.id" :value="item.id" >{{item.title}}</b-form-select-option>
						</b-form-select>
					</b-form-group>
                    <b-form-group label="Start Date" label-cols="3" label-size="sm" label-align-sm="right">
						<b-form-datepicker v-model="selectedItem.start_date" show-decade-nav="false" :date-format-options="{ year: 'numeric', month: 'short', day: '2-digit', weekday: 'short' }" :hide-header="true"></b-form-datepicker>
					</b-form-group>
					<b-form-group label="End Date" label-cols="3" label-size="sm" label-align-sm="right">
						<b-form-datepicker v-model="selectedItem.end_date" show-decade-nav="false" :date-format-options="{ year: 'numeric', month: 'short', day: '2-digit', weekday: 'short' }" :hide-header="true"></b-form-datepicker>
					</b-form-group>
				</form>
				<template v-slot:modal-footer="{ ok, close }">
					<b-button size="sm" variant="danger" @click="close()">Cancel</b-button>
					<b-button size="sm" variant="success" @click="ok()"><span class="spinner-border spinner-border-sm" v-if="loading_status" role="status" aria-hidden="true"></span>&nbsp;{{(selectedItem.id > 0)?'Update':'Submit'}}</b-button>
				</template>
			</b-modal>
		
		</b-container>
		<transition name="fade">
			<b-row v-if="loading" class="loading" style="position: absolute; top:0px; left:0px; right:0px; bottom:0px; z-index: 1000; background-color: rgba(0,0,0,0.4);" align-v="center" align-h="center">
				<b-spinner label="Busy" variant="light"></b-spinner>
			</b-row>
		</transition>
	</div>
	
</template>
<script>
//import Header from "@/components/Header.vue";
export default {
	middleware: ['check-auth','auth'],
	layout: 'admin',
	name: 'LeavelReport',
	components: {
		//"top-header": Header
	},
	mounted(){
		var self = this;
		Object.assign(self.selectedItem, self.emptyItem);
		this.initload();
	},
	data() {
		return{
			loading: false, 
            modelTitle: '',
            loading_status: false,
			password: '',
            initUrl:  process.env.apiUrl+'level-list',
			recordsUrl: process.env.apiUrl+'device-records',
			devices: [],
            imeino: '',
			datefrom: this.$moment().format('YYYY-MM-DD'),
			dateto: this.$moment().format('YYYY-MM-DD'),
			records: [],
			zones: [],
			fields: [
				{ key: 'sr_no', label: 'S.No.', class:'text-center last-cal', 'extra': 1 },
				/* { key: 'trans_id', label: 'ID', class:"text-left"}, 
				{ key: 'sl_voltage', label: 'SL Voltage', class:"text-left" },*/
                { key: 'level_mtr', label: 'Water Level (mtr)', class:"text-left" },
				{ key: 'level_per', label: 'Water Level (%)', class:"text-left" },
                { key: 'insert_time', label: 'Timestamp', class:"text-right" ,
                    formatter: (value, key, item) => {
						if(item.insert_time == ""){
							return '00-00-0000 00:00:00';
						}
						return this.$moment(item.insert_time).format('DD-MM-YYYY HH:mm:ss');
					}
                }
			],
			totalRows: 1,
			currentPage: 1,
			pageOptions: [10, 20, 50, 100],
			perPage: 10,
			sortBy: '',
			sortDesc: false,
			sortDirection: 'asc',
			filter: null,
			filterOn: [],
			selectedItem: { 
				state: '', //self.$store.getters.getUserinfo.permissions.state_perm,
				district: '',
				ulb: ''
			},
			emptyItem: {
				id: 0,
				type: '',
				state: '',
				district: '',
				date: ''
			}
		};
	},
	methods: {
        initload(){
            var self = this;
            self.$axios.post(self.initUrl, {
                accesskey: self.$store.getters.getUserinfo.access_key,
				group_id: this.$store.getters.getUserinfo.group_id,
			})
			.then(function (response) {
				if(response.data.error == 0 || response.data.error == '0'){
					self.devices = response.data.result.devices;
					
                  /*   self.$bvToast.toast(response.data.message, {
						title: 'Record Status',
						toaster: 'b-toaster-bottom-right',
						autoHideDelay: 5000,
						variant: 'warning',
						solid: true,
						appendToast: true
					}); */
				}else if(response.data.error == 2 || response.data.error == '2'){
					self.$router.push('/');
				}else{
					self.$bvToast.toast(response.data.message, {
						title: 'Record Status',
						toaster: 'b-toaster-bottom-right',
						autoHideDelay: 5000,
						variant: 'warning',
						solid: true,
						appendToast: true
					});

				}
			})
			.catch(function (error) {
				alert(error);
			});
        },
		loadRecords(){
			var self = this;
			if(self.imeino == ""){
				self.$bvToast.toast('Please Select Device!', {
						title: 'Device List Status',
						toaster: 'b-toaster-bottom-right',
						autoHideDelay: 5000,
						variant: 'danger',
						solid: true,
						appendToast: true
					});
				return;
			}
			self.loading=true; 

			self.$axios.post(self.recordsUrl, {
                accesskey: self.$store.getters.getUserinfo.access_key,
                imeino: self.imeino,
				datefrom: self.datefrom,
				dateto: self.dateto
			})
			.then(function (response) {
				if(response.data.error == 0 || response.data.error == '0'){
					var rows = response.data.result.records;
					self.livedata = response.data.result.livedata;
					self.loading = false;
                    

					var height = JSON.parse(self.livedata.tank_height).overflow;
					var sensor_height = self.livedata.sensor_height;
					
					var min = self.livedata.level_min;
					var max = min + parseInt((self.livedata.level_max - self.livedata.level_min) * height / sensor_height);
					
					var unit = (max-min)/height;
					
					rows.forEach(function(item,index){
						var level_mtr = 0;
					//	var level_mtr_per = 0;
						
						level_mtr 		= (item.analoginput*1.4)/100;
						item.level_mtr 	= level_mtr.toFixed(2);
						item.level_per =(item.analoginput).toFixed(2);
						//item.level_per = cal.toFixed(1);

						item.sr_no = index + 1;

						


                    });

					self.records = rows;
					self.totalRows = self.records.length;
                    
                    self.$bvToast.toast(response.data.message, {
						title: 'Record Status',
						toaster: 'b-toaster-bottom-right',
						autoHideDelay: 5000,
						variant: 'warning',
						solid: true,
						appendToast: true
					});
					
				}else if(response.data.error == 2 || response.data.error == '2'){
					self.$router.push('/');
				}else{
					self.$bvToast.toast(response.data.message, {
						title: 'Record Status',
						toaster: 'b-toaster-bottom-right',
						autoHideDelay: 5000,
						variant: 'warning',
						solid: true,
						appendToast: true
					});

				}
			})
			.catch(function (error) {
				alert(error);
			});
		},
		

		resetSelectedItem(){
			var self = this;
			self.selectedItem = Object.assign({}, self.emptyItem);
		},
		
		onFiltered(filteredItems) {
			this.totalRows = filteredItems.length
			this.currentPage = 1
		},
		
		downloadcsv(){
			var self = this;
			var header = new Array()
			self.fields.forEach(function(item){
				//if(!item.extra){
					header.push(item.label);
				//}
			});
			
			//var d = table.rows().data();
			var finalarr = new Array();
			finalarr.push(header);
			self.records.forEach(function(row){
				var dataarr = new Array();
				self.fields.forEach(function(field){
					//if(field.key != 'extra'){
						dataarr.push(row[field.key]);
					//}
				});
				finalarr.push(dataarr);
			});
			
			let csvContent = "data:text/csv;charset=utf-8," 
			+ finalarr.map(e => e.join(",")).join("\n");

			var encodedUri = encodeURI(csvContent);
			var link = document.createElement("a");
			link.setAttribute("href", encodedUri);
			link.setAttribute("download", "device_report.csv");
			document.body.appendChild(link); // Required for FF

			link.click();
		}
	}
}
</script>
<style>
html{
	min-height: 100%;
}
body{
	background-color: '#FFF' !important;
	background-image: none !important;
}
.table{
	font-size: small;
}
.table .btn{
	font-size: 12px;
}
.table td, .table th{
	vertical-align: middle;
}


.fade-enter-active, .fade-leave-active {
  transition: opacity .5s;
}
.fade-enter, .fade-leave-to{
  opacity: 0;
}
</style>