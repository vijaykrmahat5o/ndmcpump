import Vuex from 'vuex'

export const strict = false

const createStore = () => {
    return new Vuex.Store({
        state: {
            userinfo: {
                "access_key": ""
            },
            search_enabled: false
        },
        mutations: {
            setUserinfo(state, userdata){
                state.userinfo = userdata;
            },
            setSearchEnabled(state, flag){
                console.log('>>>>>>>>>>>>>>>>>>> SET SEARCH ACTION '+flag);
                state.search_enabled = flag;
            }
        },
        actions: {
            setSearchEnabled(vuexContext, flag){
                console.log('SET SEARCH ACTION '+flag);
                vuexContext.commit('setSearchEnabled', flag);
            },
            setUserinfo(vuexContext, userdata){
                console.log('SET USER INFO ACTION');
                vuexContext.commit('setUserinfo', userdata);
            },
            authenticateUser(vuexContext, authData){
                var self = this;

                /*var o = {
                    access_key: 12112121221,
                    email: "admin@livefibre.in",
                    permission: [],
                    role: "A",
                    user_id: 1,
                    username: "Admin"
                }
                vuexContext.commit('setUserinfo', o);
                localStorage.setItem('userdata', JSON.stringify(o));
                return true;*/

                return this.$axios.post(authData.url, authData.login).then(function (response) {
                    if(response.data.error == 0 || response.data.error == '0'){
                        vuexContext.commit('setUserinfo', response.data.result);
                        localStorage.setItem('userdata', JSON.stringify(response.data.result));
                        console.log('SET USER DATA '); 
                    }else{
                        self.error_msg = response.data.message;
                        self.$bvToast.toast(response.data.message, {
                            title: 'Register',
                            toaster: 'b-toaster-bottom-right',
                            autoHideDelay: 5000,
                            variant: 'danger',
                            solid: true,
                            appendToast: true
                        });
                    }
                })
                .catch(function (error) {
                   // alert(error);
                   console.log(error);
                });
            },
            initAuth(vuexContext){
                console.log('---------------------- INIT AUTH -------------------');
                const userdata = JSON.parse(localStorage.getItem('userdata'));
                if(!userdata){
                    return;
                }
                if(userdata.access_key == ""){
                    return;
                }
                
                console.log("ACCESS KEY "+userdata.access_key);
                vuexContext.commit('setUserinfo', userdata);
            },
            logoutUser(vuexContext, authData){
                var nodata = {'access_key':""};
                localStorage.setItem('userdata', JSON.stringify(nodata));
                vuexContext.commit('setUserinfo', nodata);
                return true;
            },
            
        },
        getters: {
            getUserinfo(state){
                return state.userinfo;
            },
            isAuthenticated(state){
                return (state.userinfo.access_key  == "")? false:true;
            },
            chkperm(p1,p2){
                return true;
            },
            isSearchEnabled(state){
                return state.search_enabled;
            }
        }
    })
}

export default createStore
