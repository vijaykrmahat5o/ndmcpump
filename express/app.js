var createError = require('http-errors');
var express = require('express');
var cors = require('cors');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
//var islcRouter = require('./routes/islc');
//var surveyRouter = require('./routes/wmsurvey');
//var mdmsRouter = require('./routes/mdms');
//var wdmsRouter = require('./routes/wdms');
//var secureRouter = require('./routes/secure');
//var surveyadminRouter = require('./routes/surveyadmin');
//var nhaiRouter = require('./routes/nhai');
//var cromptonRouter = require('./routes/cromptongreeves');
//var vendorsRouter = require('./routes/vendors');
//var wdms_test = require('./routes/wdms_test');
//var wsocketapi = require('./routes/socketapi');
//var wsocketapi = require('./routes/socketapi2');
//var wsocketapi = require('./routes/socketapi3'); 
var wmsRouter = require('./routes/wms');

var app = express(); 

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(cors())
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// custom code

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

// end custom code

app.use('/', indexRouter);
//app.use('/islc', islcRouter);
//app.use('/wmsurvey', surveyRouter);
//app.use('/mdms', mdmsRouter);
//app.use('/wdms-api', wdmsRouter);
//app.use('/surveyadmin-api', surveyadminRouter);
//app.use('/nhai-api', nhaiRouter);
//app.use('/crompton-api', cromptonRouter);
//app.use('/vendor-api', vendorsRouter);
//app.use('/wdms_test_api', wdms_test);
app.use('/wms-api', wmsRouter);
//app.use('/socketapi', wsocketapi);



// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
