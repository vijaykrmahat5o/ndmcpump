<template>
  <div class="flex-grow-1 min-h-screen p-5" style="margin-top:50px" > 
    <b-row class="pb-3">
        <b-col cols="auto">
          
            <!-- <b-breadcrumb class="mb-0" v-if="$store.getters.getUserinfo.group_id==1">
                <b-breadcrumb-item to="/dashboard/">
                    <font-awesome-icon :icon="['fas', 'home']" class="icon"/>
                    Home 
                </b-breadcrumb-item>
                <b-breadcrumb-item :to="'/tank/farrukhabad'">Tank Level</b-breadcrumb-item>
                <b-breadcrumb-item active> Tank - Water Level Record: <b>{{ livedata.location }}</b></b-breadcrumb-item>
            </b-breadcrumb> -->
            <b-breadcrumb  class="mb-0" >
                <b-breadcrumb-item :to="'/'+$store.getters.getUserinfo.dashboard">
                    <font-awesome-icon :icon="['fas', 'home']" class="icon"/>
                    Home 
                </b-breadcrumb-item>
                <b-breadcrumb-item :to="'/'+$store.getters.getUserinfo.dashboard">Drainage Level</b-breadcrumb-item>
                <b-breadcrumb-item active> Drainage - Water Level Record: <b>{{ livedata.location }}</b></b-breadcrumb-item>
            </b-breadcrumb>
        </b-col>
        
    </b-row>  
    <b-container fluid class="fb-features">
      <!-- <b-row class="mt-3 mb-2">
        <b-col class="col-md-9 col-sm-9 col-xs-12 text-left">
          <h3>
            Water Level Record: <b>{{ livedata.location }}</b>
          </h3>
        </b-col>
        <b-col class="col-md-3 col-sm-3 col-xs-12 text-right">
          <b-button variant="dark" @click="downloadcsv()">Export</b-button>
        </b-col>
      </b-row> -->
        <b-row style="display: none;">
          <b-col class="col-sm-12">
            <h1 class="widget-title title-line text-center">Tank {{ livedata.location }}</h1>
              <div class="zoyly-fecsec">

                <!-- Left Side Panel -->
                <div class="zyfet-left">
                  <div class="timeline">
                    <!-- {{ pump_mapped_list_L }}  -->
                    <div  data-aos="fade-right" v-for="(pump,pindex) in pump_mapped_list_L" :key="pindex" :class="'timeline-item timeline-item-'+pump.supply+' aos-init aos-animate'">
                      <div class="timeline-content">
                        <div class="timeline-text">
                          <div class="timeltex-icon"><img src="/pump.png"></div>
                            <div class="timeltex-box">
                              <h4>{{pump.location}}</h4>
                              <b>IMEI NO:</b> {{pump.imei_no}} | <b>Power Supply: </b>{{pump.supply }} <br /> <b>Pump Status: </b> {{ pump.pump_status }} | <b>Pump Mode: </b>{{ pump.auto_manual}} 
                            </div>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>

                <!-- Center Side Panel -->
                <div class="zyfet-middle aos-init aos-animate" data-aos="zoom-in" data-aos-duration="900">
                  <img src="/high-water-tank.png" width="100%" height="65%">
                </div>

                <!-- Right Side Panel -->
                <div class="zyfet-right">

                  <div class="timeline">    
                    <div  data-aos="fade-left" v-for="(pump,pindex) in pump_mapped_list_R" :key="pindex" data-aos-duration="1300"  :class="'timeline-item timeline-item-'+pump.supply+' aos-init aos-animate'">
                      <div class="timeline-content">
                        <div class="timeline-text">
                          <div class="timeltex-box"><h4>{{pump.location}}</h4>
                            <b>IMEI NO:</b> {{pump.imei_no}} | <b>Power Supply: </b>{{pump.supply }} <br /> <b>Pump Status: </b> {{ pump.pump_status }} | <b>Pump Mode: </b>{{ pump.auto_manual}}  
                          </div>
                          <div class="timeltex-icon"><img src="/pump.png"></div>
                        </div>
                      </div>
                    </div>

                        <div class="no-tank aos-init aos-animate" data-aos="fade-left" data-aos-duration="1500" v-if="pump_mapped_list.length<=0">
                              <div class="timeline-content">
                              <div class="timeline-text">
                              <div class="timeltex-box text-center"> <h2><font-awesome-icon :icon="['fas', 'arrow-left']" class="icon"/> Please Add Pump</h2></div>                      
                              </div>
                              </div>
                        </div>

                          <!--       <div class="timeline-item aos-init aos-animate" data-aos="fade-left" data-aos-duration="1500">
                          <div class="timeline-content">
                          <div class="timeline-text">
                          <div class="timeltex-box"><h4>COUNSELLING</h4>Connect with largest networkof mental health professionals.</div>
                          <div class="timeltex-icon"><img src="/pump.png"></div>
                          </div>
                          </div>
                          </div>

                          <div class="timeline-item aos-init" data-aos="fade-left" data-aos-duration="1700">
                          <div class="timeline-content">
                          <div class="timeline-text">
                          <div class="timeltex-box"><h4>Q&amp;A Help</h4>Ask and answer tough questions and learn better.</div>
                          <div class="timeltex-icon"><img src="/pump.png"></div>
                          </div>
                          </div>
                          </div>

                          <div class="timeline-item aos-init" data-aos="fade-left" data-aos-duration="1900">
                          <div class="timeline-content">
                          <div class="timeline-text">
                          <div class="timeltex-box"><h4>SIBLINGS ENGAGEMENT</h4>See what your siblings are upto.</div>
                          <div class="timeltex-icon"><img src="/pump.png"></div>
                          </div>
                          </div>
                          </div>



                          <div class="timeline-item aos-init" data-aos="fade-left" data-aos-duration="2100">
                          <div class="timeline-content">
                          <div class="timeline-text">
                          <div class="timeltex-box"><h4>FAMILY EVENTS</h4>Pool-in funds to organize group events.</div>
                          <div class="timeltex-icon"><img src="/pump.png"></div>
                          </div>
                          </div>
                          </div> -->

                  </div>
                </div>
              </div>
          </b-col>
        </b-row>


    </b-container>
   <!--  <b-container fluid >
      <b-row class="mt-3 mb-2">
        <b-col class="col-md-9 col-sm-9 col-xs-12 text-left">
          <h3>
            Water Level Record: <b>{{ livedata.location }}</b>
          </h3>
        </b-col>
        <b-col class="col-md-3 col-sm-3 col-xs-12 text-right">
          <b-button variant="dark" @click="downloadcsv()">Export</b-button>-
        </b-col>
      </b-row>
    </b-container> -->
    <b-container fluid class="pl-5 pr-5 pt-4 bg-white">
      <b-row>
        
        <b-col>
         
          <div class=" zyfet-dranage aos-init aos-animate" data-aos="zoom-in" data-aos-duration="900">
        
            <img  src="/drainage-water-line.png" width="100%" height="350px">
          </div>

          

        </b-col>
        <b-col>
          <b-row>
            <!-- <b-col>
              <b-img src="/high-water-tank.png" class="table-shadow" center fluid></b-img> 
            </b-col> -->
            <b-col>
              
              <span >
                <p class="font-md font-bold mb-0">DRAINAGE LINE LEVEL (%)</p>
                <p style="font-size:50px" class="mt-0" >{{ (level_per).toFixed(2) }}%</p>
                <p class="font-md font-bold mb-0">DRAINAGE LINE LEVEL (mtr)</p>
                <p style="font-size:40px" > {{ level_mtr_ndmc }} </p>
              </span>
              
              
              <div class="table-shadow p-2 font-md" style="background-color:rgb(242 243 242)">
                <!-- For Farrukhabad-->
                
              <span> 
                  <b-row>
                    <b-col class="text-left font-bold pr-0">
                      Drainage Depth 
                    </b-col>
                    <b-col class="text-right pl-0">
                      <h4>
                      {{tank_height}}<small> (mtr)</small>
                      </h4>
                    </b-col>
                  </b-row>
                  <b-row>
                    <b-col class="text-left font-bold pr-0 mt-2">
                      Level High <p style="font-size: 10px;">(Level between 90% to 95%)</p>
                    </b-col>
                    <b-col class="text-right pl-0  mt-2">
                      <h4 v-if="(level_per).toFixed(2)>=90 && (level_per).toFixed(2)<95">
                        <img  src="/yellow.gif" width="35%" height="65%">
                      </h4>
                      <h4 v-else>----</h4>
                    </b-col>
                  </b-row>
                  <b-row>
                    <b-col class="text-left font-bold pr-0 mt-2">
                      Level High High <p style="font-size: 10px;"> (Level Above 95%)</p>
                    </b-col>
                    <b-col class="text-right pl-0  mt-2">
                      <h4 v-if="(level_per).toFixed(2)>=95 ">
                        <img  src="/red.gif" width="35%" height="65%">
                      </h4>
                      <h4 v-else>----</h4>
                    </b-col>
                  </b-row>
                </span>
                <b-row>
                  <b-col class="text-left font-bold pr-0">
                    Status
                  </b-col>
                  <b-col class="text-right pl-0">
                    <h4>
                     
                      <b-badge v-if="conn_status == 1" pill variant="success" class="font-xs">CONNECTED</b-badge>
                      <b-badge  v-else pill variant="danger" class="font-xs">DISCONNECTED</b-badge>
                   

                    </h4>
                  </b-col>
                </b-row>
              </div>
            </b-col>
          </b-row>
        </b-col>
        <b-col class="col-md-5 col-sm-12 col-xs-12">
          <b-row class="px-3">
            <b-col class="m-0 p-0"> 
              <b-card img-alt="Card image" img-left class="info-box mb-3">
              <!-- <GmapMap :center="{lat:center.lat, lng:center.lng}" :zoom="15" map-type-id="terrain" style="width: 100%; height: 370px">
                            <GmapCluster :gridSize="5" :position="center" :averageCenter="true">
                                <GmapMarker :position="{lat:center.lat, lng:center.lng}" :clickable="true" :icon=icon   @click="showInfoIndex=true">
                                  <GmapInfoWindow  @closeclick="showInfoIndex = null">
                                        <div>
                                          <h4>Demo</h4>
                                          <p>mark</p>
                                        </div>
                                      </GmapInfoWindow>

                                </GmapMarker>
                            </GmapCluster>
                        </GmapMap> -->
                        <GmapMap :center="{lat: center.lat, lng: center.lng}" :zoom="15" map-type-id="terrain" style="width: 100%; height: 370px" >
                          <GmapCluster :gridSize="5" :position="center" :averageCenter="true">
                            <GmapMarker 
                              :position="{lat: center.lat, lng: center.lng}" 
                              :clickable="true" 
                              :icon="icon"
                              @click="showInfo = true"
                            >
                              <!-- Info Window -->
                              <GmapInfoWindow v-if="showInfo" @closeclick="showInfo = false">
                                <div>
                                  <h6>{{livedata.location}}</h6>
                                  <p>IMEI No: {{livedata.imei_no}} </p>
                                  <p>Last Updated: {{livedata.update_time}}</p>
                                  <p><a :href="'https://www.google.com/maps/dir/'+my_latitude+','+my_longitude+'/'+livedata.latitude+','+livedata.longitude" target="_blank" class="trackMe">Track Me</a></p>
                                </div>
                              </GmapInfoWindow>
                            </GmapMarker>
                          </GmapCluster>
                        </GmapMap>
              
              </b-card>
            </b-col>
            </b-row>
            <!-- For Farrukhabad -->
            
        </b-col>
      </b-row>
    </b-container>
  </div>
</template>
<script>

export default {
  middleware: ['check-auth','auth'],
  layout: 'admin',
  name:'tankDetails',
  components:{
  },
  mounted() {
    this.initload();
    this.getCurrentLocation();
  },
  data() {
    var self = this;
    return {
      email: "",
      conn_status: 0,
      level_mtr: 0,
      level_mtr_ndmc:0,
      level_per: 0,
      pindigation:1100,
      url: process.env.apiUrl+ "device-data",
      imeino: self.$route.params.id,
      records: [],
      pump_mapped_list:[],
      pump_mapped_list_L:[],
      pump_mapped_list_R:[],
      livedata: {},
      tank_height:0,
      fields: [
        {
          key: "analoginput",
          label: "Water Level",
          class: "text-left",
          formatter: (value, key, item) => {
            var height = JSON.parse(self.livedata.tank_height).overflow;
            var sensor_height = self.livedata.sensor_height;
            var level = 0;
            var min = self.livedata.level_min;
            var max = min + parseInt(((self.livedata.level_max - self.livedata.level_min) * height) / sensor_height);

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
            /* if(this.$store.getters.getUserinfo.group_id==2){ 
               level= (JSON.parse(self.livedata.tank_height).top_to_bottom-level);
            } // for NDMC CONDITION. */



            return level.toFixed(2);
          },
        },
        {
          key: "insert_time",
          label: "TimeStamp",
          class: "text-right",
          formatter: (value, key, item) => {
            var self = this;
            return self.$moment(item.insert_time).format("DD-MM-YYYY HH:mm:ss");
          },
        },
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
      min_level: 1050,
      unit_meter: 20,
      markers: [],
      icon: {url:'https://billing.water.live/mapflag.svg', size: {width: 50, height: 50, f: 'px', b: 'px'}},
      coordinates: {},
      center: {lng:77.190715, lat:28.580972},
      showInfo: false,
      my_latitude:'28.580972',
			my_longitude:'77.190715',
    };
  },
  methods: {
    initload() {
      var self = this;
      self.$axios 
        .post(self.url, {
          accesskey: this.$store.getters.getUserinfo.access_key,
          imeino: self.imeino,
        })
        .then(function(response) {
          if (response.data.error == 0 || response.data.error == "0") {
            self.livedata = response.data.result.livedata;
            self.tank_height = JSON.parse(self.livedata.tank_height).top_to_bottom;

            self.records = response.data.result.records;
            self.pump_mapped_list = response.data.result.mapped_pump_list;
            self.loading = false;
            self.totalRows = self.records.length;

          /* Mapped Pump List SLice Left & Right */
          

          var devices = self.pump_mapped_list;
          var curdatetime = self.$moment();
          var conn_status = 1;
          var dbdatetime = '';
          var duration = '';
          var minutes = '';
           
            for (var i = 0; i < devices.length; i++) {
              
              var d = devices[i];
              // console.log('instrument:',self.devices[i].instrument);
              if(d.instrument!=''){
                  devices[i].instrument = JSON.parse(d.instrument);
                }else{
                  devices[i].instrument=[];
                } 


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
                if(d.data_status == 0){
                  conn_status = 0;
                }
              }else{
                conn_status = 0;
              }
              if(conn_status == 0){
                self.total_disconnected += 1;
              }
              devices[i].connection_status = conn_status;
              

             /*  devices[i].subzone_title = self.subzones.filter(function (_d) {
                if(_d.id == d.subzone){
                  return true;
                }
              })[0].title; 

              if(d.sl_voltage == "0" || d.sl_voltage == 0){
                
              }*/

              if(d.inputs != null){
                if(d.inputs.charAt(2) == 1){
                  devices[i].auto_manual = 'AUTO';
                }else{
                  devices[i].auto_manual = 'MANUAL';
                }
              }else{
                devices[i].auto_manual = 'MANUAL';
                //devices[i].auto_manual = 'N/A';
              }

              
              if(d.inputs != null){
                if(d.inputs.charAt(1) == 1){
                  devices[i].device_trip = 'TRIP';
                 
                }else{
                  devices[i].device_trip = '';
                }
              }else{
                devices[i].device_trip = '';
              }

              if(d.sl_voltage == 12){
                devices[i].supply = 'ON';
              }else{
                devices[i].supply = 'OFF';
              }
              
              if(d.outputs != null){
                if(d.outputs.charAt(0) == 1){
                  devices[i].pump_status = 'ON';

                }else{
                  devices[i].pump_status = 'OFF';

                }
              }else{
                //devices[i].pump_status = 'N/A';
                devices[i].pump_status = 'OFF';
              }
             
            } 

            console.log(devices);
            const pumpMappedList =  devices; //self.pump_mapped_list;
          if(pumpMappedList.length>1){
            const midIndex = Math.floor(pumpMappedList.length / 2);
            self.pump_mapped_list_L = pumpMappedList.slice(0, midIndex);
            self.pump_mapped_list_R = pumpMappedList.slice(midIndex);
          }
          

          /* ****************************************************************  */
            var curdatetime = self.$moment();
            var dbdatetime = self.$moment(self.livedata.update_time);
            var duration = 0;
            var minutes = 0;
            if (curdatetime > dbdatetime) {
              duration = self.$moment.duration(curdatetime.diff(dbdatetime));
            } else {
              duration = self.$moment.duration(dbdatetime.diff(curdatetime));
            }
            minutes = duration.asMinutes();
            //console.log('--------',self.$root.disconnection_time);
            var disconnection_time = 30;
            if (minutes < disconnection_time) {
              self.conn_status = 1;
            } else {
              self.conn_status = 0;
            }

            var height = JSON.parse(self.livedata.tank_height).overflow;
            var sensor_height = self.livedata.sensor_height;
            var level = 0;
            var min = self.livedata.level_min;
            var max = min + parseInt(((self.livedata.level_max - self.livedata.level_min) * height) / sensor_height);

            console.log('self.livedata.analoginput:'+self.livedata.analoginput+'========min:'+max+'max:'+max+'sensor_height:'+sensor_height);

            var unit = (max - min) / height;

            if (self.livedata.analoginput <= min) {
              level = 0;
            }
            if (self.livedata.analoginput >= max) {
              level = Number(height);
            }
            if (self.livedata.analoginput > min && self.livedata.analoginput < max) {
              level = (self.livedata.analoginput - min) / unit; // current level in meter
            }
            if (self.livedata.analoginput == null) {
              level = 0;
              self.level_mtr = "0.00";
              self.level_per = "0.00";
              self.level_mtr_ndmc ="0.00";
            } else {
              console.log('Develop:'+level);
              self.level_mtr = level.toFixed(2);
              self.level_mtr_ndmc =((self.livedata.analoginput*1.4)/100).toFixed(2);
            

              
              self.level_per = self.livedata.analoginput;
            }


            self.center['lng'] = self.livedata.longitude;
            self.center['lat'] = self.livedata.latitude;


            setTimeout(self.initload, 60*1000);
          } else {
           // self.$root.forceLogout(response.data.message);
           console.log('NO result Found!');
          }
        })
        .catch(function(error) {
          alert(error);
        });
      //alert('login '+self.email+" "+self.password);
    },
    getCurrentLocation() {
      /* Current My Location  */
      navigator.geolocation.getCurrentPosition((position) => {
        this.my_latitude  = position.coords.latitude;
        this.my_longitude = position.coords.longitude;
        //console.log('Long:'+position.coords.latitude);
        /* this.marker.position = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        };
        this.panToMarker(); */
      });

    },
    onFiltered(filteredItems) {
      // Trigger pagination to update the number of buttons/pages due to filtering
      this.totalRows = filteredItems.length;
      this.currentPage = 1;
    },
    downloadcsv() {
      var self = this;
      var header = new Array();
      self.fields.forEach(function(item) {
        if (!item.extra) {
          header.push(item.label);
        }
      });

      //var d = table.rows().data();
      var finalarr = new Array();
      finalarr.push(header);
      self.records.forEach(function(row) {
        var dataarr = new Array();
        self.fields.forEach(function(field) {
          if (field.key != "extra") {
            dataarr.push(row[field.key]);
          }
        });
        finalarr.push(dataarr);
      });

      let csvContent = "data:text/csv;charset=utf-8," + finalarr.map((e) => e.join(",")).join("\n");

      var encodedUri = encodeURI(csvContent);
      var link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "device_data_report.csv");
      document.body.appendChild(link); // Required for FF

      link.click();
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
.table td,
.table th {
  vertical-align: middle;
}

/* ******************* */

/*============home fb features===========*/

.fb-features
{
	padding-top:25px;
	padding-bottom:25px;
}
.zoyly-fecsec
{
	width:100%;
	float:left;
	}

.zyfet-left, .zyfet-right
{
	width:33%;
	float:left;
}

.zyfet-middle
{
	/* width:34%; */
	float:left;
	text-align:center;
	/* z-index: -1; */
    position: relative;
}


.zyfet-dranage{
  border: 1px solid #1224648f;
  padding: 17px;
  border-width: 8px;
}
/* .zyfet-middle:after
{
content: '';
    width: 95px;
    height: 27px;
    background-color: #f7f7f7;
    position: absolute;
    left: 36%;
	top:0;
}
.zyfet-middle:before
{
content: '';
    width: 95px;
    height: 27px;
    background-color: #f7f7f7;
    position: absolute;
    left: 36%;
	bottom:0;
} */
.zyfet-middle img
{
	border-radius: 50%;
    padding: 25px;
    border: 5px solid #4941a2;
}


.timeline
{
	width:100%;
	float:left;
	}

.timeline-item {
    position: relative;
}
.timeline-item {
    padding-left: 140px;
}
.timeline-item + .timeline-item {
    margin-top: 12px;
}
/*.timeline-item + .timeline-item::after {
    top: -52px;
}*/


.timeline-item::before {
    background-color: #ffffff;
}
.timeline-item-ON::before {
    background-color: #0ea54b;
}
.timeline-item-OFF::before {
    background-color: #b20e0e;
}

.timeline-item::before {
    left: 0px;
}
.timeline-item::after {
    left: 0px;
}
.timeline-item::before {
	border-radius: 100%;
    height: 30px;
    top: 20px;
    width: 30px;
    z-index: 1;
    border: solid 2px #443b9d;
}
.timeline-item::after {
    background-color: #443b9d;
    bottom: 0;
   top: 32px;
    width: 140px;
    height: 2px;
	  /* z-index:-1; */
}
.timeline-item::after, .timeline-item::before {
    content: "";
    position: absolute;
}
.timeline-year
{
color: #d1160a;
}
.timeline-year {
    font-size: 24px;
    left: 0;
    margin-bottom: 0;
    position: absolute;
    top: 11px;
}
.timeline-title {
    font-size: 20px;
    margin-bottom: 5px !important;
    margin-top: 2px;
	color:#093eb6;
}
.timeline-text
{
	border:solid 2px #443b9d;
	display:table;
	min-height:68px;
	border-radius:10px;
	width:100%;
}
.timeltex-box, .timeltex-icon
{
	display:table-cell;
	vertical-align:middle;
}
.timeltex-box
{
	padding:5px 10px;
	background-color:#ffffff;
	border-radius:0px 10px 10px 0px;
}
.zyfet-right .timeltex-box
{
	border-radius:10px 0px 0px 10px;
}
.timeltex-icon
{
	width:70px;
	text-align:center;
	background-color:#443b9d;
	    border-radius: 0px 7px 7px 0px;
}
.timeltex-icon img
{
	width:60px;
	height:60px;
}
.timeltex-box h4
{
	margin-bottom:2px;
	font-size:14px;
	font-weight:600;
}
.timeltex-box 
{
	font-size: 13px;
    line-height: 18px;
}

.zyfet-right .timeline-item:nth-child(1)
{
	margin-left:-106px;
}
.zyfet-right .timeline-item:nth-child(2)
{
	margin-left:-35px;
	padding-left:115px;
}
.zyfet-right .timeline-item:nth-child(3)
{
	margin-left:-16px;
	padding-left:115px;
	
}
.zyfet-right .timeline-item:nth-child(4)
{
	margin-left:-32px;
	padding-left: 109px;
}
.zyfet-right .timeline-item:nth-child(5)
{
	margin-left:-86px;
}

.zyfet-left .timeline-item
{
	padding-left:0px;
	padding-right:140px;
	}
.zyfet-left .timeltex-icon {
    border-radius: 7px 0px 0px 7px;
}
.zyfet-left .timeline-item::after {
	left:inherit;
    right: 0px;
}
.zyfet-left .timeline-item::before {
    left:inherit;
    right: 0px;
}
.zyfet-left .timeline-item:nth-child(1)
{
	margin-right:-106px;
}
.zyfet-left .timeline-item:nth-child(2)
{
	margin-right:-35px;
}
.zyfet-left .timeline-item:nth-child(3)
{
	margin-right:-16px;
}
.zyfet-left .timeline-item:nth-child(4)
{
	margin-right:-31px;
}
.zyfet-left .timeline-item:nth-child(5)
{
	margin-right:-88px;
}

.no-tank {
   /*  border: solid 2px #443b9d; */
    display: table;
    min-height: 68px;
    border-radius: 3px;
    width: 100%;
    margin-top: 40%;
    margin-left: 26%;
}

</style>
