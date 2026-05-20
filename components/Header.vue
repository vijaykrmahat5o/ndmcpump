<template>
    <div>
        <b-navbar toggleable="lg" type="dark" fixed="top" variant="info" class="header">
            <b-navbar-brand href="#">Remote Monitoring & Control System</b-navbar-brand>

            <b-navbar-toggle target="nav-collapse"></b-navbar-toggle>

            <b-collapse id="nav-collapse" is-nav>

            <b-navbar-nav class="ml-auto menus">
                <NuxtLink :to="'/'+$store.getters.getUserinfo.dashboard" class="nav-link">Home</NuxtLink>
                <b-nav-item-dropdown right>
                    <template #button-content>
                        <em>Reports</em>
                    </template>
                    <b-dropdown-item to="/reports/level-report" nuxt-link-active="/report/detail-report" exact>Level Report</b-dropdown-item>
                    <!-- <b-dropdown-item v-if="$store.getters.getUserinfo.group_id==1" to="/reports/detail-report" nuxt-link-active="/report/detail-report" exact>Detail Report</b-dropdown-item>
                    <b-dropdown-item v-if="$store.getters.getUserinfo.group_id==1" to="/reports/daily-operational-report" nuxt-link-active="/report/daily-operational-report" exact>Daily Operational Report</b-dropdown-item>
                    <b-dropdown-item v-if="$store.getters.getUserinfo.group_id==1" to="/reports/operational-report" nuxt-link-active="/report/operational-report" exact>Individual Operational Report</b-dropdown-item> -->
                </b-nav-item-dropdown>
                <b-nav-item-dropdown right>
                    <template #button-content>
                        <em>User</em>
                    </template>
                    <b-dropdown-item href="#">Profile</b-dropdown-item>
                    <b-dropdown-item @click="logout">Sign Out</b-dropdown-item>
                </b-nav-item-dropdown>
            </b-navbar-nav>
            </b-collapse>
        </b-navbar>

    </div>
</template>
<script>
export default {
    methods:{
        logout(){
            var self = this;
            this.$store.dispatch('logoutUser', {}).then((status) => {
                if(status){
                    self.$router.push('/login');
                }else{
                    alert('error');
                }
                
            });
        },
    }
}
</script>
<style scoped>
.header{
    -webkit-box-shadow: 0px 5px 10px 0px rgba(0,0,0,0.3);
	-moz-box-shadow: 0px 5px 10px 0px rgba(0,0,0,0.3);
	box-shadow: 0px 5px 10px 0px rgba(0,0,0,0.3);
}
.bg-info {
    background-color: #122464 !important;
}
.menus a {
    font-size: 16px !important;
}
.menus .nav-link{
    padding-left: 1rem !important;
    padding-right: 1rem !important;
}
</style>