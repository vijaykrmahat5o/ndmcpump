export default function(context){
    console.log('AUTH '+context.store.getters.isAuthenticated);
    if(!context.store.getters.isAuthenticated){
        context.redirect('/login');
    }else{
        //console.log(context.route);
        if(context.route.path == "/") {
            context.redirect('/login');
        }
    }
}