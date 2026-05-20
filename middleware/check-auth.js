export default function(context){
    if (!process.server) {
        console.log(">>> "+localStorage.getItem('userdata'));
        context.store.dispatch('initAuth');
    }
}