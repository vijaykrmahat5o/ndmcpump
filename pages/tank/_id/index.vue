<template>
    <div class="flex-grow-1" style="margin-top:75px;min-height: 100vh;">
     <!--  <top-header></top-header> -->
      <!--<h1 class="mt-2 text-center">Smart City</h1>-->
  
      <b-container fluid>
        <b-row class="mt-1 mb-1">
          <b-col class="text-left">
            <b-breadcrumb class="mb-0">
			<b-breadcrumb-item :to="'/'+$store.getters.getUserinfo.dashboard ">
				<font-awesome-icon :icon="['fas', 'home']" class="icon"/>
				Home
			</b-breadcrumb-item>
			<!--<b-breadcrumb-item :to="'/zones/'+ward.zone_areacode">{{ward.zone_title}}</b-breadcrumb-item>-->
			<b-breadcrumb-item active> Tank Level Dashboard</b-breadcrumb-item>
		</b-breadcrumb>
            <!--<b-img src="../assets/phed.jpg" style="width:70px"></b-img>-->
          </b-col>
          <!--<b-col cols="8">
                      <h2 class="text-center text-uppercase"><b>{{$root.app_name}}</b></h2>
                      <h4 class="text-center text-uppercase" style="color:#000099">Mahaveer Chem</h4>
                  </b-col>-->
          <!-- <b-col class="text-right">
            <b-button variant="dark" pill class="mr-2" v-if="$root.chkperm('devices', 'add')" @click="showAddModal()"
              >Add Location</b-button
            >
          </b-col> -->
        </b-row>
      </b-container>
  
      <!--v-if="$session.get('user_info').role==1"-->
      <b-container fluid ></b-container>
      <b-container>
        <b-row class="">
          <b-col md="4">
           <!--  <doughnut-chart ref="livechart" id="pieid" height="250px" /> -->
          </b-col>
  
          <b-col class="text-right" fluid >
            <b-button
              variant="dark"
              pill
              class="btn-shadow-g mr-2"
              
              @click="showAddModal()"
              >Add Level</b-button
            >
          </b-col>
          <!-- <b-col>
            <b-card img-alt="Card image" img-left border-variant="primary" class="info-box mb-3">
              <h6>Total Locations</h6>
              <b-card-text>
                {{ devices.length }}
              </b-card-text>
            </b-card>
          </b-col> -->
          <!-- <b-col>
            <b-card img-alt="Card image" img-left border-variant="success" class="info-box mb-3">
              <h6>Connected</h6>
              <b-card-text> {{ connected_devices }} <small>Nos</small> </b-card-text>
            </b-card>
          </b-col>
          <b-col>
            <b-card img-alt="Card image" img-left border-variant="danger" class="info-box mb-3">
              <h6>Disconnected</h6>
              <b-card-text> {{ devices.length - connected_devices }} <small>Nos</small> </b-card-text>
            </b-card>
          </b-col>
          <b-col>
            <b-card img-alt="Card image" img-left border-variant="warning" class="info-box mb-3">
              <h6>Power Cuts</h6>
              <b-card-text>
                {{ poweroff_devices }}
              </b-card-text>
            </b-card>
          </b-col> -->
        </b-row>
      </b-container>
  
      <!-- <doughnut-chart></doughnut-chart> -->
      <!-- <b-container fluid>
        <b-row class="my-3">
          <b-col md="3">
            <pie-chart ref="livechart" id="pieid" />
          </b-col>
        </b-row>
      </b-container> -->
      <!-- <doughnut-chart></doughnut-chart> -->
      <b-container fluid>
        <b-row>
          <b-col class="col-md-12 col-sm-12 col-xs-12">
            <div class="container-box">
              <b-row class="mt-4">
                <b-col class="text-left">
                  <span class="mr-2">Show</span>
                  <b-form-select v-model="perPage" id="perPageSelect" :options="pageOptions" size="sm" class="w-25">
                  </b-form-select>
                  <span class="ml-2">entries</span>
                </b-col>
                <b-col>
                  <span class="mr-2">Network Filter</span>
                  <b-form-select
                    v-model="networkfilter"
                    :options="networkOptions"
                    size="sm"
                    class="w-25"
                    @change="onFilterDevices()"
                  >
                  </b-form-select>
                </b-col>
                <b-col>
                  <b-form-group
                    label="Filter"
                    label-cols-sm="3"
                    label-align-sm="right"
                    label-size="sm"
                    label-for="filterInput"
                    class="mb-0"
                  >
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
              <b-row class="pt-3">
                <b-col lg="12">
                  <b-table
                    show-empty
                    sticky-header
                    small
                    striped
                    outlined
                    id="my-table"
                    stacked="md"
                    :items="filteredrecords"
                    :fields="fields"
                    :current-page="currentPage"
                    :per-page="perPage"
                    :filter="filter"
                    :filterIncludedFields="filterOn"
                    :sort-by.sync="sortBy"
                    :sort-desc.sync="sortDesc"
                    :sort-direction="sortDirection"
                    @filtered="onFiltered"
                  >
                    <template v-slot:cell(ulb_title)="row">
                      <b-link :href="'/devices/' + row.item.ulb_areacode">{{ row.value }}</b-link>
                    </template>
                    <template v-slot:cell(analoginput)="row">
                      <b-badge pill variant="success" class="font-xs " v-if="row.value > 50">{{ row.value }}</b-badge>
                      <b-badge pill variant="warning" class="font-xs " v-else-if="row.value > 30">{{
                        row.value
                      }}</b-badge>
                      <b-badge pill variant="danger" class="font-xs " v-else>{{ row.value }}</b-badge>
                    </template>
                    <template v-slot:cell(location)="row">
                     
                      <b-link :href="'/tank/details/' + row.item.imei_no" class="font-bold">{{ row.value }}</b-link>
                    </template>
                    <template v-slot:cell(tank_height)="row">
                      <span v-html="row.value"></span>
                    </template>
                    <template v-slot:cell(levelinput)="row">
                      <span v-html="row.value" class="font-sm"></span>
                    </template>
                    <template v-slot:cell(connection_status)="row">
                      <b-badge pill variant="danger" class="font-xs" v-if="row.value == 0">DISCONNECTED</b-badge>
                      <b-badge pill variant="success" class="font-xs" v-else>CONNECTED</b-badge>
                    </template>
                    <template v-slot:cell(actions)="row">
                      <!--v-if="$root.chkperm('location','edit')"-->
                      <b-button
                        pill
                        variant="info"
                        class="btn-shadow-only mr-1"
                        @click="updateLocation(row.item, row.index, $event.target)"
                       
                        size="sm"
                        >
                        <i class="fas fa-pencil" aria-hidden="true"></i>
                        <i class="fas pencil-alt" aria-hidden="true"></i>
                        <i class="fa-solid fa-pencil"></i>
                      <font-awesome-icon :icon="['fas', 'pencil-alt']" size="1x" class="icon"/>
                    </b-button>
                      <b-button
                        pill
                        variant="danger"
                        class="btn-shadow-only mr-1"
                        @click="deleteLocation(row.item)"                       
                        size="sm"
                        >
                        <font-awesome-icon :icon="['fas', 'trash']" size="1x" class="icon"/>
                    </b-button>
                   <!--  <b-button
                        pill
                        variant="danger"
                        class="btn-shadow-only mr-1"
                        @click="showmappingModal(row.item)"                       
                        size="sm"
                        >
                        <span>⇆</span>
                        
                      
                       
                        
                    </b-button> -->
                    
                    </template>
                  </b-table>
                </b-col>
              </b-row>
              <b-row>
                <b-col class="text-left">
                  <span class="mr-2"
                    >Showing {{ currentPage }} to {{ perPage > filteredrecords.length ? filteredrecords.length : perPage }} of
                    {{ filteredrecords.length }} entries</span
                  >
                </b-col>
                <b-col>
                  <b-pagination
                    v-model="currentPage"
                    pills
                    :total-rows="totalRows"
                    :per-page="perPage"
                    align="right"
                    size="sm"
                    prev-text="Prev"
                    next-text="Next"
                    first-number
                    last-number
                  ></b-pagination>
                </b-col>
              </b-row>
            </div>
          </b-col>
        </b-row>
            
      
      </b-container>
      <!-- ***************** ADD TANK/Lavel Sensor Model*****************-->
      <b-modal
        id="edit-model"
        :title="selectedItem.id > 0 ? 'Edit Location' : 'Add Location'"
        size="xl"
        ok-only
        @hidden="resetSelectedItem"
        @ok="modalSubmit"
      >
        <b-container fluid>
          <b-row class="mb-1">
            <b-col>
              <b-alert show variant="secondary" class="header-title">Device Information</b-alert>
              <b-form-group
                label="Imei"
                label-for="imei-input"
                label-cols="4"
                label-size="sm"
                label-align-sm="right"
                invalid-feedback="Imei is required"
              >
                <b-form-input id="imei-input" v-model="selectedItem.imei_no" required></b-form-input
                ><!-- :disabled="selectedItem.id > 0"-->
              </b-form-group>
              <b-form-group
                label="Unique ID"
                label-for="uniq_no-input"
                label-cols="4"
                label-size="sm"
                label-align-sm="right"
                invalid-feedback="Unique ID is required"
              >
                <b-form-input
                  id="uniq_no-input"
                  v-model="selectedItem.uniq_no"
                  :disabled="selectedItem.id > 0"
                  required
                ></b-form-input>
              </b-form-group>
              <b-form-group label="Type" label-for="title" label-cols="4" label-size="sm" label-align-sm="right">
                <b-form-select v-model="selectedItem.location_type">
                  <b-form-select-option value="ESR">ESR</b-form-select-option>
                  <b-form-select-option value="GSR">GSR</b-form-select-option>
                </b-form-select>
              </b-form-group>
              <b-form-group
                label="Mobile No"
                label-for="ccms-input"
                label-cols="4"
                label-size="sm"
                label-align-sm="right"
              >
                <b-form-input id="mobile-input" v-model="selectedItem.mobile_no" required></b-form-input>
              </b-form-group>
              <b-form-group
                label="Device ID"
                label-cols="4"
                label-size="sm"
                label-align-sm="right"
                invalid-feedback="Device no is required"
              >
                <b-form-input id="imei-input" v-model="selectedItem.device_no" required></b-form-input>
              </b-form-group>
              <b-form-group label="Location" label-for="ward-input" label-cols="4" label-size="sm" label-align-sm="right">
                <b-form-input id="location-input" v-model="selectedItem.location" required></b-form-input>
              </b-form-group>
            </b-col>
            <b-col>
              <b-alert show variant="secondary" class="header-title">Map Information</b-alert>
              <b-form-group label="Latitude" label-for="load-input" label-cols="4" label-size="sm" label-align-sm="right">
                <b-form-input v-model="selectedItem.latitude" required></b-form-input>
              </b-form-group>
              <b-form-group
                label="Longitude"
                label-for="ward-input"
                label-cols="4"
                label-size="sm"
                label-align-sm="right"
              >
                <b-form-input v-model="selectedItem.longitude" required></b-form-input>
              </b-form-group>
  
              <b-alert show variant="secondary" class="header-title">Tank Information</b-alert>
              <b-row class="mb-3">
                <b-col>
                  <label>Top to bottom</label>
                  <b-form-input v-model="selectedItem.tank_height.top_to_bottom"></b-form-input>
                </b-col>
                <b-col>
                  <label>Door to bottom </label>
                  <b-form-input v-model="selectedItem.tank_height.door_to_bottom"></b-form-input>
                </b-col>
                <b-col>
                  <label>Overflow</label>
                  <b-form-input v-model="selectedItem.tank_height.overflow"></b-form-input>
                </b-col>
              </b-row>
  
              <b-alert show variant="secondary" class="header-title">Sensor</b-alert>
              <b-row class="mb-3">
                <b-col>
                  <label>Sensor Height</label>
                  <b-form-input v-model="selectedItem.sensor_height"></b-form-input>
                </b-col>
                <b-col>
                  <label>Level Min </label>
                  <b-form-input v-model="selectedItem.level_min"></b-form-input>
                </b-col>
                <b-col>
                  <label>Level Max</label>
                  <b-form-input v-model="selectedItem.level_max"></b-form-input>
                </b-col>
              </b-row>
  
              <b-alert show variant="secondary" class="header-title">Pump</b-alert>
              <b-row class="mb-3">
                <b-col>
                  <label>Pump ON Level</label>
                  <b-form-input v-model="selectedItem.pump_on_level"></b-form-input>
                </b-col>
                <b-col>
                  <label>Pump OFF Level</label>
                  <b-form-input v-model="selectedItem.pump_off_level"></b-form-input>
                </b-col>
                <b-col> </b-col>
              </b-row>
  
              <!--<b-form-group label="Sensor Height" label-for="load-input" label-cols="4" label-size="sm" label-align-sm="right">
                              <b-form-input v-model="selectedItem.sensor_height" required></b-form-input>
                          </b-form-group>-->
            </b-col>
          </b-row>
        </b-container>
        <form ref="form" @submit.stop.prevent="handleSubmit"></form>
        <template v-slot:modal-footer="{ ok, close }">
          <b-button size="sm" variant="danger" @click="close()">Cancel</b-button>
          <b-button size="sm" variant="success" @click="ok()">{{ selectedItem.id > 0 ? "Update" : "Submit" }}</b-button>
        </template>
      </b-modal>

      <!-- *****************  Mapping Tank with Pump *****************-->
      <b-modal
        id="mapmodule-model"
        title="Mapping Pump"
        size="xl"
        ok-only
        @hidden="resetpumpmapingSelectedItem"
        @ok="modalpumpmapingSubmit"
      >
        <b-container fluid>
          <b-row class="mb-1">
            <b-col>
              <b-alert show variant="secondary" class="header-title">Tank Information</b-alert>
              <ul class="list-group">
                <li class="list-group-item d-flex justify-content-between align-items-center p-2">Imei No:   
                  <span>{{mappingItem.imei_no}}</span></li>

                <li class="list-group-item d-flex justify-content-between align-items-center p-2">Mobile:   
                  <span>{{mappingItem.mobile_no}}</span></li>
                <li class="list-group-item d-flex justify-content-between align-items-center p-2">Location:   
                  <span>{{mappingItem.location}}</span></li>
                <li class="list-group-item d-flex justify-content-between align-items-center p-2">TimeStamp:   
                  <span>{{mappingItem.update_time}}</span></li>                
              </ul>
            </b-col>
            <b-col>
              <b-alert show variant="secondary" class="header-title">Mapped Pump</b-alert>
              <ul class="list-group">

                <li class="list-group-item d-flex justify-content-between align-items-center p-2" v-for="(mpl,index) in pump_mapped_list" :key="index">{{mpl.location}}   
                  <span><b-button
                        pill
                        variant="danger"
                        class="btn-shadow-only mr-1"
                        @click="unmappump(mpl.imei_no)"                       
                        size="sm"
                        >
                        <font-awesome-icon :icon="['fas', 'trash']" size="1x" class="icon"/>
                    </b-button></span></li>

                         
              </ul>
            </b-col>
            <b-col>
              <b-alert show variant="secondary" class="header-title">Unmapped Pump List </b-alert>             
              <b-row class="mb-3">
                <b-col class="scrolllist">                 
                  <b-form-group v-slot="{ ariaDescribedby }" >
                    <b-form-checkbox-group
                      id="checkbox-group-1"
                      v-model="mappingItem.pumps"
                      :options="pumplist"
                      :aria-describedby="ariaDescribedby"
                      name="unmappumpliat"
                      stacked
                    ></b-form-checkbox-group>
                  </b-form-group>
                </b-col>
              </b-row>
            </b-col>
          </b-row>
        </b-container>
        <form ref="form" @submit.stop.prevent="handleSubmit"></form>
        <template v-slot:modal-footer="{ ok, close }">
          <b-button size="sm" variant="danger" @click="close()">Cancel</b-button>
          <b-button size="sm" variant="success" @click="ok()">{{ selectedItem.id > 0 ? "Update" : "Submit" }}</b-button>
        </template>
      </b-modal>

    </div>
  </template>
  <script scope>
  import Header from "@/components/Header.vue";
  //import { Doughnut } from "vue-chartjs";
  
  export default {
    layout: 'admin',
    middleware: ['check-auth','auth'], 
    name:'tankList',   
     mounted() {
      this.initload();
      this.$refs.pieid;
    },
    data() {
      var self = this;
      return {
        email: "",
        last_sync_time: "",
        url: process.env.apiUrl + "dashboard",
        insertUrl: process.env.apiUrl + "add-location",
        updateUrl: process.env.apiUrl + "update-location",
        deleteUrl: process.env.apiUrl + "delete-location",
        mapingUrl: process.env.apiUrl + "pumpmaping",
        tankpumplistUrl: process.env.apiUrl + "tank_pump_list",
        unmappumpUrl: process.env.apiUrl + "tank_unmappump",       
        chartData: {
          labels: ["Babol", "Cabanatuan"],
          datasets: [
            {
              borderWidth: 1,
              borderColor: ["rgba(255,99,132,1)", "rgba(54, 162, 235, 1)"],
              backgroundColor: ["rgba(255, 99, 132, 0.2)", "rgba(54, 162, 235, 0.2)", "rgba(255, 206, 86, 0.2)"],
              data: [1000, 500],
            },
          ],
        },
        options: {
          legend: {
            display: true,
          },
          responsive: true,
          maintainAspectRatio: false,
        },
  
        networkfilter: -1,
        devices: [],
        pumplist:[],
        pump_mapped_list:[],
        total_esr: 0,
        total_gsr: 0,
        connected_esr: 0,
        connected_gsr: 0,
        total_device: 0,
        total_device_on: 0,
        total_device_loss: 0,
        connected_devices: 0,
        total_controller: 0,
        total_controller_on: 0,
        total_controller_off: 0,
        total_controller_loss: 0,
        poweroff_devices: 0,
        dashboard_data: {},
        filteredrecords: [],
        total_load: 0,
        current_load: 0,
        selected_region: { state: self.$route.params.stateid },
        networkOptions: [
          { text: "All", value: -1 },
          { text: "Connected", value: 1 },
          { text: "Disconnected", value: 0 },
        ],
        zones: [],
        wps_piedata_in: {
          labels: [],
          datasets: [],
        },
        wps_piedata_out: {
          labels: [],
          datasets: [],
        },
        wps_pieoptions: {
          responsive: true,
          maintainAspectRatio: false,
          legend: {
            position: "bottom",
          },
        },
        records: [],
        fields: [
          /* { key: "id", label: "ID.", class: "text-left" }, */
          {key:"sr_no" , label: "S.No.", class: "text-left"},
          /* { key: "uniq_no", label: "Uniq No.", sortable: true, sortDirection: "desc", class: "text-center" }, */
          { key: "imei_no", label: "Imei No.", sortable: true, class: "text-left" },
          { key: "mobile_no", label: "Mobile", class: "text-left" },
          { key: "location", label: "Location", class: "text-left" },
         /*  { key: "sl_voltage", label: "SL Voltage", class: "text-center" }, */
          {
            key: "tank_height",
            label: "Tank Height (mtr)",
            class: "text-center tankheight",
            formatter: (value) => {
              return JSON.parse(value).top_to_bottom;
              //return '<ul><li>Top to Bottom: <div style="float:right;width:30px;">'+JSON.parse(value).top_to_bottom+'</div></li><li>Door to Bottom: <div style="float:right;width:30px;">'+JSON.parse(value).door_to_bottom+'</div></li><li>Overflow: <div style="float:right;width:30px;">'+JSON.parse(value).overflow+'</div></li></ul>';
            },
          },
          {
            key: "levelinput",
            label: "Level (mtr)",
            class: "text-center",
            formatter: (value, key, item) => {
              var height = JSON.parse(item.tank_height).overflow;
              var sensor_height = item.sensor_height;
              var level = 0;
              //var diff = 0;
              var min = item.level_min;
              var max = item.level_min + parseInt(((item.level_max - item.level_min) * height) / sensor_height);
  
              var unit = (max - min) / height;
  
              if (item.analoginput <= min) {
                level = 0;
              }
              if (item.analoginput >= max) {
                level = Number(height);
              }
              if (item.analoginput > min && item.analoginput < max) {
                level = (item.analoginput - min) / unit; // current level in meter
              }
              if (item.analoginput == null) {
                level = 0;
              }
              if(this.$store.getters.getUserinfo.group_id==2){ 
                level= (JSON.parse(item.tank_height).top_to_bottom-level);
              } // for NDMC CONDITION.
              level= (item.analoginput*1.4)/100;

              return level.toFixed(1);
            },
          },
          {
            key: "analoginput",
            label: "Level (%)",
            class: "text-center",
            formatter: (value, key, item) => {
              //return (parseInt(value/100)*10)+'.'+((value/100) - parseInt(value/100));
              /* var height = JSON.parse(item.tank_height).overflow;
              var sensor_height = item.sensor_height;
              var level = 0;
              var diff = 0;
              var min = item.level_min;
              var max = item.level_min + parseInt(((item.level_max - item.level_min) * height) / sensor_height);
  
              var unit = (max - min) / height;
  
              if (value <= min) {
                level = 0;
              }
              if (value >= max) {
                level = Number(height);
              }
              if (value > min && value < max) {
                level = (value - min) / unit; // current level in meter
              }
  
              diff = max - min;
  
              var cal = (level / height) * 100;
  
              if (diff === 0) {
                cal = 0;
              }
              if(this.$store.getters.getUserinfo.group_id==2){ 
                cal= (100-cal);
              }  */ // for NDMC CONDITION.
              var cal = '';
              cal= value;
              //console.log(item.imei_no+' '+min+' '+max+' '+unit+' '+value+' '+level+' '+diff+' '+cal);
              return cal.toFixed(1); //Number(parseInt(value/100) * 10) + Number(((value/100) - parseInt(value/100)).toFixed(2));
            },
          },
          {
            key: "update_time",
            label: "TimeStamp",
            class: "text-center",
            formatter: (value, key, item) => {
              if (item.update_time == "") {
                return "00-00-0000 00:00:00";
              }
              return self.$moment(item.update_time).format("DD-MM-YYYY HH:mm:ss");
            },
          },
          {
            key: "connection_status",
            label: "Status",
            class: "text-center",
            sortable: true,
            formatter: (value) => {
              return value;
            },
          },
          { key: "actions", label: "Actions", extra: 1, class: "text-center" },
        ],
        totalRows: 1,
        currentPage: 1,
        pageOptions: [10, 20, 50, 100],
        perPage: 10,
        sortBy: "",
        sortDesc: false,
        sortDirection: "asc",
        filter: null,
        filterOn: [],
        selectedItem: {
          id: 0,
          tank_height: {
            top_to_bottom: 0,
            door_to_bottom: 0,
            overflow: 0,
          },
        },
        mappingItem: {
          id: 0,
          pumps:[],
          tank_height: {
            top_to_bottom: 0,
            door_to_bottom: 0,
            overflow: 0,
          },
        },
        emptymappingItem: {
          id: 0,
          pumps:[],
          tank_height: {
            top_to_bottom: 0,
            door_to_bottom: 0,
            overflow: 0,
          },
        },
        emptyItem: {
          id: 0,
          tank_height: {
            top_to_bottom: 0,
            door_to_bottom: 0,
            overflow: 0,
          },
        },
        center: { lat: 0, lng: 0 },
        markers: [],
        places: [],
        currentPlace: null,
        infoWindowPos: null,
        infoWindowOpen: false,
        currentMarkerIndex: null,
        zoneinfo: { zoom: 14 },
        infoOptions: {
          content: "",
          pixelOffset: {
            width: 0,
            height: -35,
          },
        },
      };
    },
    methods: {
      onFilterDevices() {
        this.filteredrecords = this.filterDevices(this.devices);
        this.totalRows = this.filteredrecords.length;
        this.currentPage = 1;
      },
      filterDevices(devices) {
        var self = this;
        return devices.filter(function(d) {
          var valid = false;
          if (self.networkfilter < 0) {
            valid = true;
          } else if (self.networkfilter == 0) {
            if (d.connection_status == 0) {
              valid = true;
            }
          } else if (self.networkfilter == 1) {
            if (d.connection_status == 1) {
              valid = true;
            }
          }
          if (valid) {
            return d;
          }
        });
      },
      resetSelectedItem() {
        var self = this;
        self.selectedItem = Object.assign({}, self.emptyItem);
      },
      resetpumpmapingSelectedItem() {
        var self = this;
        self.mappingItem = Object.assign({}, self.emptymappingItem);
      },
      toogleMarkerInfoWindow(marker, index) {
        this.infoWindowPos = marker.position;
        this.infoOptions.content = marker.infotext;
        if (this.currentMarkerIndex == index) {
          this.infoWindowOpen = !this.infoWindowOpen;
        } else {
          this.infoWindowOpen = true;
          this.currentMarkerIndex = index;
        }
      },
      addMarker(lat, lng, infotext, iconurl) {
        const marker = {
          lat: lat,
          lng: lng,
        };
        this.markers.push({
          position: marker,
          infotext: infotext,
          icon: {
            url: iconurl,
            size: { width: 35, height: 45, f: "px", b: "px" },
            scaledSize: { width: 35, height: 45, f: "px", b: "px" },
          },
        });
        //this.markers.push({ position: marker, infotext: infotext, icon: {url:iconurl} });
        //this.places.push(this.currentPlace);
        this.center = marker;
        this.currentPlace = null;
      },
      showAddModal() {
        this.selectedItem = Object.assign({}, this.emptyItem);
        this.$root.$emit("bv::show::modal", "edit-model");
      },      
      updateLocation(item, index, button) {
        this.selectedItem = Object.assign({}, item);
        this.selectedItem.tank_height = JSON.parse(item.tank_height);
  
        this.$root.$emit("bv::show::modal", "edit-model", button);
      },
        deleteLocation(item) {
            var self = this;
            this.$bvModal
          .msgBoxConfirm("Please confirm that you want to delete location.", {
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
            if (value == true) {
            self.$axios
            .post(self.deleteUrl, {
                  accesskey: self.$store.getters.getUserinfo.access_key,
                  deleteid: item.id,
                })
                .then(function(response) {
                  if (response.data.error == 0 || response.data.error == "0") {
                    self.$bvToast.toast(response.data.message, {
                      title: "Delete",
                      toaster: "b-toaster-bottom-right",
                      autoHideDelay: 5000,
                      variant: "warning",
                      solid: true,
                      appendToast: true,
                    });
                    self.initload();
                  }
                })
                .catch(function(error) {
                  alert(error);
                });
            } else {
              //alert('no '+item.id);
            }
          })
          .catch((err) => {
            // An error occurred
            console.log(err);
          });
        },
      modalSubmit(bvModalEvt) {
        var self = this;
        self.loading = true;
        bvModalEvt.preventDefault();
  
        var submitUrl = "";
        if (self.selectedItem.id == 0) {
          submitUrl = self.insertUrl;
        } else {
          submitUrl = self.updateUrl;
        }
  
        self.$axios.post(submitUrl, {
            accesskey: self.$store.getters.getUserinfo.access_key,
            data: self.selectedItem,
            //group_id: 1, //self.$store.getters.getUserinfo.group_id,
            group_id: self.$store.getters.getUserinfo.group_id,
          })
          .then(function(response) {
            if (response.data.error == 0 || response.data.error == "0") {
              self.$bvModal.hide("edit-model");
              self.$bvToast.toast(response.data.message, {
                title: "Status",
                toaster: "b-toaster-bottom-right",
                autoHideDelay: 5000,
                variant: "warning",
                solid: true,
                appendToast: true,
              });
              self.initload();
            }
          })
          .catch(function(error) {
            alert(error);
          });
      },
      modalpumpmapingSubmit(bvModalEvt) {
        var self = this;
        self.loading = true;
        bvModalEvt.preventDefault();
  
        var submitUrl = self.mapingUrl;
       
        if(self.mappingItem.pumps==undefined){
            self.$bvToast.toast('Please Select Atleast One Pump!', {
                title: "Status",
                toaster: "b-toaster-bottom-right",
                autoHideDelay: 5000,
                variant: "warning",
                solid: true,
                appendToast: true,
              });
          return false;
        }
  
        self.$axios.post(submitUrl, {
            accesskey: self.$store.getters.getUserinfo.access_key,
            data: self.mappingItem,
            //group_id: 1, //self.$store.getters.getUserinfo.group_id,
            group_id:self.$store.getters.getUserinfo.group_id
            
          })
          .then(function(response) {
            if (response.data.error == 0 || response.data.error == "0") {
              self.$bvModal.hide("mapmodule-model");
              self.$bvToast.toast(response.data.message, {
                title: "Status",
                toaster: "b-toaster-bottom-right",
                autoHideDelay: 5000,
                variant: "warning",
                solid: true,
                appendToast: true,
              });
              self.initload();
            }
          })
          .catch(function(error) {
            alert(error);
          });
      },
      unmappump(imei_no) {
            var self = this;
            this.$bvModal
          .msgBoxConfirm("Please confirm that you want to Unmap Pump.", {
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
            if (value == true) {
            self.$axios
            .post(self.unmappumpUrl, {
                  accesskey: self.$store.getters.getUserinfo.access_key,
                  pump_imei: imei_no,
                })
                .then(function(response) {
                  if (response.data.error == 0 || response.data.error == "0") {
                    self.$bvToast.toast(response.data.message, {
                      title: "Unmap Pump",
                      toaster: "b-toaster-bottom-right",
                      autoHideDelay: 5000,
                      variant: "warning",
                      solid: true,
                      appendToast: true,
                    });
                  
                   /* *** ReFill Pump Maped list after unmaped *** */
                   self.pump_mapped_list.forEach(function(item,index) {
                      if(item.imei_no==imei_no){
                        self.pump_mapped_list.pop(index);                        
                      }                    
                    }); 


                  }
                })
                .catch(function(error) {
                  alert(error);
                });
            } else {
              //alert('no '+item.id);
            }
          })
          .catch((err) => {
            // An error occurred
            console.log(err);
          });
        },
      initload() {
         //if(this.$session.get('user_info').role!=1){
          /*  if (!this.$root.chkperm("display", "id")) {
              delete this.fields[0];
            }
            if (!this.$root.chkperm("display", "imei")) {
              delete this.fields[2];
            }
            if (!this.$root.chkperm("display", "mobile")) {
              delete this.fields[3];
            }
            if (!this.$root.chkperm("display", "tank_height")) {
              delete this.fields[6];
            }
            if (!this.$root.chkperm("display", "connection_status")) {
              delete this.fields[10];
            } */
            var self = this;

            /* self.$axios.post(submitUrl, {
            accesskey: self.$store.getters.getUserinfo.access_key,
            data: self.selectedItem
          }) */
         // console.log('SessionID:::',self.$store.getters.getUserinfo.access_key);
        self.$axios
          .post(self.url, {
            accesskey: self.$store.getters.getUserinfo.access_key, //self.$session.get("access_key"),
            devicetype: "LEVELS",
            //group_id: 1 //self.$session.get("group_id"),
            group_id:self.$store.getters.getUserinfo.group_id
          })
          .then(function(response) {
            if (response.data.error == 0 || response.data.error == "0") {
              self.devices = response.data.result.devices;

              /* For All Unmaped Pump List */
              var pumplistData = response.data.result.pumplist;
              self.pumplist=[];
              pumplistData.forEach(items => {
              var ol= { text: items.location, value:items.imei_no };               
              self.pumplist.push(ol);
              }); 
            
              
  
              self.last_sync_time = self.$moment().format("DD-MM-YYYY HH:mm:ss");
  
              var min_lat = 100;
              var min_lng = 100;
              var max_lat = 0;
              var max_lng = 0;
  
              self.connected_devices = 0;
              self.total_gsr = 0;
              self.poweroff_devices = 0;
  
              self.markers = [];
  
              var curdatetime = self.$moment();
              var conn_status = 1;
              var dbdatetime = "";
              var duration = "";
              var minutes = "";
  
              for (var i = 0; i < self.devices.length; i++) {
                var d = self.devices[i];
  
                if (d.update_time != "") {
                  dbdatetime = self.$moment(d.update_time);
  
                  if (curdatetime > dbdatetime) {
                    duration = self.$moment.duration(curdatetime.diff(dbdatetime));
                  } else {
                    duration = self.$moment.duration(dbdatetime.diff(curdatetime));
                  }
                  minutes = duration.asMinutes();
                //  console.log('----disconnection_time----::'+self.$root.disconnection_time);
                  var disconnection_time = 30;
                  if (minutes < disconnection_time) {
                    conn_status = 1;
                  } else {
                    conn_status = 0;
                  }
                } else {
                  conn_status = 0;
                }
                d.connection_status = conn_status;
                self.connected_devices += conn_status;
  
                if (d.sl_voltage == "0" || d.sl_voltage == 0) {
                  self.poweroff_devices += 1;
                }
  
                if (d.latitude != "NaN" && d.latitude != "undefined" && d.latitude != "") {
                  if (d.location_type == "ESR") {
                    self.total_esr += 1;
                  }
                  if (d.location_type == "GSR") {
                    self.total_gsr += 1;
                  }
  
                  d.latitude = parseFloat(d.latitude);
                  d.longitude = parseFloat(d.longitude);
  
                  var value = d.analoginput;
                  var height = JSON.parse(d.tank_height).overflow;
                  var sensor_height = d.sensor_height;
                  var level = 0;
                  var diff = 0;
                  var min = d.level_min;
                  var max = d.level_min + parseInt(((d.level_max - d.level_min) * height) / sensor_height);
  
                  var unit = (max - min) / height;
  
                  if (value <= min) {
                    level = 0;
                  }
                  if (value >= max) {
                    level = Number(height);
                  }
                  if (value > min && value < max) {
                    level = (value - min) / unit; // current level in meter
                  }
  
                  diff = max - min;
  
                  var cal = (level / height) * 100;
  
                  if (diff === 0) {
                    cal = 0;
                  }
  
                  var msg =
                    "<b>Location</b> : " +
                    d.location +
                    "<br><b>Latitude :</b> " +
                    d.latitude +
                    "<br><b>Longitude :</b> " +
                    d.longitude +
                    "<br><b>Water Level :</b> " +
                    cal.toFixed(1) +
                    "<br><b>Last Updated Time :</b> " +
                    self.$moment(d.update_time).format("DD-MM-YYYY HH:mm:ss");
  
                  min_lat = Math.min(d.latitude, min_lat);
                  min_lng = Math.min(d.longitude, min_lng);
  
                  max_lat = Math.max(d.latitude, max_lat);
                  max_lng = Math.max(d.longitude, max_lng);
  
                  var blueurl = "https://www.fablurs.com/flag-blue.png";
                  var redurl = "https://www.fablurs.com/flag-red.png";
                  var greenurl = "https://www.fablurs.com/flag-green.png";
                  var iconurl = greenurl;
                  if (d.analoginput < 500) {
                    if (d.analoginput < 200) {
                      iconurl = redurl;
                    } else {
                      iconurl = blueurl;
                    }
                  }
                  self.addMarker(self.devices[i].latitude, self.devices[i].longitude, msg, iconurl);
                }
                d.sr_no = i + 1;
              }
              self.center = { lat: min_lat + (max_lat - min_lat) / 2, lng: min_lng + (max_lng - min_lng) / 2 };
  
              self.filteredrecords = self.filterDevices(self.devices);
              self.totalRows = self.filteredrecords.length;
              self.currentPage = 1;
  
              setTimeout(self.initload, 60*1000);
            } else {
              self.$root.forceLogout(response.data.message);
            }
  
            /*  var disconn = self.devices.length - self.connected_devices;
  
           self.$refs.livechart.renderChart(
              {
                labels: [
                  "Total Location : " + self.devices.length,
                  "Connected : " + self.connected_devices,
                  "Disconnected : " + disconn,
                  "Power Cuts : " + self.poweroff_devices,
                ],
                datasets: [
                  {
                    label: ["CCMS CONNECTED"],
                    borderColor: "#ffffff",
                    backgroundColor: ["#1cd9a0", "#2cd91c", "#d9351c", "#c9d91c"],
                    data: [self.devices.length, self.connected_devices, disconn, self.poweroff_devices],
                    fill: false,
                    lineTension: 1,
                  },
                ],
              },
              {
                responsive: true,
              }
            ); */
          })
          .catch(function(error) {
            console.log(error);
          });
        //alert('login '+self.email+" "+self.password);
      },
      onFiltered(filteredItems) {
        this.totalRows = filteredItems.length;
        this.currentPage = 1;
      },
      showmappingModal(item) {
        var self = this;
        self.mappingItem = Object.assign({}, item);
        self.pump_mapped_list=[];
       // this.mappingItem.tank_height = JSON.parse(item.tank_height);

        /* List Tank Pumps */
        self.$axios.post(self.tankpumplistUrl, {
            accesskey: self.$store.getters.getUserinfo.access_key,
            tank_imei_no: self.mappingItem.imei_no          
          })
          .then(function(response) {
            if (response.data.error == 0 || response.data.error == "0") {
              self.pump_mapped_list = response.data.result.mapped_pump_list;
             
            }
          })
          .catch(function(error) {
            alert(error);
          });
        this.$root.$emit("bv::show::modal", "mapmodule-model");
      },
    },
  };
  </script>
  <style>
  html {
    min-height: 100%;
  }
  body {
    background-color: "#FFF" !important;
    background-image: none !important;
  }
  .table {
    font-size: small;
  }
  .table .btn {
    font-size: 12px;
  }
  .table td,
  .table th {
    vertical-align: middle;
  }
  
  .mt-xl {
    margin-top: 100px;
  }
  .btn-black {
    background-color: #000;
    color: #fff;
    padding: 6px 25px;
  }
  .info-box2 {
    display: block;
    min-height: 90px;
    background-color: #fff;
    width: 100%;
    box-shadow: 0 1px 1px rgba(0, 0, 0, 0.1);
    border-radius: 2px;
    margin-bottom: 15px;
  }
  .scrolllist{
    overflow-y: scroll;
    height: 150px;
  }
  </style>
  