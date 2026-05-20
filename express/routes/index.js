var express = require("express");
var router = express.Router();
var conn = require("./db");
var md5 = require("md5");
var empty = require("is-empty");
var url = require("url");
const fs = require("fs");
const path = require("path");
var moment = require("moment");
const fileUpload = require("express-fileupload");
router.use(
	fileUpload({
		useTempFiles: true,
		tempFileDir: "/tmp/",
	})
);

var mysql = require("mysql");
var pool = mysql.createPool({
	connectionLimit: 50,
	host: "localhost",
	user: "ccms_usr",
	password: "ah8vx61mxrbv",
	database: "ccms_cromptongreeves",
	multipleStatements: true,
	dateStrings: ["DATE", "DATETIME"],
});

var pool_login = mysql.createPool({
	connectionLimit: 50,
	host: "localhost",
	user: "ccms_usr",
	password: "ah8vx61mxrbv",
	database: "ccms_cromptongreeves",
	multipleStatements: true,
	dateStrings: ["DATE", "DATETIME"],
});

var connection = mysql.createPool({
	connectionLimit: 50,
	host: "localhost",
	user: "ccms_usr",
	password: "ah8vx61mxrbv",
	database: "ccms_wdms",
	multipleStatements: true,
	dateStrings: ["DATE", "DATETIME"],
});

var connectioncwms = mysql.createPool({
	connectionLimit: 50,
	host: "localhost",
	user: "ccms_usr",
	password: "ah8vx61mxrbv",
	database: "ccms_cwms",
	multipleStatements: true,
	dateStrings: ["DATE", "DATETIME"],
});

var import_data = [];
var import_result = [];
var import_index = 0;

var POOLDB = {
	"crompton.ccms.live": pool,
};
var DASHBOARD = {
	"crompton.ccms.live": "/state-dashboard/in-up",
};
var STATEIP = {
	IN_MH: "216.10.251.190",
	IN_UP: "103.211.218.36",
	IN_RJ: "216.10.245.169",
	IN_DL: "119.18.52.29",
};

var IN_MH = "216.10.251.190";
var IN_UP = "103.211.218.36";
var IN_RJ = "216.10.245.169";
var IN_DL = "119.18.52.29";

/* GET home page. */
router.get("/", function (req, res, next) {
	console.log(req.hostname);
	res.render("index", { title: "API" });
});

require("dotenv").config();
const { DateTime, Settings } = require("luxon");
let doQuery = require("./connection.js");

// Configure the time zone
Settings.defaultZone = "Asia/Calcutta";

// app.use(log_err);

function log_err(req, res, next) {
	req.custom_error = "";
	next();

	if (req.custom_error.length > 0) {
		// create an error log file if not exists
		let error_file_name = DateTime.local().toFormat("yyyy-MM-dd") + "_moradabad_errors.txt";

		if (fs.existsSync(path.normalize(__dirname + "/../logs" + `/${error_file_name}`))) {
			fs.appendFileSync(
				path.normalize(__dirname + "/../logs" + `/${error_file_name}`),
				"\r\n" + `--- --- --- --- --- --- --- --- --- --- --- ---\n` + req.custom_error,
				function (err1) {
					if (err1) console.log("Error while writing in a text file:", err1);
				}
			);
		} else {
			fs.writeFileSync(
				path.normalize(__dirname + "/../logs" + `/${error_file_name}`),
				`--- New Error Log File, Date: ${DateTime.local().toFormat("DDD")}, Time: ${DateTime.local().toFormat(
					"ttt"
				)} ---\n` + req.custom_error,
				function (err2) {
					if (err2) console.log("Error while writing in a text file:", err2);
				}
			);
		}
	}
}

function pad(str, max) {
	str = str.toString();
	return str.length < max ? pad("0" + str, max) : str;
}

function split_every_n(str, n, arr = []) {
	if (str.length === 0) {
		return arr;
	}

	arr.push(str.slice(0, n));
	return split_every_n(str.slice(n), n, arr);
}

function hex_to_dec(hex_str) {
	let hex_arr = split_every_n(hex_str, 2);

	return parseInt(pad(hex_arr.reverse().join(""), 4), 16);
}

function decode_axioma_payload(axioma_pl) {
	let current_date = DateTime.fromSeconds(hex_to_dec(axioma_pl.slice(0, 8))).toFormat("yyyy-MM-dd HH:mm:ss");

	let current_volume = hex_to_dec(axioma_pl.slice(10, 18)) / 1000;

	// console.log("::: ::: ::: current_date ::: ::: :::", current_date, typeof current_date);
	// console.log("::: ::: ::: current_volume ::: ::: :::", current_volume, typeof current_volume);

	let data_arr = [];
	let log_date = DateTime.fromSeconds(hex_to_dec(axioma_pl.slice(18, 26)));
	let log_volume = hex_to_dec(axioma_pl.slice(26, 34)) / 1000;

	data_arr.push({
		date: log_date.toFormat("yyyy-MM-dd HH:mm:ss"),
		volume: log_volume,
	});

	// console.log("::: ::: ::: log_date ::: ::: :::", log_date.toFormat("yyyy-MM-dd HH:mm:ss"), typeof log_date);
	// console.log("::: ::: ::: log_volume ::: ::: :::", log_volume, typeof log_volume);

	let total_vol = log_volume;
	let total_mins = 60;

	let start_index = 34;
	for (let i = 0; i < 15; i++) {
		let del_vol = hex_to_dec(axioma_pl.slice(start_index, start_index + 4)) / 1000;
		start_index += 4;

		// console.log(`i: ${i}, del_vol: ${del_vol}`);

		total_vol += del_vol;
		data_arr.push({
			date: log_date.plus({ minutes: total_mins }).toFormat("yyyy-MM-dd HH:mm:ss"),
			volume: total_vol,
		});

		total_mins += 60;
	}

	data_arr.push({
		date: current_date,
		volume: current_volume,
	});

	return data_arr;

	// all values expanded
	/* let del_vol_1 = HexToRevDecimal(ax_100_pl.payload.substr(34, 4)) / 1000;
	total_vol += del_vol_1;
	console.log(
		"::: ::: ::: del_vol_1 ::: ::: :::",
		log_date.plus({ minutes: total_mins }).toFormat("yyyy-MM-dd HH:mm:ss"),
		total_vol,
		typeof del_vol_1
	);

	total_mins += 60;
	let del_vol_2 = HexToRevDecimal(ax_100_pl.payload.substr(38, 4)) / 1000;
	total_vol += del_vol_2;
	console.log(
		"::: ::: ::: del_vol_2 ::: ::: :::",
		log_date.plus({ minutes: total_mins }).toFormat("yyyy-MM-dd HH:mm:ss"),
		total_vol,
		typeof del_vol_2
	);

	total_mins += 60;
	let del_vol_3 = HexToRevDecimal(ax_100_pl.payload.substr(42, 4)) / 1000;
	total_vol += del_vol_3;
	console.log(
		"::: ::: ::: del_vol_3 ::: ::: :::",
		log_date.plus({ minutes: total_mins }).toFormat("yyyy-MM-dd HH:mm:ss"),
		total_vol,
		typeof del_vol_3
	);

	total_mins += 60;
	let del_vol_4 = HexToRevDecimal(ax_100_pl.payload.substr(46, 4)) / 1000;
	total_vol += del_vol_4;
	console.log(
		"::: ::: ::: del_vol_4 ::: ::: :::",
		log_date.plus({ minutes: total_mins }).toFormat("yyyy-MM-dd HH:mm:ss"),
		total_vol,
		typeof del_vol_4
	);

	total_mins += 60;
	let del_vol_5 = HexToRevDecimal(ax_100_pl.payload.substr(50, 4)) / 1000;
	total_vol += del_vol_5;
	console.log(
		"::: ::: ::: del_vol_5 ::: ::: :::",
		log_date.plus({ minutes: total_mins }).toFormat("yyyy-MM-dd HH:mm:ss"),
		total_vol,
		typeof del_vol_5
	);

	total_mins += 60;
	let del_vol_6 = HexToRevDecimal(ax_100_pl.payload.substr(54, 4)) / 1000;
	total_vol += del_vol_6;
	console.log(
		"::: ::: ::: del_vol_6 ::: ::: :::",
		log_date.plus({ minutes: total_mins }).toFormat("yyyy-MM-dd HH:mm:ss"),
		total_vol,
		typeof del_vol_6
	);

	total_mins += 60;
	let del_vol_7 = HexToRevDecimal(ax_100_pl.payload.substr(58, 4)) / 1000;
	total_vol += del_vol_7;
	console.log(
		"::: ::: ::: del_vol_7 ::: ::: :::",
		log_date.plus({ minutes: total_mins }).toFormat("yyyy-MM-dd HH:mm:ss"),
		total_vol,
		typeof del_vol_7
	);

	total_mins += 60;
	let del_vol_8 = HexToRevDecimal(ax_100_pl.payload.substr(62, 4)) / 1000;
	total_vol += del_vol_8;
	console.log(
		"::: ::: ::: del_vol_8 ::: ::: :::",
		log_date.plus({ minutes: total_mins }).toFormat("yyyy-MM-dd HH:mm:ss"),
		total_vol,
		typeof del_vol_8
	);

	total_mins += 60;
	let del_vol_9 = HexToRevDecimal(ax_100_pl.payload.substr(66, 4)) / 1000;
	total_vol += del_vol_9;
	console.log(
		"::: ::: ::: del_vol_9 ::: ::: :::",
		log_date.plus({ minutes: total_mins }).toFormat("yyyy-MM-dd HH:mm:ss"),
		total_vol,
		typeof del_vol_9
	);

	total_mins += 60;
	let del_vol_10 = HexToRevDecimal(ax_100_pl.payload.substr(70, 4)) / 1000;
	total_vol += del_vol_10;
	console.log(
		"::: ::: ::: del_vol_10 ::: ::: :::",
		log_date.plus({ minutes: total_mins }).toFormat("yyyy-MM-dd HH:mm:ss"),
		total_vol,
		typeof del_vol_10
	);

	total_mins += 60;
	let del_vol_11 = HexToRevDecimal(ax_100_pl.payload.substr(74, 4)) / 1000;
	total_vol += del_vol_11;
	console.log(
		"::: ::: ::: del_vol_11 ::: ::: :::",
		log_date.plus({ minutes: total_mins }).toFormat("yyyy-MM-dd HH:mm:ss"),
		total_vol,
		typeof del_vol_11
	);

	total_mins += 60;
	let del_vol_12 = HexToRevDecimal(ax_100_pl.payload.substr(78, 4)) / 1000;
	total_vol += del_vol_12;
	console.log(
		"::: ::: ::: del_vol_12 ::: ::: :::",
		log_date.plus({ minutes: total_mins }).toFormat("yyyy-MM-dd HH:mm:ss"),
		total_vol,
		typeof del_vol_12
	);

	total_mins += 60;
	let del_vol_13 = HexToRevDecimal(ax_100_pl.payload.substr(82, 4)) / 1000;
	total_vol += del_vol_13;
	console.log(
		"::: ::: ::: del_vol_13 ::: ::: :::",
		log_date.plus({ minutes: total_mins }).toFormat("yyyy-MM-dd HH:mm:ss"),
		total_vol,
		typeof del_vol_13
	);

	total_mins += 60;
	let del_vol_14 = HexToRevDecimal(ax_100_pl.payload.substr(86, 4)) / 1000;
	total_vol += del_vol_14;
	console.log(
		"::: ::: ::: del_vol_14 ::: ::: :::",
		log_date.plus({ minutes: total_mins }).toFormat("yyyy-MM-dd HH:mm:ss"),
		total_vol,
		typeof del_vol_14
	);

	total_mins += 60;
	let del_vol_15 = HexToRevDecimal(ax_100_pl.payload.substr(90, 4)) / 1000;
	total_vol += del_vol_15;
	console.log(
		"::: ::: ::: del_vol_15 ::: ::: :::",
		log_date.plus({ minutes: total_mins }).toFormat("yyyy-MM-dd HH:mm:ss"),
		total_vol,
		typeof del_vol_15
	); */
}

function hex_to_binary(input) {
	/*Using parseInt to get the decimal value of the given String*/
	var decimalValue = parseInt(input, 16);

	/*Using decimalValue to get the binary String of given integer*/
	var result = decimalValue.toString(2);

	/* Calculating the length of the binary number with leading zeroes */
	var len = 4 * (Math.floor(result.length / 4) + (result.length % 4 ? 1 : 0));

	return result.padStart(len, "0");
}

function decode_axioma_status(axioma_pl) {
	// let current_date = DateTime.fromSeconds(hex_to_dec(axioma_pl.slice(0, 8))).toFormat("yyyy-MM-dd HH:mm:ss");
	let status = axioma_pl.slice(8, 10);

	let hex_to_bin = hex_to_binary(status);
	let hex_to_bin_rev = [...hex_to_bin].reverse();
	// console.log("::: ::: ::: current_date ::: ::: :::", current_date);
	// console.log("::: status :::", status, "::: binary :::", hex_to_bin, "::: reverse binary :::", hex_to_bin_rev);

	let result = {};
	if (parseInt(hex_to_bin_rev[2]) === 1) {
		result.low_battery = 1;
	}

	if (parseInt(hex_to_bin_rev[3]) === 1) {
		result.permanent = 1;
	}

	// If more than one temporary error occurs, status shows only one, by priority.
	// Temporary errors priority: freeze; leakage; burst; negative flow;
	if (parseInt(hex_to_bin_rev[4]) === 1) {
		result.temporary = 1; // empty spool
	}

	if (parseInt(hex_to_bin_rev[5]) === 1 && parseInt(hex_to_bin_rev[6]) === 1) {
		result.backflow = 1;
	}

	if (parseInt(hex_to_bin_rev[5]) === 1 && parseInt(hex_to_bin_rev[7]) === 1) {
		result.burst = 1;
	}

	if (parseInt(hex_to_bin_rev[5]) === 1 && parseInt(hex_to_bin_rev[6]) !== 1 && parseInt(hex_to_bin_rev[7]) !== 1) {
		result.leakage = 1;
	}

	if (parseInt(hex_to_bin_rev[7]) === 1 && parseInt(hex_to_bin_rev[5]) !== 1) {
		result.freeze = 1;
	}

	return result;

	// 04 = "00 00 01 00"; // Low battery
	// "00 10 00 00"

	// 08 = "00 00 10 00"; // Permanent error
	// "00 01 00 00"

	// 10 = "00 01 00 00" // Temporary error
	// "00 00 10 00"

	// 20 = "00 10 00 00" // Leakage
	// "00 00 01 00"

	// A0 = "10 10 00 00" // Burst
	// "00 00 01 01"

	// 60 = "01 10 00 00" // Backflow
	// "00 00 01 10"

	// 80 = "10 00 00 00" // Freeze
	// "00 00 00 01"

	// combination alarms

	// 30 = "00 11 00 00"; // LEAKAGE + TEMPORARY ERROR
	// "00 00 11 00"

	// 38 = "00 11 10 00" // leakage + temporary error + permanent
	// "00 01 11 00"
}

router.get("/getsome", function (req, res) {
	console.log("getsome endpoint requested");
	res.send({
		data_from_ccms_live: JSON.stringify(req.body),
	});
});

router.post("/data_up", async function (req, res, next) {
	try {
		// data entry in db
		let gateway_data = req.body;
		console.log("data_up endpoint request received");

		let file_name = DateTime.local().toFormat("yyyy_MM_dd") + "_moradabad_kerlink_uplink.txt";
		let file_text = "";

		if (gateway_data.endDevice.devEui) {
			// devEui existence check
			let read_device = await doQuery(
				"SELECT md.device_id, md.meter_type FROM `master_device` md INNER JOIN `trans_last_data` tld ON md.device_id = tld.device_id WHERE md.device_id = ?;",
				gateway_data.endDevice.devEui
			);

			if (read_device.length > 0) {
				let meter_type = read_device[0].meter_type;
				let insert_values = {};

				if (meter_type.toLowerCase() === "axioma" && parseInt(gateway_data.fPort) === 100) {
					let decoded_data = decode_axioma_payload(gateway_data.payload);
					let latest_data = decoded_data[decoded_data.length - 1];

					let decoded_status = decode_axioma_status(gateway_data.payload);

					insert_values = {
						device_id: gateway_data.endDevice.devEui,
						battery_status: 3.6,
						payload: gateway_data.payload,
						reading: latest_data.volume,
						credit: 0,
						meter_cover_opened: 0,
						fitting_removed: 0,
						magnetic_affected: 0,
						battery_cover_opened: 0,
						leakage_penalty: 0,
						meter_disabled: 0,
						reverse_flow: 0,
						battery_dead: 0,
						first_boot: 0,
						periodic: 0,
						reconnection: 0,
						manual_connection: 0,
						downlink_issue: 0,
						timestamp: latest_data.date,
						status: 1,

						// low_battery: decoded_status.low_battery ? 1 : 0,
						// perm_error: decoded_status.permanent ? 1 : 0,
						// temp_error: decoded_status.temporary ? 1 : 0,
						// backflow_error: decoded_status.backflow ? 1 : 0,
						// burst_error: decoded_status.burst ? 1 : 0,
						// leakage_error: decoded_status.leakage ? 1 : 0,
						// freeze_error: decoded_status.freeze ? 1 : 0,
					};
				} // if meter_type = axioma and fPort = 100
				else if (meter_type.toLowerCase() === "baylan" && parseInt(gateway_data.fPort) === 2) {
					// var binaryMeterStatus = HexToBinary(hexPayload.substr(24, 2));
					//insertq.TariffStep = binaryMeterStatus.substr(binaryMeterStatus.length - 3, 3);
					//insertq.IsBackupCredit = binaryMeterStatus.substr(binaryMeterStatus.length - 5, 1) == "1";
					//insertq.valve_status = binaryMeterStatus.substr(binaryMeterStatus.length - 6, 1); // changes
					//insertq.IsValveClosedByConsumerCard = binaryMeterStatus.substr(0, 1) == "1";

					//	insertq.version = parseInt(hexPayload.substr(30, 2), 10);

					// var meterType = parseInt(hexPayload.substr(26, 1));

					//	insertq.PenaltyStatus = parseInt(hexPayload.substr(20, 2));

					insert_values = {
						device_id: gateway_data.endDevice.devEui,
						payload: gateway_data.payload,
						timestamp: DateTime.fromMillis(parseInt(gateway_data.recvTime)).toFormat("yyyy-MM-dd HH:mm:ss"),
						status: 1,
					};

					var binaryPenalties = HexToBinary(gateway_data.payload.substr(20, 2));
					insert_values.meter_cover_opened = parseInt(binaryPenalties.substr(7, 1));
					insert_values.fitting_removed = parseInt(binaryPenalties.substr(6, 1));
					insert_values.magnetic_affected = parseInt(binaryPenalties.substr(5, 1));
					insert_values.battery_cover_opened = parseInt(binaryPenalties.substr(4, 1));
					insert_values.leakage_penalty = parseInt(binaryPenalties.substr(3, 1));
					//	insertq.IsFireModeActivated = parseInt(binaryPenalties.substr(2, 1));
					//	insertq.IsValveClosedByConsumerCard = parseInt(binaryPenalties.substr(1, 1));
					insert_values.meter_disabled = parseInt(binaryPenalties.substr(0, 1));

					//	insertq.WarningStatus = parseInt(hexPayload.substr(22, 2));

					var binaryWarnings = HexToBinary(gateway_data.payload.substr(22, 2));

					//	insertq.IsCriticCredit = binaryWarnings.substr(7, 1) == "1";
					//	insertq.IsValveMalfunction = binaryWarnings.substr(6, 1) == "1";
					//	insertq.IsPulseMalfunction = binaryWarnings.substr(5, 1) == "1";
					//	insertq.IsLeakageWarning = binaryWarnings.substr(4, 1) == "1";
					insert_values.reverse_flow = binaryWarnings.substr(3, 1) == "1";
					insert_values.battery_dead = binaryWarnings.substr(2, 1) == "1";
					//	insertq.IsOveralConsumption = binaryWarnings.substr(1, 1) == "1";
					//	insertq.IsMaximumFlowRate = binaryWarnings.substr(0, 1) == "1";

					var creditDivider = 0;
					var divider = 0;

					creditDivider = Math.pow(10, parseInt(gateway_data.payload.substr(19, 1)));
					divider = Math.pow(10, parseInt(gateway_data.payload.substr(18, 1)));

					insert_values.reading = parseInt(HexToRev2Decimal(gateway_data.payload.substr(2, 8))) / divider;
					insert_values.credit =
						parseInt(HexToRev2Decimal(gateway_data.payload.substr(10, 8))) / creditDivider;

					insert_values.first_boot = 0;
					insert_values.periodic = 0;
					insert_values.reconnection = 0;
					insert_values.manual_connection = 0;
					insert_values.downlink_issue = 0;
					var connectionType = gateway_data.payload.substr(27, 1);
					switch (connectionType) {
						case "0":
							insert_values.first_boot = "1";
							break;
						case "1":
							insert_values.periodic = "1";
							break;
						case "2":
							insert_values.reconnection = "1";
							break;
						case "3":
							insert_values.manual_connection = "1";
							break;
					}

					var binaryBatteryStatus = HexToDecimal(gateway_data.payload.substr(28, 2));
					insert_values.battery_status = parseInt(binaryBatteryStatus) / 10;
				} // if meter_type = baylan and fPort = 100

				// ~~ columns available in DB ~~

				// table => trans_last_data
				// device_id, battery_status, payload, reading, credit, meter_cover_opened, fitting_removed, magnetic_affected
				// battery_cover_opened, leakage_penalty, meter_disabled, reverse_flow, battery_dead, first_boot, periodic
				// reconnection, manual_connection, downlink_issue, timestamp, status, update_time

				// table => trans_received_data
				// device_id, battery_status, payload, reading, credit, meter_cover_opened, fitting_removed, magnetic_affected
				// battery_cover_opened, leakage_penalty, meter_disabled, reverse_flow, battery_dead, first_boot, periodic
				// reconnection, manual_connection, downlink_issue, timestamp, status, insert_time, trans_id

				// insert into db
				let message;
				await Promise.all([
					doQuery("INSERT INTO trans_received_data SET ?, trans_id = 1, insert_time = NOW();", [
						insert_values,
					]),
					doQuery("UPDATE trans_last_data SET ?, update_time = NOW() WHERE device_id = ?;", [
						insert_values,
						gateway_data.endDevice.devEui,
					]),
				]).then((values) => {
					message = `records added: ${values[0].affectedRows}, records updated: ${values[1].changedRows}`;
				});

				console.log("message: ", message);

				// create a log file
				file_text += `\r\n { Date: ${DateTime.local().toFormat("DDD")}, Time: ${DateTime.local().toFormat(
					"ttt"
				)}, Gateway_Data: ${JSON.stringify(gateway_data)} }`;

				if (fs.existsSync(path.normalize(__dirname + "/../logs" + `/${file_name}`))) {
					fs.appendFileSync(
						path.normalize(__dirname + "/../logs" + `/${file_name}`),
						"\r\n" + `--- --- --- --- --- --- --- --- --- --- --- ---\n` + file_text,
						function (err1) {
							if (err1) console.log("Error while writing in a text file:", err1);
						}
					);
				} else {
					fs.writeFileSync(
						path.normalize(__dirname + "/../logs" + `/${file_name}`),
						`--- New Log File, Date: ${DateTime.local().toFormat("DDD")}, Time: ${DateTime.local().toFormat(
							"ttt"
						)} ---` + file_text,
						function (err2) {
							if (err2) console.log("Error while writing in a text file:", err2);
						}
					);
				}
			} else {
				// devEui not found in the DB

				let file_404 = DateTime.local().toFormat("yyyy_MM_dd") + "_moradabad_kerlink_uplink_not_found.txt";

				file_text += `\r\n { Date: ${DateTime.local().toFormat("DDD")}, Time: ${DateTime.local().toFormat(
					"ttt"
				)}, Gateway_Data: ${JSON.stringify(gateway_data)} }`;

				if (fs.existsSync(path.normalize(__dirname + "/../logs" + `/${file_404}`))) {
					fs.appendFileSync(
						path.normalize(__dirname + "/../logs" + `/${file_404}`),
						"\r\n" + `--- --- --- --- --- --- --- --- --- --- --- ---\n` + file_text,
						function (err1) {
							if (err1) console.log("Error while writing in a text file:", err1);
						}
					);
				} else {
					fs.writeFileSync(
						path.normalize(__dirname + "/../logs" + `/${file_404}`),
						`--- New Log File, Date: ${DateTime.local().toFormat("DDD")}, Time: ${DateTime.local().toFormat(
							"ttt"
						)} ---` + file_text,
						function (err2) {
							if (err2) console.log("Error while writing in a text file:", err2);
						}
					);
				}
			}
			res.send(JSON.stringify({ error: 0, message: "Task Added Successfully!", result: 1 }));
		}
	} catch (err) {
		let err_mod = {};
		Object.getOwnPropertyNames(err).forEach((item) => {
			// console.log(item, typeof item);
			if (item === "stack") {
				let index = err.stack.indexOf("moradabad_test/index.js");
				err_mod.stack = err.stack.slice(index - 30, index + 40);
			} else {
				err_mod[item] = err[item];
			}
		});

		// req.custom_error += "\r\n" + `--- --- --- --- --- data_up endpoint --- --- --- --- ---\n` + err.toString();

		req.custom_error +=
			"\r\n" + `--- --- --- --- --- data_up endpoint --- --- --- --- ---\n` + JSON.stringify(err_mod);

		// let index = err.stack.indexOf("moradabad_test\\index.js");
		// let temp_stack = err.stack.slice(index - 30, index + 40);

		// delete err.stack;
		// err.stack = temp_stack;
		// console.log("temp_stack:", temp_stack);
		console.log("Error in WDMS data_up: ", err);
	}
});

router.post("/data_down", async (req, res, next) => {
	try {
		let gateway_data = req.body;
		console.log("data_down endpoint request received");

		let file_name = DateTime.local().toFormat("yyyy_MM_dd") + "_moradabad_kerlink_downlink.txt";
		let file_text = "";

		file_text += `\r\n { Date: ${DateTime.local().toFormat("DDD")}, Time: ${DateTime.local().toFormat(
			"ttt"
		)}, Gateway_Data: ${JSON.stringify(gateway_data)} }`;

		// file_text += "\r\n" + DateTime.local().toFormat("x") + "," + JSON.stringify(data);

		// create a log file if not exists
		if (fs.existsSync(path.normalize(__dirname + "/../logs" + `/${file_name}`))) {
			fs.appendFileSync(
				path.normalize(__dirname + "/../logs" + `/${file_name}`),
				"\r\n" + `--- --- --- --- --- --- --- --- --- --- --- ---\n` + file_text,
				function (err1) {
					if (err1) console.log("Error while writing in a text file:", err1);
				}
			);
		} else {
			fs.writeFileSync(
				path.normalize(__dirname + "/../logs" + `/${file_name}`),
				`--- New Log File, Date: ${DateTime.local().toFormat("DDD")}, Time: ${DateTime.local().toFormat(
					"ttt"
				)} ---\n` + file_text,
				function (err2) {
					if (err2) console.log("Error while writing in a text file:", err2);
				}
			);
		}

		res.send(JSON.stringify({ error: 0, message: "From WDMS data_down_event", result: 1 }));
	} catch (err) {
		let err_mod = {};
		Object.getOwnPropertyNames(err).forEach((item) => {
			// console.log(item, typeof item);
			if (item === "stack") {
				let index = err.stack.indexOf("moradabad_test/index.js");
				err_mod.stack = err.stack.slice(index - 30, index + 40);
			} else {
				err_mod[item] = err[item];
			}
		});

		req.custom_error +=
			"\r\n" + `--- --- --- --- --- data_down endpoint --- --- --- --- ---\n` + JSON.stringify(err_mod);

		// let index = err.stack.indexOf("moradabad_test\\index.js");
		// let temp_stack = err.stack.slice(index - 30, index + 40);

		// delete err.stack;
		// err.stack = temp_stack;
		// console.log("temp_stack:", temp_stack);
		console.log("Error in WDMS data_down_event: ", err);
	}
});

router.post("/dataUp", function (req, res, next) {
	var param = req.body;

	console.log("POST DATA");

	var data = {
		data: param,
	};

	var insertq = {};
	if (param.endDevice.devEui) {
		// kerlink
		insertq = {
			trans_id: 1,
			device_id: param.endDevice.devEui,
			payload: param.payload,
			timestamp: moment(param.recvTime).format("YYYY-MM-DD HH:mm:ss"),
		};

		console.log(param.payload.length);
		if (param.payload.length == 42) {
			decodeAxioma(param, res);
			return;
		}
	} else {
		insertq = {
			trans_id: 1,
			//device_id: param.DevEUI_uplink.DevEUI,
			//payload: param.DevEUI_uplink.payload_hex,
			//timestamp: moment(param.DevEUI_uplink.Time).format('YYYY-MM-DD HH:mm:ss')
		};
	}

	var hexPayload = param.payload;

	var binaryMeterStatus = HexToBinary(hexPayload.substr(24, 2));
	//insertq.TariffStep = binaryMeterStatus.substr(binaryMeterStatus.length - 3, 3);
	//insertq.IsBackupCredit = binaryMeterStatus.substr(binaryMeterStatus.length - 5, 1) == "1";
	//insertq.valve_status = binaryMeterStatus.substr(binaryMeterStatus.length - 6, 1); // changes
	//insertq.IsValveClosedByConsumerCard = binaryMeterStatus.substr(0, 1) == "1";

	//	insertq.version = parseInt(hexPayload.substr(30, 2), 10);

	var meterType = parseInt(hexPayload.substr(26, 1));

	//	insertq.PenaltyStatus = parseInt(hexPayload.substr(20, 2));

	var binaryPenalties = HexToBinary(hexPayload.substr(20, 2));
	insertq.meter_cover_opened = parseInt(binaryPenalties.substr(7, 1));
	insertq.fitting_removed = parseInt(binaryPenalties.substr(6, 1));
	insertq.magnetic_affected = parseInt(binaryPenalties.substr(5, 1));
	insertq.battery_cover_opened = parseInt(binaryPenalties.substr(4, 1));
	insertq.leakage_penalty = parseInt(binaryPenalties.substr(3, 1));
	//	insertq.IsFireModeActivated = parseInt(binaryPenalties.substr(2, 1));
	//	insertq.IsValveClosedByConsumerCard = parseInt(binaryPenalties.substr(1, 1));
	insertq.meter_disabled = parseInt(binaryPenalties.substr(0, 1));

	//	insertq.WarningStatus = parseInt(hexPayload.substr(22, 2));

	var binaryWarnings = HexToBinary(hexPayload.substr(22, 2));

	//	insertq.IsCriticCredit = binaryWarnings.substr(7, 1) == "1";
	//	insertq.IsValveMalfunction = binaryWarnings.substr(6, 1) == "1";
	//	insertq.IsPulseMalfunction = binaryWarnings.substr(5, 1) == "1";
	//	insertq.IsLeakageWarning = binaryWarnings.substr(4, 1) == "1";
	insertq.reverse_flow = binaryWarnings.substr(3, 1) == "1";
	insertq.battery_dead = binaryWarnings.substr(2, 1) == "1";
	//	insertq.IsOveralConsumption = binaryWarnings.substr(1, 1) == "1";
	//	insertq.IsMaximumFlowRate = binaryWarnings.substr(0, 1) == "1";

	var creditDivider = 0;
	var divider = 0;

	creditDivider = Math.pow(10, parseInt(hexPayload.substr(19, 1)));
	divider = Math.pow(10, parseInt(hexPayload.substr(18, 1)));

	insertq.reading = parseInt(HexToRev2Decimal(hexPayload.substr(2, 8))) / divider;
	insertq.credit = parseInt(HexToRev2Decimal(hexPayload.substr(10, 8))) / creditDivider;

	insertq.first_boot = 0;
	insertq.periodic = 0;
	insertq.reconnection = 0;
	insertq.manual_connection = 0;
	insertq.downlink_issue = 0;
	var connectionType = hexPayload.substr(27, 1);
	switch (connectionType) {
		case "0":
			insertq.first_boot = "1";
			break;
		case "1":
			insertq.periodic = "1";
			break;
		case "2":
			insertq.reconnection = "1";
			break;
		case "3":
			insertq.manual_connection = "1";
			break;
	}

	var binaryBatteryStatus = HexToDecimal(hexPayload.substr(28, 2));
	insertq.battery_status = parseInt(binaryBatteryStatus) / 10;

	var sql = "INSERT INTO trans_received_data SET ?, insert_time=NOW();";
	sql += "UPDATE trans_last_data SET ?, update_time = NOW() WHERE device_id=?;";

	var device_id = param.endDevice.devEui;
	var updateq = {
		payload: param.payload,
		timestamp: moment(param.recvTime).format("YYYY-MM-DD HH:mm:ss"),
	};
	updateq.meter_cover_opened = parseInt(binaryPenalties.substr(7, 1));
	updateq.fitting_removed = parseInt(binaryPenalties.substr(6, 1));
	updateq.magnetic_affected = parseInt(binaryPenalties.substr(5, 1));
	updateq.battery_cover_opened = parseInt(binaryPenalties.substr(4, 1));
	updateq.leakage_penalty = parseInt(binaryPenalties.substr(3, 1));
	updateq.meter_disabled = parseInt(binaryPenalties.substr(0, 1));

	updateq.reverse_flow = binaryWarnings.substr(3, 1) == "1";
	updateq.battery_dead = binaryWarnings.substr(2, 1) == "1";

	updateq.reading = parseInt(HexToRev2Decimal(hexPayload.substr(2, 8))) / divider;
	updateq.credit = parseInt(HexToRev2Decimal(hexPayload.substr(10, 8))) / creditDivider;

	updateq.first_boot = 0;
	updateq.periodic = 0;
	updateq.reconnection = 0;
	updateq.manual_connection = 0;
	updateq.downlink_issue = 0;

	switch (connectionType) {
		case "0":
			updateq.first_boot = "1";
			break;
		case "1":
			updateq.periodic = "1";
			break;
		case "2":
			updateq.reconnection = "1";
			break;
		case "3":
			updateq.manual_connection = "1";
			break;
	}

	updateq.battery_status = parseInt(binaryBatteryStatus) / 10;

	connection.query(sql, [insertq, updateq, device_id], function selectCb(err, results, fields) {
		if (err) {
			console.log(err);
		} else {
			console.log("DATA STORED ......");
		}
	});

	var date = new Date();
	var time = date.getTime();
	const path = require("path");
	var file = date.getUTCFullYear() + "-" + (date.getUTCMonth() + 1) + "-" + date.getUTCDate() + "-kerlink.txt";
	fs.exists(path.normalize(__dirname + "/../logs/" + file), function (exist) {
		if (exist) {
			var str = time + "," + JSON.stringify(data);
			fs.appendFile(path.normalize(__dirname + "/../logs/" + file), "\r\n" + str, function (err1) {
				if (err1) console.log(err1);
			});
			var mess = { error: 0, message: "Task Added Successfully!", result: 1 };
			res.send(JSON.stringify(mess));
		} else {
			fs.writeFile(path.normalize(__dirname + "/../logs/" + file), "--- Start Logging ---", function (err2) {
				if (err2) console.log(err2);
				console.log("NEW LOG FILE CREATED!");
			});
			var mess = { error: 0, message: "Task Added Successfully!", result: 1 };
			res.send(JSON.stringify(mess));
		}
	});
});

function decodeAxioma(data, res) {
	var _arr = new Array();
	//console.log(data.substr(0, 8));

	var date = moment.unix(HexToRevDecimal(data.payload.substr(0, 8))).format("YYYY-MM-DD HH:mm:ss");

	//console.log(date);

	var status = data.payload.substr(8, 2);
	//console.log(status);

	var volume = HexToRevDecimal(data.payload.substr(10, 8));
	if (volume / 1000 > 99999) {
		return;
	}
	//console.log(volume);

	var logdate = moment.unix(HexToRevDecimal(data.payload.substr(18, 8))).format("YYYY-MM-DD HH:mm:ss");
	//console.log(logdate);

	var insertq = {
		trans_id: 1,
		device_id: data.endDevice.devEui,
		payload: data.payload,
		timestamp: moment(data.recvTime).format("YYYY-MM-DD HH:mm:ss"),
	};
	insertq.meter_cover_opened = 0;
	insertq.fitting_removed = 0;
	insertq.magnetic_affected = 0;
	insertq.battery_cover_opened = 0;
	insertq.leakage_penalty = 0;
	insertq.meter_disabled = 0;

	insertq.reverse_flow = 0;
	insertq.battery_dead = 0;

	insertq.reading = volume / 1000;
	insertq.credit = 0;

	insertq.first_boot = 0;
	insertq.periodic = 0;
	insertq.reconnection = 0;
	insertq.manual_connection = 0;
	insertq.downlink_issue = 0;

	insertq.battery_status = 3.6;

	var sql = "INSERT INTO trans_received_data SET ?, insert_time=NOW();";
	sql += "UPDATE trans_last_data SET ?, update_time = NOW() WHERE device_id=?;";

	var device_id = data.endDevice.devEui;
	var updateq = {
		payload: data.payload,
		timestamp: moment(data.recvTime).format("YYYY-MM-DD HH:mm:ss"),
	};
	updateq.meter_cover_opened = 0;
	updateq.fitting_removed = 0;
	updateq.magnetic_affected = 0;
	updateq.battery_cover_opened = 0;
	updateq.leakage_penalty = 0;
	updateq.meter_disabled = 0;

	updateq.reverse_flow = 0;
	updateq.battery_dead = 0;

	updateq.reading = volume / 1000;
	updateq.credit = 0;

	updateq.first_boot = 0;
	updateq.periodic = 0;
	updateq.reconnection = 0;
	updateq.manual_connection = 0;
	updateq.downlink_issue = 0;

	updateq.battery_status = 3.6;

	connection.query(sql, [insertq, updateq, device_id], function selectCb(err, results, fields) {
		if (err) {
			console.log(err);
		} else {
			console.log("DATA STORED ......");
		}
	});

	var date = new Date();
	var time = date.getTime();
	const path = require("path");
	var file = date.getUTCFullYear() + "-" + (date.getUTCMonth() + 1) + "-" + date.getUTCDate() + "-kerlink.txt";
	fs.exists(path.normalize(__dirname + "/../logs/" + file), function (exist) {
		if (exist) {
			var str = time + "," + JSON.stringify(data);
			fs.appendFile(path.normalize(__dirname + "/../logs/" + file), "\r\n" + str, function (err1) {
				if (err1) console.log(err1);
			});
			var mess = { error: 0, message: "Task Added Successfully!", result: 1 };
			res.send(JSON.stringify(mess));
		} else {
			fs.writeFile(path.normalize(__dirname + "/../logs/" + file), "--- Start Logging ---", function (err2) {
				if (err2) console.log(err2);
				console.log("NEW LOG FILE CREATED!");
			});
			var mess = { error: 0, message: "Task Added Successfully!", result: 1 };
			res.send(JSON.stringify(mess));
		}
	});
}

function cwmsDecodeAxioma(data, res) {
	var _arr = new Array();
	//console.log(data.substr(0, 8));

	var date = moment.unix(HexToRevDecimal(data.payload.substr(0, 8))).format("YYYY-MM-DD HH:mm:ss");

	//console.log(date);

	var status = data.payload.substr(8, 2);
	//console.log(status);

	var volume = HexToRevDecimal(data.payload.substr(10, 8));
	if (volume / 1000 > 99999) {
		return;
	}
	//console.log(volume);

	var logdate = moment.unix(HexToRevDecimal(data.payload.substr(18, 8))).format("YYYY-MM-DD HH:mm:ss");
	//console.log(logdate);

	var insertq = {
		trans_id: 1,
		device_id: data.endDevice.devEui,
		payload: data.payload,
		timestamp: moment(data.recvTime).format("YYYY-MM-DD HH:mm:ss"),
	};
	insertq.meter_cover_opened = 0;
	insertq.fitting_removed = 0;
	insertq.magnetic_affected = 0;
	insertq.battery_cover_opened = 0;
	insertq.leakage_penalty = 0;
	insertq.meter_disabled = 0;

	insertq.reverse_flow = 0;
	insertq.battery_dead = 0;

	insertq.reading = volume / 1000;
	insertq.credit = 0;

	insertq.first_boot = 0;
	insertq.periodic = 0;
	insertq.reconnection = 0;
	insertq.manual_connection = 0;
	insertq.downlink_issue = 0;

	insertq.battery_status = 3.6;

	var sql = "INSERT INTO trans_received_data SET ?, insert_time=NOW();";
	sql += "UPDATE trans_last_data SET ?, update_time = NOW() WHERE device_id=?;";

	var device_id = data.endDevice.devEui;
	var updateq = {
		payload: data.payload,
		timestamp: moment(data.recvTime).format("YYYY-MM-DD HH:mm:ss"),
	};
	updateq.meter_cover_opened = 0;
	updateq.fitting_removed = 0;
	updateq.magnetic_affected = 0;
	updateq.battery_cover_opened = 0;
	updateq.leakage_penalty = 0;
	updateq.meter_disabled = 0;

	updateq.reverse_flow = 0;
	updateq.battery_dead = 0;

	updateq.reading = volume / 1000;
	updateq.credit = 0;

	updateq.first_boot = 0;
	updateq.periodic = 0;
	updateq.reconnection = 0;
	updateq.manual_connection = 0;
	updateq.downlink_issue = 0;

	updateq.battery_status = 3.6;

	connectioncwms.query(sql, [insertq, updateq, device_id], function selectCb(err, results, fields) {
		if (err) {
			console.log(err);
		} else {
			console.log("DATA STORED ......");
		}
	});

	var date = new Date();
	var time = date.getTime();
	const path = require("path");
	var file = date.getUTCFullYear() + "-" + (date.getUTCMonth() + 1) + "-" + date.getUTCDate() + "-kerlink-cwms.txt";
	fs.exists(path.normalize(__dirname + "/../logs/" + file), function (exist) {
		if (exist) {
			var str = time + "," + JSON.stringify(data);
			fs.appendFile(path.normalize(__dirname + "/../logs/" + file), "\r\n" + str, function (err1) {
				if (err1) console.log(err1);
			});
			var mess = { error: 0, message: "Task Added Successfully!", result: 1 };
			res.send(JSON.stringify(mess));
		} else {
			fs.writeFile(path.normalize(__dirname + "/../logs/" + file), "--- Start Logging ---", function (err2) {
				if (err2) console.log(err2);
				console.log("NEW LOG FILE CREATED!");
			});
			var mess = { error: 0, message: "Task Added Successfully!", result: 1 };
			res.send(JSON.stringify(mess));
		}
	});
}
//setTimeout(function(){
//	var dd = {"data":{"id":"63f35cf58449510001d25767","endDevice":{"devEui":"8CF9572000097A9B","devAddr":"02243D09","cluster":{"id":177}},"fPort":25,"fCntDown":2,"fCntUp":3,"adr":true,"confirmed":false,"encrypted":false,"payload":"810a901f032b944400000000fe","encodingType":"HEXA","recvTime":1676893429476,"gwRecvTime":1676893429476,"classB":false,"delayed":false}};
//	console.log(">>>>>>>>>>>> "+dd.data.id);
//console.log(d);
//	cwmsDecodeBecox(dd.data);
//}, 5000);
/*setTimeout(function(){
	var dd = {"data":{"id":"63f35cf58449510001d25767","endDevice":{"devEui":"8CF9572000097A9B","devAddr":"02243D09","cluster":{"id":177}},"fPort":25,"fCntDown":2,"fCntUp":3,"adr":true,"confirmed":false,"encrypted":false,"payload":"810a901f032b944400000000fe","encodingType":"HEXA","recvTime":1676893429476,"gwRecvTime":1676893429476,"classB":false,"delayed":false}};
	console.log(">>>>>>>>>>>> "+dd.data.id);
	//console.log(d);
	cwmsDecodeBecox(dd.data);
}, 60000);*/
function cwmsDecodeBecox(data, res) {
	var _arr = new Array();

	var d = data.payload;

	var date = moment().format("YYYY-MM-DD HH:mm:ss");

	fx = 0;
	lx = 2;
	var v1 = d.substr(fx, lx);
	console.log("Control Code (" + v1 + "): " + HexToDec(v1));

	fx += lx;
	lx = 2;
	var v1 = d.substr(fx, lx);
	console.log("Data Length (" + v1 + "): " + HexToDec(v1));

	fx += lx;
	lx = 2;
	var v1 = d.substr(fx, lx);
	console.log("Data identification DI0 (" + v1 + "): " + HexToDec(v1));

	fx += lx;
	lx = 2;
	var v1 = d.substr(fx, lx);
	console.log("Data identification DI1 (" + v1 + "): " + HexToDec(v1));

	fx += lx;
	lx = 2;
	var v1 = d.substr(fx, lx);
	console.log("Count number (" + v1 + "): " + HexToDec(v1));

	fx += lx;
	lx = 2;
	var v1 = d.substr(fx, lx);
	console.log("Unit field (" + v1 + "): 0x" + v1 + " = 0.001m³");

	fx += lx;
	lx = 8;
	var v1 = d.substr(fx, 2);
	var v2 = d.substr(fx + 2, 2);
	var v3 = d.substr(fx + 4, 2);
	var v4 = d.substr(fx + 6, 2);
	var reading = parseInt(v4 + v3 + v2 + v1) * 0.001;

	fx += lx;
	lx = 2;
	var v1 = d.substr(fx, lx);
	var st1 = HexToBin(v1);
	console.log("Data field ST1 (" + v1 + "): " + HexToBin(v1));

	//console.log("			Meter Battery Alarm: "+st1.substr(0,1));
	//console.log("			Empty Pipe Alarm: "+st1.substr(1,1));
	var leakage_penalty = st1.substr(2, 1);
	console.log("			Burst alarm: " + st1.substr(3, 1));
	var magnetic_affected = st1.substr(4, 1);
	console.log("			Freezing Alarm: " + st1.substr(5, 1));
	//console.log("			Transducer IN Error: "+st1.substr(6,1));
	//console.log("			Transducer OUT Error: "+st1.substr(7,1));

	fx += lx;
	lx = 2;
	var v1 = d.substr(fx, lx);
	var st2 = HexToBin(v1);
	console.log("Data field ST2 (" + v1 + "): " + HexToBin(v1));

	console.log("			Meter Battery Alarm: " + st2.substr(0, 1));
	var fitting_removed = st2.substr(1, 1);
	var reverse_flow = st2.substr(2, 1);
	console.log("			Over Range Alarm: " + st2.substr(3, 1));
	console.log("			Temperature Alarm: " + st2.substr(4, 1));
	console.log("			EE Error: " + st2.substr(5, 1));
	console.log("			Transducer IN Error: " + st2.substr(6, 1));
	console.log("			Transducer OUT Error: " + st2.substr(7, 1));

	fx += lx;
	lx = 2;
	var v1 = d.substr(fx, lx);
	var battery_status = ((HexToDec(v1) / 253) * 100).toFixed(0);

	var status = data.payload.substr(8, 2);

	var volume = HexToRevDecimal(data.payload.substr(10, 8));
	if (volume / 1000 > 99999) {
		return;
	}
	console.log(battery_status);

	var logdate = moment.unix(HexToRevDecimal(data.payload.substr(18, 8))).format("YYYY-MM-DD HH:mm:ss");
	//console.log(logdate);

	var insertq = {
		trans_id: 1,
		device_id: data.endDevice.devEui,
		payload: data.payload,
		timestamp: moment(data.recvTime).format("YYYY-MM-DD HH:mm:ss"),
	};
	insertq.meter_cover_opened = 0;
	insertq.fitting_removed = fitting_removed;
	insertq.magnetic_affected = magnetic_affected;
	insertq.battery_cover_opened = 0;
	insertq.leakage_penalty = leakage_penalty;
	insertq.meter_disabled = 0;

	insertq.reverse_flow = reverse_flow;
	insertq.battery_dead = 0;

	insertq.reading = reading;
	insertq.credit = 0;

	insertq.first_boot = 0;
	insertq.periodic = 0;
	insertq.reconnection = 0;
	insertq.manual_connection = 0;
	insertq.downlink_issue = 0;

	insertq.battery_status = battery_status;

	var sql = "INSERT INTO trans_received_data SET ?, insert_time=NOW();";
	sql += "UPDATE trans_last_data SET ?, update_time = NOW() WHERE device_id=?;";

	var device_id = data.endDevice.devEui;
	var updateq = {
		payload: data.payload,
		timestamp: moment(data.recvTime).format("YYYY-MM-DD HH:mm:ss"),
	};
	updateq.meter_cover_opened = 0;
	updateq.fitting_removed = fitting_removed;
	updateq.magnetic_affected = magnetic_affected;
	updateq.battery_cover_opened = 0;
	updateq.leakage_penalty = leakage_penalty;
	updateq.meter_disabled = 0;

	updateq.reverse_flow = reverse_flow;
	updateq.battery_dead = 0;

	updateq.reading = reading;
	updateq.credit = 0;

	updateq.first_boot = 0;
	updateq.periodic = 0;
	updateq.reconnection = 0;
	updateq.manual_connection = 0;
	updateq.downlink_issue = 0;

	updateq.battery_status = battery_status;

	var errr = "";
	connectioncwms.query(sql, [insertq, updateq, device_id], function selectCb(err, results, fields) {
		if (err) {
			errr = err;
			console.log(err);
		} else {
			console.log("DATA STORED ......");
		}
	});

	var date = new Date();
	var time = date.getTime();
	const path = require("path");
	var file = date.getUTCFullYear() + "-" + (date.getUTCMonth() + 1) + "-" + date.getUTCDate() + "-kerlink-cwms.txt";
	fs.exists(path.normalize(__dirname + "/../logs/" + file), function (exist) {
		if (exist) {
			var str = time + "," + JSON.stringify(data);
			fs.appendFile(
				path.normalize(__dirname + "/../logs/" + file),
				"\r\n" + JSON.stringify(insertq) + "\r\n" + JSON.stringify(updateq) + "\r\n" + JSON.stringify(errr),
				function (err1) {
					if (err1) console.log(err1);
				}
			);
			var mess = { error: 0, message: "Task Added Successfully!", result: 1 };
			res.send(JSON.stringify(mess));
		} else {
			fs.writeFile(path.normalize(__dirname + "/../logs/" + file), "--- Start Logging ---", function (err2) {
				if (err2) console.log(err2);
				console.log("NEW LOG FILE CREATED!");
			});
			var mess = { error: 0, message: "Task Added Successfully!", result: 1 };
			res.send(JSON.stringify(mess));
		}
	});
}

function HexToRevDecimal(data) {
	var _arr = new Array();
	for (var i = 0; i < 4; i++) {
		_arr.push(data.substr(i * 2, 2));
	}
	return HexToDecimal(_arr.reverse().join(""));
}

router.post("/dataDownEvent", function (req, res, next) {
	var param = req.body;

	console.log("POST DATA");

	var data = {
		data: param,
	};

	var date = new Date();
	var time = date.getTime();
	const path = require("path");
	var file = date.getUTCFullYear() + "-" + (date.getUTCMonth() + 1) + "-" + date.getUTCDate() + "-kerlink.txt";
	fs.exists(path.normalize(__dirname + "/../logs/" + file), function (exist) {
		if (exist) {
			var str = time + "," + JSON.stringify(data);
			fs.appendFile(path.normalize(__dirname + "/../logs/" + file), "\r\n" + str, function (err1) {
				if (err1) console.log(err1);
			});
			var mess = { error: 0, message: "Task Added Successfully!", result: 1 };
			res.send(JSON.stringify(mess));
		} else {
			fs.writeFile(path.normalize(__dirname + "/../logs/" + file), "--- Start Logging ---", function (err2) {
				if (err2) console.log(err2);
				console.log("NEW LOG FILE CREATED!");
			});
			var mess = { error: 0, message: "Task Added Successfully!", result: 1 };
			res.send(JSON.stringify(mess));
		}
	});
});

router.post("/cwmsDataUp", function (req, res, next) {
	var param = req.body;

	console.log("POST DATA");

	var data = {
		data: param,
	};

	var insertq = {};
	if (param.endDevice.devEui) {
		// kerlink
		insertq = {
			trans_id: 1,
			device_id: param.endDevice.devEui,
			payload: param.payload,
			timestamp: moment(param.recvTime).format("YYYY-MM-DD HH:mm:ss"),
		};

		console.log(param.payload.length);
		if (param.payload.length == 42) {
			cwmsDecodeAxioma(param, res);
			return;
		}
		if (param.payload.length == 26) {
			cwmsDecodeBecox(param, res);
			return;
		}
	} else {
		insertq = {
			trans_id: 1,
			//device_id: param.DevEUI_uplink.DevEUI,
			//payload: param.DevEUI_uplink.payload_hex,
			//timestamp: moment(param.DevEUI_uplink.Time).format('YYYY-MM-DD HH:mm:ss')
		};
	}
	if (param.payload == 0) {
		return;
	}
	var hexPayload = param.payload;

	var binaryMeterStatus = HexToBinary(hexPayload.substr(24, 2));
	//insertq.TariffStep = binaryMeterStatus.substr(binaryMeterStatus.length - 3, 3);
	//insertq.IsBackupCredit = binaryMeterStatus.substr(binaryMeterStatus.length - 5, 1) == "1";
	//insertq.valve_status = binaryMeterStatus.substr(binaryMeterStatus.length - 6, 1); // changes
	//insertq.IsValveClosedByConsumerCard = binaryMeterStatus.substr(0, 1) == "1";

	//	insertq.version = parseInt(hexPayload.substr(30, 2), 10);

	var meterType = parseInt(hexPayload.substr(26, 1));

	//	insertq.PenaltyStatus = parseInt(hexPayload.substr(20, 2));

	var binaryPenalties = HexToBinary(hexPayload.substr(20, 2));
	insertq.meter_cover_opened = parseInt(binaryPenalties.substr(7, 1));
	insertq.fitting_removed = parseInt(binaryPenalties.substr(6, 1));
	insertq.magnetic_affected = parseInt(binaryPenalties.substr(5, 1));
	insertq.battery_cover_opened = parseInt(binaryPenalties.substr(4, 1));
	insertq.leakage_penalty = parseInt(binaryPenalties.substr(3, 1));
	//	insertq.IsFireModeActivated = parseInt(binaryPenalties.substr(2, 1));
	//	insertq.IsValveClosedByConsumerCard = parseInt(binaryPenalties.substr(1, 1));
	insertq.meter_disabled = parseInt(binaryPenalties.substr(0, 1));

	//	insertq.WarningStatus = parseInt(hexPayload.substr(22, 2));

	var binaryWarnings = HexToBinary(hexPayload.substr(22, 2));

	//	insertq.IsCriticCredit = binaryWarnings.substr(7, 1) == "1";
	//	insertq.IsValveMalfunction = binaryWarnings.substr(6, 1) == "1";
	//	insertq.IsPulseMalfunction = binaryWarnings.substr(5, 1) == "1";
	//	insertq.IsLeakageWarning = binaryWarnings.substr(4, 1) == "1";
	insertq.reverse_flow = binaryWarnings.substr(3, 1) == "1";
	insertq.battery_dead = binaryWarnings.substr(2, 1) == "1";
	//	insertq.IsOveralConsumption = binaryWarnings.substr(1, 1) == "1";
	//	insertq.IsMaximumFlowRate = binaryWarnings.substr(0, 1) == "1";

	var creditDivider = 0;
	var divider = 0;

	creditDivider = Math.pow(10, parseInt(hexPayload.substr(19, 1)));
	divider = Math.pow(10, parseInt(hexPayload.substr(18, 1)));

	insertq.reading = parseInt(HexToRev2Decimal(hexPayload.substr(2, 8))) / divider;
	insertq.credit = parseInt(HexToRev2Decimal(hexPayload.substr(10, 8))) / creditDivider;

	insertq.first_boot = 0;
	insertq.periodic = 0;
	insertq.reconnection = 0;
	insertq.manual_connection = 0;
	insertq.downlink_issue = 0;
	var connectionType = hexPayload.substr(27, 1);
	switch (connectionType) {
		case "0":
			insertq.first_boot = "1";
			break;
		case "1":
			insertq.periodic = "1";
			break;
		case "2":
			insertq.reconnection = "1";
			break;
		case "3":
			insertq.manual_connection = "1";
			break;
	}

	var binaryBatteryStatus = HexToDecimal(hexPayload.substr(28, 2));
	insertq.battery_status = parseInt(binaryBatteryStatus) / 10;

	var sql = "INSERT INTO trans_received_data SET ?, insert_time=NOW();";
	sql += "UPDATE trans_last_data SET ?, update_time = NOW() WHERE device_id=?;";

	var device_id = param.endDevice.devEui;
	var updateq = {
		payload: param.payload,
		timestamp: moment(param.recvTime).format("YYYY-MM-DD HH:mm:ss"),
	};
	updateq.meter_cover_opened = parseInt(binaryPenalties.substr(7, 1));
	updateq.fitting_removed = parseInt(binaryPenalties.substr(6, 1));
	updateq.magnetic_affected = parseInt(binaryPenalties.substr(5, 1));
	updateq.battery_cover_opened = parseInt(binaryPenalties.substr(4, 1));
	updateq.leakage_penalty = parseInt(binaryPenalties.substr(3, 1));
	updateq.meter_disabled = parseInt(binaryPenalties.substr(0, 1));

	updateq.reverse_flow = binaryWarnings.substr(3, 1) == "1";
	updateq.battery_dead = binaryWarnings.substr(2, 1) == "1";

	updateq.reading = parseInt(HexToRev2Decimal(hexPayload.substr(2, 8))) / divider;
	updateq.credit = parseInt(HexToRev2Decimal(hexPayload.substr(10, 8))) / creditDivider;

	updateq.first_boot = 0;
	updateq.periodic = 0;
	updateq.reconnection = 0;
	updateq.manual_connection = 0;
	updateq.downlink_issue = 0;

	switch (connectionType) {
		case "0":
			updateq.first_boot = "1";
			break;
		case "1":
			updateq.periodic = "1";
			break;
		case "2":
			updateq.reconnection = "1";
			break;
		case "3":
			updateq.manual_connection = "1";
			break;
	}

	updateq.battery_status = parseInt(binaryBatteryStatus) / 10;

	connectioncwms.query(sql, [insertq, updateq, device_id], function selectCb(err, results, fields) {
		if (err) {
			console.log(err);
		} else {
			console.log("DATA STORED ......");
		}
	});

	var date = new Date();
	var time = date.getTime();
	const path = require("path");
	var file = date.getUTCFullYear() + "-" + (date.getUTCMonth() + 1) + "-" + date.getUTCDate() + "-kerlink-cwms.txt";
	fs.exists(path.normalize(__dirname + "/../logs/" + file), function (exist) {
		if (exist) {
			var str = time + "," + JSON.stringify(data);
			fs.appendFile(path.normalize(__dirname + "/../logs/" + file), "\r\n" + str, function (err1) {
				if (err1) console.log(err1);
			});
			var mess = { error: 0, message: "Task Added Successfully!", result: 1 };
			res.send(JSON.stringify(mess));
		} else {
			fs.writeFile(path.normalize(__dirname + "/../logs/" + file), "--- Start Logging ---", function (err2) {
				if (err2) console.log(err2);
				console.log("NEW LOG FILE CREATED!");
			});
			var mess = { error: 0, message: "Task Added Successfully!", result: 1 };
			res.send(JSON.stringify(mess));
		}
	});
});

router.post("/cwmsDataDownEvent", function (req, res, next) {
	var param = req.body;

	console.log("POST DATA");

	var data = {
		data: param,
	};

	var date = new Date();
	var time = date.getTime();
	const path = require("path");
	var file = date.getUTCFullYear() + "-" + (date.getUTCMonth() + 1) + "-" + date.getUTCDate() + "-kerlink-cwms.txt";
	fs.exists(path.normalize(__dirname + "/../logs/" + file), function (exist) {
		if (exist) {
			var str = time + "," + JSON.stringify(data);
			fs.appendFile(path.normalize(__dirname + "/../logs/" + file), "\r\n" + str, function (err1) {
				if (err1) console.log(err1);
			});
			var mess = { error: 0, message: "Task Added Successfully!", result: 1 };
			res.send(JSON.stringify(mess));
		} else {
			fs.writeFile(path.normalize(__dirname + "/../logs/" + file), "--- Start Logging ---", function (err2) {
				if (err2) console.log(err2);
				console.log("NEW LOG FILE CREATED!");
			});
			var mess = { error: 0, message: "Task Added Successfully!", result: 1 };
			res.send(JSON.stringify(mess));
		}
	});
});

router.get("/dev", function (req, res, next) {
	var sql = "SELECT count(id) as total FROM master_device";
	POOLDB[req.hostname].getConnection(function (err, connection) {
		if (err) console.log(err);

		connection.query(sql, function (error, result) {
			connection.release();

			if (error) {
				console.log(error);
				var mess = { error: 1, message: "Issue!", result: 0 };
				res.send(JSON.stringify(mess));
			} else {
				if (result.length > 0) {
					var mess = { error: 1, message: "ok! " + result[0]["total"], result: 0 };
					res.send(JSON.stringify(mess));
				} else {
					var mess = { error: 2, message: "failed!", result: 0 };
					res.send(JSON.stringify(mess));
				}
			}
		});
	});
});

router.get("/api/", function (req, res, next) {
	res.render("index", { title: "Express API" });
});
router.get("/downlink", function (req, res, next) {
	const https = require("https");
	const crypto = require("crypto");
	const moment = require("moment");

	// ----------------------------------
	// INPUT PARAMETERS (Please update them before running this script)
	// ----------------------------------

	const DOWNLINK_HOSTNAME = "api.thingpark.com";
	const DOWNLINK_PATH = "/thingpark/lrc/rest/downlink";

	const AS_KEY = "a2d546b6c9db8fe03b05abf51d59ae8f";
	const AS_ID = "TWA_100047233.56086.AS";

	const DevEUI = "506F9800000052C8";
	const FPort = 7;
	const Payload = "0103"; // Abeeway Position On Demand command
	const Confirmed = false; // optional, Possible values: Ture|False
	const FlushDownlinkQueue = false; // optional, Possible values: Ture|False
	const ValidityTime = undefined; // optional, Example: "2018-10-17T16:38:46.882+02:00"
	const CorrelationID = undefined; // optional, Example: "1234"

	// ----------------------------------

	// ----------------------------------
	// Creating the query_string that is part of the request URL and is used to generate the token
	// ----------------------------------

	// 'DevEUI', 'FPort' and 'Payload' are mandatory part of the query_string
	query_string = "DevEUI=" + DevEUI + "&FPort=" + FPort.toString() + "&Payload=" + Payload;

	// 'Confirmed', 'FlushDownlinkQueue' and 'ValidityTime' are optional part of the query_string
	if (Confirmed) {
		query_string += "&Confirmed=1";
	}
	if (FlushDownlinkQueue) {
		query_string += "&FlushDownlinkQueue=1";
	}
	if (ValidityTime) {
		query_string += "&ValidityTime=" + ValidityTime;
	}

	// 'AS_ID' and 'Time' are mandatory part of the query_string
	Time = moment().format();
	query_string += "&AS_ID=" + AS_ID + "&Time=" + Time;

	// 'CorrelationID' is optional part of the query_string
	if (CorrelationID) {
		query_string += "&CorrelationID=" + CorrelationID;
	}

	// 'Token' is mandatory part of the query_string
	Token = crypto
		.createHash("sha256")
		.update(query_string + AS_KEY)
		.digest("hex");
	query_string += "&Token=" + Token;

	// The 'Time' parameter within the query_string includes ':' and '+' characters that have to be encoded
	query_string = query_string.replace(/\:/gi, "%3A").replace(/\+/gi, "%2B");

	// ----------------------------------

	console.log(query_string);

	const reqs = https.request(
		{
			hostname: DOWNLINK_HOSTNAME,
			path: DOWNLINK_PATH + "?" + query_string,
			method: "POST",
		},
		(res) => {
			console.log(`statusCode: ${res.statusCode}`);
			res.on("data", (d) => {
				console.log(d.toString(), "\n");
			});
		}
	);

	reqs.on("error", (error) => {
		console.error(error);
	});

	reqs.write("");
	reqs.end();
	res.render("index", { title: "Lora Downlink" });
});

router.get(
	"/api/promise",
	function (req, res, next) {
		let promise = new Promise(function (resolve, reject) {
			setTimeout(() => resolve({ msg: "To do some more job" }), 1000);
		})
			.then(function (result) {
				console.log(">>>> ");
				new Promise(function (resolve, reject) {
					resolve();
				}).then(function (result) {
					console.log(">>> >>>> >>> >>>> FINISH ");
				});
				console.log(">>>> >>>> ");
			})
			.then(function (result) {
				console.log(">>>> >>>> >>>>");
				res.data = "333";
				next();
				//return {data: 'some other data'+result};
			});
	},
	function (req, res, next) {
		console.log("FINISH 2 " + res.data);
		res.data = "FUNCTION 2";
		next();
	},
	function (req, res, next) {
		console.log("FINISH 3 " + res.data);
		res.send("FFF");
	}
);

function saveUserActivity(req, res, next) {
	console.log("------ SAVE USER ACTIVITY ------ " + req.user_id + " " + req.url);
	if (!req.user_id) {
		next();
	} else {
		POOLDB[req.hostname].getConnection(function (err, connection) {
			if (err) {
				console.log(err);
				next();
			} else {
				var insertq = {
					user_id: req.user_id,
					url: req.url,
					data: JSON.stringify(req.body),
				};
				//	console.log("INSERTING DATA "+JSON.stringify(req.body));
				var sql = "INSERT INTO user_logs SET ? , insert_time = NOW()";
				var q = connection.query(sql, insertq, function (error, result) {
					connection.release();

					//console.log(q.sql);

					next();
				});
			}
		});
	}
}

function checkAuth(req, res, next) {
	var accesskey = req.body.accesskey;

	if (!accesskey) {
		console.log("***************** Unauthorised Access! ***************");
		var mess = { error: 1, message: "Unauthorised Access!", result: 0 };
		res.send(JSON.stringify(mess));
	} else {
		//var accesskey = req.body.accesskey;

		console.log("CHK AUTH " + req.hostname + " " + accesskey);

		pool_login.getConnection(function (err, connection) {
			if (err) console.log(err);

			var sql =
				'SELECT ap.user_id, u.permissions from access_permission ap LEFT JOIN users u ON ap.user_id=u.id WHERE ap.access_key = "' +
				accesskey +
				'" AND ap.is_valid=1;';
			connection.query(sql, function (error, result) {
				if (error) {
					console.log(error);
					connection.release();
					var mess = { error: 1, message: "Database issue. please login again!", result: 0 };
					res.send(JSON.stringify(mess));
				} else {
					if (result.length > 0) {
						console.log("------x------ LOGIN SUCCESSFULLY ------x------");
						req.user_id = result[0].user_id;
						req.permissions = JSON.parse(result[0].permissions);
						connection.release();

						next();
					} else {
						connection.release();
						console.log("!!!!!!!!!!! SECURITY ISSUE !!!!!!!!!!!!");
						var mess = {
							error: 2,
							message: "Session Timeout. For security reason, please login again!",
							result: 0,
						};
						res.send(JSON.stringify(mess));
					}
				}
			});
		});
	}
}
router.get("/api/test", function (req, res, next) {
	/*var sql1 = "SELECT IFNULL(dld.supply, '') as supply, IFNULL(dld.update_time, '') as update_time FROM master_device as md LEFT JOIN device_last_data as dld ON dld.imei_no = md.imei_no;";
	var sql2 = "SELECT IFNULL(tld.on_off_status, '') as on_off_status, IFNULL(tld.update_time, '') as update_time FROM master_controller as mc LEFT JOIN trans_last_data as tld ON tld.unique_id = mc.unique_id;"
	conn.query(sql1+sql2, function (error, result, fields) {
	  	if (error) {
	  		console.log(error);
	  	}
	  	var o = {'devices': result[0], 'controllers': result[1]};
	 	var mess = {'error':0,'message':'Master devices!','result':o};
		res.send(JSON.stringify(mess));
	})*/
	const path = require("path");
	console.log(path.join(__dirname, "../public"));
	var imeino = "869247044265780"; //req.body.imeino;
	if (imeino != "") {
		var unique_id = new Date().getTime();
		var date = "02-06-2020";
		var tmppath = path.join(__dirname, "../public/exports/report-ulb-" + date + "-" + unique_id + ".csv");
		var filepath = tmppath.replace(/\\/g, "/");

		var sql =
			"SELECT 'SUPPLY','VOLTAGE R','VOLTAGE Y','VOLTAGE B','AMP R','AMP Y','AMP B','KW R','KW Y','KW B','KWH','TOTAL KW','UPDATE TIME','DOOR STATUS','OUTPUT STATUS' UNION ALL SELECT supply, voltage_r, voltage_y, voltage_b, amp_r, amp_y, amp_b, kw_r, kw_y, kw_b, kwh, total_kw, update_time, door_status, output_status FROM device_received_data_clone WHERE imei_no='" +
			imeino +
			"' INTO OUTFILE '" +
			filepath +
			"' FIELDS TERMINATED BY ',' LINES TERMINATED BY '\n';";

		conn.query(sql, function (err, result, fields) {
			if (err) {
				console.log(err);
				var mess = { error: 1, message: "Error in Export Database!", result: "" };
				res.send(JSON.stringify(mess));
			} else {
				var insertq = {
					user_id: user_id,
					tyep: "Device Report",
					report_id: imeino,
					records: result.affectedRows - 1,
					status: "1",
				};
				var sql = "INSERT INTO daily_reports SET ? , insert_time = NOW()";

				conn.query(sql, insertq, function (err, rows, fields) {
					if (err) {
						console.log(err);
						var mess = { error: 1, message: "Error in Export Database!", result: "" };
						res.send(JSON.stringify(mess));
					} else {
						var mess = { error: 0, message: "Device records!", result: "" };
						res.send(JSON.stringify(mess));
					}
				});
			}
		});
	} else {
		var mess = { error: 1, message: "Failed!", result: [] };
		res.send(JSON.stringify(mess));
	}
});
router.post("/api/get-feeder-pillar", checkAuth, function (req, res, next) {
	var fp_no = req.body.fp_no;
	var state = req.body.state.replace("-", "_").toUpperCase();
	var user_id = req.user_id;

	console.log(">>>> " + state + " " + POOLDB[eval(state)]);

	if (fp_no > 0) {
		POOLDB[eval(state)].getConnection(function (err, connection) {
			if (err) console.log(err);

			var sql =
				'SELECT imei_no, location, state_id, ulb_id FROM master_location WHERE feeder_pillar_no="' +
				fp_no +
				'"';

			connection.query(sql, function (error, result) {
				connection.release();

				if (error) {
					var mess = { error: 1, message: "Error!", result: 0 };
					res.send(JSON.stringify(mess));
				} else {
					var mess = { error: 0, message: "Load Feeder Pillar Successfully!", result: result[0] };
					res.send(JSON.stringify(mess));
				}
			});
		});
	} else {
		var mess = { error: 1, message: "Failed!", result: 0 };
		res.send(JSON.stringify(mess));
	}
});
router.post("/api/dashboard", checkAuth, function (req, res, next) {
	var perms = req.permissions;
	console.log("PERMISSION STATE: " + perms.state_perm);
	var state_perm = perms.state_perm;
	if (empty(perms.state_perm)) {
		state_perm = req.body.state_perm;
	}
	console.log("HOST NAME " + req.hostname + " " + state_perm);
	POOLDB[req.hostname].getConnection(function (err, connection) {
		if (err) console.log(err);

		var sql = "";
		if (!empty(state_perm)) {
			//sql = "SELECT IFNULL(dld.supply, '') as supply, IFNULL(dld.update_time, '') as update_time FROM master_device as md LEFT JOIN device_last_data as dld ON dld.imei_no = md.imei_no LEFT JOIN master_location ml ON ml.feeder_pillar_no=md.feeder_pillar_no WHERE ml.state_id='"+state_perm+"';";
			/*sql += "SELECT ru.ulb_id, mz.state as state_id, mz.parent as zone_id, mz.previous_load, mz.tariff_rate, ru.total_device, ru.total_device_loss, ru.total_controller, ru.total_controller_on, ru.total_controller_off, ru.total_controller_loss, ru.total_powercut, ru.total_load, ru.actual_load, ru.total_kwh, mz.title as ulb_title, mz.areacode ulb_areacode, ru.update_time, mz2.title zone_title, mz2.areacode zone_areacode FROM report_ulb ru LEFT JOIN master_zone mz ON ru.ulb_id=mz.id LEFT JOIN master_zone mz2 ON mz.parent = mz2.id WHERE mz2.state='"+state_perm+"';";*/
			sql +=
				"SELECT ru.ulb_id, mz.state as state_id, mc.title as city_title, mc.areacode as city_code, mz.parent as zone_id, mz.previous_load, mz.tariff_rate, ru.total_device, ru.total_device_on, ru.total_device_off, ru.total_device_loss, ru.total_controller, ru.total_controller_on, ru.total_controller_off, ru.total_controller_loss, ru.total_powercut, ru.total_manual_on, ru.total_load, ru.actual_load, ru.total_kwh, mz.title as ulb_title, mz.areacode ulb_areacode, ru.update_time, mz.title zone_title, mz.areacode zone_areacode FROM report_ulb ru LEFT JOIN master_zone mz ON ru.ulb_id=mz.id LEFT JOIN master_city mc ON mc.id=mz.city WHERE mz.state='" +
				state_perm +
				"';";
			sql +=
				"SELECT mz.id, mz.title, mz.areacode, mc.title as city_title, mc.areacode as city_code FROM master_zone mz LEFT JOIN master_city mc ON mz.city=mc.id WHERE mz.state='" +
				state_perm +
				"';";
		} else {
			//sql = "SELECT IFNULL(dld.supply, '') as supply, IFNULL(dld.update_time, '') as update_time FROM master_device as md LEFT JOIN device_last_data as dld ON dld.imei_no = md.imei_no;";
			/*sql += "SELECT ru.ulb_id, mz.state as state_id, mz.parent as zone_id, mz.previous_load, mz.tariff_rate, ru.total_device, ru.total_device_loss, ru.total_controller, ru.total_controller_on, ru.total_controller_off, ru.total_controller_loss, ru.total_powercut, ru.total_load, ru.actual_load, ru.total_kwh, mz.title as ulb_title, mz.areacode ulb_areacode, ru.update_time, mz2.title zone_title, mz2.areacode zone_areacode FROM report_ulb ru LEFT JOIN master_zone mz ON ru.ulb_id=mz.id LEFT JOIN master_zone mz2 ON mz.parent = mz2.id;";*/
			sql +=
				"SELECT ru.ulb_id, mz.state as state_id, mc.title as city_title, mc.areacode as city_code, mz.parent as zone_id, mz.previous_load, mz.tariff_rate, ru.total_device, ru.total_device_on, ru.total_device_off, ru.total_device_loss, ru.total_controller, ru.total_controller_on, ru.total_controller_off, ru.total_controller_loss, ru.total_powercut, ru.total_manual_on, ru.total_load, ru.actual_load, ru.total_kwh, mz.title as ulb_title, mz.areacode ulb_areacode, ru.update_time, mz.title zone_title, mz.areacode zone_areacode FROM report_ulb ru LEFT JOIN master_zone mz ON ru.ulb_id=mz.id LEFT JOIN master_city mc ON mc.id=mz.city;";
			sql +=
				"SELECT mz.id, mz.title, mz.areacode, mc.title as city_title, mc.areacode as city_code FROM master_zone mz LEFT JOIN master_city mc ON mz.city=mc.id;";
		}

		connection.query(sql, function (error, result) {
			connection.release();

			if (error) {
				console.log(error);
			}
			//var o = {'devices': result[0], 'records':result[1], 'zones':result[2]};
			var o = { records: result[0], zones: result[1] };
			var mess = { error: 0, message: "Master devices!", result: o };
			res.send(JSON.stringify(mess));
		});
	});
});

router.post("/api/livedata", checkAuth, function (req, res, next) {
	var perms = req.permissions;
	console.log("PERMISSION STATE: " + perms.state_perm);
	var state_perm = perms.state_perm;
	if (empty(perms.state_perm)) {
		state_perm = req.body.state_perm;
	}
	var sql = "";
	if (!empty(state_perm)) {
		sql =
			"SELECT IFNULL(dld.supply, '') as supply, IFNULL(dld.update_time, '') as update_time FROM master_device as md LEFT JOIN device_last_data as dld ON dld.imei_no = md.imei_no LEFT JOIN master_location ml ON ml.feeder_pillar_no=md.feeder_pillar_no WHERE ml.state_id='" +
			state_perm +
			"';";
		sql +=
			"SELECT IFNULL(tld.on_off_status, '') as on_off_status, IFNULL(tld.update_time, '') as update_time FROM master_controller as mc LEFT JOIN controller_last_data as tld ON tld.unique_id = mc.unique_id;";
		sql +=
			"SELECT ru.ulb_id, mz.state as state_id, mz.parent as zone_id, ru.total_device, ru.total_device_loss, ru.total_controller, ru.total_controller_on, ru.total_controller_off, ru.total_controller_loss, ru.total_powercut, ru.total_load, ru.actual_load, ru.total_kwh, mz.title as ulb_title, mz.areacode ulb_areacode, ru.update_time, mz2.title zone_title, mz2.areacode zone_areacode FROM report_ulb ru LEFT JOIN master_zone mz ON ru.ulb_id=mz.id LEFT JOIN master_zone mz2 ON mz.parent = mz2.id WHERE mz2.state='" +
			state_perm +
			"';";
		sql += "SELECT id, title, areacode FROM master_zone WHERE parent=0 AND state='" + state_perm + "';";
	}

	conn.query(sql, function (error, result, fields) {
		if (error) {
			console.log(error);
		} //'total_ulb': result[0][0].total_ulb,
		var o = { devices: result[0], controllers: result[1], records: result[2], zones: result[3] };
		var mess = { error: 0, message: "Master devices!", result: o };
		res.send(JSON.stringify(mess));
	});
});

router.post("/api/search-device", checkAuth, saveUserActivity, function (req, res, next) {
	var searchtxt = req.body.imei_no;
	POOLDB[req.hostname].getConnection(function (err, connection) {
		if (err) console.log(err);

		var sql = "";
		if (searchtxt.length == 15) {
			sql =
				"SELECT md.id, md.imei_no, md.mobile_no, md.feeder_pillar_no, md.device_type, md.device_no, ml.state_id, mz.areacode, ml.zone_id, ml.location, ml.meter_type, ml.previous_load, (SELECT title from master_zone WHERE id = ml.zone_id) as zone_title, ml.ulb_id, ml.total_connection as connections, ml.ward_no, mz.title as ulb_title, ml.total_load, ml.no_of_poles, ml.no_of_fittings, ml.location_lat, ml.location_lng, ml.led_18w, ml.led_20w, ml.led_24w, ml.led_32w, ml.led_35w, ml.led_40w, ml.led_45w, ml.led_50w, ml.led_60w, ml.led_70w, ml.led_72w, ml.led_75w, ml.led_80w, ml.led_90w, ml.led_100w, ml.led_110w, ml.led_120w, ml.led_130w, ml.led_140w, ml.led_150w, ml.led_190w, ml.led_200w, ml.led_250w, ml.led_400w, IFNULL(dld.total_kw, '') as total_kw, IFNULL(dld.supply, '') as supply, dld.data_stamp, IFNULL(dld.update_time, '') as update_time, dld.meter_no as sys_meter_no, dld.door_status, dld.output_status, dld.datalength FROM master_device as md LEFT JOIN master_location as ml ON ml.feeder_pillar_no = md.feeder_pillar_no LEFT JOIN master_zone as mz ON ml.ulb_id = mz.id LEFT JOIN (SELECT update_time, imei_no, supply, datalength, total_kw, meter_no, door_status, output_status, DATE_FORMAT(data_stamp, '%Y-%m-%d %H:%i:%s') as data_stamp FROM device_last_data ) dld ON dld.imei_no=md.imei_no WHERE md.imei_no='" +
				searchtxt +
				"';";
		} else if (searchtxt.length <= 6 && searchtxt.length >= 4) {
			sql =
				"SELECT md.id, md.imei_no, md.mobile_no, md.feeder_pillar_no, md.device_type, md.device_no, ml.state_id, mz.areacode, ml.zone_id, ml.location, ml.meter_type, ml.previous_load, (SELECT title from master_zone WHERE id = ml.zone_id) as zone_title, ml.ulb_id, ml.total_connection as connections, ml.ward_no, mz.title as ulb_title, ml.total_load, ml.no_of_poles, ml.no_of_fittings, ml.location_lat, ml.location_lng, ml.led_18w, ml.led_20w, ml.led_24w, ml.led_32w, ml.led_35w, ml.led_40w, ml.led_45w, ml.led_50w, ml.led_60w, ml.led_70w, ml.led_72w, ml.led_75w, ml.led_80w, ml.led_90w, ml.led_100w, ml.led_110w, ml.led_120w, ml.led_130w, ml.led_140w, ml.led_150w, ml.led_190w, ml.led_200w, ml.led_250w, ml.led_400w, IFNULL(dld.total_kw, '') as total_kw, IFNULL(dld.supply, '') as supply, dld.data_stamp, IFNULL(dld.update_time, '') as update_time, dld.meter_no as sys_meter_no, dld.door_status, dld.output_status, dld.datalength FROM master_device as md LEFT JOIN master_location as ml ON ml.feeder_pillar_no = md.feeder_pillar_no LEFT JOIN master_zone as mz ON ml.ulb_id = mz.id LEFT JOIN (SELECT update_time, imei_no, supply, datalength, total_kw, meter_no, door_status, output_status, DATE_FORMAT(data_stamp, '%Y-%m-%d %H:%i:%s') as data_stamp FROM device_last_data ) dld ON dld.imei_no=md.imei_no WHERE ml.feeder_pillar_no='" +
				searchtxt +
				"';";
		} else if (searchtxt.length <= 13 && searchtxt.length >= 10) {
			sql =
				"SELECT md.id, md.imei_no, md.mobile_no, md.feeder_pillar_no, md.device_type, md.device_no, ml.state_id, mz.areacode, ml.zone_id, ml.location, ml.meter_type, ml.previous_load, (SELECT title from master_zone WHERE id = ml.zone_id) as zone_title, ml.ulb_id, ml.total_connection as connections, ml.ward_no, mz.title as ulb_title, ml.total_load, ml.no_of_poles, ml.no_of_fittings, ml.location_lat, ml.location_lng, ml.led_18w, ml.led_20w, ml.led_24w, ml.led_32w, ml.led_35w, ml.led_40w, ml.led_45w, ml.led_50w, ml.led_60w, ml.led_70w, ml.led_72w, ml.led_75w, ml.led_80w, ml.led_90w, ml.led_100w, ml.led_110w, ml.led_120w, ml.led_130w, ml.led_140w, ml.led_150w, ml.led_190w, ml.led_200w, ml.led_250w, ml.led_400w, IFNULL(dld.total_kw, '') as total_kw, IFNULL(dld.supply, '') as supply, dld.data_stamp, IFNULL(dld.update_time, '') as update_time, dld.meter_no as sys_meter_no, dld.door_status, dld.output_status, dld.datalength FROM master_device as md LEFT JOIN master_location as ml ON ml.feeder_pillar_no = md.feeder_pillar_no LEFT JOIN master_zone as mz ON ml.ulb_id = mz.id LEFT JOIN (SELECT update_time, imei_no, supply, datalength, total_kw, meter_no, door_status, output_status, DATE_FORMAT(data_stamp, '%Y-%m-%d %H:%i:%s') as data_stamp FROM device_last_data ) dld ON dld.imei_no=md.imei_no WHERE md.mobile_no='" +
				searchtxt +
				"';";
		} else {
		}

		connection.query(sql, function (error, result) {
			connection.release();

			if (error) {
				console.log(error);
			}
			var mess = { error: 0, message: "Master devices!", result: [] };

			if (result.length > 0) {
				mess = { error: 0, message: "Master devices!", result: result[0] };
			}

			res.send(JSON.stringify(mess));
		});
	});
});
/************************************************* CCMS METHODS START *****************************************/

router.post("/api/masterdevices", checkAuth, function (req, res, next) {
	/*var sql = "SELECT md.id, md.imei_no, md.state_id, md.zone_id, (SELECT title from master_zone WHERE id = md.zone_id) as zone_title, md.ulb_id, md.feeder_piller_no, count(mc.unique_id) as connections, md.ward_no, md.ccms_no, mz.title as ulb_title, md.total_load, md.no_of_poles, md.no_of_fittings, IFNULL(dld.total_kw, '') as total_kw, IFNULL(dld.supply, '') as supply, dld.data_stamp, IFNULL(dld.update_time, '') as update_time, dld.door_status, dld.output_status FROM master_device as md LEFT JOIN master_controller as mc ON md.imei_no = mc.imei_no LEFT JOIN master_zone as mz ON md.ulb_id = mz.id LEFT JOIN (SELECT update_time, imei_no, supply, total_kw, door_status, output_status, DATE_FORMAT(data_stamp, '%Y-%m-%d %H:%i:%s') as data_stamp FROM device_last_data ) dld ON dld.imei_no=md.imei_no GROUP BY md.imei_no";*/
	pool.getConnection(function (err, connection) {
		if (err) console.log(err);

		var sql =
			"SELECT md.id, md.imei_no, md.feeder_pillar_no, md.device_type, md.device_no, ml.state_id, ml.zone_id, (SELECT title from master_zone WHERE id = ml.zone_id) as zone_title, ml.ulb_id, ml.total_connection as connections, ml.ward_no, mz.title as ulb_title, ml.total_load, ml.no_of_poles, ml.no_of_fittings, ml.location_lat, ml.location_lng, IFNULL(dld.total_kw, '') as total_kw, IFNULL(dld.supply, '') as supply, dld.data_stamp, IFNULL(dld.update_time, '') as update_time, dld.door_status, dld.output_status FROM master_device as md LEFT JOIN master_location as ml ON ml.feeder_pillar_no = md.feeder_pillar_no LEFT JOIN master_zone as mz ON ml.ulb_id = mz.id LEFT JOIN (SELECT update_time, imei_no, supply, total_kw, door_status, output_status, DATE_FORMAT(data_stamp, '%Y-%m-%d %H:%i:%s') as data_stamp FROM device_last_data ) dld ON dld.imei_no=md.imei_no GROUP BY md.imei_no;";

		connection.query(sql, function (error, result) {
			connection.release();

			if (error) {
				console.log(error);
			}
			var mess = { error: 0, message: "Master devices!", result: result[0] };
			res.send(JSON.stringify(mess));
		});
	});
});
router.post("/api/master-reload", checkAuth, function (req, res, next) {
	var sql =
		"SELECT " +
		"md.id, " +
		"md.imei_no, " +
		"md.feeder_piller_no, " +
		"total_connections, " +
		"md.ward_no, " +
		"md.ccms_no, " +
		"IFNULL(mz.location, '') as zone_location, " +
		"md.total_load, " +
		"md.no_of_poles, " +
		"md.no_of_fittings, " +
		"IFNULL(dld.total_kw, '') as total_kw, " +
		"IFNULL(dld.supply, '') as supply, " +
		"dld.data_stamp, " +
		"IFNULL(dld.update_time, '') as update_time, " +
		"dld.door_status, " +
		"dld.output_status " +
		"FROM master_device as md " +
		"LEFT JOIN master_controller as mc " +
		"ON md.imei_no = mc.imei_no " +
		"LEFT JOIN master_zone as mz " +
		"ON md.zone_id = mz.id " +
		"LEFT JOIN (SELECT update_time, imei_no, supply, total_kw, door_status, output_status, DATE_FORMAT(data_stamp, '%Y-%m-%d %H:%i:%s') as data_stamp FROM device_last_data ) dld " +
		"ON dld.imei_no=md.imei_no " +
		"GROUP BY md.imei_no";

	conn.query(sql, function (err, rows, fields) {
		if (err) {
			console.log(err);
		}
		var mess = { error: 0, message: "Master devices!", result: rows };
		res.send(JSON.stringify(mess));
	});
});

router.post("/api/consumption", checkAuth, function (req, res, next) {
	var ulb = req.body.ulb;

	console.log("ULB CONSUMPTION: " + ulb);

	var datefrom = req.body.datefrom;
	var dateto = req.body.dateto;

	var sql =
		"SELECT feeder_pillar_no, IFNULL(consumer_no, '') as consumer_no, imei_no, REPLACE(location, ',', '') as location, meter_no, no_of_fittings FROM master_location WHERE ulb_id=" +
		ulb +
		";";
	sql +=
		"SELECT imei_no, kwh, meter_no, DATE_FORMAT(update_time, '%Y-%m-%d') as update_time FROM consumption_daily WHERE ulb_id=" +
		ulb +
		" AND update_time >= DATE('" +
		datefrom +
		" 00:00:01') AND update_time <= DATE_ADD('" +
		dateto +
		" 00:00:01', INTERVAL 1 DAY);";
	//sql += "SELECT imei_no, kwh, meter_no, DATE_FORMAT(update_time, '%Y-%m-%d') as update_time FROM consumption_daily WHERE ulb_id="+ulb+" AND update_time > DATE_SUB('"+datefrom+"',INTERVAL 7 DAY);";

	POOLDB[req.hostname].getConnection(function (err, connection) {
		if (err) console.log(err);

		connection.query(sql, function (error, result) {
			connection.release();

			var mess = {};
			if (error) {
				console.log(error);
				mess = { error: 1, message: "Error in loading zone record!", result: [] };
			} else {
				var o = {};
				o.consumption = result[1];
				o.devices = result[0];
				o.datefrom = datefrom;
				o.dateto = datefrom;
				o.time = new Date();
				var mess = { error: 0, message: "Consumption Records!", result: o };
				res.send(JSON.stringify(mess));
			}
		});
	});
});

router.post("/api/monthlyconsumption", checkAuth, function (req, res, next) {
	var ulb = req.body.ulb;

	console.log("ULB CONSUMPTION: " + ulb);

	var sql =
		"SELECT ml.total_load, zo.title as zone, IFNULL(ml.consumer_no, '') as consumer_no, ml.feeder_pillar_no, ml.imei_no, REPLACE(ml.location, ',', '') as location, ml.meter_no, ml.no_of_fittings, ml.led_18w, ml.led_20w, ml.led_24w, ml.led_28w, ml.led_32w, ml.led_35w, ml.led_40w, ml.led_45w, ml.led_50w, ml.led_60w, ml.led_70w, ml.led_72w, ml.led_75w, ml.led_80w, ml.led_90w, ml.led_96w, ml.led_100w, ml.led_110w, ml.led_120w, ml.led_130w, ml.led_140w, ml.led_150w, ml.led_190w, ml.led_200w, ml.led_250w, ml.led_400w FROM master_location ml LEFT JOIN zones as zo ON zo.ulb_id = ml.ulb_id AND zo.id=ml.zone_id WHERE ml.ulb_id=" +
		ulb +
		";";
	//var sql = "SELECT total_load, IFNULL(consumer_no, '') as consumer_no, feeder_pillar_no, imei_no, REPLACE(location, ',', '') as location, meter_no, no_of_fittings FROM master_location WHERE ulb_id="+ulb+";";

	sql +=
		"SELECT imei_no, kwh, meter_no, DATE_FORMAT(update_time, '%Y-%m-%d') as update_time FROM consumption_monthly WHERE ulb_id=" +
		ulb +
		" AND update_time > DATE_SUB(DATE_FORMAT(NOW() ,'%Y-%m-01'),INTERVAL 8 MONTH);";

	POOLDB[req.hostname].getConnection(function (err, connection) {
		if (err) console.log(err);

		connection.query(sql, function (error, result) {
			connection.release();

			var mess = {};
			if (error) {
				console.log(error);
				mess = { error: 1, message: "Error in loading zone record!", result: [] };
			} else {
				var o = {};
				o.consumption = result[1];
				o.devices = result[0];
				o.time = new Date();
				var mess = { error: 0, message: "Consumption Records!", result: o };
				res.send(JSON.stringify(mess));
			}
		});
	});
});

router.post("/api/device-ulbs", checkAuth, function (req, res, next) {
	var ulbcode = req.body.ulbcode;

	var sql = "";

	if (!empty(perms.state_perm)) {
		sql = "SELECT * FROM master_zone WHERE areacode='" + ulbcode + "' AND state='" + perms.state_perm + "';";
	} else {
		sql = "SELECT * FROM master_zone WHERE areacode='" + ulbcode + "';";
	}

	POOLDB[req.hostname].getConnection(function (err, connection) {
		if (err) console.log(err);

		connection.query(sql, function (error, result) {
			connection.release();

			var mess = {};
			if (error) {
				console.log(error);
				mess = { error: 1, message: "Error in loading zone record!", result: [] };
			} else {
				var ulb_id = result[0]["id"];
				var zoneinfo = result[0];

				if (!empty(perms.state_perm)) {
					sql =
						"SELECT md.id, md.imei_no, md.feeder_pillar_no, md.mobile_no, md.device_type, ml.modem_type, ml.consumer_no, md.device_no, md.data_fault, dld.meter_no as sys_meter_no, dld.meter_fault, dld.door_status, COALESCE(md.fault_time, '') as fault_time, ml.state_id, ml.zone_id, ml.ulb_id, ml.ward_id, ml.meter_type, ml.phase, ml.total_connection, ml.previous_load, ml.total_load, ml.location_lat, ml.location_lng, ml.no_of_fittings, ml.location, ml.led_18w, ml.led_20w, ml.led_24w, ml.led_28w, ml.led_32w, ml.led_35w, ml.led_40w, ml.led_45w, ml.led_50w, ml.led_60w, ml.led_70w, ml.led_72w, ml.led_75w, ml.led_80w, ml.led_90w, ml.led_96w, ml.led_100w, ml.led_110w, ml.led_120w, ml.led_130w, ml.led_140w, ml.led_150w, ml.led_190w, ml.led_200w, ml.led_250w, ml.led_400w, COALESCE(dld.total_kw, 0) total_kw, dld.datalength, dld.supply, dld.amp_r, dld.amp_y, dld.amp_b, dld.kw_r, dld.kw_y, dld.kw_b, dld.kwh, dld.output_status, DATE_FORMAT(dld.data_stamp, '%Y-%m-%d %H:%i:%s') as data_stamp, dld.meter_phase_type, ml.maintenance, DATE_FORMAT(dld.update_time, '%Y-%m-%d %H:%i:%s') as update_time, DATE_FORMAT(ml.insert_time, '%Y-%m-%d %H:%i:%s') as insert_time " +
						"FROM master_device AS md " +
						"LEFT JOIN master_location AS ml ON ml.feeder_pillar_no = md.feeder_pillar_no " +
						"LEFT JOIN device_last_data AS dld ON dld.imei_no = md.imei_no " +
						"WHERE ml.ulb_id = '" +
						ulb_id +
						"' AND ml.state_id='" +
						perms.state_perm +
						"';";
				} else {
					sql =
						"SELECT md.id, md.imei_no, md.feeder_pillar_no, md.mobile_no, md.device_type, ml.modem_type, ml.consumer_no, md.device_no, md.data_fault, dld.meter_no as sys_meter_no, dld.meter_fault, dld.door_status, COALESCE(md.fault_time, '') as fault_time, ml.state_id, ml.zone_id, ml.ulb_id, ml.ward_id, ml.meter_type, ml.phase, ml.total_connection, ml.previous_load, ml.total_load, ml.location_lat, ml.location_lng, ml.no_of_fittings, ml.location, ml.led_18w, ml.led_20w, ml.led_24w, ml.led_28w, ml.led_32w, ml.led_35w, ml.led_40w, ml.led_45w, ml.led_50w, ml.led_60w, ml.led_70w, ml.led_72w, ml.led_75w, ml.led_80w, ml.led_90w, ml.led_96w, ml.led_100w, ml.led_110w, ml.led_120w, ml.led_130w, ml.led_140w, ml.led_150w, ml.led_190w, ml.led_200w, ml.led_250w, ml.led_400w, COALESCE(dld.total_kw, 0) total_kw, dld.datalength, dld.supply, dld.amp_r, dld.amp_y, dld.amp_b, dld.kw_r, dld.kw_y, dld.kw_b, dld.kwh, dld.output_status, DATE_FORMAT(dld.data_stamp, '%Y-%m-%d %H:%i:%s') as data_stamp, dld.meter_phase_type, ml.maintenance, DATE_FORMAT(dld.update_time, '%Y-%m-%d %H:%i:%s') as update_time, DATE_FORMAT(ml.insert_time, '%Y-%m-%d %H:%i:%s') as insert_time " +
						"FROM master_device AS md " +
						"LEFT JOIN master_location AS ml ON ml.feeder_pillar_no = md.feeder_pillar_no " +
						"LEFT JOIN device_last_data AS dld ON dld.imei_no = md.imei_no " +
						"WHERE ml.ulb_id = '" +
						ulb_id +
						"';";
				}

				POOLDB[req.hostname].getConnection(function (err, connection) {
					if (err) {
						console.log(err);
						var mess = { error: 1, message: "Database query error!", result: [], s: sql };
						res.send(JSON.stringify(mess));
					} else {
						connection.query(sql, function (error, result) {
							connection.release();

							var o = {};
							o.ulb_devices = result;
							o.zoneinfo = zoneinfo;
							o.time = new Date();
							var mess = { error: 0, message: "Ulb devices!", result: o };
							res.send(JSON.stringify(mess));
						});
					}
				});
			}
		});
	});
});
router.post("/api/getulbinfo", checkAuth, function (req, res, next) {
	var ulbcode = req.body.ulbcode;

	var perms = req.permissions;

	var sql = "SELECT * FROM master_zone WHERE areacode='" + ulbcode + "';";

	POOLDB[req.hostname].getConnection(function (err, connection) {
		if (err) {
			console.log(err);
			var mess = { error: 1, message: "Database query error!", result: [] };
			res.send(JSON.stringify(mess));
		} else {
			connection.query(sql, function (error, result) {
				connection.release();

				var mess = { error: 0, message: "Ulb devices!", result: result[0] };
				res.send(JSON.stringify(mess));
			});
		}
	});
});

router.post("/api/ulb-info", checkAuth, function (req, res, next) {
	var ulbcode = req.body.ulbcode;

	var perms = req.permissions;
	console.log("PERMISSION STATE: " + perms.state_perm);

	var sql = "SELECT * FROM master_zone WHERE areacode='" + ulbcode + "';";

	pool.getConnection(function (err, connection) {
		if (err) console.log(err);

		connection.query(sql, function (error, result) {
			connection.release();

			var mess = {};
			if (error) {
				console.log(error);
				mess = { error: 1, message: "Error in loading zone record!", result: [] };
			} else {
				var ulb_id = result[0]["id"];

				if (!empty(perms.state_perm)) {
					sql =
						"SELECT ml.total_load, ml.no_of_fittings, COALESCE(dld.total_kw, 0) total_kw, dld.datalength, dld.supply, dld.kwh, ml.location_lat, ml.location_lng, ml.location, dld.output_status, DATE_FORMAT(dld.update_time, '%Y-%m-%d %H:%i:%s') as update_time " +
						"FROM master_device AS md " +
						"LEFT JOIN master_location AS ml ON ml.feeder_pillar_no = md.feeder_pillar_no " +
						"LEFT JOIN device_last_data AS dld ON dld.imei_no = md.imei_no " +
						"WHERE ml.ulb_id = '" +
						ulb_id +
						"' AND ml.state_id='" +
						perms.state_perm +
						"';";
				} else {
					sql =
						"SELECT ml.total_load, ml.no_of_fittings, COALESCE(dld.total_kw, 0) total_kw, dld.datalength, dld.supply, dld.kwh, ml.location_lat, ml.location_lng, ml.location, dld.output_status, DATE_FORMAT(dld.update_time, '%Y-%m-%d %H:%i:%s') as update_time " +
						"FROM master_device AS md " +
						"LEFT JOIN master_location AS ml ON ml.feeder_pillar_no = md.feeder_pillar_no " +
						"LEFT JOIN device_last_data AS dld ON dld.imei_no = md.imei_no " +
						"WHERE ml.ulb_id = '" +
						ulb_id +
						"';";
				}

				pool.getConnection(function (err, connection) {
					if (err) {
						console.log(err);
						var mess = { error: 1, message: "Database query error!", result: [] };
						res.send(JSON.stringify(mess));
					} else {
						connection.query(sql, function (error, result) {
							connection.release();

							var o = {};
							o.ulb_devices = result;
							o.time = new Date();
							var mess = { error: 0, message: "Ulb devices!", result: o };
							res.send(JSON.stringify(mess));
						});
					}
				});
			}
		});
	});
});
router.post("/api/ulb-devices", checkAuth, function (req, res, next) {
	var ulbcode = req.body.ulbcode;
	var limit = req.body.limit;
	var index = req.body.index;
	var filters = req.body.filters;

	console.log(filters.network + " " + filters.power + " " + filters.search);

	var offset = index * limit;

	var perms = req.permissions;
	console.log("PERMISSION STATE: " + perms.state_perm);

	var sql = "SELECT * FROM master_zone WHERE areacode='" + ulbcode + "';";

	pool.getConnection(function (err, connection) {
		if (err) console.log(err);

		connection.query(sql, function (error, result) {
			connection.release();

			var mess = {};
			if (error) {
				console.log(error);
				mess = { error: 1, message: "Error in loading zone record!", result: [] };
			} else {
				var ulb_id = result[0]["id"];
				var zoneinfo = result[0];

				sql = "";

				if (filters.search != "") {
					sql =
						"SELECT md.id, md.imei_no, md.feeder_pillar_no, md.mobile_no, md.device_type, md.device_no, md.data_fault, dld.meter_fault, dld.door_status, COALESCE(md.fault_time, '') as fault_time, ml.state_id, ml.zone_id, ml.ulb_id, ml.ward_no, ml.meter_type, ml.total_connection, ml.previous_load, ml.total_load, ml.location_lat, ml.location_lng, ml.no_of_fittings, ml.location,  ml.led_18w, ml.led_20w, ml.led_24w, ml.led_32w, ml.led_35w, ml.led_40w, ml.led_45w, ml.led_50w, ml.led_60w, ml.led_70w, ml.led_72w, ml.led_75w, ml.led_80w, ml.led_90w, ml.led_100w, ml.led_110w, ml.led_120w, ml.led_130w, ml.led_140w, ml.led_150w, ml.led_190w, ml.led_200w, ml.led_250w, ml.led_400w, COALESCE(dld.total_kw, 0) total_kw, dld.datalength, dld.supply, dld.amp_r, dld.amp_y, dld.amp_b, dld.kwh, dld.output_status, DATE_FORMAT(dld.data_stamp, '%Y-%m-%d %H:%i:%s') as data_stamp, ml.maintenance, DATE_FORMAT(dld.update_time, '%Y-%m-%d %H:%i:%s') as update_time " +
						"FROM master_device AS md " +
						"LEFT JOIN master_location AS ml ON ml.feeder_pillar_no = md.feeder_pillar_no " +
						"LEFT JOIN device_last_data AS dld ON dld.imei_no = md.imei_no ";
					if (!empty(perms.state_perm)) {
						if (filters.search.length >= 4 && filters.search.length <= 7) {
							sql +=
								"WHERE ml.ulb_id = '" +
								ulb_id +
								"' AND md.feeder_pillar_no = '" +
								filters.search +
								"' AND ml.state_id='" +
								perms.state_perm +
								"';";
						} else if (filters.search.length >= 10 && filters.search.length <= 13) {
							sql +=
								"WHERE ml.ulb_id = '" +
								ulb_id +
								"' AND md.mobile_no = '" +
								filters.search +
								"'; AND ml.state_id='" +
								perms.state_perm +
								"';";
						} else if (filters.search.length >= 14 && filters.search.length <= 16) {
							sql +=
								"WHERE ml.ulb_id = '" +
								ulb_id +
								"' AND md.imei_no = '" +
								filters.search +
								"'; AND ml.state_id='" +
								perms.state_perm +
								"';";
						} else {
							sql +=
								"WHERE ml.ulb_id = '" +
								ulb_id +
								"' AND md.imei_no = '000000000000000'; AND ml.state_id='" +
								perms.state_perm +
								"';";
						}
						//sql += "WHERE ml.ulb_id = '"+ulb_id+"' AND ml.state_id='"+perms.state_perm+"' LIMIT "+limit+" OFFSET "+offset+";";
					} else {
						if (filters.search.length >= 4 && filters.search.length <= 7) {
							sql +=
								"WHERE ml.ulb_id = '" +
								ulb_id +
								"' AND md.feeder_pillar_no = '" +
								filters.search +
								"';";
						} else if (filters.search.length >= 10 && filters.search.length <= 13) {
							sql += "WHERE ml.ulb_id = '" + ulb_id + "' AND md.mobile_no = '" + filters.search + "';";
						} else if (filters.search.length >= 14 && filters.search.length <= 16) {
							sql += "WHERE ml.ulb_id = '" + ulb_id + "' AND md.imei_no = '" + filters.search + "';";
						} else {
							sql += "WHERE ml.ulb_id = '" + ulb_id + "' AND md.imei_no = '000000000000000';";
						}
						//sql += "WHERE ml.ulb_id = '"+ulb_id+"' LIMIT "+limit+" OFFSET "+offset+";";
					}
					/*if(filters.search.length >= 4 && filters.search.length <= 7){
		  				sql = "WHERE ml.ulb_id = '"+ulb_id+"' AND md.feeder_pillar_no = '"+filters.search+"';";
		  			}else if(filters.search.length >= 10 && filters.search.length <= 13){
		  				sql = "WHERE ml.ulb_id = '"+ulb_id+"' AND md.mobile_no = '"+filters.search+"';";
		  			}else if(filters.search.length >= 14 && filters.search.length <= 16){
		  				sql = "WHERE ml.ulb_id = '"+ulb_id+"' AND md.imei_no = '"+filters.search+"';";
		  			}else{
		  				sql = "WHERE ml.ulb_id = '"+ulb_id+"' AND md.imei_no = '000000000000000';";
		  			}*/
				} else if (filters.network != "") {
					sql =
						"SELECT md.id, md.imei_no, md.feeder_pillar_no, md.mobile_no, md.device_type, md.device_no, md.data_fault, dld.meter_fault, dld.door_status, COALESCE(md.fault_time, '') as fault_time, ml.state_id, ml.zone_id, ml.ulb_id, ml.ward_no, ml.meter_type, ml.total_connection, ml.previous_load, ml.total_load, ml.location_lat, ml.location_lng, ml.no_of_fittings, ml.location,  ml.led_18w, ml.led_20w, ml.led_24w, ml.led_32w, ml.led_35w, ml.led_40w, ml.led_45w, ml.led_50w, ml.led_60w, ml.led_70w, ml.led_72w, ml.led_75w, ml.led_80w, ml.led_90w, ml.led_100w, ml.led_110w, ml.led_120w, ml.led_130w, ml.led_140w, ml.led_150w, ml.led_190w, ml.led_200w, ml.led_250w, ml.led_400w, COALESCE(dld.total_kw, 0) total_kw, dld.datalength, dld.supply, dld.amp_r, dld.amp_y, dld.amp_b, dld.kwh, dld.output_status, DATE_FORMAT(dld.data_stamp, '%Y-%m-%d %H:%i:%s') as data_stamp, ml.maintenance, DATE_FORMAT(dld.update_time, '%Y-%m-%d %H:%i:%s') as update_time " +
						"FROM master_device AS md " +
						"LEFT JOIN master_location AS ml ON ml.feeder_pillar_no = md.feeder_pillar_no " +
						"LEFT JOIN device_last_data AS dld ON dld.imei_no = md.imei_no ";
					if (filters.network == "CONNECTED") {
						if (!empty(perms.state_perm)) {
							sql +=
								"WHERE ml.ulb_id = '" +
								ulb_id +
								"' AND ml.state_id='" +
								perms.state_perm +
								"' AND dld.update_time >= DATE_SUB(NOW(),INTERVAL 1 HOUR) LIMIT " +
								limit +
								" OFFSET " +
								offset +
								";";
						} else {
							sql +=
								"WHERE ml.ulb_id = '" +
								ulb_id +
								"' AND dld.update_time >= DATE_SUB(NOW(), INTERVAL 1 HOUR) LIMIT " +
								limit +
								" OFFSET " +
								offset +
								";";
						}
					} else if (filters.network == "DISCONNECTED") {
						if (!empty(perms.state_perm)) {
							sql +=
								"WHERE ml.ulb_id = '" +
								ulb_id +
								"' AND ml.state_id='" +
								perms.state_perm +
								"' AND (dld.update_time <= DATE_SUB(NOW(),INTERVAL 1 HOUR) OR dld.update_time IS NULL) LIMIT " +
								limit +
								" OFFSET " +
								offset +
								";";
						} else {
							sql +=
								"WHERE ml.ulb_id = '" +
								ulb_id +
								"' AND (dld.update_time <= DATE_SUB(NOW(),INTERVAL 1 HOUR) OR dld.update_time IS NULL) LIMIT " +
								limit +
								" OFFSET " +
								offset +
								";";
						}
					} else {
						sql += "WHERE ml.ulb_id = '" + ulb_id + "' LIMIT " + limit + " OFFSET " + offset + ";";
					}
					//console.log(sql);
				} else {
					if (!empty(perms.state_perm)) {
						sql =
							"SELECT md.id, md.imei_no, md.feeder_pillar_no, md.mobile_no, md.device_type, md.device_no, md.data_fault, dld.meter_fault, dld.door_status, COALESCE(md.fault_time, '') as fault_time, ml.state_id, ml.zone_id, ml.ulb_id, ml.ward_no, ml.meter_type, ml.total_connection, ml.previous_load, ml.total_load, ml.location_lat, ml.location_lng, ml.no_of_fittings, ml.location,  ml.led_18w, ml.led_20w, ml.led_24w, ml.led_32w, ml.led_35w, ml.led_40w, ml.led_45w, ml.led_50w, ml.led_60w, ml.led_70w, ml.led_72w, ml.led_75w, ml.led_80w, ml.led_90w, ml.led_100w, ml.led_110w, ml.led_120w, ml.led_130w, ml.led_140w, ml.led_150w, ml.led_190w, ml.led_200w, ml.led_250w, ml.led_400w, COALESCE(dld.total_kw, 0) total_kw, dld.datalength, dld.supply, dld.amp_r, dld.amp_y, dld.amp_b, dld.kwh, dld.output_status, DATE_FORMAT(dld.data_stamp, '%Y-%m-%d %H:%i:%s') as data_stamp, ml.maintenance, DATE_FORMAT(dld.update_time, '%Y-%m-%d %H:%i:%s') as update_time " +
							"FROM master_device AS md " +
							"LEFT JOIN master_location AS ml ON ml.feeder_pillar_no = md.feeder_pillar_no " +
							"LEFT JOIN master_zone AS mz ON mz.id = ml.ulb_id " +
							"LEFT JOIN device_last_data AS dld ON dld.imei_no = md.imei_no " +
							"WHERE ml.ulb_id = '" +
							ulb_id +
							"' AND ml.state_id='" +
							perms.state_perm +
							"' AND ml.status!=2 LIMIT " +
							limit +
							" OFFSET " +
							offset +
							";";
					} else {
						sql =
							"SELECT md.id, md.imei_no, md.feeder_pillar_no, md.mobile_no, md.device_type, md.device_no, md.data_fault, dld.meter_fault, dld.door_status, COALESCE(md.fault_time, '') as fault_time, ml.state_id, ml.zone_id, ml.ulb_id, ml.ward_no, ml.meter_type, ml.total_connection, ml.previous_load, ml.total_load, ml.location_lat, ml.location_lng, ml.no_of_fittings, ml.location,  ml.led_18w, ml.led_20w, ml.led_24w, ml.led_32w, ml.led_35w, ml.led_40w, ml.led_45w, ml.led_50w, ml.led_60w, ml.led_70w, ml.led_72w, ml.led_75w, ml.led_80w, ml.led_90w, ml.led_100w, ml.led_110w, ml.led_120w, ml.led_130w, ml.led_140w, ml.led_150w, ml.led_190w, ml.led_200w, ml.led_250w, ml.led_400w, COALESCE(dld.total_kw, 0) total_kw, dld.datalength, dld.supply, dld.amp_r, dld.amp_y, dld.amp_b, dld.kwh, dld.output_status, DATE_FORMAT(dld.data_stamp, '%Y-%m-%d %H:%i:%s') as data_stamp, ml.maintenance, DATE_FORMAT(dld.update_time, '%Y-%m-%d %H:%i:%s') as update_time " +
							"FROM master_device AS md " +
							"LEFT JOIN master_location AS ml ON ml.feeder_pillar_no = md.feeder_pillar_no " +
							"LEFT JOIN device_last_data AS dld ON dld.imei_no = md.imei_no " +
							"WHERE ml.ulb_id = '" +
							ulb_id +
							"' AND ml.status!=2 LIMIT " +
							limit +
							" OFFSET " +
							offset +
							";";
					}
				}

				pool.getConnection(function (err, connection) {
					if (err) {
						console.log(err);
						var mess = { error: 1, message: "Database query error!", result: [] };
						res.send(JSON.stringify(mess));
					} else {
						connection.query(sql, function (error, result) {
							connection.release();

							var o = {};
							o.limit_devices = result;
							o.zoneinfo = zoneinfo;
							o.time = new Date();
							var mess = { error: 0, message: "Master devices!", result: o };
							res.send(JSON.stringify(mess));
						});
					}
				});
			}
		});
	});
});
router.post("/api/ulb-devices-search", checkAuth, function (req, res, next) {
	var searchtxt = req.body.searchtxt;
	var state = req.body.state;

	var offset = index * limit;

	var mess = {};

	var perms = req.permissions;
	var sql =
		"SELECT md.id, md.imei_no, md.feeder_pillar_no, md.mobile_no, md.device_type, md.device_no, md.data_fault, dld.meter_fault, dld.door_status, COALESCE(md.fault_time, '') as fault_time, ml.state_id, ml.zone_id, ml.ulb_id, ml.ward_no, ml.meter_type, ml.total_connection, ml.previous_load, ml.total_load, ml.location_lat, ml.location_lng, ml.no_of_fittings, ml.location, ml.led_18w, ml.led_20w, ml.led_24w, ml.led_32w, ml.led_35w, ml.led_40w, ml.led_45w, ml.led_50w, ml.led_60w, ml.led_70w, ml.led_72w, ml.led_75w, ml.led_80w, ml.led_90w, ml.led_100w, ml.led_110w, ml.led_120w, ml.led_130w, ml.led_140w, ml.led_150w, ml.led_190w, ml.led_200w, ml.led_250w, ml.led_400w, COALESCE(dld.total_kw, 0) total_kw, dld.datalength, dld.supply, dld.amp_r, dld.amp_y, dld.amp_b, dld.kwh, dld.output_status, DATE_FORMAT(dld.data_stamp, '%Y-%m-%d %H:%i:%s') as data_stamp, ml.maintenance, DATE_FORMAT(dld.update_time, '%Y-%m-%d %H:%i:%s') as update_time " +
		"FROM master_device AS md " +
		"LEFT JOIN master_location AS ml ON ml.feeder_pillar_no = md.feeder_pillar_no " +
		"LEFT JOIN master_zone AS mz ON mz.id = ml.ulb_id " +
		"LEFT JOIN device_last_data AS dld ON dld.imei_no = md.imei_no ";
	if (searchtxt.length == 15) {
		sql += "WHERE md.imei_no='" + searchtxt + "';";
	} else if (searchtxt.length <= 6 && searchtxt.length >= 4) {
		sql += "WHERE ml.feeder_pillar_no='" + searchtxt + "';";
	} else if (searchtxt.length <= 13 && searchtxt.length >= 10) {
		sql += "WHERE md.mobile_no='" + searchtxt + "';";
	} else {
		sql = "";
		mess = { error: 0, message: "Devices!", result: [] };
		res.send(JSON.stringify(mess));
	}
	if (sql.length > 0) {
		pool.getConnection(function (err, connection) {
			if (err) console.log(err);

			connection.query(sql, function (error, result) {
				connection.release();

				var mess = {};
				if (error) {
					console.log(error);
					mess = { error: 0, message: "Devices!", result: [] };
				} else {
					var o = {};
					o.ulb_devices = result[0];
					o.total_devices = result[1][0]["total_count"];
					o.zoneinfo = result[2][0];
					mess = { error: 0, message: "Master devices!", result: o };
				}
				res.send(JSON.stringify(mess));
			});
		});
	}
});

/*
router.post('/api/search-device', checkAuth, function(req, res, next) {
	var searchtxt = req.body.imei_no;
	pool.getConnection(function(err, connection) {
		if (err) console.log(err);

		var sql = "";
		if(searchtxt.length == 15){
			sql = "SELECT md.id, md.imei_no, md.mobile_no, md.feeder_pillar_no, md.device_type, md.device_no, ml.state_id, ml.zone_id, ml.location, ml.meter_type, ml.previous_load, (SELECT title from master_zone WHERE id = ml.zone_id) as zone_title, ml.ulb_id, ml.total_connection as connections, ml.ward_no, mz.title as ulb_title, ml.total_load, ml.no_of_poles, ml.no_of_fittings, ml.location_lat, ml.location_lng, ml.led_18w, ml.led_24w, ml.led_35w, ml.led_45w, ml.led_70w, ml.led_75w, ml.led_110w, ml.led_140w, ml.led_190w, IFNULL(dld.total_kw, '') as total_kw, IFNULL(dld.supply, '') as supply, dld.data_stamp, IFNULL(dld.update_time, '') as update_time, dld.door_status, dld.output_status, dld.datalength FROM master_device as md LEFT JOIN master_location as ml ON ml.feeder_pillar_no = md.feeder_pillar_no LEFT JOIN master_zone as mz ON ml.ulb_id = mz.id LEFT JOIN (SELECT update_time, imei_no, supply, datalength, total_kw, door_status, output_status, DATE_FORMAT(data_stamp, '%Y-%m-%d %H:%i:%s') as data_stamp FROM device_last_data ) dld ON dld.imei_no=md.imei_no WHERE md.imei_no='"+searchtxt+"';";
		}else if(searchtxt.length <= 6 && searchtxt.length >= 4){
			sql = "SELECT md.id, md.imei_no, md.mobile_no, md.feeder_pillar_no, md.device_type, md.device_no, ml.state_id, ml.zone_id, ml.location, ml.meter_type, ml.previous_load, (SELECT title from master_zone WHERE id = ml.zone_id) as zone_title, ml.ulb_id, ml.total_connection as connections, ml.ward_no, mz.title as ulb_title, ml.total_load, ml.no_of_poles, ml.no_of_fittings, ml.location_lat, ml.location_lng, ml.led_18w, ml.led_24w, ml.led_35w, ml.led_45w, ml.led_70w, ml.led_75w, ml.led_110w, ml.led_140w, ml.led_190w, IFNULL(dld.total_kw, '') as total_kw, IFNULL(dld.supply, '') as supply, dld.data_stamp, IFNULL(dld.update_time, '') as update_time, dld.door_status, dld.output_status, dld.datalength FROM master_device as md LEFT JOIN master_location as ml ON ml.feeder_pillar_no = md.feeder_pillar_no LEFT JOIN master_zone as mz ON ml.ulb_id = mz.id LEFT JOIN (SELECT update_time, imei_no, supply, datalength, total_kw, door_status, output_status, DATE_FORMAT(data_stamp, '%Y-%m-%d %H:%i:%s') as data_stamp FROM device_last_data ) dld ON dld.imei_no=md.imei_no WHERE ml.feeder_pillar_no='"+searchtxt+"';";
		}else if(searchtxt.length <= 13 && searchtxt.length >= 10){
			sql = "SELECT md.id, md.imei_no, md.mobile_no, md.feeder_pillar_no, md.device_type, md.device_no, ml.state_id, ml.zone_id, ml.location, ml.meter_type, ml.previous_load, (SELECT title from master_zone WHERE id = ml.zone_id) as zone_title, ml.ulb_id, ml.total_connection as connections, ml.ward_no, mz.title as ulb_title, ml.total_load, ml.no_of_poles, ml.no_of_fittings, ml.location_lat, ml.location_lng, ml.led_18w, ml.led_24w, ml.led_35w, ml.led_45w, ml.led_70w, ml.led_75w, ml.led_110w, ml.led_140w, ml.led_190w, IFNULL(dld.total_kw, '') as total_kw, IFNULL(dld.supply, '') as supply, dld.data_stamp, IFNULL(dld.update_time, '') as update_time, dld.door_status, dld.output_status, dld.datalength FROM master_device as md LEFT JOIN master_location as ml ON ml.feeder_pillar_no = md.feeder_pillar_no LEFT JOIN master_zone as mz ON ml.ulb_id = mz.id LEFT JOIN (SELECT update_time, imei_no, supply, datalength, total_kw, door_status, output_status, DATE_FORMAT(data_stamp, '%Y-%m-%d %H:%i:%s') as data_stamp FROM device_last_data ) dld ON dld.imei_no=md.imei_no WHERE md.mobile_no='"+searchtxt+"';";
		}else{
			
		}

		

		connection.query(sql, function (error, result) {
			connection.release();

		  	if (error) {
		  		console.log(error);
		  	}
		  	var mess = {'error':0,'message':'Master devices!','result':[]};


		  	if(result.length > 0){
		  		
		  		mess = {'error':0,'message':'Master devices!','result':result[0]};
		  	}
		 	
			res.send(JSON.stringify(mess));
		});
	})
});*/

router.post("/api/device-all", checkAuth, function (req, res, next) {
	var ulbcode = req.body.ulb_id;

	var sql = "";
	if (!empty(ulbcode)) {
		sql =
			"SELECT md.id, md.imei_no, md.feeder_pillar_no, md.mobile_no, md.device_type, md.device_no, md.data_fault, COALESCE(md.fault_time, '') as fault_time, ml.state_id, ml.zone_id, ml.ulb_id, ml.ward_no, ml.total_connection, ml.total_load, ml.location_lat, ml.location_lng, ml.no_of_fittings, ml.location, ml.led_18w, ml.led_20w, ml.led_24w, ml.led_32w, ml.led_35w, ml.led_40w, ml.led_45w, ml.led_50w, ml.led_60w, ml.led_70w, ml.led_72w, ml.led_75w, ml.led_80w, ml.led_90w, ml.led_100w, ml.led_110w, ml.led_120w, ml.led_130w, ml.led_140w, ml.led_150w, ml.led_190w, ml.led_200w, ml.led_250w, ml.led_400w, COALESCE(dld.total_kw, 0) total_kw, dld.datalength, dld.supply, dld.amp_r, dld.amp_y, dld.amp_b, dld.kwh, dld.output_status, DATE_FORMAT(dld.data_stamp, '%Y-%m-%d %H:%i:%s') as data_stamp, ml.maintenance, DATE_FORMAT(dld.update_time, '%Y-%m-%d %H:%i:%s') as update_time " +
			"FROM master_device AS md " +
			"LEFT JOIN master_location AS ml ON ml.feeder_pillar_no = md.feeder_pillar_no " +
			"LEFT JOIN master_zone AS mz ON mz.id = ml.ulb_id " +
			"LEFT JOIN device_last_data AS dld ON dld.imei_no = md.imei_no " +
			"WHERE mz.id = '" +
			ulbcode +
			"';";
		conn.query(sql, function (err, result, fields) {
			if (err) {
				console.log(err);
			}
			var o = {};
			o.ulb_devices = result;
			o.zoneinfo = [];
			var mess = { error: 0, message: "Master devices!", result: o };
			res.send(JSON.stringify(mess));
		});
	} else {
		var o = {};
		o.ulb_devices = [];
		o.zoneinfo = [];
		var mess = { error: 0, message: "Master devices!", result: o };
		res.send(JSON.stringify(mess));
	}
});

router.post("/api/device-insert", checkAuth, saveUserActivity, async function (req, res, next) {
	var insertdata = req.body.data;
	if (insertdata.imei_no != "" && insertdata.imei_no.length == 15) {
		POOLDB[req.hostname].getConnection(function (err, connection) {
			if (err) console.log(err);

			var sql = "SELECT * from master_device WHERE imei_no=?";

			connection.query(sql, [insertdata.imei_no], function (error, result) {
				//connection.release();

				if (error) {
					console.log(error);
					var mess = { error: 1, message: "Server error!", result: "" };
					res.send(JSON.stringify(mess));
				}
				if (result.length > 0) {
					var mess = { error: 1, message: "Imei allready exist!", result: "" };
					res.send(JSON.stringify(mess));
				} else {
					var device = {
						imei_no: insertdata.imei_no,
						feeder_pillar_no: insertdata.feeder_pillar_no,
						mobile_no: insertdata.mobile_no,
						device_type: insertdata.device_type,
						device_no: insertdata.device_no,
					};
					var sql = "INSERT INTO master_device SET ?, insert_time=NOW();";

					var location = {
						imei_no: insertdata.imei_no,
						feeder_pillar_no: insertdata.feeder_pillar_no,
						mobile_no: insertdata.mobile_no,
						modem_type: insertdata.modem_type,
						state_id: insertdata.state_id,
						zone_id: insertdata.zone_id,
						ulb_id: insertdata.ulb_id,
						total_load: insertdata.total_load,
						no_of_fittings: insertdata.no_of_fittings,
						location: insertdata.location,
						location_lat: insertdata.location_lat,
						location_lng: insertdata.location_lng,
					};
					if (!empty(insertdata.previous_load)) {
						location.previous_load = insertdata.previous_load;
					} else {
						location.previous_load = 0;
					}
					if (!empty(insertdata.phase)) {
						location.phase = insertdata.phase;
					}
					if (!empty(insertdata.ward_id)) {
						location.ward_id = insertdata.ward_id;
					}
					if (!empty(insertdata.meter_type)) {
						location.meter_type = insertdata.meter_type;
					}
					if (!empty(insertdata.meter_type)) {
						location.meter_no = insertdata.device_no;
					}
					if (!empty(insertdata.consumer_no)) {
						location.consumer_no = insertdata.consumer_no;
					}
					if (!empty(insertdata.led_18w)) {
						location.led_18w = insertdata.led_18w;
					}
					if (!empty(insertdata.led_20w)) {
						location.led_20w = insertdata.led_20w;
					}
					if (!empty(insertdata.led_24w)) {
						location.led_24w = insertdata.led_24w;
					}
					if (!empty(insertdata.led_32w)) {
						location.led_32w = insertdata.led_32w;
					}
					if (!empty(insertdata.led_35w)) {
						location.led_35w = insertdata.led_35w;
					}
					if (!empty(insertdata.led_40w)) {
						location.led_40w = insertdata.led_40w;
					}
					if (!empty(insertdata.led_45w)) {
						location.led_45w = insertdata.led_45w;
					}
					if (!empty(insertdata.led_50w)) {
						location.led_50w = insertdata.led_50w;
					}
					if (!empty(insertdata.led_60w)) {
						location.led_60w = insertdata.led_60w;
					}
					if (!empty(insertdata.led_70w)) {
						location.led_70w = insertdata.led_70w;
					}
					if (!empty(insertdata.led_72w)) {
						location.led_72w = insertdata.led_72w;
					}
					if (!empty(insertdata.led_75w)) {
						location.led_75w = insertdata.led_75w;
					}
					if (!empty(insertdata.led_80w)) {
						location.led_80w = insertdata.led_80w;
					}
					if (!empty(insertdata.led_90w)) {
						location.led_90w = insertdata.led_90w;
					}
					if (!empty(insertdata.led_100w)) {
						location.led_100w = insertdata.led_100w;
					}
					if (!empty(insertdata.led_110w)) {
						location.led_110w = insertdata.led_110w;
					}
					if (!empty(insertdata.led_120w)) {
						location.led_120w = insertdata.led_120w;
					}
					if (!empty(insertdata.led_130w)) {
						location.led_130w = insertdata.led_130w;
					}
					if (!empty(insertdata.led_140w)) {
						location.led_140w = insertdata.led_140w;
					}
					if (!empty(insertdata.led_150w)) {
						location.led_150w = insertdata.led_150w;
					}
					if (!empty(insertdata.led_190w)) {
						location.led_190w = insertdata.led_190w;
					}
					if (!empty(insertdata.led_200w)) {
						location.led_200w = insertdata.led_200w;
					}
					if (!empty(insertdata.led_250w)) {
						location.led_250w = insertdata.led_250w;
					}
					if (!empty(insertdata.led_400w)) {
						location.led_400w = insertdata.led_400w;
					}

					//sql += "INSERT INTO master_location (feeder_pillar_no, state_id, zone_id, ulb_id, ward_no, total_load, no_of_fittings, location, location_lat, location_lng) VALUES ('"+insertdata.feeder_pillar_no+"', '"+insertdata.state_id+"', '"+insertdata.zone_id+"', '"+insertdata.ulb_id+"', '"+insertdata.ward_no+"', '"+insertdata.total_load+"', '"+insertdata.no_of_fittings+"', '"+insertdata.location+"', '"+insertdata.location_lat+"', '"+insertdata.location_lng+"');";
					sql += "INSERT INTO master_location SET ?, insert_time=NOW(), update_time=NOW();";

					sql += "INSERT INTO device_last_data (imei_no) VALUES ('" + insertdata.imei_no + "');";

					var query = connection.query(sql, [device, location], function (err, result) {
						connection.release();
						if (err) {
							var mess = { error: 1, message: "Error!", result: 0 };
							res.send(JSON.stringify(mess));
						} else {
							var mess = { error: 0, message: "Device Added Successfully!", result: 1 };
							res.send(JSON.stringify(mess));
						}
					});
				}
			});
		});
	} else {
		var mess = { error: 1, message: "Failed!", result: 0 };
		res.send(JSON.stringify(mess));
	}
});

router.post("/api/device-update", checkAuth, saveUserActivity, function (req, res, next) {
	var updatedata = req.body.data;
	if (updatedata.imei_no != "") {
		var device = {
			mobile_no: updatedata.mobile_no,
			device_type: updatedata.device_type,
		};

		var sql = "UPDATE master_device SET ? WHERE feeder_pillar_no='" + updatedata.feeder_pillar_no + "';";

		var location = {
			imei_no: updatedata.imei_no,
			state_id: updatedata.state_id,
			mobile_no: updatedata.mobile_no,
			modem_type: updatedata.modem_type,
			zone_id: updatedata.zone_id,
			ulb_id: updatedata.ulb_id,
			total_load: updatedata.total_load,
			no_of_fittings: updatedata.no_of_fittings,
			location: updatedata.location,
			location_lat: updatedata.location_lat,
			location_lng: updatedata.location_lng,
		};
		if (!empty(updatedata.previous_load)) {
			location.previous_load = updatedata.previous_load;
		} else {
			location.previous_load = 0;
		}
		if (!empty(updatedata.ward_id)) {
			location.ward_id = updatedata.ward_id;
		}
		if (!empty(updatedata.phase)) {
			location.phase = updatedata.phase;
		}
		if (!empty(updatedata.meter_type)) {
			location.meter_type = updatedata.meter_type;
		}
		if (!empty(updatedata.consumer_no)) {
			location.consumer_no = updatedata.consumer_no;
		}
		if (!empty(updatedata.led_18w)) {
			location.led_18w = updatedata.led_18w;
		}
		if (!empty(updatedata.led_20w)) {
			location.led_20w = updatedata.led_20w;
		}
		if (!empty(updatedata.led_24w)) {
			location.led_24w = updatedata.led_24w;
		}
		if (!empty(updatedata.led_32w)) {
			location.led_32w = updatedata.led_32w;
		}
		if (!empty(updatedata.led_35w)) {
			location.led_35w = updatedata.led_35w;
		}
		if (!empty(updatedata.led_40w)) {
			location.led_40w = updatedata.led_40w;
		}
		if (!empty(updatedata.led_45w)) {
			location.led_45w = updatedata.led_45w;
		}
		if (!empty(updatedata.led_50w)) {
			location.led_50w = updatedata.led_50w;
		}
		if (!empty(updatedata.led_60w)) {
			location.led_60w = updatedata.led_60w;
		}
		if (!empty(updatedata.led_70w)) {
			location.led_70w = updatedata.led_70w;
		}
		if (!empty(updatedata.led_72w)) {
			location.led_72w = updatedata.led_72w;
		}
		if (!empty(updatedata.led_75w)) {
			location.led_75w = updatedata.led_75w;
		}
		if (!empty(updatedata.led_80w)) {
			location.led_80w = updatedata.led_80w;
		}
		if (!empty(updatedata.led_90w)) {
			location.led_90w = updatedata.led_90w;
		}
		if (!empty(updatedata.led_100w)) {
			location.led_100w = updatedata.led_100w;
		}
		if (!empty(updatedata.led_110w)) {
			location.led_110w = updatedata.led_110w;
		}
		if (!empty(updatedata.led_120w)) {
			location.led_120w = updatedata.led_120w;
		}
		if (!empty(updatedata.led_130w)) {
			location.led_130w = updatedata.led_130w;
		}
		if (!empty(updatedata.led_140w)) {
			location.led_140w = updatedata.led_140w;
		}
		if (!empty(updatedata.led_150w)) {
			location.led_150w = updatedata.led_150w;
		}
		if (!empty(updatedata.led_190w)) {
			location.led_190w = updatedata.led_190w;
		}
		if (!empty(updatedata.led_200w)) {
			location.led_200w = updatedata.led_200w;
		}
		if (!empty(updatedata.led_250w)) {
			location.led_250w = updatedata.led_250w;
		}
		if (!empty(updatedata.led_400w)) {
			location.led_400w = updatedata.led_400w;
		}

		//sql += "UPDATE master_location SET state_id='"+updatedata.state_id+"', zone_id='"+updatedata.zone_id+"', ulb_id='"+updatedata.ulb_id+"', ward_no='"+updatedata.ward_no+"', total_load='"+updatedata.total_load+"', no_of_poles='0', no_of_fittings='"+updatedata.no_of_fittings+"', location='"+updatedata.location+"', location_lat='"+updatedata.location_lat+"', location_lng='"+updatedata.location_lng+"' WHERE feeder_pillar_no='"+updatedata.feeder_pillar_no+"';";
		sql +=
			"UPDATE master_location SET ?, update_time=NOW() WHERE feeder_pillar_no='" +
			updatedata.feeder_pillar_no +
			"';";

		POOLDB[req.hostname].getConnection(function (err, connection) {
			if (err) console.log(err);

			connection.query(sql, [device, location], function (error, result) {
				connection.release();

				if (error) {
					console.log(error);
					var mess = { error: 1, message: "Server error!", result: "" };
					res.send(JSON.stringify(mess));
				} else {
					var mess = { error: 0, message: "Device Updated Successfully!", result: 1 };
					res.send(JSON.stringify(mess));
				}
			});
		});
	} else {
		var mess = { error: 1, message: "Failed!", result: 0 };
		res.send(JSON.stringify(mess));
	}
});
router.post("/api/device-delete", checkAuth, saveUserActivity, function (req, res, next) {
	var deleteid = req.body.deleteid;
	var mess = { error: 1, message: "Failed!", result: 0 };
	res.send(JSON.stringify(mess));
	/*if(deleteid != ''){
		var sql = "DELETE FROM master_location WHERE feeder_pillar_no=(SELECT feeder_pillar_no FROM master_device WHERE id='"+deleteid+"');";
		sql += "DELETE FROM device_last_data WHERE imei_no=(SELECT imei_no FROM master_device WHERE id='"+deleteid+"');";
		sql += "DELETE FROM master_device WHERE id='"+deleteid+"';";

		conn.query(sql, function (err, result, fields) {
		  	if (err) {
		  		console.log(err);
		  	}
		 	var mess = {'error':0,'message':'Record deleted!','result':1};
			res.send(JSON.stringify(mess));
		})
	}else{
		var mess = {'error':1,'message':'Failed!','result':0};
		res.send(JSON.stringify(mess));
	}*/
});

router.post("/api/bulk-update", async function (req, res, next) {
	const fs = require("fs");
	const csv = require("csv-parser");

	var ulb_id = req.body.ulb_id;
	console.log("----- BULK UPDATE ----- ");

	import_data = [];
	import_result = [];
	import_index = 0;

	if (!req.files || Object.keys(req.files).length === 0) {
		req.upload_csv = "";
		console.log("No CSV File");
		var mess = { error: 1, message: "No Upload Files!", result: 0 };
		res.send(JSON.stringify(mess));
		//next();
	} else {
		var csvfile = req.files.csvfile;
		//console.log('IMAG E' +imagefile.name);
		if (!empty(csvfile)) {
			var csvfile = req.files.csvfile;
			//console.log('IMAG E' +imagefile.name);
			if (!empty(csvfile)) {
				fs.createReadStream(csvfile.tempFilePath)
					.pipe(csv())
					.on("data", (data) => {
						console.log(">>>>" + data.feeder_pillar_no + " " + data.imei_no);

						if (!empty(data.feeder_pillar_no)) {
							import_data.push(data);
						} else {
							import_result.push({
								fpno: data.feeder_pillar_no,
								imei_no: data.imei_no,
								status: "No Feeder Pillar Number",
							});
						}
					})
					.on("end", async () => {
						console.log("END");

						import_index = 0;
						console.log("BULK UPDATE DATA LENGTH " + import_data.length);
						updatedevice(req, res);
					});
			}
		}
	}
});
router.post("/api/bulk-import", async function (req, res, next) {
	const fs = require("fs");
	const csv = require("csv-parser");

	var ulb_id = req.body.ulb_id;

	console.log("----- CHECK UPLOAD PRODUCT IMPORT CSV  AUTHENTICATION ----- ");

	import_data = [];
	import_result = [];
	import_index = 0;

	var user_id = req.user_id;

	if (!req.files || Object.keys(req.files).length === 0) {
		req.upload_csv = "";
		console.log("No CSV File");
		var mess = { error: 1, message: "No Upload Files!", result: 0 };
		res.send(JSON.stringify(mess));
		//next();
	} else {
		var csvfile = req.files.csvfile;
		//console.log('IMAG E' +imagefile.name);
		if (!empty(csvfile)) {
			//pool.getConnection(function(err, connection) {
			//if (err) console.log(err);

			fs.createReadStream(csvfile.tempFilePath)
				.pipe(csv())
				.on("data", (data) => {
					console.log(
						">>>>" +
							data.feeder_pillar_no +
							" " +
							data.ulb_id +
							" " +
							data.imei_no.toString() +
							" " +
							data.mobile_no
					);

					if (!empty(data.feeder_pillar_no)) {
						if (data.ulb_id == ulb_id) {
							import_data.push(data);
						}
					}
				})
				.on("end", async () => {
					console.log("END");

					import_index = 0;
					console.log("IMPORT DATA LENGTH " + import_data.length);
					insertdevice(req, res);
				});

			// var csvext = csvinfo[csvinfo.length-1];

			/*var fs = require('fs');

            var dt = new Date();
            var year = dt.getFullYear();
            var month = ('0' + (dt.getMonth()+1)).slice(-2);
            //var date = ('0' + dt.getDate()).slice(-2);
            var folder = config.ROOT_PATH+'/imports/'+year+'/'+month;
            fs.mkdir(folder, { recursive: true }, function(err) {
                if (err) {
                    console.log(err)
                } else {
                    const { v4: uuidv4 } = require('uuid');
                    var uuid = uuidv4();
                    var csvfilepath = folder+'/'+uuid+'.csv';
                    csvfile.mv(csvfilepath, function(err) {
                        if (err)
                            return res.status(500).send(err);
                    
                        req.upload_csv = year+'/'+month+'/'+uuid+'.csv';
                        req.uuid = uuid;
                        console.log('CSV File Uploaded');
                        next();
                    });
                }
            }) */

			//});
		} else {
			req.upload_csv = "";
			console.log("No CSV File format");
			var mess = { error: 1, message: "Failed!", result: 0 };
			res.send(JSON.stringify(mess));
			//next();
		}
	}
	return;
	if (insertdata.imei_no != "" && insertdata.imei_no.length == 15) {
		pool.getConnection(function (err, connection) {
			if (err) console.log(err);

			var sql = "SELECT * from master_device WHERE imei_no=?";

			connection.query(sql, [insertdata.imei_no], function (error, result) {
				//connection.release();

				if (error) {
					console.log(error);
					var mess = { error: 1, message: "Server error!", result: "" };
					res.send(JSON.stringify(mess));
				}
				if (result.length > 0) {
					var mess = { error: 1, message: "Imei allready exist!", result: "" };
					res.send(JSON.stringify(mess));
				} else {
					var device = {
						imei_no: insertdata.imei_no,
						feeder_pillar_no: insertdata.feeder_pillar_no,
						mobile_no: insertdata.mobile_no,
						device_type: insertdata.device_type,
						device_no: insertdata.device_no,
					};
					var sql = "INSERT INTO master_device SET ?, insert_time=NOW();";

					var location = {
						feeder_pillar_no: insertdata.feeder_pillar_no,
						state_id: insertdata.state_id,
						zone_id: insertdata.zone_id,
						ulb_id: insertdata.ulb_id,
						ward_no: insertdata.ward_no,
						total_load: insertdata.total_load,
						no_of_fittings: insertdata.no_of_fittings,
						location: insertdata.location,
						location_lat: insertdata.location_lat,
						location_lng: insertdata.location_lng,
					};
					if (!empty(insertdata.previous_load)) {
						location.previous_load = insertdata.previous_load;
					} else {
						location.previous_load = 0;
					}
					if (!empty(insertdata.meter_type)) {
						location.meter_type = insertdata.meter_type;
					}
					if (!empty(insertdata.led_18w)) {
						location.led_18w = insertdata.led_18w;
					}
					if (!empty(insertdata.led_20w)) {
						location.led_20w = insertdata.led_20w;
					}
					if (!empty(insertdata.led_24w)) {
						location.led_24w = insertdata.led_24w;
					}
					if (!empty(insertdata.led_32w)) {
						location.led_32w = insertdata.led_32w;
					}
					if (!empty(insertdata.led_35w)) {
						location.led_35w = insertdata.led_35w;
					}
					if (!empty(insertdata.led_40w)) {
						location.led_40w = insertdata.led_40w;
					}
					if (!empty(insertdata.led_45w)) {
						location.led_45w = insertdata.led_45w;
					}
					if (!empty(insertdata.led_50w)) {
						location.led_50w = insertdata.led_50w;
					}
					if (!empty(insertdata.led_60w)) {
						location.led_60w = insertdata.led_60w;
					}
					if (!empty(insertdata.led_70w)) {
						location.led_70w = insertdata.led_70w;
					}
					if (!empty(insertdata.led_72w)) {
						location.led_72w = insertdata.led_72w;
					}
					if (!empty(insertdata.led_75w)) {
						location.led_75w = insertdata.led_75w;
					}
					if (!empty(insertdata.led_80w)) {
						location.led_80w = insertdata.led_80w;
					}
					if (!empty(insertdata.led_90w)) {
						location.led_90w = insertdata.led_90w;
					}
					if (!empty(insertdata.led_100w)) {
						location.led_100w = insertdata.led_100w;
					}
					if (!empty(insertdata.led_110w)) {
						location.led_110w = insertdata.led_110w;
					}
					if (!empty(insertdata.led_120w)) {
						location.led_120w = insertdata.led_120w;
					}
					if (!empty(insertdata.led_130w)) {
						location.led_130w = insertdata.led_130w;
					}
					if (!empty(insertdata.led_140w)) {
						location.led_140w = insertdata.led_140w;
					}
					if (!empty(insertdata.led_150w)) {
						location.led_150w = insertdata.led_150w;
					}
					if (!empty(insertdata.led_190w)) {
						location.led_190w = insertdata.led_190w;
					}
					if (!empty(insertdata.led_200w)) {
						location.led_200w = insertdata.led_200w;
					}
					if (!empty(insertdata.led_250w)) {
						location.led_250w = insertdata.led_250w;
					}
					if (!empty(insertdata.led_400w)) {
						location.led_400w = insertdata.led_400w;
					}

					//sql += "INSERT INTO master_location (feeder_pillar_no, state_id, zone_id, ulb_id, ward_no, total_load, no_of_fittings, location, location_lat, location_lng) VALUES ('"+insertdata.feeder_pillar_no+"', '"+insertdata.state_id+"', '"+insertdata.zone_id+"', '"+insertdata.ulb_id+"', '"+insertdata.ward_no+"', '"+insertdata.total_load+"', '"+insertdata.no_of_fittings+"', '"+insertdata.location+"', '"+insertdata.location_lat+"', '"+insertdata.location_lng+"');";
					sql += "INSERT INTO master_location SET ?;";

					sql += "INSERT INTO device_last_data (imei_no) VALUES ('" + insertdata.imei_no + "');";

					connection.query(sql, [device, location], function (err, result) {
						connection.release();
						if (err) {
							var mess = { error: 1, message: "Error!", result: 0 };
							res.send(JSON.stringify(mess));
						} else {
							var mess = { error: 0, message: "Device Added Successfully!", result: 1 };
							res.send(JSON.stringify(mess));
						}
					});
				}
			});
		});
	} else {
		var mess = { error: 1, message: "Failed!", result: 0 };
		res.send(JSON.stringify(mess));
	}
});
router.post("/api/device-maintenance", checkAuth, function (req, res, next) {
	var updatedata = req.body.data;
	if (updatedata.feeder_pillar_no != "") {
		var sql =
			"UPDATE master_location SET maintenance='" +
			updatedata.maintenance +
			"' WHERE feeder_pillar_no='" +
			updatedata.feeder_pillar_no +
			"';";

		conn.query(sql, function (err, result, fields) {
			if (err) {
				console.log(err);
			}
			var mess = { error: 0, message: "Device Maintenance Updated Successfully!", result: 1 };
			res.send(JSON.stringify(mess));
		});
	} else {
		var mess = { error: 1, message: "Maintenance Failed!", result: 0 };
		res.send(JSON.stringify(mess));
	}
});

function updatedevice(req, res) {
	const fs = require("fs");

	if (import_index < import_data.length) {
		var data = import_data[import_index];
		import_index++;

		/*if(empty(data.imei_no)){
			import_result.push({'fpno':data.feeder_pillar_no, 'imei_no': data.imei_no, 'status':'Missing IMEI Number'});
			updatedevice(req,res);
		}else{*/
		POOLDB[req.hostname].getConnection(function (err, connection) {
			if (err) {
				console.log(err);
			} else {
				var sql = "";
				var inputarr = [];
				if (!empty(data.imei_no) && !empty(data.feeder_pillar_no)) {
					sql = "SELECT * from master_location WHERE imei_no=? AND feeder_pillar_no=?";
					inputarr = [data.imei_no, data.feeder_pillar_no];
				} else if (!empty(data.feeder_pillar_no)) {
					sql = "SELECT * from master_location WHERE feeder_pillar_no=?";
					inputarr = [data.feeder_pillar_no];
				} else if (!empty(data.imei_no)) {
					sql = "SELECT * from master_location WHERE imei_no=?";
					inputarr = [data.imei_no];
				}
				connection.query(sql, inputarr, function (error, result) {
					if (error) {
						console.log(error);
						connection.release();
						import_result.push({
							fpno: data.feeder_pillar_no,
							imei_no: data.imei_no,
							status: "Connection Error",
						});
						updatedevice(req, res);
					}
					if (result.length > 0) {
						var location = {};
						if (!empty(data.ward_id)) {
							location.ward_id = data.ward_id;
						}
						if (!empty(data.zone_id)) {
							location.zone_id = data.zone_id;
						}
						if (!empty(data.meter_no)) {
							location.meter_no = data.meter_no;
						}
						if (!empty(data.phase)) {
							location.phase = data.phase;
						}
						if (!empty(data.location)) {
							location.location = data.location;
						}
						if (!empty(data.location_lat)) {
							location.location_lat = data.location_lat;
						}
						if (!empty(data.location_lng)) {
							location.location_lng = data.location_lng;
						}
						if (!empty(data.no_of_fittings)) {
							location.no_of_fittings = data.no_of_fittings;
						}
						if (!empty(data.total_load)) {
							location.total_load = data.total_load;
						}
						if (!empty(data.previous_load)) {
							location.previous_load = data.previous_load;
						}
						if (!empty(data.meter_type)) {
							location.meter_type = data.meter_type;
						}
						if (!empty(data.modem_type)) {
							location.modem_type = data.modem_type;
						}
						if (!empty(data.consumer_no)) {
							location.consumer_no = data.consumer_no;
						}
						if (!empty(data.led_18w)) {
							location.led_18w = data.led_18w;
						}
						if (!empty(data.led_20w)) {
							location.led_20w = data.led_20w;
						}
						if (!empty(data.led_24w)) {
							location.led_24w = data.led_24w;
						}
						if (!empty(data.led_32w)) {
							location.led_32w = data.led_32w;
						}
						if (!empty(data.led_35w)) {
							location.led_35w = data.led_35w;
						}
						if (!empty(data.led_40w)) {
							location.led_40w = data.led_40w;
						}
						if (!empty(data.led_45w)) {
							location.led_45w = data.led_45w;
						}
						if (!empty(data.led_50w)) {
							location.led_50w = data.led_50w;
						}
						if (!empty(data.led_60w)) {
							location.led_60w = data.led_60w;
						}
						if (!empty(data.led_70w)) {
							location.led_70w = data.led_70w;
						}
						if (!empty(data.led_72w)) {
							location.led_72w = data.led_72w;
						}
						if (!empty(data.led_75w)) {
							location.led_75w = data.led_75w;
						}
						if (!empty(data.led_80w)) {
							location.led_80w = data.led_80w;
						}
						if (!empty(data.led_90w)) {
							location.led_90w = data.led_90w;
						}
						if (!empty(data.led_100w)) {
							location.led_100w = data.led_100w;
						}
						if (!empty(data.led_110w)) {
							location.led_110w = data.led_110w;
						}
						if (!empty(data.led_120w)) {
							location.led_120w = data.led_120w;
						}
						if (!empty(data.led_130w)) {
							location.led_130w = data.led_130w;
						}
						if (!empty(data.led_140w)) {
							location.led_140w = data.led_140w;
						}
						if (!empty(data.led_150w)) {
							location.led_150w = data.led_150w;
						}
						if (!empty(data.led_190w)) {
							location.led_190w = data.led_190w;
						}
						if (!empty(data.led_200w)) {
							location.led_200w = data.led_200w;
						}
						if (!empty(data.led_250w)) {
							location.led_250w = data.led_250w;
						}
						if (!empty(data.led_400w)) {
							location.led_400w = data.led_400w;
						}

						var sql = "";

						if (!empty(data.imei_no) && !empty(data.feeder_pillar_no)) {
							sql =
								'UPDATE master_location SET ? , update_time = NOW() WHERE feeder_pillar_no="' +
								data.feeder_pillar_no +
								'" AND imei_no="' +
								data.imei_no +
								'"';
						} else if (!empty(data.feeder_pillar_no)) {
							sql =
								'UPDATE master_location SET ? , update_time = NOW() WHERE feeder_pillar_no="' +
								data.feeder_pillar_no +
								'"';
						} else if (!empty(data.imei_no)) {
							sql =
								'UPDATE master_location SET ? , update_time = NOW() WHERE imei_no="' +
								data.imei_no +
								'"';
						}

						connection.query(sql, [location], function (err, result) {
							connection.release();
							if (err) {
								import_result.push({
									fpno: data.feeder_pillar_no,
									imei_no: data.imei_no,
									status: "Update Error",
								});
							} else {
								import_result.push({
									fpno: data.feeder_pillar_no,
									imei_no: data.imei_no,
									status: "Update Successfully",
								});
							}
							updatedevice(req, res);
						});

						/*connection.release();
							console.log('------------------UPDATED'+JSON.stringify(location));
							import_result.push({'fpno':data.feeder_pillar_no, 'imei_no': data.imei_no, 'status':'Update Successfully'});
							updatedevice(req,res);*/
					} else {
						connection.release();
						//console.log('---------------------------------------- NO EXIST');
						import_result.push({ fpno: data.feeder_pillar_no, imei_no: data.imei_no, status: "Not Exist" });
						updatedevice(req, res);
					}
				});
			}
		});
		/*}*/
	} else {
		console.log("----------- FINISH UPLOAD ------------");
		const { convertArrayToCSV } = require("convert-array-to-csv");
		const csv = convertArrayToCSV(import_result);
		var mess = { error: 1, message: "CSV!", result: csv, len: import_result.length };
		res.send(csv);
	}
}

function insertdevice(req, res) {
	const fs = require("fs");

	if (import_index < import_data.length) {
		var data = import_data[import_index];
		import_index++;

		if (data.mobile_no == 0) {
			import_result.push({
				fpno: data.feeder_pillar_no,
				imei_no: data.imei_no,
				mobile_no: data.mobile_no,
				status: "Missing Mobile Number",
			});
			insertdevice(req, res);
		} else {
			POOLDB[req.hostname].getConnection(function (err, connection) {
				if (err) {
					console.log(err);
				} else {
					var sql = "SELECT * from master_device WHERE imei_no=? OR mobile_no=?";

					connection.query(sql, [data.imei_no, data.mobile_no], function (error, result) {
						//connection.release();
						if (error) {
							connection.release();
							console.log(error);
							import_result.push({
								fpno: data.feeder_pillar_no,
								imei_no: data.imei_no,
								mobile_no: data.mobile_no,
								status: "Connection Error",
							});
							insertdevice(req, res);
						}
						if (result.length > 0) {
							connection.release();
							import_result.push({
								fpno: data.feeder_pillar_no,
								imei_no: data.imei_no,
								mobile_no: data.mobile_no,
								status: "Allready Exist",
							});
							insertdevice(req, res);
						} else {
							var device = {
								imei_no: data.imei_no,
								feeder_pillar_no: data.feeder_pillar_no,
								mobile_no: data.mobile_no,
								device_type: "CCMS",
								device_no: data.meter_no,
							};
							var sql = "INSERT INTO master_device SET ?, insert_time=NOW();";

							var location = {
								feeder_pillar_no: data.feeder_pillar_no,
								state_id: data.state_id,
								imei_no: data.imei_no,
								mobile_no: data.mobile_no,
								meter_no: data.meter_no,
								ulb_id: data.ulb_id,
								total_load: data.total_load,
								no_of_fittings: data.no_of_fittings,
								location: data.location,
								location_lat: data.location_lat,
								location_lng: data.location_lng,
							};
							if (!empty(data.ward_id)) {
								location.ward_id = data.ward_id;
							}
							if (!empty(data.previous_load)) {
								location.previous_load = data.previous_load;
							} else {
								location.previous_load = 0;
							}
							if (!empty(data.phase)) {
								location.phase = data.phase;
							}
							if (!empty(data.modem_type)) {
								location.modem_type = data.modem_type;
							}
							if (!empty(data.meter_type)) {
								location.meter_type = data.meter_type;
							}
							if (!empty(data.consumer_no)) {
								location.consumer_no = data.consumer_no;
							}
							if (!empty(data.led_18w)) {
								location.led_18w = data.led_18w;
							}
							if (!empty(data.led_20w)) {
								location.led_20w = data.led_20w;
							}
							if (!empty(data.led_24w)) {
								location.led_24w = data.led_24w;
							}
							if (!empty(data.led_32w)) {
								location.led_32w = data.led_32w;
							}
							if (!empty(data.led_35w)) {
								location.led_35w = data.led_35w;
							}
							if (!empty(data.led_40w)) {
								location.led_40w = data.led_40w;
							}
							if (!empty(data.led_45w)) {
								location.led_45w = data.led_45w;
							}
							if (!empty(data.led_50w)) {
								location.led_50w = data.led_50w;
							}
							if (!empty(data.led_60w)) {
								location.led_60w = data.led_60w;
							}
							if (!empty(data.led_70w)) {
								location.led_70w = data.led_70w;
							}
							if (!empty(data.led_72w)) {
								location.led_72w = data.led_72w;
							}
							if (!empty(data.led_75w)) {
								location.led_75w = data.led_75w;
							}
							if (!empty(data.led_80w)) {
								location.led_80w = data.led_80w;
							}
							if (!empty(data.led_90w)) {
								location.led_90w = data.led_90w;
							}
							if (!empty(data.led_100w)) {
								location.led_100w = data.led_100w;
							}
							if (!empty(data.led_110w)) {
								location.led_110w = data.led_110w;
							}
							if (!empty(data.led_120w)) {
								location.led_120w = data.led_120w;
							}
							if (!empty(data.led_130w)) {
								location.led_130w = data.led_130w;
							}
							if (!empty(data.led_140w)) {
								location.led_140w = data.led_140w;
							}
							if (!empty(data.led_150w)) {
								location.led_150w = data.led_150w;
							}
							if (!empty(data.led_190w)) {
								location.led_190w = data.led_190w;
							}
							if (!empty(data.led_200w)) {
								location.led_200w = data.led_200w;
							}
							if (!empty(data.led_250w)) {
								location.led_250w = data.led_250w;
							}
							if (!empty(data.led_400w)) {
								location.led_400w = data.led_400w;
							}

							sql += "INSERT INTO master_location SET ?;";

							sql += "INSERT INTO device_last_data (imei_no) VALUES ('" + data.imei_no + "');";

							connection.query(sql, [device, location], function (err, result) {
								connection.release();
								if (err) {
									import_result.push({
										fpno: data.feeder_pillar_no,
										imei_no: data.imei_no,
										mobile_no: data.mobile_no,
										status: "Insert Error",
									});
								} else {
									import_result.push({
										fpno: data.feeder_pillar_no,
										imei_no: data.imei_no,
										mobile_no: data.mobile_no,
										status: "Added Successfully",
									});
								}
								insertdevice(req, res);
							});
						}

						//insertdevice(res);
					});
				}
			});
		}
	} else {
		const { convertArrayToCSV } = require("convert-array-to-csv");
		const csv = convertArrayToCSV(import_result);
		var mess = { error: 1, message: "CSV!", result: csv, len: import_result.length };
		res.send(csv);
	}
}

/************************************************* CCMS METHODS END *****************************************/

/************************************************* CONTROLLER METHODS START *****************************************/

router.post("/api/controllers", checkAuth, function (req, res, next) {
	var feederno = req.body.feederno;
	var sql =
		"SELECT mc.unique_id, mc.location, IFNULL(cld.pwm, '') as pwm, IFNULL(cld.on_off_status, '') as on_off_status, IFNULL(cld.current, '') as current, IFNULL(cld.voltage, '') as voltage, IFNULL(cld.kwh, '') as kwh, IFNULL(cld.pf, '') as pf, IFNULL(cld.load_kw, '') as load_kw, IFNULL(cld.light_on_hours, '') as light_on_hours, cld.data_stamp, mc.status, IFNULL(cld.update_time, '') as update_time FROM master_controller as mc LEFT JOIN controller_last_data as cld ON cld.unique_id = mc.unique_id WHERE mc.feeder_pillar_no='" +
		feederno +
		"'";

	conn.query(sql, function (err, rows, fields) {
		if (err) {
			console.log(err);
		}
		var mess = { error: 0, message: "Controller list!", result: rows };
		res.send(JSON.stringify(mess));
	});
});
router.post("/api/controller-insert", checkAuth, function (req, res, next) {
	var insertdata = req.body.data;
	var feederno = req.body.feederno;
	if (feederno != "") {
		var sql1 =
			"INSERT INTO master_controller (unique_id, feeder_pillar_no, location, status, insert_time) VALUES ('" +
			insertdata.unique_id +
			"', '" +
			feederno +
			"', '" +
			insertdata.location +
			"', '" +
			insertdata.status +
			"', NOW());";

		var sql2 =
			"UPDATE master_location SET total_connection=(SELECT count(unique_id) as total FROM master_controller WHERE feeder_pillar_no='" +
			feederno +
			"') WHERE feeder_pillar_no='" +
			feederno +
			"';";

		conn.query(sql1 + sql2, function (err, result, fields) {
			if (err) {
				var mess = { error: 1, message: "Error!", result: 0 };
				res.send(JSON.stringify(mess));
			} else {
				var mess = { error: 0, message: "Controller Added Successfully!", result: 1 };
				res.send(JSON.stringify(mess));
			}
		});
	} else {
		var mess = { error: 1, message: "Failed!", result: 0 };
		res.send(JSON.stringify(mess));
	}
});
router.post("/api/controller-update", checkAuth, function (req, res, next) {
	var updatedata = req.body.data;
	var feederno = req.body.feederno;
	if (feederno != "") {
		var sql1 =
			"UPDATE master_controller SET location='" +
			updatedata.location +
			"', status='" +
			updatedata.status +
			"' WHERE unique_id='" +
			updatedata.unique_id +
			"' AND feeder_pillar_no='" +
			feederno +
			"';";

		conn.query(sql1, function (err, result, fields) {
			if (err) {
				console.log(err);
			}
			var mess = { error: 0, message: "Controller Updated Successfully!", result: 1 };
			res.send(JSON.stringify(mess));
		});
	} else {
		var mess = { error: 1, message: "Failed!", result: 0 };
		res.send(JSON.stringify(mess));
	}
});

router.post("/api/controller-delete", checkAuth, function (req, res, next) {
	var deleteid = req.body.deleteid;
	var feederno = req.body.feederno;
	if (deleteid != "") {
		var sql1 = "DELETE FROM master_controller WHERE unique_id='" + deleteid + "';";
		var sql2 =
			"UPDATE master_location SET total_connection=(SELECT count(unique_id) as total FROM master_controller WHERE feeder_pillar_no='" +
			feederno +
			"') WHERE feeder_pillar_no='" +
			feederno +
			"';";

		conn.query(sql1 + sql2, function (err, result, fields) {
			if (err) {
				console.log(err);
			}
			var mess = { error: 0, message: "Record deleted!", result: 1 };
			res.send(JSON.stringify(mess));
		});
	} else {
		var mess = { error: 1, message: "Failed!", result: 0 };
		res.send(JSON.stringify(mess));
	}
});
router.post("/api/controller-data", checkAuth, function (req, res, next) {
	var uniqueid = req.body.uniqueid;
	if (uniqueid != "") {
		var sql =
			"SELECT unique_id, pwm, on_off_status, current, voltage, kwh, pf, load_kw, light_on_hours, data_stamp, update_time FROM controller_last_data WHERE unique_id='" +
			uniqueid +
			"' LIMIT 50";

		conn.query(sql, function (err, result, fields) {
			if (err) {
				console.log(err);
			}
			var mess = { error: 0, message: "Device records!", result: result };
			res.send(JSON.stringify(mess));
		});
	} else {
		var mess = { error: 1, message: "Failed!", result: [] };
		res.send(JSON.stringify(mess));
	}
});

/************************************************* CONTROLLER METHODS END *****************************************/

/*router.post('/api/zone-record', checkAuth, function(req, res, next) {
	var imeino = req.body.imeino;
	if(imeino != ''){
		var sql = "SELECT * FROM master_zone ORDER BY title ASC";

		var finalarr = [];
		conn.query(sql, function (error, result, fields) {
		  	if (err) {
		  		console.log(err);
		  	}
		 	var mess = {'error':0,'message':'Zone records!','result':result};
			res.send(JSON.stringify(mess));
		})
	}else{
		var mess = {'error':1,'message':'Failed!','result':[]};
		res.send(JSON.stringify(mess));
	}	
});*/

router.post("/api/get-state-ulbs", checkAuth, function (req, res, next) {
	var state = req.body.state;
	if (state != "") {
		var sql = "SELECT * FROM master_zone WHERE state = ? ORDER BY title ASC";

		POOLDB[req.hostname].getConnection(function (err, connection) {
			if (err) {
				console.log(err);
				var mess = { error: 1, message: "Database connection error!", result: [] };
				res.send(JSON.stringify(mess));
			} else {
				connection.query(sql, state, function (error, result) {
					connection.release();

					var mess = { error: 0, message: "ULB records!", result: result };
					res.send(JSON.stringify(mess));
				});
			}
		});
	} else {
		var mess = { error: 1, message: "Failed!", result: [] };
		res.send(JSON.stringify(mess));
	}
});

/**************************************************** CITY METHODS ********************************************/

router.post("/api/city-record", checkAuth, function (req, res, next) {
	var sql = "SELECT * FROM master_city";

	POOLDB[req.hostname].getConnection(function (err, connection) {
		if (err) {
			console.log(err);
			var mess = { error: 1, message: "Database connection error!", result: [] };
			res.send(JSON.stringify(mess));
		} else {
			connection.query(sql, function (error, result) {
				connection.release();

				var mess = { error: 0, message: "City records!", result: result };
				res.send(JSON.stringify(mess));
			});
		}
	});
});
router.post("/api/city-insert", checkAuth, saveUserActivity, function (req, res, next) {
	var insertdata = req.body.data;
	if (insertdata.state_id != "") {
		var insertq = {
			state_id: insertdata.state_id,
			title: insertdata.title,
			status: insertdata.status,
		};
		if (!empty(insertdata.areacode)) {
			insertq.areacode = insertdata.areacode;
		}
		var sql = "INSERT INTO master_city SET ? , update_time = NOW()";

		POOLDB[req.hostname].getConnection(function (err, connection) {
			if (err) {
				console.log(err);
				var mess = { error: 1, message: "Database connection error!", result: [] };
				res.send(JSON.stringify(mess));
			} else {
				connection.query(sql, insertq, function (error, result) {
					connection.release();

					if (error) {
						var mess = { error: 1, message: "Error!", result: 0 };
						res.send(JSON.stringify(mess));
					} else {
						var mess = { error: 0, message: "City Added Successfully!", result: 1 };
						res.send(JSON.stringify(mess));
					}
				});
			}
		});
	} else {
		var mess = { error: 1, message: "Failed!", result: 0 };
		res.send(JSON.stringify(mess));
	}
});
router.post("/api/city-update", checkAuth, saveUserActivity, function (req, res, next) {
	var updatedata = req.body.data;
	if (updatedata.id != "") {
		var updateq = {
			state_id: updatedata.state_id,
			areacode: updatedata.areacode,
			title: updatedata.title,
			status: updatedata.status,
		};

		POOLDB[req.hostname].getConnection(function (err, connection) {
			if (err) console.log(err);

			var sql = 'UPDATE master_city SET ? , update_time = NOW() WHERE id="' + updatedata.id + '"';

			connection.query(sql, updateq, function (error, result) {
				connection.release();

				if (error) {
					var mess = { error: 1, message: "Connection Error!", result: 0 };
					res.send(JSON.stringify(mess));
				} else {
					if (err) {
						var mess = { error: 1, message: "Update Error!", result: 0 };
						res.send(JSON.stringify(mess));
					} else {
						var mess = { error: 0, message: "City Updated Successfully!", result: 1 };
						res.send(JSON.stringify(mess));
					}
				}
			});
		});
	} else {
		var mess = { error: 1, message: "Update Failed!", result: 0 };
		res.send(JSON.stringify(mess));
	}
});
router.post("/api/city-delete", checkAuth, saveUserActivity, function (req, res, next) {
	var deleteid = req.body.deleteid;
	if (deleteid != "") {
		POOLDB[req.hostname].getConnection(function (err, connection) {
			if (err) console.log(err);

			var sql = "DELETE FROM master_city WHERE id='" + deleteid + "';";

			connection.query(sql, updateq, function (error, result) {
				connection.release();

				if (error) {
					var mess = { error: 1, message: "Connection Error!", result: 0 };
					res.send(JSON.stringify(mess));
				} else {
					if (err) {
						var mess = { error: 1, message: "Failed!", result: 0 };
						res.send(JSON.stringify(mess));
					} else {
						var mess = { error: 0, message: "Ward deleted!", result: 1 };
						res.send(JSON.stringify(mess));
					}
				}
			});
		});
	} else {
		var mess = { error: 1, message: "Failed!", result: 0 };
		res.send(JSON.stringify(mess));
	}
});
/**************************************************** WARD METHODS ********************************************/

router.post("/api/ward-record", checkAuth, function (req, res, next) {
	var sql = "SELECT * FROM master_ward";

	POOLDB[req.hostname].getConnection(function (err, connection) {
		if (err) {
			console.log(err);
			var mess = { error: 1, message: "Database connection error!", result: [] };
			res.send(JSON.stringify(mess));
		} else {
			connection.query(sql, function (error, result) {
				connection.release();

				var mess = { error: 0, message: "Ward records!", result: result };
				res.send(JSON.stringify(mess));
			});
		}
	});
});
router.post("/api/ward-insert", checkAuth, saveUserActivity, function (req, res, next) {
	var insertdata = req.body.data;
	if (insertdata.state_id != "") {
		var insertq = {
			ulb_id: insertdata.ulb_id,
			title: insertdata.title,
			status: insertdata.status,
		};
		if (!empty(insertdata.areacode)) {
			insertq.areacode = insertdata.areacode;
		}
		var sql = "INSERT INTO master_ward SET ? , update_time = NOW()";

		POOLDB[req.hostname].getConnection(function (err, connection) {
			if (err) {
				console.log(err);
				var mess = { error: 1, message: "Database connection error!", result: [] };
				res.send(JSON.stringify(mess));
			} else {
				connection.query(sql, insertq, function (error, result) {
					connection.release();

					if (error) {
						var mess = { error: 1, message: "Error!", result: 0 };
						res.send(JSON.stringify(mess));
					} else {
						var mess = { error: 0, message: "Ward Added Successfully!", result: 1 };
						res.send(JSON.stringify(mess));
					}
				});
			}
		});
	} else {
		var mess = { error: 1, message: "Failed!", result: 0 };
		res.send(JSON.stringify(mess));
	}
});
router.post("/api/ward-update", checkAuth, saveUserActivity, function (req, res, next) {
	var updatedata = req.body.data;
	if (updatedata.id != "") {
		var updateq = {
			ulb_id: updatedata.ulb_id,
			areacode: updatedata.areacode,
			title: updatedata.title,
			status: updatedata.status,
		};

		POOLDB[req.hostname].getConnection(function (err, connection) {
			if (err) console.log(err);

			var sql = 'UPDATE master_ward SET ? , update_time = NOW() WHERE id="' + updatedata.id + '"';

			connection.query(sql, updateq, function (error, result) {
				connection.release();

				if (error) {
					var mess = { error: 1, message: "Connection Error!", result: 0 };
					res.send(JSON.stringify(mess));
				} else {
					if (err) {
						var mess = { error: 1, message: "Update Error!", result: 0 };
						res.send(JSON.stringify(mess));
					} else {
						var mess = { error: 0, message: "Ward Updated Successfully!", result: 1 };
						res.send(JSON.stringify(mess));
					}
				}
			});
		});
	} else {
		var mess = { error: 1, message: "Update Failed!", result: 0 };
		res.send(JSON.stringify(mess));
	}
});
router.post("/api/ward-delete", checkAuth, saveUserActivity, function (req, res, next) {
	var deleteid = req.body.deleteid;
	if (deleteid != "") {
		POOLDB[req.hostname].getConnection(function (err, connection) {
			if (err) console.log(err);

			var sql = "DELETE FROM master_ward WHERE id='" + deleteid + "';";

			connection.query(sql, updateq, function (error, result) {
				connection.release();

				if (error) {
					var mess = { error: 1, message: "Connection Error!", result: 0 };
					res.send(JSON.stringify(mess));
				} else {
					if (err) {
						var mess = { error: 1, message: "Failed!", result: 0 };
						res.send(JSON.stringify(mess));
					} else {
						var mess = { error: 0, message: "Ward deleted!", result: 1 };
						res.send(JSON.stringify(mess));
					}
				}
			});
		});
	} else {
		var mess = { error: 1, message: "Failed!", result: 0 };
		res.send(JSON.stringify(mess));
	}
});

/**************************************************** NEW ZONE METHODS ********************************************/

router.post("/api/zones", checkAuth, function (req, res, next) {
	var sql = "SELECT * FROM zones";

	POOLDB[req.hostname].getConnection(function (err, connection) {
		if (err) {
			console.log(err);
			var mess = { error: 1, message: "Database connection error!", result: [] };
			res.send(JSON.stringify(mess));
		} else {
			connection.query(sql, function (error, result) {
				connection.release();

				var mess = { error: 0, message: "Zones records!", result: result };
				res.send(JSON.stringify(mess));
			});
		}
	});
});
router.post("/api/zone-add", checkAuth, saveUserActivity, function (req, res, next) {
	var insertdata = req.body.data;
	if (insertdata.ulb_id != "") {
		var insertq = {
			ulb_id: insertdata.ulb_id,
			title: insertdata.title,
			status: insertdata.status,
		};
		if (!empty(insertdata.areacode)) {
			insertq.areacode = insertdata.areacode;
		}
		var sql = "INSERT INTO zones SET ? , update_time = NOW()";

		POOLDB[req.hostname].getConnection(function (err, connection) {
			if (err) {
				console.log(err);
				var mess = { error: 1, message: "Database connection error!", result: [] };
				res.send(JSON.stringify(mess));
			} else {
				connection.query(sql, insertq, function (error, result) {
					connection.release();

					if (error) {
						var mess = { error: 1, message: "Error!", result: 0 };
						res.send(JSON.stringify(mess));
					} else {
						var mess = { error: 0, message: "Zone Added Successfully!", result: 1 };
						res.send(JSON.stringify(mess));
					}
				});
			}
		});
	} else {
		var mess = { error: 1, message: "Failed!", result: 0 };
		res.send(JSON.stringify(mess));
	}
});
router.post("/api/zone-edit", checkAuth, saveUserActivity, function (req, res, next) {
	var updatedata = req.body.data;
	if (updatedata.id != "") {
		var updateq = {
			ulb_id: updatedata.ulb_id,
			areacode: updatedata.areacode,
			title: updatedata.title,
			status: updatedata.status,
		};

		POOLDB[req.hostname].getConnection(function (err, connection) {
			if (err) console.log(err);

			var sql = 'UPDATE zones SET ? , update_time = NOW() WHERE id="' + updatedata.id + '"';

			connection.query(sql, updateq, function (error, result) {
				connection.release();

				if (error) {
					var mess = { error: 1, message: "Connection Error!", result: 0 };
					res.send(JSON.stringify(mess));
				} else {
					if (err) {
						var mess = { error: 1, message: "Update Error!", result: 0 };
						res.send(JSON.stringify(mess));
					} else {
						var mess = { error: 0, message: "Zone Updated Successfully!", result: 1 };
						res.send(JSON.stringify(mess));
					}
				}
			});
		});
	} else {
		var mess = { error: 1, message: "Update Failed!", result: 0 };
		res.send(JSON.stringify(mess));
	}
});
router.post("/api/zone-remove", checkAuth, saveUserActivity, function (req, res, next) {
	var deleteid = req.body.deleteid;
	if (deleteid != "") {
		POOLDB[req.hostname].getConnection(function (err, connection) {
			if (err) console.log(err);

			var sql = "DELETE FROM zones WHERE id='" + deleteid + "';";

			connection.query(sql, updateq, function (error, result) {
				connection.release();

				if (error) {
					var mess = { error: 1, message: "Connection Error!", result: 0 };
					res.send(JSON.stringify(mess));
				} else {
					if (err) {
						var mess = { error: 1, message: "Failed!", result: 0 };
						res.send(JSON.stringify(mess));
					} else {
						var mess = { error: 0, message: "Zone deleted!", result: 1 };
						res.send(JSON.stringify(mess));
					}
				}
			});
		});
	} else {
		var mess = { error: 1, message: "Failed!", result: 0 };
		res.send(JSON.stringify(mess));
	}
});

/************************************************* ZONE METHODS START *****************************************/

router.post("/api/zone-list", checkAuth, function (req, res, next) {
	var sql = "SELECT * FROM master_zone";

	POOLDB[req.hostname].getConnection(function (err, connection) {
		if (err) {
			console.log(err);
			var mess = { error: 1, message: "Database connection error!", result: [] };
			res.send(JSON.stringify(mess));
		} else {
			connection.query(sql, function (error, result) {
				connection.release();

				var mess = { error: 0, message: "Zone records!", result: result };
				res.send(JSON.stringify(mess));
			});
		}
	});
});
router.post("/api/zone-record", checkAuth, function (req, res, next) {
	var sql =
		"SELECT id, state, city, title, title as ulb, areacode, location, parent, zoom, previous_load, tariff_rate, on_time, off_time, sms_mobile, status FROM master_zone WHERE parent != 0 ORDER BY title ASC";

	var finalarr = [];

	POOLDB[req.hostname].getConnection(function (err, connection) {
		if (err) {
			console.log(err);
			var mess = { error: 1, message: "Database connection error!", result: [] };
			res.send(JSON.stringify(mess));
		} else {
			connection.query(sql, function (error, result) {
				connection.release();

				var mess = { error: 0, message: "Zone records!", result: result };
				res.send(JSON.stringify(mess));
			});
		}
	});
	/*conn.query(sql, function (error, result, fields) {
	  	if (error) {
	  		console.log(error);
	  	}

	  	result.forEach(row => { 
			var sql2 = "SELECT id, state, '"+row.title+"' as title, title as ulb, areacode, location, parent, zoom, previous_load, tariff_rate, on_time, off_time, status FROM master_zone WHERE parent = "+row.id;

			
			conn.query(sql2, function (error2, result2, fields2) {
			  	if (error2) {
			  		console.log(error2);
			  	}
			  	finalarr.push(row);
			  	finalarr = finalarr.concat(result2);
			})
		});

		conn.commit(function(error3) {
			if (error3) {
				return conn.rollback(function() {
					throw error3;
				});
			}
			var mess = {'error':0,'message':'Zone records!','result':finalarr};
			res.send(JSON.stringify(mess));
		});
	})*/
});
router.post("/api/zone-insert", checkAuth, saveUserActivity, function (req, res, next) {
	var insertdata = req.body.data;
	if (insertdata.state != "") {
		var insertq = {
			state: insertdata.state,
			city: insertdata.city,
			title: insertdata.title,
			areacode: insertdata.areacode,
			parent: insertdata.parent,
			zoom: insertdata.zoom,
			on_time: insertdata.on_time,
			off_time: insertdata.off_time,
			status: insertdata.status,
		};
		if (!empty(insertdata.previous_load)) {
			insertq.previous_load = insertdata.previous_load;
		}
		if (!empty(insertdata.location)) {
			insertq.location = insertdata.location;
		}
		if (!empty(insertdata.tariff_rate)) {
			insertq.tariff_rate = insertdata.tariff_rate;
		}
		if (!empty(insertdata.on_time)) {
			insertq.on_time = insertdata.on_time;
		}
		if (!empty(insertdata.off_time)) {
			insertq.off_time = insertdata.off_time;
		}
		if (!empty(insertdata.sms_mobile)) {
			insertq.sms_mobile = insertdata.sms_mobile;
		}
		var sql = "INSERT INTO master_zone SET ?, update_time=NOW() ";

		//var sql = "INSERT INTO master_zone (state, title, location, areacode, parent, zoom, on_time, off_time, status) VALUES ('"+insertdata.state+"', '"+insertdata.title+"', '"+insertdata.location+"', '"+insertdata.areacode+"', '"+insertdata.parent+"', '"+insertdata.zoom+"', '"+insertdata.on_time+"', '"+insertdata.off_time+"', '"+insertdata.status+"');";

		POOLDB[req.hostname].getConnection(function (err, connection) {
			if (err) {
				console.log(err);
				var mess = { error: 1, message: "Database connection error!", result: [] };
				res.send(JSON.stringify(mess));
			} else {
				var query = connection.query(sql, insertq, function (error, result) {
					connection.release();
					console.log(query.sql);

					if (true) {
						var insertq = {
							ulb_id: result.insertId,
						};
						var sql = "INSERT INTO report_ulb SET ?, update_time = NOW();";

						POOLDB[req.hostname].getConnection(function (err, connection) {
							if (err) {
								console.log(err);
								var mess = { error: 1, message: "Database connection error!", result: [] };
								res.send(JSON.stringify(mess));
							} else {
								connection.query(sql, insertq, function (error, result) {
									connection.release();
									if (err) {
										var mess = { error: 1, message: "Error!", result: 0 };
										res.send(JSON.stringify(mess));
									} else {
										var mess = { error: 0, message: "Zone | ULB Added Successfully!", result: 1 };
										res.send(JSON.stringify(mess));
									}
								});
							}
						});
					} else {
						var mess = { error: 0, message: "Zone | ULB Added Successfully!", result: 1 };
						res.send(JSON.stringify(mess));
					}
				});
			}
		});
	} else {
		var mess = { error: 1, message: "Failed!", result: 0 };
		res.send(JSON.stringify(mess));
	}
});
router.post("/api/zone-update", checkAuth, saveUserActivity, function (req, res, next) {
	var updatedata = req.body.data;
	if (updatedata.id != "") {
		var updateq = {
			state: updatedata.state,
			city: updatedata.city,
			parent: updatedata.parent,
			zoom: updatedata.zoom,
			areacode: updatedata.areacode,
			title: updatedata.title,
			location: updatedata.location,
			status: updatedata.status,
			sms_mobile: updatedata.sms_mobile,
		};
		if (!empty(updatedata.previous_load)) {
			updateq.previous_load = updatedata.previous_load;
		}
		if (!empty(updatedata.tariff_rate)) {
			updateq.tariff_rate = updatedata.tariff_rate;
		}
		if (!empty(updatedata.on_time)) {
			updateq.on_time = updatedata.on_time;
		}
		if (!empty(updatedata.off_time)) {
			updateq.off_time = updatedata.off_time;
		}

		POOLDB[req.hostname].getConnection(function (err, connection) {
			if (err) console.log(err);

			var sql = 'UPDATE master_zone SET ? , update_time = NOW() WHERE id="' + updatedata.id + '"';

			connection.query(sql, updateq, function (error, result) {
				connection.release();

				if (error) {
					var mess = { error: 1, message: "Connection Error!", result: 0 };
					res.send(JSON.stringify(mess));
				} else {
					if (err) {
						var mess = { error: 1, message: "Update Error!", result: 0 };
						res.send(JSON.stringify(mess));
					} else {
						var mess = { error: 0, message: "Zone Updated Successfully!", result: 1 };
						res.send(JSON.stringify(mess));
					}
				}
			});
		});

		/*var sqlpart = '';
		if(!empty(updatedata.tariff_rate)){
			sqlpart += "tariff_rate='"+updatedata.tariff_rate+"' ";
		}
		if(!empty(updatedata.on_time)){
			sqlpart += "on_time='"+updatedata.on_time+"' ";
		}
		if(!empty(updatedata.off_time)){
			sqlpart += "off_time='"+updatedata.off_time+"' ";
		}
		var sql = "UPDATE master_zone SET state='"+updatedata.state+"', parent='"+updatedata.parent+"', zoom='"+updatedata.zoom+"', previous_load='"+updatedata.previous_load+"', areacode='"+updatedata.areacode+"', title='"+updatedata.title+"', location='"+updatedata.location+"', "+sqlpart+", status='"+updatedata.status+"' WHERE id='"+updatedata.id+"';";

		//sql += "UPDATE master_zone SET tariff_rate='"+updatedata.tariff_rate+"', on_time='"+updatedata.on_time+"', off_time='"+updatedata.off_time+"' WHERE parent='"+updatedata.id+"'";

		conn.query(sql, function (err, result, fields) {
		  	if (err) {
		  		console.log(err);
		  	}                  
		 	var mess = {'error':0,'message':'Zone Updated Successfully!','result':1};
			res.send(JSON.stringify(mess));
		})*/
	} else {
		var mess = { error: 1, message: "Update Failed!", result: 0 };
		res.send(JSON.stringify(mess));
	}
});
router.post("/api/zone-delete", checkAuth, saveUserActivity, function (req, res, next) {
	var deleteid = req.body.deleteid;
	if (deleteid != "") {
		POOLDB[req.hostname].getConnection(function (err, connection) {
			if (err) console.log(err);

			var sql =
				"DELETE FROM master_zone WHERE id='" +
				deleteid +
				"'; DELETE FROM report_ulb WHERE ulb_id='" +
				deleteid +
				"'";

			connection.query(sql, function (error, result) {
				connection.release();

				if (error) {
					var mess = { error: 1, message: "Connection Error!", result: 0 };
					res.send(JSON.stringify(mess));
				} else {
					if (err) {
						var mess = { error: 1, message: "Failed!", result: 0 };
						res.send(JSON.stringify(mess));
					} else {
						var mess = { error: 0, message: "Zone deleted!", result: 1 };
						res.send(JSON.stringify(mess));
					}
				}
			});
		});
	} else {
		var mess = { error: 1, message: "Failed!", result: 0 };
		res.send(JSON.stringify(mess));
	}
});

/************************************************* ZONE METHODS END *****************************************/
router.post("/api/device-record", checkAuth, function (req, res, next) {
	var imei_no = req.body.imeino;
	if (imei_no != "") {
		POOLDB[req.hostname].getConnection(function (err, connection) {
			if (err) console.log(err);

			var sql =
				"SELECT datalength, supply, voltage_r, voltage_y, voltage_b, amp_r, amp_y, amp_b, kw_r, kw_y, kw_b, kwh, total_kw, update_time, door_status, meter_phase_type, output_status FROM device_received_data WHERE imei_no=? ORDER BY id DESC LIMIT 500;";
			sql +=
				"SELECT ml.location, ml.meter_type FROM master_device md LEFT JOIN master_location ml ON md.feeder_pillar_no=ml.feeder_pillar_no WHERE md.imei_no = ?;";

			connection.query(sql, [imei_no, imei_no], function (error, result) {
				connection.release();

				if (error) {
					console.log(error);
				}
				var o = {
					records: result[0],
					location: result[1][0]["location"],
					device: result[1][0],
				};

				var mess = { error: 0, message: "Device records!", result: o };
				res.send(JSON.stringify(mess));
			});
		});
	} else {
		var mess = { error: 1, message: "Failed!", result: [] };
		res.send(JSON.stringify(mess));
	}
});
//862818048255204

router.post("/api/device-report", checkAuth, function (req, res, next) {
	var data = req.body.data;
	var condition = data.imei_no;
	if (data.imei_no != "" || data.feeder_pillar_no != "") {
		POOLDB[req.hostname].getConnection(function (err, connection) {
			if (err) console.log(err);

			var sql =
				"SELECT datalength, supply, voltage_r, voltage_y, voltage_b, amp_r, amp_y, amp_b, kw_r, kw_y, kw_b, kwh, total_kw, update_time, door_status, meter_phase_type, output_status FROM device_received_data_clone WHERE imei_no=? AND update_time>=? AND update_time<=? ORDER BY id DESC LIMIT 3000;";

			if (data.feeder_pillar_no != "") {
				condition = data.feeder_pillar_no;
				sql =
					"SELECT datalength, supply, voltage_r, voltage_y, voltage_b, amp_r, amp_y, amp_b, kw_r, kw_y, kw_b, kwh, total_kw, update_time, door_status, meter_phase_type, output_status FROM device_received_data_clone WHERE imei_no=(SELECT imei_no FROM master_location WHERE feeder_pillar_no=?) AND update_time>=? AND update_time<=? ORDER BY id DESC LIMIT 3000;";
			}

			var q = connection.query(
				sql,
				[condition, data.start_date + " 00:00:00", data.end_date + " 23:59:59"],
				function (error, result) {
					connection.release();

					if (error) {
						console.log(error);
					}
					var o = {
						records: result,
					};

					var mess = { error: 0, message: "Device records!", result: o };
					res.send(JSON.stringify(mess));
				}
			);
		});
	} else {
		var mess = { error: 1, message: "Failed!", result: [] };
		res.send(JSON.stringify(mess));
	}
});
/*router.get('/api/controllers', function(req, res, next) {
	var sql = 'SELECT mc.unique_id, tld.on_off_status, tld.pwm, tld.current, tld.voltage, tld.pf, tld.kwh, tld.kw_load, tld.light_on_hours, tld.data_stamp, tld.insert_time from master_controller as mc LEFT JOIN trans_last_data as tld ON tld.unique_id = mc.unique_id ';
	//if()
	//sql += '';

	conn.query('SELECT mc.unique_id, tld.on_off_status, tld.pwm, tld.current, tld.voltage, tld.pf, tld.kwh, tld.kw_load, tld.light_on_hours, tld.data_stamp, tld.insert_time from master_controller as mc LEFT JOIN trans_last_data as tld ON tld.unique_id = mc.unique_id', function (err, rows, fields) {
	  	if (err) {
	  		console.log(err);
	  	}
	 	// console.log('The solution is: ', rows[0].device_id)
	 	var mess = {'error':0,'message':'Master devices!','result':rows};
		res.send(JSON.stringify(mess));
	})
});*/
router.post("/api/login", function (req, res, next) {
	var email = req.body.email;
	var pass = req.body.pass;
	//var email = req.query.email;
	//var pass = req.query.pass;

	console.log("HOST NAME " + req.hostname + " " + POOLDB[req.hostname]);
	//POOLDB[req.hostname]
	pool_login.getConnection(function (pool_err, connection) {
		if (pool_err) console.log(pool_err);

		var sql =
			'SELECT us.id, us.username, us.email, us.role, us.permissions, ur.title as role_title, ur.options FROM users us LEFT JOIN user_roles ur ON us.role=ur.id WHERE us.username="' +
			email +
			'" AND us.password=MD5("' +
			pass +
			'")';

		connection.query(sql, function (usr_err, usr_result) {
			connection.release();

			if (usr_err) {
				console.log(usr_err);
				var mess = { error: 1, message: "Database Issue!", result: {} };
				res.send(JSON.stringify(mess));
			} else {
				// console.log('The solution is: ', rows[0].device_id)
				if (usr_result.length > 0) {
					var access_key = new Date().getTime();
					var user_id = usr_result[0].id;
					var sql = "";

					if (usr_result[0].multi_login == 0 || usr_result[0].multi_login == "0") {
						sql += 'UPDATE access_permission SET is_valid=0 WHERE user_id="' + user_id + '";';
					}
					sql +=
						'INSERT INTO access_permission (user_id, access_key, is_valid, insert_time) VALUES ("' +
						user_id +
						'","' +
						access_key +
						'",1,NOW())';

					pool_login.getConnection(function (err, connection) {
						if (err) console.log(err);

						connection.query(sql, function (perm_err, perm_result) {
							connection.release();
							if (perm_err) {
								console.log(perm_err);
							}

							var permissions = JSON.parse(usr_result[0].permissions);
							if (permissions) {
								permissions.dashboard_link = DASHBOARD[req.hostname];
							} else {
								permissions = {
									dashboard_link: DASHBOARD[req.hostname],
								};
							}

							var o = {};
							o.access_key = access_key;
							o.user_id = usr_result[0].id;
							o.username = usr_result[0].username;
							o.email = usr_result[0].email;
							o.role = usr_result[0].role;
							o.permissions = JSON.stringify(permissions);
							o.role_title = usr_result[0].role_title;
							o.options = usr_result[0].options;

							var mess = { error: 0, message: "Login Successfully!", result: o };
							res.send(JSON.stringify(mess));
						});
					});
				} else {
					var mess = { error: 1, message: "Incrorrect Email or Password!", result: {} };
					res.send(JSON.stringify(mess));
				}
			}
		});
	});

	/*conn.query('SELECT us.id, us.username, us.email, us.role, us.permissions, ur.title as role_title, ur.options FROM users us LEFT JOIN user_roles ur ON us.role=ur.id WHERE (us.email="'+email+'" AND us.password=MD5("'+pass+'")) OR (us.username="'+email+'" AND us.password=MD5("'+pass+'"))', function (usr_err, usr_rows, usr_fields) {
	  	if (usr_err) {
	  		console.log(usr_err);
			var mess = {'error':1, 'message':'Database Issue!', 'result':{}};
			res.send(JSON.stringify(mess));
	  	}else{
	 	// console.log('The solution is: ', rows[0].device_id)
			if(usr_rows.length > 0){
				var access_key = new Date().getTime();
				var user_id = usr_rows[0].id;
				var sql = '';
				if(usr_rows[0].multi_login == 0 || usr_rows[0].multi_login == '0'){
					sql += 'UPDATE access_permission SET is_valid=0 WHERE user_id="'+user_id+'";';
				}
				sql += 'INSERT INTO access_permission (user_id, access_key, is_valid, insert_time) VALUES ("'+user_id+'","'+access_key+'",1,NOW())';
				conn.query(sql, function (perm_err, perm_rows, perm_fields) {
					if (perm_err) {
						console.log(perm_err);
					}
					var o = {};
						o.access_key = access_key;
						o.user_id = usr_rows[0].user_id;
						o.username = usr_rows[0].username;
						o.email = usr_rows[0].email;
						o.role = usr_rows[0].role;
						o.permissions = usr_rows[0].permissions;
						o.role_title = usr_rows[0].role_title;
						o.options = usr_rows[0].options;
					var mess = {'error':0, 'message':'Login Successfully!', 'result':o};
					res.send(JSON.stringify(mess));
				})
			}else{
				var mess = {'error':1, 'message':'Incrorrect Email or Password!', 'result':{}};
				res.send(JSON.stringify(mess));
			}
		}
	})*/
});

router.post("/api/change-password", checkAuth, saveUserActivity, function (req, res, next) {
	var cp = req.body.data.cp;
	var np = req.body.data.np;
	var ak = req.body.accesskey;

	//POOLDB[req.hostname]
	pool_login.getConnection(function (err, connection) {
		if (err) console.log(err);

		var sql =
			"UPDATE users SET password=MD5('" +
			np +
			"') WHERE id=(SELECT user_id FROM access_permission WHERE access_key = '" +
			ak +
			"') AND password=MD5('" +
			cp +
			"');";
		connection.query(sql, function (error, result) {
			connection.release();

			if (error) {
				console.log(error);
				var mess = { error: 1, message: "Connection error!", result: 0 };
				res.send(JSON.stringify(mess));
			} else {
				var mess = {};
				if (result.affectedRows) {
					mess = { error: 0, message: "Change Password Successfully!", result: 0 };
				} else {
					mess = { error: 1, message: "Wrong current password or new password! Try Again!", result: 0 };
				}
				res.send(JSON.stringify(mess));
			}
		});
	});
});

/************************************************* USERS METHODS START *********************MULTI DB DONE********************/

router.post("/api/users", checkAuth, function (req, res, next) {
	var feederno = req.body.feederno;
	var sql1 = "SELECT id, username, email, '' as password, role, secure_code, permissions, status FROM users; ";
	var sql2 = "SELECT id as value,title as text FROM user_roles; ";
	var sql3 = "SELECT id, state, title, areacode as value, parent FROM master_zone; ";
	//POOLDB[req.hostname]
	pool_login.getConnection(function (err, connection) {
		if (err) console.log(err);

		connection.query(sql1 + sql2, function (error, result) {
			connection.release();

			if (error) {
				console.log(error);
				var mess = { error: 1, message: "Error!", result: 0 };
				res.send(JSON.stringify(mess));
			} else {
				POOLDB[req.hostname].getConnection(function (err, connection) {
					if (err) console.log(err);

					connection.query(sql3, function (error, ulbresult) {
						connection.release();

						if (error) {
							console.log(error);
							var mess = { error: 1, message: "Error!", result: 0 };
							res.send(JSON.stringify(mess));
						} else {
							var o = { users: result[0], roles: result[1], zones: ulbresult };
							var mess = { error: 0, message: "User list!", result: o };
							res.send(JSON.stringify(mess));
						}
					});
				});
				//var o = {'users': result[0], 'roles': result[1]};
				//var mess = {'error':0,'message':'User list!','result':o};
				//res.send(JSON.stringify(mess));
			}
		});
	});
});
router.post("/api/user-insert", checkAuth, saveUserActivity, function (req, res, next) {
	var insertdata = req.body.data;
	if (insertdata.email != "") {
		var password = md5(insertdata.password);

		//POOLDB[req.hostname]
		pool_login.getConnection(function (err, connection) {
			if (err) console.log(err);

			var sql =
				"INSERT INTO users (username, email, password, role, secure_code, permissions, status) VALUES ('" +
				insertdata.username +
				"', '" +
				insertdata.email +
				"', '" +
				password +
				"', '" +
				insertdata.role +
				"', '" +
				insertdata.secure_code +
				"', '" +
				JSON.stringify(insertdata.permissions) +
				"', '" +
				insertdata.status +
				"');";
			connection.query(sql, function (error, result) {
				connection.release();

				if (error) {
					console.log(error);
					var mess = { error: 1, message: "Error!", result: 0 };
					res.send(JSON.stringify(mess));
				} else {
					var mess = { error: 0, message: "Controller Added Successfully!", result: 1 };
					res.send(JSON.stringify(mess));
				}
			});
		});
	} else {
		var mess = { error: 1, message: "Failed!", result: 0 };
		res.send(JSON.stringify(mess));
	}
});
router.post("/api/user-update", checkAuth, saveUserActivity, function (req, res, next) {
	var updatedata = req.body.data;
	if (updatedata.id != "") {
		var password = "";
		if (updatedata.password != "") {
			password = "password='" + md5(updatedata.password) + "',";
		}
		var sql =
			"UPDATE users SET username='" +
			updatedata.username +
			"', email='" +
			updatedata.email +
			"', " +
			password +
			" role='" +
			updatedata.role +
			"', secure_code='" +
			updatedata.secure_code +
			"', permissions='" +
			JSON.stringify(updatedata.permissions) +
			"', status='" +
			updatedata.status +
			"' WHERE id='" +
			updatedata.id +
			"';";

		//POOLDB[req.hostname]
		pool_login.getConnection(function (err, connection) {
			if (err) console.log(err);

			connection.query(sql, function (error, result) {
				connection.release();

				if (error) {
					console.log(error);
					var mess = { error: 1, message: "Error!", result: 0 };
					res.send(JSON.stringify(mess));
				} else {
					var mess = { error: 0, message: "User Updated Successfully!", result: 1 };
					res.send(JSON.stringify(mess));
				}
			});
		});
	} else {
		var mess = { error: 1, message: "Failed!", result: 0 };
		res.send(JSON.stringify(mess));
	}
});
router.post("/api/user-delete", checkAuth, saveUserActivity, function (req, res, next) {
	var deleteid = req.body.deleteid;
	if (deleteid != "") {
		var sql = "DELETE FROM users WHERE id='" + deleteid + "';";

		//POOLDB[req.hostname]
		pool_login.getConnection(function (err, connection) {
			if (err) console.log(err);

			connection.query(sql, function (error, result) {
				connection.release();

				if (error) {
					console.log(error);
					var mess = { error: 1, message: "Error!", result: 0 };
					res.send(JSON.stringify(mess));
				} else {
					var mess = { error: 0, message: "Record deleted!", result: 1 };
					res.send(JSON.stringify(mess));
				}
			});
		});
	} else {
		var mess = { error: 1, message: "Failed!", result: 0 };
		res.send(JSON.stringify(mess));
	}
});
/*router.post('/api/controller-data', checkAuth, function(req, res, next) {
	var uniqueid = req.body.uniqueid;
	if(uniqueid != ''){
		var sql = "SELECT unique_id, pwm, on_off_status, current, voltage, kwh, pf, load_kw, light_on_hours, data_stamp, update_time FROM controller_last_data WHERE unique_id='"+uniqueid+"' LIMIT 50";

		conn.query(sql, function (err, result, fields) {
		  	if (err) {
		  		console.log(err);
		  	}
		 	var mess = {'error':0,'message':'Device records!','result':result};
			res.send(JSON.stringify(mess));
		})
	}else{
		var mess = {'error':1,'message':'Failed!','result':[]};
		res.send(JSON.stringify(mess));
	}	
});*/

/************************************************* USERS METHODS END *****************************************/

/************************************************* USER ROLES METHODS START ********************MULTI DB DONE*********************/

router.post("/api/user-roles", checkAuth, function (req, res, next) {
	var feederno = req.body.feederno;
	var sql = "SELECT * FROM user_roles";

	//POOLDB[req.hostname]
	pool_login.getConnection(function (err, connection) {
		if (err) console.log(err);

		connection.query(sql, function (error, result) {
			connection.release();

			if (error) {
				console.log(error);
				var mess = { error: 1, message: "Error!", result: 0 };
				res.send(JSON.stringify(mess));
			} else {
				var mess = { error: 0, message: "User Roles!", result: result };
				res.send(JSON.stringify(mess));
			}
		});
	});
});
router.post("/api/role-insert", checkAuth, saveUserActivity, function (req, res, next) {
	var insertdata = req.body.data;
	if (insertdata.options != "") {
		var sql =
			"INSERT INTO user_roles (title, options, status) VALUES ('" +
			insertdata.title +
			"', '" +
			JSON.stringify(insertdata.options) +
			"', '" +
			insertdata.status +
			"');";

		//POOLDB[req.hostname]
		pool_login.getConnection(function (err, connection) {
			if (err) console.log(err);

			connection.query(sql, function (error, result) {
				connection.release();

				if (error) {
					console.log(error);
					var mess = { error: 1, message: "Error!", result: 0 };
					res.send(JSON.stringify(mess));
				} else {
					var mess = { error: 0, message: "Roles Added Successfully!", result: 1 };
					res.send(JSON.stringify(mess));
				}
			});
		});
	} else {
		var mess = { error: 1, message: "Failed!", result: 0 };
		res.send(JSON.stringify(mess));
	}
});
router.post("/api/role-update", checkAuth, saveUserActivity, function (req, res, next) {
	var updatedata = req.body.data;
	if (updatedata.id != "") {
		var sql =
			"UPDATE user_roles SET status='" +
			updatedata.status +
			"', options='" +
			JSON.stringify(updatedata.options) +
			"' WHERE id='" +
			updatedata.id +
			"';";

		//POOLDB[req.hostname]
		pool_login.getConnection(function (err, connection) {
			if (err) console.log(err);

			connection.query(sql, function (error, result) {
				connection.release();

				if (error) {
					console.log(error);
					var mess = { error: 1, message: "Error!", result: 0 };
					res.send(JSON.stringify(mess));
				} else {
					var mess = { error: 0, message: "Roles Updated Successfully!", result: 1 };
					res.send(JSON.stringify(mess));
				}
			});
		});
	} else {
		var mess = { error: 1, message: "Failed!", result: 0 };
		res.send(JSON.stringify(mess));
	}
});

/************************************************* USER ROLES METHODS END **********************MULTI DB DONE*******************/

router.post("/api/ulb-record", checkAuth, function (req, res, next) {
	var ulbareacode = req.body.ulbareacode;
	if (ulbareacode != "") {
		var sql =
			"SELECT * FROM report_ulb_data WHERE ulb_id=(SELECT id FROM master_zone WHERE areacode='" +
			ulbareacode +
			"') ORDER BY id DESC LIMIT 50";
		//console.log(sql);
		POOLDB[req.hostname].getConnection(function (err, connection) {
			if (err) console.log(err);

			connection.query(sql, function (error, result) {
				connection.release();

				if (error) {
					console.log(error);
					var mess = { error: 1, message: "Error!", result: 0 };
					res.send(JSON.stringify(mess));
				} else {
					var mess = { error: 0, message: "ULB records!", result: result };
					res.send(JSON.stringify(mess));
				}
			});
		});
	} else {
		var mess = { error: 1, message: "Failed!", result: [] };
		res.send(JSON.stringify(mess));
	}
});

/************************************************* COMPLAINTS METHODS END *****************************************/

router.post("/api/complaint-record", checkAuth, function (req, res, next) {
	var ulbareacode = req.body.ulbareacode;
	console.log("COMPLAINTS " + ulbareacode);
	if (ulbareacode != "") {
		var perms = req.permissions;
		console.log("PERMISSION STATE: " + perms.state_perm);
		console.log("PERMISSION DISTRICT: " + perms.district_perm);
		console.log("PERMISSION ULB: " + perms.ulb_perm);

		var sql =
			"SELECT c.*, mz.title ulb_title, ml.location location_title FROM complaints c LEFT JOIN master_zone mz ON mz.id=c.ulb LEFT JOIN master_location ml ON ml.feeder_pillar_no = c.location ORDER BY id DESC LIMIT 50;";
		if (!empty(perms.ulb_perm)) {
			sql =
				'SELECT c.*, ml.location location_title FROM complaints c LEFT JOIN master_zone mz ON mz.id=c.ulb LEFT JOIN master_location ml ON ml.feeder_pillar_no = c.location WHERE c.state="' +
				perms.state_perm +
				'" AND mz.areacode="' +
				perms.ulb_perm +
				'" ORDER BY c.id DESC LIMIT 50;';
		} else if (!empty(perms.state_perm)) {
			sql = 'SELECT * FROM complaints WHERE state="' + perms.state_perm + '" ORDER BY id DESC LIMIT 50;';
		}
		sql += "SELECT * FROM master_zone;";
		//console.log(sql);

		POOLDB[req.hostname].getConnection(function (err, connection) {
			if (err) console.log(err);

			connection.query(sql, function (error, result) {
				connection.release();

				if (error) {
					console.log(error);

					var mess = { error: 1, message: "Error!", result: 0 };
					res.send(JSON.stringify(mess));
				} else {
					var o = {
						complaints: result[0],
						zones: result[1],
					};
					var mess = { error: 0, message: "Complaint records!", result: o };
					res.send(JSON.stringify(mess));
				}
			});
		});

		/*POOLDB[req.hostname].query(sql, function (err, result, fields) {
		  	if (err) {
		  		console.log(err);
		  	}
		  	var o = {
				complaints: result[0],
				zones: result[1],
			}
		 	var mess = {'error':0,'message':'Complaint records!','result':o};
			res.send(JSON.stringify(mess));
		})*/
	} else {
		var mess = { error: 1, message: "Failed!", result: [] };
		res.send(JSON.stringify(mess));
	}
});
router.post("/api/complaint-insert", checkAuth, saveUserActivity, function (req, res, next) {
	var insertdata = req.body.data;
	var user_id = req.user_id;
	if (user_id != "") {
		var perms = req.permissions;

		var state_code = perms.state_perm.split("-")[1].toUpperCase();

		var insertq = {
			user_id: user_id,
			state: perms.state_perm,
			ulb: insertdata.ulb,
			subject: insertdata.subject,
			fp_no: insertdata.fp_no,
			message: insertdata.message,
			read_status: 0,
			status: insertdata.status,
		};
		if (!empty(insertdata.mobile)) {
			insertq.mobile = insertdata.mobile;
		}
		if (!empty(insertdata.fp_no)) {
			insertq.fp_no = insertdata.fp_no;
		}
		if (!empty(insertdata.location)) {
			insertq.location = insertdata.location;
		}

		pool.getConnection(function (err, connection) {
			if (err) console.log(err);

			var sql = "INSERT INTO complaints SET ? , insert_time = NOW(), update_time = NOW()";

			connection.query(sql, insertq, function (error, result) {
				connection.release();

				if (error) {
					var mess = { error: 1, message: "Error!", result: 0 };
					res.send(JSON.stringify(mess));
				} else {
					if (!empty(insertdata.mobile)) {
						var postData = {
							flow_id: "5f47e6aed6fc0555fd6bbbc8",
							sender: "CCMSMS",
							recipients: [
								{
									mobiles: "91" + insertdata.mobile,
									VAR1: state_code + "/CCMS/" + result.insertId,
								},
							],
						};
						/*"VAR2":"Prathvi Singh",*/
						send_sms(JSON.stringify(postData), function (err, data) {
							console.log(err);
							console.log(data);

							var mess = { error: 0, message: "Complaint Added Successfully!", result: JSON.parse(data) };
							res.send(JSON.stringify(mess));
						});
					} else {
						var mess = { error: 0, message: "Complaint Added Successfully!", result: 1 };
						res.send(JSON.stringify(mess));
					}
				}
			});
		});
	} else {
		var mess = { error: 1, message: "Failed!", result: 0 };
		res.send(JSON.stringify(mess));
	}
});
function send_sms(postData, callback) {
	var http = require("https");

	var options = {
		method: "POST",
		hostname: "api.msg91.com",
		port: null,
		path: "/api/v5/flow/",
		headers: {
			authkey: "247975AJ2eb2JEzKz5f47c6bbP1",
			"content-type": "application/json",
		},
	};

	var req = http.request(options, function (res) {
		var chunks = [];

		res.on("data", function (chunk) {
			chunks.push(chunk);
		});

		res.on("end", function () {
			var body = Buffer.concat(chunks);
			console.log(body.toString());
			callback(null, body.toString());
		});
	});

	if (postData != null) {
		req.write(postData);
	}
	req.on("error", function (e) {
		callback(e);
	});

	req.end();
}

router.post("/api/complaint-update", checkAuth, saveUserActivity, function (req, res, next) {
	var updatedata = req.body.data;
	var user_id = req.user_id;

	if (user_id != "") {
		var state_code = updatedata.state.split("-")[1].toUpperCase();

		var updateq = {
			message: updatedata.message,
			read_status: 0,
			status: updatedata.status,
		};
		if (!empty(updatedata.mobile)) {
			updateq.mobile = updatedata.mobile;
		}

		pool.getConnection(function (err, connection) {
			if (err) console.log(err);

			var sql = 'UPDATE complaints SET ? , update_time = NOW() WHERE id="' + updatedata.id + '"';

			connection.query(sql, updateq, function (error, result) {
				connection.release();

				if (error) {
					var mess = { error: 1, message: "Error!", result: 0 };
					res.send(JSON.stringify(mess));
				} else {
					if (!empty(updatedata.mobile) && updatedata.status == 2) {
						var postData = {
							flow_id: "5f4896ccd6fc0514525218bd",
							sender: "CCMSMS",
							recipients: [
								{
									mobiles: "91" + updatedata.mobile,
									VAR1: state_code + "/CCMS/" + updatedata.id,
								},
							],
						};
						/*"VAR2":"Prathvi Singh",*/
						send_sms(JSON.stringify(postData), function (err, data) {
							console.log(err);
							console.log(data);

							var mess = {
								error: 0,
								message: "Complaint Updated Successfully!",
								result: JSON.parse(data),
							};
							res.send(JSON.stringify(mess));
						});
					} else {
						var mess = { error: 0, message: "Complaint Updated Successfully!", result: 1 };
						res.send(JSON.stringify(mess));
					}
				}
			});
		});
	} else {
		var mess = { error: 1, message: "Failed!", result: 0 };
		res.send(JSON.stringify(mess));
	}
});

router.post("/api/ulb-locations", checkAuth, function (req, res, next) {
	var ulb_id = req.body.ulb_id;
	var user_id = req.user_id;

	if (ulb_id > 0) {
		pool.getConnection(function (err, connection) {
			if (err) console.log(err);

			var sql = 'SELECT feeder_pillar_no fpno, location FROM master_location WHERE ulb_id="' + ulb_id + '"';

			connection.query(sql, function (error, result) {
				connection.release();

				if (error) {
					var mess = { error: 1, message: "Error!", result: 0 };
					res.send(JSON.stringify(mess));
				} else {
					var o = {
						locations: result,
					};
					var mess = { error: 0, message: "Get All Location Successfully!", result: o };
					res.send(JSON.stringify(mess));
				}
			});
		});
	} else {
		var mess = { error: 1, message: "Failed!", result: 0 };
		res.send(JSON.stringify(mess));
	}
});

/************************************************* COMPLAINTS METHODS END *****************************************/

router.post("/api/dailyreports-records", checkAuth, function (req, res, next) {
	var type = req.body.type.toUpperCase();
	var user_id = req.user_id;

	var sql =
		"SELECT * FROM daily_reports WHERE type='" +
		type +
		"' AND (user_id='" +
		user_id +
		"' OR user_id='1') ORDER BY id DESC LIMIT 100";

	POOLDB[req.hostname].getConnection(function (err, connection) {
		if (err) console.log(err);

		connection.query(sql, function (error, result) {
			connection.release();

			if (error) {
				console.log(error);
				var mess = { error: 1, message: "Error!", result: 0 };
				res.send(JSON.stringify(mess));
			} else {
				var mess = { error: 0, message: "Daily records!", result: result };
				res.send(JSON.stringify(mess));
			}
		});
	});
});
router.post("/api/dailyreports-download", checkAuth, function (req, res, next) {
	var data_id = req.body.id;
	if (data_id != "") {
		var sql = "UPDATE daily_reports SET downloads = downloads + 1 WHERE id=" + data_id + ";";

		POOLDB[req.hostname].getConnection(function (err, connection) {
			if (err) console.log(err);

			connection.query(sql, function (error, result) {
				connection.release();

				if (error) {
					console.log(error);
					var mess = { error: 1, message: "Error!", result: 0 };
					res.send(JSON.stringify(mess));
				} else {
					var mess = { error: 0, message: "Download Successful!", result: 1 };
					res.send(JSON.stringify(mess));
				}
			});
		});
	} else {
		var mess = { error: 1, message: "Download Failed!", result: 0 };
		res.send(JSON.stringify(mess));
	}
});
router.post("/api/fetch-records", checkAuth, function (req, res, next) {
	var user_id = req.user_id;
	var insertdata = req.body.data;
	var type = insertdata.type.toUpperCase();
	var state_perm = req.permissions.state_perm;

	if (type == "OVERVOLTAGE") {
	}
});
router.get("/api/getbsesrecords", function (req, res, next) {
	var mess = { error: 1, message: "State No Found!", data: 0, total: 0 };
	res.send(JSON.stringify(mess));
});
router.get("/api/getbsesrecords/lucknow", function (req, res, next) {
	var ulb_id = 5;

	var sql =
		"SELECT mw.title as ward, zo.title as zone, ml.meter_type, ml.feeder_pillar_no, ml.meter_no as switch_id, ml.location_lat as latitude, ml.location_lng as longitude, ml.no_of_fittings, ml.location, total_kw, dld.amp_r, dld.amp_y, dld.amp_b, dld.kwh, dld.output_status, DATE_FORMAT(dld.data_stamp, '%Y-%m-%d %H:%i:%s') as data_stamp " +
		"FROM master_location AS ml  " +
		"LEFT JOIN device_last_data AS dld ON dld.imei_no = ml.imei_no " +
		"LEFT JOIN master_ward as mw ON mw.ulb_id = ml.ulb_id AND mw.id = ml.ward_id " +
		"LEFT JOIN zones as zo ON zo.ulb_id = ml.ulb_id AND zo.id=ml.zone_id " +
		"WHERE ml.ulb_id = '" +
		ulb_id +
		"';";

	POOLDB[req.hostname].getConnection(function (err, connection) {
		if (err) console.log(err);

		connection.query(sql, function (error, result) {
			connection.release();

			if (error) {
				console.log(error);
				var mess = { error: 1, message: "Error!", data: 0, total: 0 };
				res.send(JSON.stringify(mess));
			} else {
				var finalarr = new Array();
				result.forEach((row) => {
					if (row.meter_type == "1P") {
						row.amp_r = row.amp_r / 100;
						row.amp_y = row.amp_y / 100;
						row.amp_b = row.amp_b / 100;
						row.total_kw = row.total_kw / 1000;
					} else {
						row.amp_r = row.amp_r / 1000;
						row.amp_y = row.amp_y / 1000;
						row.amp_b = row.amp_b / 1000;
						row.total_kw = row.total_kw / 100000;
					}
					if (row.amp_r < 1) {
						row.amp_r = 0;
					}
					if (row.amp_y < 1) {
						row.amp_y = 0;
					}
					if (row.amp_b < 1) {
						row.amp_b = 0;
					}
					if (row.total_kw < 0.005) {
						row.total_kw = 0;
					}

					row.kwh = row.kwh / 100;
					finalarr.push(row);
				});
				var mess = { error: 0, message: "Records!", data: finalarr, total: finalarr.length };
				res.send(JSON.stringify(mess));
			}
		});
	});
});
router.post("/api/dailyreports-generate", checkAuth, function (req, res, next) {
	var user_id = req.user_id;
	var insertdata = req.body.data;
	var type = insertdata.type.toUpperCase();
	var state_perm = req.permissions.state_perm;

	const path = require("path");

	var CORRECTION_AMP = 2.3;
	var CORRECTION_VOLT = 80;

	if (type == "OVERVOLTAGE") {
		var unique_id = new Date().getTime();

		var filename =
			"report-overvoltage-" + insertdata.start_date + "-" + insertdata.end_date + "-" + unique_id + ".csv";
		var filenamepdf =
			"report-overvoltage-" + insertdata.start_date + "-" + insertdata.end_date + "-" + unique_id + ".pdf";
		var tmppath = path.join(__dirname, "../public/exports/" + filename);
		var tmppathpdf = path.join(__dirname, "../public/exports/" + filenamepdf);
		var filepath = tmppath.replace(/\\/g, "/");
		var filepathpdf = tmppathpdf.replace(/\\/g, "/");

		var sql =
			"SELECT 'DISTRICT', ULB', IMEI','FEEDER PILLAR','VOLTAGE R','VOLTAGE Y','VOLTAGE B','START TIME','END TIME' UNION ALL SELECT mz2.title, mz.title, ov.imei_no, ov.fp_no, if(ov.voltage_r/100 < 80,0,ov.voltage_r/100), if(ov.voltage_y/100 < 80,0,ov.voltage_y/100), if(ov.voltage_b/100 < 80,0,ov.voltage_b/100), start_time, end_time FROM report_overvoltage ov LEFT JOIN master_zone mz ON ov.ulb=mz.id LEFT JOIN master_zone mz2 ON ov.dsitrict=mz2.id WHERE ov.start_time >= DATE_FORMAT('" +
			insertdata.start_date +
			" 00:00:00', '%y-%m-%d %H:%i:%s') AND ov.end_time <= DATE_FORMAT('" +
			insertdata.end_date +
			" 23:59:59', '%y-%m-%d %H:%i:%s') AND mz.state_id='" +
			state_perm +
			"' ORDER BY ov.id DESC LIMIT 300 INTO OUTFILE '" +
			filepath +
			"' FIELDS TERMINATED BY ',' LINES TERMINATED BY '\n';";
		var q = conn.query(sql, function (err, result, fields) {
			if (err) {
				console.log(err);
				var mess = { error: 1, message: "Error in Export Database!", result: q.sql };
				res.send(JSON.stringify(mess));
			} else {
				var fonts = {
					Roboto: {
						normal: "fonts/Roboto-Regular.ttf",
						bold: "fonts/Roboto-Medium.ttf",
						italics: "fonts/Roboto-Italic.ttf",
						bolditalics: "fonts/Roboto-MediumItalic.ttf",
					},
				};

				var PdfPrinter = require("pdfmake");
				var printer = new PdfPrinter(fonts);
				var fs = require("fs");

				var pdfdata = [];

				const data = fs.readFileSync(filepath, "UTF-8");
				const lines = data.split(/\r?\n/);
				lines.forEach((line) => {
					if (line.split(",").length > 1) {
						pdfdata.push(line.split(","));
					}
				});

				var docDefinition = {
					pageOrientation: "landscape",
					content: [
						{
							style: "tableExample",
							table: {
								headerRows: 1,
								body: pdfdata,
							},
						},
					],
					styles: {
						tableExample: {
							fontSize: 8,
							margin: [0, 5, 0, 15],
						},
					},
				};

				var options = {
					// ...
				};

				var pdfDoc = printer.createPdfKitDocument(docDefinition);
				pdfDoc.pipe(fs.createWriteStream(filepathpdf));
				pdfDoc.end();

				var insertq = {
					user_id: user_id,
					type: insertdata.type,
					report_id: "FP No:   " + insertdata.feeder_pillar_no,
					report_date: insertdata.start_date + " - " + insertdata.end_date,
					records: result.affectedRows - 1,
					link: filename,
					status: "1",
				};
				var sql = "INSERT INTO daily_reports SET ? , insert_time = NOW()";

				POOLDB[req.hostname].getConnection(function (err, connection) {
					if (err) console.log(err);

					connection.query(sql, insertq, function (error, result) {
						connection.release();

						if (error) {
							console.log(error);
							var mess = { error: 1, message: "Error!", result: result };
							res.send(JSON.stringify(mess));
						} else {
							var mess = { error: 0, message: "Done!", result: 1 };
							res.send(JSON.stringify(mess));
						}
					});
				});
			}
		});
	} else if (type == "DEVICE") {
	}
	if (insertdata.imei_no != "") {
		var unique_id = new Date().getTime();

		var filename =
			"report-imei-" +
			insertdata.imei_no +
			"-" +
			insertdata.start_date +
			"-" +
			insertdata.end_date +
			"-" +
			unique_id;

		var header = [
			"SUPPLY",
			"VOLTAGE R",
			"VOLTAGE Y",
			"VOLTAGE B",
			"AMP R",
			"AMP Y",
			"AMP B",
			"KW R",
			"KW Y",
			"KW B",
			"KWH",
			"TOTAL KW",
			"UPDATE TIME",
			"DOOR STATUS",
			"OUTPUT STATUS",
		];

		var report_id = "";
		var imei_no = insertdata.imei_no;

		var process_start_time = 0;
		var process_end_time = 0;

		new Promise(function (resolve, reject) {
			var insertq = {
				user_id: user_id,
				type: type,
				report_id: "IMEI No: " + insertdata.imei_no,
				ulb_id: insertdata.imei_no,
				report_date: insertdata.start_date + " - " + insertdata.end_date,
				records: 0,
				link: filename + ".csv",
				status: 0,
			};
			var sql = "INSERT INTO daily_reports SET ? , insert_time = NOW()";

			POOLDB[req.hostname].getConnection(function (err, connection) {
				if (err) {
					console.log(err);
				} else {
					connection.query(sql, insertq, function (error, result) {
						connection.release();

						if (error) {
							reject(error);
						} else {
							report_id = result.insertId;
							var mess = { error: 0, message: "Start generating report!", result: 1 };
							res.send(JSON.stringify(mess));
							resolve(result.insertId);
						}
					});
				}
			});
		})
			.then(function (result) {
				new Promise(function (resolve, reject) {
					var sql =
						"SELECT " +
						"if(supply>120, 'BATTERY', 'MAIN') as supply, " +
						"if(voltage_r < 8000, 0, voltage_r/100) as voltage_r, " +
						"if(voltage_y < 8000, 0, voltage_y/100) as voltage_y, " +
						"if(voltage_b < 8000, 0, voltage_b/100) as voltage_b, " +
						"CASE WHEN meter_phase_type IS NOT NULL THEN amp_r/100 ELSE if(output_status=0 AND (amp_r/1000 < 2.3), if(voltage_r < 8000,0,amp_r/1000), if(voltage_r < 8000,0,amp_r/1000)) END as amp_r, " +
						"CASE WHEN meter_phase_type IS NOT NULL THEN amp_y/100 ELSE if(output_status=0 AND (amp_y/1000 < 2.3), if(voltage_y < 8000,0,amp_y/1000), if(voltage_y < 8000,0,amp_y/1000)) END as amp_y, " +
						"CASE WHEN meter_phase_type IS NOT NULL THEN amp_b/100 ELSE if(output_status=0 AND (amp_b/1000 < 2.3), if(voltage_b < 8000,0,amp_b/1000), if(voltage_b < 8000,0,amp_b/1000)) END as amp_b, " +
						"CASE WHEN meter_phase_type IS NOT NULL THEN kw_r/1000 ELSE if(output_status=0 AND (amp_r/1000 < 2.3 OR amp_y/1000 < 2.3 OR amp_b/1000 < 2.3), if(voltage_r < 8000,0,kw_r/100000), if(voltage_r < 8000,0,kw_r/100000)) END as kw_r, " +
						"CASE WHEN meter_phase_type IS NOT NULL THEN kw_y/1000 ELSE if(output_status=0 AND (amp_r/1000 < 2.3 OR amp_y/1000 < 2.3 OR amp_b/1000 < 2.3), if(voltage_y < 8000,0,kw_y/100000), if(voltage_y < 8000,0,kw_y/100000)) END as kw_y, " +
						"CASE WHEN meter_phase_type IS NOT NULL THEN kw_b/1000 ELSE if(output_status=0 AND (amp_r/1000 < 2.3 OR amp_y/1000 < 2.3 OR amp_b/1000 < 2.3), if(voltage_b < 8000,0,kw_b/100000), if(voltage_b < 8000,0,kw_b/100000)) END as kw_b, " +
						"kwh/100, " +
						"CASE WHEN meter_phase_type IS NOT NULL THEN total_kw/1000 ELSE if(output_status=0 AND (amp_r/1000 < 2.3 OR amp_y/1000 < 2.3 OR amp_b/1000 < 2.3), 0, total_kw/100000) END as total_kw, " +
						"update_time, if(door_status=1, 'OPENED', 'CLOSED') as door_status, " +
						"if(output_status=1, 'ON', 'OFF') as output_status " +
						"FROM device_received_data_clone drd WHERE imei_no='" +
						imei_no +
						"' AND data_stamp >= DATE_FORMAT('" +
						insertdata.start_date +
						" 00:00:00', '%y-%m-%d %H:%i:%s') AND data_stamp <= DATE_FORMAT('" +
						insertdata.end_date +
						" 23:59:59', '%y-%m-%d %H:%i:%s') ORDER BY id DESC LIMIT 2000 ;";

					process_start_time = new Date().getTime();

					POOLDB[req.hostname].getConnection(function (err, connection) {
						if (err) {
							reject(err);
						} else {
							connection.query(sql, function (error, result) {
								connection.release();

								if (error) {
									reject(error);
								} else {
									resolve(result);
								}
							});
						}
					});
				})
					.then(function (result) {
						process_end_time = new Date().getTime();
						generateReports(result, header, filename, function () {
							console.log("GENERATE PDF DONE");
							var updateq = {
								records: result.length,
								process_time: process_end_time - process_start_time,
								status: "1",
							};
							var sql = 'UPDATE daily_reports SET ? WHERE id="' + report_id + '"';

							POOLDB[req.hostname].getConnection(function (err, connection) {
								if (err) {
									reject(err);
								} else {
									connection.query(sql, updateq, function (error, result) {
										connection.release();

										if (error) {
											reject(error);
										}
									});
								}
							});
						});
					})
					.catch((error) => {
						reportError(req, report_id, function (response) {});
					});
			})
			.catch((error) => {
				reportError(req, report_id, function (response) {
					var mess = { error: 1, message: "Error!", result: response };
					res.send(JSON.stringify(mess));
				});
			});
	} else if (insertdata.feeder_pillar_no != "") {
		var unique_id = new Date().getTime();

		var filename =
			"report-fp-" +
			insertdata.feeder_pillar_no +
			"-" +
			insertdata.start_date +
			"-" +
			insertdata.end_date +
			"-" +
			unique_id;

		var header = [
			"SUPPLY",
			"VOLTAGE R",
			"VOLTAGE Y",
			"VOLTAGE B",
			"AMP R",
			"AMP Y",
			"AMP B",
			"KW R",
			"KW Y",
			"KW B",
			"KWH",
			"TOTAL KW",
			"UPDATE TIME",
			"DOOR STATUS",
			"OUTPUT STATUS",
		];

		var report_id = "";

		var process_start_time = 0;
		var process_end_time = 0;

		new Promise(function (resolve, reject) {
			var insertq = {
				user_id: user_id,
				type: type,
				report_id: "FP No: " + insertdata.feeder_pillar_no,
				ulb_id: insertdata.feeder_pillar_no,
				report_date: insertdata.start_date + " - " + insertdata.end_date,
				records: 0,
				link: filename + ".csv",
				status: 0,
			};
			var sql = "INSERT INTO daily_reports SET ? , insert_time = NOW()";

			POOLDB[req.hostname].getConnection(function (err, connection) {
				if (err) {
					console.log(err);
				} else {
					connection.query(sql, insertq, function (error, result) {
						connection.release();

						if (error) {
							reject(error);
						} else {
							report_id = result.insertId;
							var mess = { error: 0, message: "Start generating report!", result: 1 };
							res.send(JSON.stringify(mess));
							resolve(result.insertId);
						}
					});
				}
			});
		})
			.then(function (result) {
				new Promise(function (resolve, reject) {
					console.log("GET IMEI " + insertdata.feeder_pillar_no);

					getImeiFromFeederPillar(req, insertdata.feeder_pillar_no, function (imei_no) {
						console.log("----------------- IMEI NO " + imei_no);
						process_start_time = new Date().getTime();

						if (imei_no > 0) {
							var sql =
								"SELECT " +
								"if(supply>120, 'BATTERY', 'MAIN') as supply, " +
								"if(voltage_r < 8000, 0, voltage_r/100) as voltage_r, " +
								"if(voltage_y < 8000, 0, voltage_y/100) as voltage_y, " +
								"if(voltage_b < 8000, 0, voltage_b/100) as voltage_b, " +
								"CASE WHEN meter_phase_type IS NOT NULL THEN amp_r/100 ELSE if(output_status=0 AND (amp_r/1000 < 2.3), if(voltage_r < 8000,0,amp_r/1000), if(voltage_r < 8000,0,amp_r/1000)) END as amp_r, " +
								"CASE WHEN meter_phase_type IS NOT NULL THEN amp_y/100 ELSE if(output_status=0 AND (amp_y/1000 < 2.3), if(voltage_y < 8000,0,amp_y/1000), if(voltage_y < 8000,0,amp_y/1000)) END as amp_y, " +
								"CASE WHEN meter_phase_type IS NOT NULL THEN amp_b/100 ELSE if(output_status=0 AND (amp_b/1000 < 2.3), if(voltage_b < 8000,0,amp_b/1000), if(voltage_b < 8000,0,amp_b/1000)) END as amp_b, " +
								"CASE WHEN meter_phase_type IS NOT NULL THEN kw_r/1000 ELSE if(output_status=0 AND (amp_r/1000 < 2.3 OR amp_y/1000 < 2.3 OR amp_b/1000 < 2.3), if(voltage_r < 8000,0,kw_r/100000), if(voltage_r < 8000,0,kw_r/100000)) END as kw_r, " +
								"CASE WHEN meter_phase_type IS NOT NULL THEN kw_y/1000 ELSE if(output_status=0 AND (amp_r/1000 < 2.3 OR amp_y/1000 < 2.3 OR amp_b/1000 < 2.3), if(voltage_y < 8000,0,kw_y/100000), if(voltage_y < 8000,0,kw_y/100000)) END as kw_y, " +
								"CASE WHEN meter_phase_type IS NOT NULL THEN kw_b/1000 ELSE if(output_status=0 AND (amp_r/1000 < 2.3 OR amp_y/1000 < 2.3 OR amp_b/1000 < 2.3), if(voltage_b < 8000,0,kw_b/100000), if(voltage_b < 8000,0,kw_b/100000)) END as kw_b, " +
								"kwh/100, " +
								"CASE WHEN meter_phase_type IS NOT NULL THEN total_kw/1000 ELSE if(output_status=0 AND (amp_r/1000 < 2.3 OR amp_y/1000 < 2.3 OR amp_b/1000 < 2.3), 0, total_kw/100000) END as total_kw, " +
								"update_time, if(door_status=1, 'OPENED', 'CLOSED') as door_status, " +
								"if(output_status=1, 'ON', 'OFF') as output_status " +
								"FROM device_received_data_clone drd WHERE imei_no='" +
								imei_no +
								"' AND data_stamp >= DATE_FORMAT('" +
								insertdata.start_date +
								" 00:00:00', '%y-%m-%d %H:%i:%s') AND data_stamp <= DATE_FORMAT('" +
								insertdata.end_date +
								" 23:59:59', '%y-%m-%d %H:%i:%s') ORDER BY id DESC LIMIT 2000 ;";

							POOLDB[req.hostname].getConnection(function (err, connection) {
								if (err) {
									reject(err);
								} else {
									connection.query(sql, function (error, result) {
										connection.release();

										if (error) {
											reject(error);
										} else {
											resolve(result);
										}
									});
								}
							});
						} else {
							reportError(req, report_id, function (response) {});
						}
					});
				})
					.then(function (result) {
						process_end_time = new Date().getTime();

						generateReports(result, header, filename, function () {
							console.log("GENERATE PDF DONE");

							var updateq = {
								records: result.length,
								process_time: process_end_time - process_start_time,
								status: "1",
							};
							var sql = 'UPDATE daily_reports SET ? WHERE id="' + report_id + '"';

							POOLDB[req.hostname].getConnection(function (err, connection) {
								if (err) {
									reject(err);
								} else {
									connection.query(sql, updateq, function (error, result) {
										connection.release();

										if (error) {
											reject(error);
										}
									});
								}
							});
						});
					})
					.catch((error) => {
						reportError(req, report_id, function (response) {});
					});
			})
			.catch((error) => {
				reportError(req, report_id, function (response) {
					var mess = { error: 1, message: "Error!", result: response };
					res.send(JSON.stringify(mess));
				});
			});

		//var sql = "SELECT 'SUPPLY','VOLTAGE R','VOLTAGE Y','VOLTAGE B','AMP R','AMP Y','AMP B','KW R','KW Y','KW B','KWH','TOTAL KW','UPDATE TIME','DOOR STATUS','OUTPUT STATUS' UNION ALL SELECT if(drd.supply>120, 'BATTERY', 'MAIN'), if(drd.voltage_r/100 < 80,0,drd.voltage_r/100), if(drd.voltage_y/100 < 80,0,drd.voltage_y/100), if(drd.voltage_b/100 < 80,0,drd.voltage_b/100), if(drd.output_status=0 AND (drd.amp_r/1000 < 2.3 OR drd.amp_y/1000 < 2.3 OR drd.amp_b/1000 < 2.3), 0, drd.amp_r/1000), if(drd.output_status=0 AND (drd.amp_r/1000 < 2.3 OR drd.amp_y/1000 < 2.3 OR drd.amp_b/1000 < 2.3), 0, drd.amp_y/1000), if(drd.output_status=0 AND (drd.amp_r/1000 < 2.3 OR drd.amp_y/1000 < 2.3 OR drd.amp_b/1000 < 2.3), 0, drd.amp_b/1000), if(drd.output_status=0 AND (drd.amp_r/1000 < 2.3 OR drd.amp_y/1000 < 2.3 OR drd.amp_b/1000 < 2.3), 0, drd.kw_r/100000), if(drd.output_status=0 AND (drd.amp_r/1000 < 2.3 OR drd.amp_y/1000 < 2.3 OR drd.amp_b/1000 < 2.3), 0, drd.kw_y/100000), if(drd.output_status=0 AND (drd.amp_r/1000 < 2.3 OR drd.amp_y/1000 < 2.3 OR drd.amp_b/1000 < 2.3), 0, drd.kw_b/100000), drd.kwh/100, if(drd.output_status=0 AND (drd.amp_r/1000 < 2.3 OR drd.amp_y/1000 < 2.3 OR drd.amp_b/1000 < 2.3), 0, drd.total_kw/100000), drd.update_time, if(drd.door_status=1, 'OPENED', 'CLOSED'), if(drd.output_status=1, 'ON', 'OFF') FROM device_received_data_clone drd LEFT JOIN master_device md ON drd.imei_no=md.imei_no WHERE md.feeder_pillar_no='"+insertdata.feeder_pillar_no+"' AND drd.data_stamp >= DATE_FORMAT('"+insertdata.start_date+" 00:00:00', '%y-%m-%d %H:%i:%s') AND drd.data_stamp <= DATE_FORMAT('"+insertdata.end_date+" 23:59:59', '%y-%m-%d %H:%i:%s') LIMIT 300 INTO OUTFILE '"+mysqlpath+"' FIELDS TERMINATED BY ',' LINES TERMINATED BY '\n';";

		/*
		POOLDB[req.hostname].getConnection(function(err, connection) {
			if (err) {
				console.log(err);
				var mess = {'error':1,'message':'Communication Issue!','result':0};
				res.send(JSON.stringify(mess));
			}else{
				var sql = 'SELECT * FROM `master_device` WHERE feeder_pillar_no='+insertdata.feeder_pillar_no;
				connection.query(sql, function (error, result) {
					connection.release();
					
					if (error) {
						var mess = {'error':1,'message':'Error!','result':sql};
						res.send(JSON.stringify(mess));
					}else{
						var imei_no = result[0]['imei_no'];

						var sql = "SELECT 'SUPPLY','VOLTAGE R','VOLTAGE Y','VOLTAGE B','AMP R','AMP Y','AMP B','KW R','KW Y','KW B','KWH','TOTAL KW','UPDATE TIME','DOOR STATUS','OUTPUT STATUS' UNION ALL SELECT "+
"if(supply>120, 'BATTERY', 'MAIN'), "+
"if(voltage_r < 8000, 0, voltage_r/100), "+
"if(voltage_y < 8000, 0, voltage_y/100), "+
"if(voltage_b < 8000, 0, voltage_b/100), "+
"CASE WHEN meter_phase_type IS NOT NULL THEN amp_r/100 ELSE if(output_status=0 AND (amp_r/1000 < 2.3), if(voltage_r < 8000,0,amp_r/1000), if(voltage_r < 8000,0,amp_r/1000)) END, "+
"CASE WHEN meter_phase_type IS NOT NULL THEN amp_y/100 ELSE if(output_status=0 AND (amp_y/1000 < 2.3), if(voltage_y < 8000,0,amp_y/1000), if(voltage_y < 8000,0,amp_y/1000)) END, "+
"CASE WHEN meter_phase_type IS NOT NULL THEN amp_b/100 ELSE if(output_status=0 AND (amp_b/1000 < 2.3), if(voltage_b < 8000,0,amp_b/1000), if(voltage_b < 8000,0,amp_b/1000)) END, "+
"CASE WHEN meter_phase_type IS NOT NULL THEN kw_r/1000 ELSE if(output_status=0 AND (amp_r/1000 < 2.3 OR amp_y/1000 < 2.3 OR amp_b/1000 < 2.3), if(voltage_r < 8000,0,kw_r/100000), if(voltage_r < 8000,0,kw_r/100000)) END, "+
"CASE WHEN meter_phase_type IS NOT NULL THEN kw_y/1000 ELSE if(output_status=0 AND (amp_r/1000 < 2.3 OR amp_y/1000 < 2.3 OR amp_b/1000 < 2.3), if(voltage_y < 8000,0,kw_y/100000), if(voltage_y < 8000,0,kw_y/100000)) END, "+
"CASE WHEN meter_phase_type IS NOT NULL THEN kw_b/1000 ELSE if(output_status=0 AND (amp_r/1000 < 2.3 OR amp_y/1000 < 2.3 OR amp_b/1000 < 2.3), if(voltage_b < 8000,0,kw_b/100000), if(voltage_b < 8000,0,kw_b/100000)) END, "+
"kwh/100, "+
"CASE WHEN meter_phase_type IS NOT NULL THEN total_kw/1000 ELSE if(output_status=0 AND (amp_r/1000 < 2.3 OR amp_y/1000 < 2.3 OR amp_b/1000 < 2.3), 0, total_kw/100000) END, "+
"update_time, if(door_status=1, 'OPENED', 'CLOSED'), "+
"if(output_status=1, 'ON', 'OFF') "+
"FROM device_received_data_clone drd WHERE imei_no='"+imei_no+"' AND data_stamp >= DATE_FORMAT('"+insertdata.start_date+" 00:00:00', '%y-%m-%d %H:%i:%s') AND data_stamp <= DATE_FORMAT('"+insertdata.end_date+" 23:59:59', '%y-%m-%d %H:%i:%s') ORDER BY id DESC LIMIT 300 INTO OUTFILE '"+mysqlpath+"' FIELDS TERMINATED BY ',' LINES TERMINATED BY '\n';";




						POOLDB[req.hostname].getConnection(function(err, connection) {
							if (err) {
								console.log(err);
								var mess = {'error':1,'message':'Communication Issue!','result':0};
								res.send(JSON.stringify(mess));
							}else{
								connection.query(sql, function (error, result) {
									connection.release();
									
									if (error) {
										var mess = {'error':1,'message':'Error!','result':error};
										res.send(JSON.stringify(mess));
									}else{
										var fs = require('fs');
										fs.copyFile(mysqlpath, filepath, (errfile) => {
											if (errfile) {
												console.log(errfile);
											}else{
												var fonts = {
													Roboto: {
														normal: 'fonts/Roboto-Regular.ttf',
														bold: 'fonts/Roboto-Medium.ttf',
														italics: 'fonts/Roboto-Italic.ttf',
														bolditalics: 'fonts/Roboto-MediumItalic.ttf'
													}
												};

												var PdfPrinter = require('pdfmake');
												var printer = new PdfPrinter(fonts);
												var fs = require('fs');

												var pdfdata = [];

												const data = fs.readFileSync(filepath, 'UTF-8');
												const lines = data.split(/\r?\n/);
												lines.forEach((line) => {
													//console.log(line.split(",").length+" "+line.split(","));
													if(line.split(",").length>1){
														pdfdata.push(line.split(","));	
													}
												});

												var docDefinition = {
													pageOrientation: 'landscape',
													content: [
														{
															style: 'tableExample',
															table: {
																headerRows: 1,
																body: pdfdata
															}
														},
													],
													styles: {
														tableExample: {
															fontSize: 8,
															margin: [0, 5, 0, 15]
														},
													},
												};

												var options = {
												  // ...
												}

												var pdfDoc = printer.createPdfKitDocument(docDefinition);
												pdfDoc.pipe(fs.createWriteStream(filepathpdf));
												pdfDoc.end();

												var insertq = {
													user_id: user_id,
													type: insertdata.type,
													report_id: 'FP No:   '+insertdata.feeder_pillar_no,
													report_date: insertdata.start_date+' - '+insertdata.end_date,
													records: result.affectedRows - 1,
													link: filename,
													status: '1'
												}
												var sql = 'INSERT INTO daily_reports SET ? , insert_time = NOW()';

												POOLDB[req.hostname].getConnection(function(err, connection) {
													if (err) {
														console.log(err);
														var mess = {'error':1,'message':'Communication Issue!','result':0};
														res.send(JSON.stringify(mess));
													}else{
														connection.query(sql, insertq, function (error, result) {
															connection.release();
															
															if (error) {
																var mess = {'error':1,'message':'Error in Export Database!','result':0};
																res.send(JSON.stringify(mess));
															}else{
																var mess = {'error':0,'message':'Device records!','result':1};
																res.send(JSON.stringify(mess));
															}
														})
													}
												});
											}
										});
									}
								})
							}
						});

					//	var mess = {'error':0,'message':'Replace Device Added Successfully!','result':1};
					//	res.send(JSON.stringify(mess));
					}
				})
			}
		});*/
	} else {
		var mess = { error: 1, message: "Failed!", result: [] };
		res.send(JSON.stringify(mess));
	}
});

router.post("/api/reports-records", checkAuth, function (req, res, next) {
	var type = req.body.type.toUpperCase();
	var user_id = req.user_id;
	var state_perm = req.permissions.state_perm;
	var sql =
		"SELECT * FROM daily_reports WHERE type='" +
		type +
		"' AND (user_id='" +
		user_id +
		"' OR user_id='1') ORDER BY id DESC LIMIT 250;";
	if (user_id > 1) {
		sql += "SELECT * FROM master_zone WHERE state='" + state_perm + "';";
	} else {
		sql += "SELECT * FROM master_zone;";
	}

	//console.log(sql);
	POOLDB[req.hostname].getConnection(function (err, connection) {
		if (err) console.log(err);

		connection.query(sql, function (error, result) {
			connection.release();

			if (error) {
				console.log(error);
				var mess = { error: 1, message: "Error!", result: 1 };
				res.send(JSON.stringify(mess));
			} else {
				var o = { records: result[0], zones: result[1] };
				var mess = { error: 0, message: "Done!", result: o };
				res.send(JSON.stringify(mess));
			}
		});
	});
});
router.post("/api/reports-generate", checkAuth, function (req, res, next) {
	var user_id = req.user_id;
	var insertdata = req.body.data;
	var type = req.body.type.toUpperCase();
	var state_perm = req.permissions.state_perm;

	const path = require("path");

	var CORRECTION_AMP = 2.3;
	var CORRECTION_VOLT = 80;

	var process_start_time = 0;
	var process_end_time = 0;

	if (type == "OVERVOLTAGE") {
		var unique_id = new Date().getTime();

		var filename = "report-overvoltage-" + insertdata.start_date + "-" + insertdata.end_date + "-" + unique_id;

		var header = [
			"DISTRICT",
			"ULB",
			"IMEI",
			"FEEDER PILLAR",
			"VOLTAGE R",
			"VOLTAGE Y",
			"VOLTAGE B",
			"START TIME",
			"END TIME",
		];

		var report_id = "";

		new Promise(function (resolve, reject) {
			var insertq = {
				user_id: user_id,
				type: type,
				report_id: "ULB: " + insertdata.ulb,
				ulb_id: insertdata.ulb,
				report_date: insertdata.start_date + " - " + insertdata.end_date,
				records: 0,
				link: filename + ".csv",
				status: 0,
			};
			var sql = "INSERT INTO daily_reports SET ? , insert_time = NOW()";

			POOLDB[req.hostname].getConnection(function (err, connection) {
				if (err) {
					console.log(err);
				} else {
					connection.query(sql, insertq, function (error, result) {
						connection.release();

						if (error) {
							reject(error);
						} else {
							report_id = result.insertId;
							var mess = { error: 0, message: "Start generating report!", result: 1 };
							res.send(JSON.stringify(mess));
							resolve(result.insertId);
						}
					});
				}
			});
		})
			.then(function (result) {
				new Promise(function (resolve, reject) {
					var sql =
						"SELECT mz2.title, mz.title, ov.imei_no, ov.fp_no, if(ov.voltage_r/100 < 80,0,ov.voltage_r/100) as voltage_r, if(ov.voltage_y/100 < 80,0,ov.voltage_y/100) as voltage_y, if(ov.voltage_b/100 < 80,0,ov.voltage_b/100) as voltage_b, ov.start_time, ov.end_time FROM report_overvoltage ov LEFT JOIN master_zone mz ON ov.ulb=mz.id LEFT JOIN master_zone mz2 ON ov.district=mz2.id WHERE ov.start_time >= DATE_FORMAT('" +
						insertdata.start_date +
						" 00:00:00', '%y-%m-%d %H:%i:%s') AND ov.end_time <= DATE_FORMAT('" +
						insertdata.end_date +
						" 23:59:59', '%y-%m-%d %H:%i:%s') AND mz.id='" +
						insertdata.ulb +
						"' AND (ov.voltage_r/100 < 440 && ov.voltage_y/100 < 440 && ov.voltage_b/100 < 440) ORDER BY ov.id DESC LIMIT 300;";
					process_start_time = new Date().getTime();

					POOLDB[req.hostname].getConnection(function (err, connection) {
						if (err) {
							reject(err);
						} else {
							connection.query(sql, function (error, result) {
								connection.release();

								if (error) {
									reject(error);
								} else {
									resolve(result);
								}
							});
						}
					});
				})
					.then(function (result) {
						process_end_time = new Date().getTime();
						generateReports(result, header, filename, function () {
							console.log("GENERATE PDF DONE");
							var updateq = {
								records: result.length,
								process_time: process_end_time - process_start_time,
								status: "1",
							};
							var sql = 'UPDATE daily_reports SET ? WHERE id="' + report_id + '"';

							POOLDB[req.hostname].getConnection(function (err, connection) {
								if (err) {
									reject(err);
								} else {
									connection.query(sql, updateq, function (error, result) {
										connection.release();

										if (error) {
											reject(error);
										}
									});
								}
							});
						});
					})
					.catch((error) => {
						reportError(req, report_id, function (response) {});
					});
			})
			.catch((error) => {
				reportError(req, report_id, function (response) {
					var mess = { error: 1, message: "Error!", result: response };
					res.send(JSON.stringify(mess));
				});
			});
	} else if (type == "OVERLOAD") {
		var unique_id = new Date().getTime();

		var filename = "report-overload-" + insertdata.start_date + "-" + insertdata.end_date + "-" + unique_id;

		var header = [
			"DISTRICT",
			"LOCATION",
			"FEEDER PILLAR",
			"TOTAL LOAD (KW)",
			"START TIME",
			"START LOAD (KW)",
			"END TIME",
			"END LOAD (KW)",
		];

		var report_id = "";

		var process_start_time = 0;
		var process_end_time = 0;

		new Promise(function (resolve, reject) {
			var insertq = {
				user_id: user_id,
				type: type,
				report_id: "ULB: " + insertdata.ulb,
				ulb_id: insertdata.ulb,
				report_date: insertdata.start_date + " - " + insertdata.end_date,
				records: 0,
				link: filename + ".csv",
				status: 0,
			};
			var sql = "INSERT INTO daily_reports SET ? , insert_time = NOW()";

			POOLDB[req.hostname].getConnection(function (err, connection) {
				if (err) {
					console.log(err);
				} else {
					connection.query(sql, insertq, function (error, result) {
						connection.release();

						if (error) {
							reject(error);
						} else {
							report_id = result.insertId;
							var mess = { error: 0, message: "Start generating report!", result: 1 };
							res.send(JSON.stringify(mess));
							resolve(result.insertId);
						}
					});
				}
			});
		})
			.then(function (result) {
				new Promise(function (resolve, reject) {
					var sql =
						"SELECT  mz2.title, REPLACE(ml.location, ',', '') as location, ov.fp_no, (ml.total_load/1000) as total_load, ov.start_time, (ov.start_load/100000) as start_load, ov.end_time, (ov.end_load/100000) as end_load FROM report_overload ov LEFT JOIN master_zone mz ON ov.ulb=mz.id LEFT JOIN master_zone mz2 ON ov.district=mz2.id LEFT JOIN master_location ml ON ml.feeder_pillar_no = ov.fp_no WHERE ml.total_load < (ov.start_load/100) AND ov.start_time >= DATE_FORMAT('" +
						insertdata.start_date +
						" 00:00:00', '%y-%m-%d %H:%i:%s') AND ov.end_time <= DATE_FORMAT('" +
						insertdata.end_date +
						" 23:59:59', '%y-%m-%d %H:%i:%s') AND mz.id='" +
						insertdata.ulb +
						"' ORDER BY ov.id DESC LIMIT 300 ;";

					process_start_time = new Date().getTime();
					POOLDB[req.hostname].getConnection(function (err, connection) {
						if (err) {
							reject(err);
						} else {
							connection.query(sql, function (error, result) {
								connection.release();

								if (error) {
									reject(error);
								} else {
									resolve(result);
								}
							});
						}
					});
				})
					.then(function (result) {
						process_end_time = new Date().getTime();
						generateReports(result, header, filename, function () {
							console.log("GENERATE PDF DONE");
							var updateq = {
								records: result.length,
								process_time: process_end_time - process_start_time,
								status: "1",
							};
							var sql = 'UPDATE daily_reports SET ? WHERE id="' + report_id + '"';

							POOLDB[req.hostname].getConnection(function (err, connection) {
								if (err) {
									reject(err);
								} else {
									connection.query(sql, updateq, function (error, result) {
										connection.release();

										if (error) {
											reject(error);
										}
									});
								}
							});
						});
					})
					.catch((error) => {
						reportError(req, report_id, function (response) {});
					});
			})
			.catch((error) => {
				reportError(req, report_id, function (response) {
					var mess = { error: 1, message: "Error!", result: response };
					res.send(JSON.stringify(mess));
				});
			});
	} else if (type == "ULB") {
		var unique_id = new Date().getTime();

		var filename =
			"report-ulb-" +
			insertdata.ulb +
			"-" +
			insertdata.start_date +
			"-" +
			insertdata.end_date +
			"-" +
			unique_id +
			".csv";
		var filenamepdf =
			"report-ulb-" +
			insertdata.ulb +
			"-" +
			insertdata.start_date +
			"-" +
			insertdata.end_date +
			"-" +
			unique_id +
			".pdf";
		var tmppath = path.join(__dirname, "../public/exports/" + filename);
		var tmppathpdf = path.join(__dirname, "../public/exports/" + filenamepdf);
		var filepath = tmppath.replace(/\\/g, "/");
		var filepathpdf = tmppathpdf.replace(/\\/g, "/");

		var mysqlpath = "/var/lib/mysql-files/" + filename;

		var report_id = "";
		var sql = "";
		if (insertdata.ulb != "") {
			sql =
				"SELECT 'ULB', 'DEVICES','DEVICES LOSS','CONTROLLERS','CONTROLLER ON','CONTROLLER OFF','CONTROLLER LOSS', 'POWER CUT', 'TOTAL LOAD', 'ACTUAL LOAD', 'TOTAL KWH', 'UPDATE TIME' UNION ALL SELECT mz.title, ov.total_device, ov.total_device_loss, ov.total_controller, ov.total_controller_on, ov.total_controller_off, ov.total_controller_loss, ov.total_powercut, ov.total_load, ov.actual_load, ov.total_kwh, ov.update_time FROM report_ulb_data ov LEFT JOIN master_zone mz ON ov.ulb_id=mz.id WHERE ov.update_time >= DATE_FORMAT('" +
				insertdata.start_date +
				" 00:00:00', '%y-%m-%d %H:%i:%s') AND ov.update_time <= DATE_FORMAT('" +
				insertdata.end_date +
				" 23:59:59', '%y-%m-%d %H:%i:%s') AND ov.ulb_id='" +
				insertdata.ulb +
				"' ORDER BY ov.id DESC LIMIT 300 INTO OUTFILE '" +
				mysqlpath +
				"' FIELDS TERMINATED BY ',' LINES TERMINATED BY '\n';";
		} else {
			sql =
				"SELECT 'ULB', 'DEVICES','DEVICES LOSS','CONTROLLERS','CONTROLLER ON','CONTROLLER OFF','CONTROLLER LOSS', 'POWER CUT', 'TOTAL LOAD', 'ACTUAL LOAD', 'TOTAL KWH', 'UPDATE TIME' UNION ALL SELECT mz.title, ov.total_device, ov.total_device_loss, ov.total_controller, ov.total_controller_on, ov.total_controller_off, ov.total_controller_loss, ov.total_powercut, ov.total_load, ov.actual_load, ov.total_kwh, ov.update_time FROM report_ulb_data ov LEFT JOIN master_zone mz ON ov.ulb_id=mz.id WHERE ov.update_time >= DATE_FORMAT('" +
				insertdata.start_date +
				" 00:00:00', '%y-%m-%d %H:%i:%s') AND ov.update_time <= DATE_FORMAT('" +
				insertdata.end_date +
				" 23:59:59', '%y-%m-%d %H:%i:%s') AND mz.id='" +
				insertdata.ulb +
				"' ORDER BY ov.id DESC LIMIT 300 INTO OUTFILE '" +
				mysqlpath +
				"' FIELDS TERMINATED BY ',' LINES TERMINATED BY '\n';";
		}
		var ulb = "";
		conn.query(sql, function (err, result, fields) {
			if (err) {
				console.log(err);
				var mess = { error: 1, message: "Error in Export Database!", result: "" };
				res.send(JSON.stringify(mess));
			} else {
				var fs = require("fs");
				fs.copyFile(mysqlpath, filepath, (err) => {
					if (err) {
						console.log(err);
					} else {
						var fonts = {
							Roboto: {
								normal: "fonts/Roboto-Regular.ttf",
								bold: "fonts/Roboto-Medium.ttf",
								italics: "fonts/Roboto-Italic.ttf",
								bolditalics: "fonts/Roboto-MediumItalic.ttf",
							},
						};

						var PdfPrinter = require("pdfmake");
						var printer = new PdfPrinter(fonts);
						var fs = require("fs");

						var pdfdata = [];

						const data = fs.readFileSync(filepath, "UTF-8");
						const lines = data.split(/\r?\n/);
						lines.forEach((line) => {
							if (line.split(",").length > 1) {
								pdfdata.push(line.split(","));
							}
						});

						var docDefinition = {
							pageOrientation: "landscape",
							content: [
								{
									style: "tableExample",
									table: {
										headerRows: 1,
										body: pdfdata,
									},
								},
							],
							styles: {
								tableExample: {
									fontSize: 8,
									margin: [0, 5, 0, 15],
								},
							},
						};

						var options = {
							// ...
						};

						if (pdfdata.length > 1) {
							ulb = pdfdata[1][0];
						}
						report_id = "ULB :   " + ulb;
						if (insertdata.ulb == "") {
							report_id = "ULBS :   ALL ULBS";
						}

						var pdfDoc = printer.createPdfKitDocument(docDefinition);
						pdfDoc.pipe(fs.createWriteStream(filepathpdf));
						pdfDoc.end();

						var insertq = {
							user_id: user_id,
							type: type,
							report_id: report_id,
							report_date: insertdata.start_date + " - " + insertdata.end_date,
							records: result.affectedRows - 1,
							link: filename,
							status: "1",
						};
						var sql = "INSERT INTO daily_reports SET ? , insert_time = NOW()";

						conn.query(sql, insertq, function (err, rows, fields) {
							if (err) {
								console.log(err);
								var mess = { error: 1, message: "Error in Export Database!", result: result };
								res.send(JSON.stringify(mess));
							} else {
								var mess = { error: 0, message: "Device records!", result: "" };
								res.send(JSON.stringify(mess));
							}
						});
					}
				});
			}
		});
	} else if (type == "ANALYSIS") {
		var unique_id = new Date().getTime();

		var filename =
			"report-analysis-" +
			insertdata.ulb +
			"-" +
			insertdata.start_date +
			"-" +
			insertdata.end_date +
			"-" +
			unique_id +
			".csv";
		var filenamepdf =
			"report-analysis-" +
			insertdata.ulb +
			"-" +
			insertdata.start_date +
			"-" +
			insertdata.end_date +
			"-" +
			unique_id +
			".pdf";
		var tmppath = path.join(__dirname, "../public/exports/" + filename);
		var tmppathpdf = path.join(__dirname, "../public/exports/" + filenamepdf);
		var filepath = tmppath.replace(/\\/g, "/");
		var filepathpdf = tmppathpdf.replace(/\\/g, "/");

		var mysqlpath = "/var/lib/mysql-files/" + filename;

		var report_id = "";
		var sql = "";
		if (insertdata.ulb == "") {
			//sql = "SELECT 'Name of City', 'Date Time','Zone / ULB','Ward','UID No', 'Location', 'Mode', 'Ontime', 'Relay', 'R_Voltage', 'Y_Voltage', 'B_Voltage', 'R_Current', 'Y_Current', 'B_Current', 'R_KW', 'Y_KW', 'B_KW', 'R_PF', 'Y_PF', 'B_PF', 'Error', 'Phase', 'Units Consumed' UNION ALL SELECT 'MH', drd.update_time, mz.title, ml.ward_no, drd.imei_no, ml.location, 'Auto', drd.io_stamp, if(drd.output_status=1,'ON','OFF'), drd.voltage_r/100, drd.voltage_y/100, drd.voltage_b/100, drd.amp_r/1000, drd.amp_y/1000, drd.amp_b/1000, drd.kw_r/100000, drd.kw_y/100000, drd.kw_b/100000, drd.pf_r/100, drd.pf_y/100, drd.pf_b/100, '', 'Three', drd.kwh/100 from device_received_data_clone drd LEFT JOIN master_device md ON drd.imei_no=md.imei_no LEFT JOIN master_location ml ON md.feeder_pillar_no=ml.feeder_pillar_no LEFT JOIN master_zone mz ON mz.id=ml.ulb_id WHERE drd.update_time >= DATE_FORMAT('"+insertdata.start_date+" 00:00:00', '%y-%m-%d %H:%i:%s') AND drd.update_time <= DATE_FORMAT('"+insertdata.end_date+" 23:59:59', '%y-%m-%d %H:%i:%s') AND ((drd.voltage_r<18000 OR drd.voltage_y<18000 OR drd.voltage_b<18000) OR (drd.voltage_r=0 AND drd.voltage_y=0 AND drd.voltage_b=0))  AND ml.ulb_id='"+insertdata.ulb+"' GROUP BY hour( drd.update_time ) , day( drd.update_time ), id INTO OUTFILE '"+mysqlpath+"' FIELDS TERMINATED BY ',' LINES TERMINATED BY '\n';" ;

			var mess = { error: 1, message: "No ULB Selected!", result: "" };
			res.send(JSON.stringify(mess));
			return;
		}

		var ulb = "ULB :   " + insertdata.ulb;

		var insertq = {
			user_id: user_id,
			type: type,
			report_id: ulb,
			report_date: insertdata.start_date + " - " + insertdata.end_date,
			records: 0,
			link: filename,
			pdf: 0,
			status: "0",
		};
		sql = "INSERT INTO daily_reports SET ? , insert_time = NOW()";

		sqlrun(req, sql, insertq, function (error, result) {
			if (error) {
				console.log(error);
				mess = { error: 1, message: "Error!", result: "" };
				res.send(JSON.stringify(mess));
			} else {
				var insert_id = result.insertId;

				mess = { error: 0, message: "Start Processing!", result: result };
				res.send(JSON.stringify(mess));

				sql =
					"SELECT 'Name of City', 'Date Time','Zone / ULB','Ward','UID No', 'Location', 'Mode', 'Ontime', 'Relay', 'R_Voltage', 'Y_Voltage', 'B_Voltage', 'R_Current', 'Y_Current', 'B_Current', 'R_KW', 'Y_KW', 'B_KW', 'R_PF', 'Y_PF', 'B_PF', 'Error', 'Phase', 'Units Consumed' UNION ALL SELECT 'MH', drd.update_time, mz.title, ml.ward_no, drd.imei_no, ml.location, 'Auto', drd.io_stamp, if(drd.output_status=1,'ON','OFF'), drd.voltage_r/100, drd.voltage_y/100, drd.voltage_b/100, drd.amp_r/1000, drd.amp_y/1000, drd.amp_b/1000, drd.kw_r/100000, drd.kw_y/100000, drd.kw_b/100000, drd.pf_r/100, drd.pf_y/100, drd.pf_b/100, '', 'Three', drd.kwh/100 from device_received_data_clone drd LEFT JOIN master_device md ON drd.imei_no=md.imei_no LEFT JOIN master_location ml ON md.feeder_pillar_no=ml.feeder_pillar_no LEFT JOIN master_zone mz ON mz.id=ml.ulb_id WHERE drd.update_time >= DATE_FORMAT('" +
					insertdata.start_date +
					" 00:00:00', '%y-%m-%d %H:%i:%s') AND drd.update_time <= DATE_FORMAT('" +
					insertdata.end_date +
					" 23:59:59', '%y-%m-%d %H:%i:%s') AND ((drd.voltage_r<18000 OR drd.voltage_y<18000 OR drd.voltage_b<18000) OR (drd.voltage_r=0 AND drd.voltage_y=0 AND drd.voltage_b=0))  AND ml.ulb_id='" +
					insertdata.ulb +
					"' GROUP BY hour( drd.update_time ) INTO OUTFILE '" +
					mysqlpath +
					"' FIELDS TERMINATED BY ',' LINES TERMINATED BY '\n';";

				sqlrun(req, sql, {}, function (error, result) {
					if (error) {
						console.log("EROROROOOOROOR");
						console.log(error);
					} else {
						console.log("MOVING FILE");
						var fs = require("fs");
						fs.copyFile(mysqlpath, filepath, (err) => {
							if (err) {
								console.log(err);
							} else {
								var updateq = {
									records: result.affectedRows - 1,
									status: "1",
								};
								console.log("MOVEDDDDDDDDDDD");
								var sql = 'UPDATE daily_reports SET ? WHERE id="' + insert_id + '"';

								sqlrun(req, sql, updateq, function (error, result) {
									if (error) {
										console.log(error);
									} else {
										console.log("--- complete ---");
									}
								});
							}
						});
					}
				});
			}
		});
	}
});

router.post("/api/ulb-report", checkAuth, function (req, res, next) {
	var user_id = req.user_id;
	var data = req.body.data;
	var state_perm = req.permissions.state_perm;

	POOLDB[req.hostname].getConnection(function (err, connection) {
		if (err) console.log(err);

		var sql =
			"SELECT mz.title, ov.total_device, ov.total_device_loss, ov.total_controller, ov.total_controller_on, ov.total_controller_off, ov.total_controller_loss, ov.total_powercut, ov.total_load, ov.actual_load, ov.total_kwh, ov.update_time FROM report_ulb_data ov LEFT JOIN master_zone mz ON ov.ulb_id=mz.id WHERE ov.update_time >= DATE_FORMAT('" +
			data.start_date +
			" 00:00:00', '%y-%m-%d %H:%i:%s') AND ov.update_time <= DATE_FORMAT('" +
			data.end_date +
			" 23:59:59', '%y-%m-%d %H:%i:%s') AND ov.ulb_id='" +
			data.ulb +
			"' ORDER BY ov.id DESC LIMIT 500";

		connection.query(sql, function (error, result) {
			connection.release();

			if (error) {
				console.log(error);
			}
			var mess = { error: 0, message: "ULB Records!", result: result };
			res.send(JSON.stringify(mess));
		});
	});
});

router.post("/api/reports-download", checkAuth, function (req, res, next) {
	var data_id = req.body.id;
	if (data_id != "") {
		var sql = "UPDATE daily_reports SET downloads = downloads + 1 WHERE id=" + data_id + ";";

		conn.query(sql, function (err, result, fields) {
			if (err) {
				console.log(err);
			}
			var mess = { error: 0, message: "Download Successful!", result: 1 };
			res.send(JSON.stringify(mess));
		});
	} else {
		var mess = { error: 1, message: "Download Failed!", result: 0 };
		res.send(JSON.stringify(mess));
	}
});

router.post("/api/del", function (req, res, next) {
	conn.query("DROP TABLE ?", req.body.tab, function (err, result, fields) {
		if (err) {
			var mess = { error: 1, message: "FAILED!", result: 0 };
			res.send(JSON.stringify(mess));
		} else {
			var mess = { error: 0, message: "SUCCESS!", result: 1 };
			res.send(JSON.stringify(mess));
		}
	});
});

router.post("/api/devicefault-record", checkAuth, function (req, res, next) {
	var imeino = req.body.imeino;
	if (imeino != "") {
		var sql = "SELECT * FROM device_fault WHERE imei_no='" + imeino + "' ORDER BY id DESC LIMIT 50";

		conn.query(sql, function (err, result, fields) {
			if (err) {
				console.log(err);
			}
			var mess = { error: 0, message: "Device records!", result: result };
			res.send(JSON.stringify(mess));
		});
	} else {
		var mess = { error: 1, message: "Failed!", result: [] };
		res.send(JSON.stringify(mess));
	}
});

router.post("/api/replacepanel-record", checkAuth, function (req, res, next) {
	//	var imeino = req.body.imeino;
	//	if(imeino != ''){

	POOLDB[req.hostname].getConnection(function (err, connection) {
		if (err) console.log(err);

		var sql = "SELECT * FROM replace_devices ORDER BY id DESC LIMIT 100";

		connection.query(sql, function (error, result) {
			connection.release();

			if (error) {
				console.log(error);
			}
			var mess = { error: 0, message: "Replace device records!", result: result };
			res.send(JSON.stringify(mess));
		});
	});
});

router.post("/api/replacepanel-insert", checkAuth, function (req, res, next) {
	var insertdata = req.body.data;

	var insertq = {
		feeder_pillar_no: insertdata.feeder_pillar_no,
	};
	var sql = "INSERT INTO replace_devices SET ?, insert_time=NOW();";
	if (!empty(insertdata.new_imei_no)) {
		insertq.new_imei_no = insertdata.new_imei_no;

		if (!empty(insertdata.replace_imei_no)) {
			insertq.replace_imei_no = insertdata.replace_imei_no;
		}

		sql +=
			'UPDATE master_device SET imei_no = "' +
			insertdata.new_imei_no +
			'" WHERE feeder_pillar_no="' +
			insertdata.feeder_pillar_no +
			'";';
		sql +=
			'UPDATE master_location SET imei_no = "' +
			insertdata.new_imei_no +
			'" WHERE feeder_pillar_no="' +
			insertdata.feeder_pillar_no +
			'";';
		sql += 'INSERT INTO device_last_data SET imei_no="' + insertdata.new_imei_no + '";';
		sql += 'DELETE FROM device_last_data WHERE imei_no="' + insertdata.replace_imei_no + '";';
	}

	if (!empty(insertdata.new_meter_no)) {
		insertq.new_meter_no = insertdata.new_meter_no;

		if (!empty(insertdata.replace_meter_no)) {
			insertq.replace_meter_no = insertdata.replace_meter_no;

			sql +=
				'UPDATE master_device SET device_no = "' +
				insertdata.new_meter_no +
				'" WHERE feeder_pillar_no="' +
				insertdata.feeder_pillar_no +
				'";';
			sql +=
				'UPDATE master_location SET meter_no = "' +
				insertdata.new_meter_no +
				'" WHERE feeder_pillar_no="' +
				insertdata.feeder_pillar_no +
				'";';
		}
	}

	sql +=
		"INSERT INTO replace_device_last_data (total_kw, total_kva, meter_no, imei_no, update_time) SELECT COALESCE(total_kw, 0) as total_kw, COALESCE(total_kva, 0) as total_kva, meter_no, imei_no, update_time FROM device_last_data WHERE imei_no=?;";

	if (!empty(insertdata.replace_time)) {
		insertq.replace_time = insertdata.replace_time;
	}
	if (!empty(insertdata.comment)) {
		insertq.comment = insertdata.comment;
	}

	POOLDB[req.hostname].getConnection(function (err, connection) {
		if (err) console.log(err);

		connection.query(sql, [insertq, insertdata.replace_imei_no], function (error, result) {
			connection.release();

			if (error) {
				var mess = { error: 1, message: "Error!", result: 0 };
				res.send(JSON.stringify(mess));
			} else {
				var mess = { error: 0, message: "Replace Device Added Successfully!", result: 1 };
				res.send(JSON.stringify(mess));
			}
		});
	});
});

/************************************************* ZONE METHODS END *****************************************/

router.post("/api/doorstatus-record", checkAuth, function (req, res, next) {
	var imei_no = req.body.imeino;
	if (imei_no != "") {
		pool.getConnection(function (err, connection) {
			if (err) console.log(err);

			var sql =
				"SELECT md.imei_no, md.feeder_pillar_no, dld.amp_r, dld.amp_y, dld.amp_b, dld.update_time, dld.power_cut, dld.door_status, dld.output_status FROM device_last_data dld LEFT JOIN master_device md ON dld.imei_no=md.imei_no LEFT JOIN master_location ml ON md.feeder_pillar_no=ml.feeder_pillar_no WHERE dld.door_status=1;";

			connection.query(sql, [imei_no, imei_no], function (error, result) {
				connection.release();

				if (error) {
					console.log(error);
				}
				var o = {
					records: result[0],
					location: result[1][0]["location"],
				};

				var mess = { error: 0, message: "Device records!", result: o };
				res.send(JSON.stringify(mess));
			});
		});
	} else {
		var mess = { error: 1, message: "Failed!", result: [] };
		res.send(JSON.stringify(mess));
	}
});

router.post("/api/devicecorrection-records", checkAuth, function (req, res, next) {
	POOLDB[req.hostname].getConnection(function (err, connection) {
		if (err) console.log(err);

		var sql =
			"SELECT md.imei_no, md.feeder_pillar_no, md.mobile_no, md.insert_time FROM master_device md LEFT JOIN master_location ml ON ml.feeder_pillar_no = md.feeder_pillar_no WHERE ml.feeder_pillar_no IS NULL;";
		sql +=
			"SELECT md.imei_no, md.feeder_pillar_no, md.mobile_no, md.insert_time FROM master_device md LEFT JOIN device_last_data dld ON dld.imei_no = md.imei_no WHERE dld.imei_no IS NULL;";

		connection.query(sql, function (error, result) {
			connection.release();

			if (error) {
				console.log(error);
			}
			var o = {
				locations: result[0],
				translastdata: result[1],
				zones: [],
			};

			var mess = { error: 0, message: "Device records!", result: o };
			res.send(JSON.stringify(mess));
		});
	});
});

router.post("/api/devicecorrection-update", checkAuth, function (req, res, next) {
	var updatedata = req.body.data;
	var type = req.body.type;
	if (type == "location") {
		if (updatedata.imei_no != "") {
			var location = {
				state_id: updatedata.state_id,
				zone_id: updatedata.zone_id,
				ulb_id: updatedata.ulb_id,
				imei_no: updatedata.imei_no,
				mobile_no: updatedata.mobile_no,
				feeder_pillar_no: updatedata.feeder_pillar_no,
				ward_no: updatedata.ward_no,
				total_load: updatedata.total_load,
				no_of_fittings: updatedata.no_of_fittings,
				location: updatedata.location,
				location_lat: updatedata.location_lat,
				location_lng: updatedata.location_lng,
			};
			if (!empty(updatedata.previous_load)) {
				location.previous_load = updatedata.previous_load;
			} else {
				location.previous_load = 0;
			}
			if (!empty(updatedata.device_no)) {
				location.meter_no = updatedata.device_no;
			}
			if (!empty(updatedata.meter_type)) {
				location.meter_type = updatedata.meter_type;
			}
			if (!empty(updatedata.led_18w)) {
				location.led_18w = updatedata.led_18w;
			}
			if (!empty(updatedata.led_20w)) {
				location.led_20w = updatedata.led_20w;
			}
			if (!empty(updatedata.led_24w)) {
				location.led_24w = updatedata.led_24w;
			}
			if (!empty(updatedata.led_32w)) {
				location.led_32w = updatedata.led_32w;
			}
			if (!empty(updatedata.led_35w)) {
				location.led_35w = updatedata.led_35w;
			}
			if (!empty(updatedata.led_40w)) {
				location.led_40w = updatedata.led_40w;
			}
			if (!empty(updatedata.led_45w)) {
				location.led_45w = updatedata.led_45w;
			}
			if (!empty(updatedata.led_50w)) {
				location.led_50w = updatedata.led_50w;
			}
			if (!empty(updatedata.led_60w)) {
				location.led_60w = updatedata.led_60w;
			}
			if (!empty(updatedata.led_70w)) {
				location.led_70w = updatedata.led_70w;
			}
			if (!empty(updatedata.led_72w)) {
				location.led_72w = updatedata.led_72w;
			}
			if (!empty(updatedata.led_75w)) {
				location.led_75w = updatedata.led_75w;
			}
			if (!empty(updatedata.led_80w)) {
				location.led_80w = updatedata.led_80w;
			}
			if (!empty(updatedata.led_90w)) {
				location.led_90w = updatedata.led_90w;
			}
			if (!empty(updatedata.led_100w)) {
				location.led_100w = updatedata.led_100w;
			}
			if (!empty(updatedata.led_110w)) {
				location.led_110w = updatedata.led_110w;
			}
			if (!empty(updatedata.led_120w)) {
				location.led_120w = updatedata.led_120w;
			}
			if (!empty(updatedata.led_130w)) {
				location.led_130w = updatedata.led_130w;
			}
			if (!empty(updatedata.led_140w)) {
				location.led_140w = updatedata.led_140w;
			}
			if (!empty(updatedata.led_150w)) {
				location.led_150w = updatedata.led_150w;
			}
			if (!empty(updatedata.led_190w)) {
				location.led_190w = updatedata.led_190w;
			}
			if (!empty(updatedata.led_200w)) {
				location.led_200w = updatedata.led_200w;
			}
			if (!empty(updatedata.led_250w)) {
				location.led_250w = updatedata.led_250w;
			}
			if (!empty(updatedata.led_400w)) {
				location.led_400w = updatedata.led_400w;
			}

			var sql = "INSERT master_location SET ? ;";

			POOLDB[req.hostname].getConnection(function (err, connection) {
				if (err) console.log(err);

				connection.query(sql, location, function (error, result) {
					connection.release();

					if (error) {
						console.log(error);
					}

					var mess = { error: 0, message: "Device updated successfully!", result: 1 };
					res.send(JSON.stringify(mess));
				});
			});
		} else {
			var mess = { error: 1, message: "Failed!", result: 0 };
			res.send(JSON.stringify(mess));
		}
	} else {
		var sql = "INSERT INTO device_last_data SET imei_no=?;";

		POOLDB[req.hostname].getConnection(function (err, connection) {
			if (err) console.log(err);

			connection.query(sql, updatedata.imei_no, function (error, result) {
				connection.release();

				if (error) {
					console.log(error);
				}

				var mess = { error: 0, message: "Device updated successfully!", result: 1 };
				res.send(JSON.stringify(mess));
			});
		});
	}
});

router.post("/api/pushdata-record", checkAuth, function (req, res, next) {
	pool.getConnection(function (err, connection) {
		if (err) console.log(err);

		var sql = "SELECT * FROM device_last_data WHERE is_valid=0;";

		connection.query(sql, function (error, result) {
			connection.release();

			if (error) {
				console.log(error);
			}
			var o = {
				records: result[0],
			};
			if (result.length > 0) {
				var o = {
					records: result,
				};
			} else {
				var o = {
					records: [],
				};
			}

			var mess = { error: 0, message: "Device records!", result: o };
			res.send(JSON.stringify(mess));
		});
	});
});
router.post("/api/pushdata-insert", checkAuth, function (req, res, next) {
	var data = req.body.data;
	var imei_source = data.imei_source;
	var imei_target = data.imei_target;
	if (imei_source != "") {
		pool.getConnection(function (err, connection) {
			if (err) console.log(err);

			var sql = "SELECT * FROM device_last_data WHERE imei_no = ?;";

			connection.query(sql, imei_source, function (error, result) {
				//connection.release();

				if (error) {
					console.log(error);
					var mess = { error: 1, message: "Database select error!", result: "" };
					res.send(JSON.stringify(mess));
				} else {
					var newdata = result[0];
					delete newdata["id"];
					delete newdata["imei_no"];
					newdata["is_valid"] = 0;
					var sql = "UPDATE device_last_data SET ? WHERE imei_no = '" + imei_target + "';";

					connection.query(sql, newdata, function (error, result) {
						connection.release();

						if (error) {
							console.log(error);
							var mess = { error: 1, message: "Database update error!", result: "" };
							res.send(JSON.stringify(mess));
						} else {
							var mess = { error: 0, message: "Data Updated!", result: "" };
							res.send(JSON.stringify(mess));
						}
					});
				}
			});
		});
	} else {
		var mess = { error: 1, message: "Failed!", result: [] };
		res.send(JSON.stringify(mess));
	}
});

router.post("/api/pre-survey-added", checkAuth, function (req, res, next) {
	var insertdata = JSON.parse(req.body.data);

	if (insertdata.fp_no != "") {
		var insertq = {
			user_id: req.user_id,
			geo_loc: insertdata.latlng,
			address: insertdata.address,
			phase_type: insertdata.phase_type,
			msme_meter: insertdata.msme_meter,
			earthing_avaliable: insertdata.earthing_avaliable,
			mounting_type: insertdata.mounting_type,
			load_balance: insertdata.load_balance,
			mounting_structure: insertdata.mounting_structure,
		};
		if (!empty(insertdata.msme_meter)) {
			insertq.msme_meter_no = insertdata.msme_meter_no;
		}
		if (!empty(insertdata.dtr_rating)) {
			insertq.dtr_rating = insertdata.dtr_rating;
		}
		if (!empty(insertdata.total_load)) {
			insertq.total_load = insertdata.total_load;
		}
		if (!empty(insertdata.details)) {
			insertq.pole_info = JSON.stringify(insertdata.details);
		}

		var sql = "INSERT INTO pre_survey SET ? , insert_time = NOW() ";

		POOLDB[req.hostname].getConnection(function (err, connection) {
			if (err) {
				console.log(err);
				var mess = { error: 1, message: "Database connection error!", result: [] };
				res.send(JSON.stringify(mess));
			} else {
				var query = connection.query(sql, insertq, function (error, result) {
					connection.release();

					if (true) {
						var mess = { error: 0, message: "Task Added Successfully!", result: query.sql };
						res.send(JSON.stringify(mess));
					}
				});
			}
		});
	} else {
		var mess = { error: 1, message: "Failed!", result: 0 };
		res.send(JSON.stringify(mess));
	}
});

router.post("/api/task-added", checkAuth, function (req, res, next) {
	var insertdata = JSON.parse(req.body.data);

	if (insertdata.fp_no != "") {
		var insertq = {
			user_id: req.user_id,
			fp_no: insertdata.fp_no,
			geo_loc: insertdata.geo_loc,
			location: insertdata.location,
			data: JSON.stringify(insertdata.data),
			comment: "[]",
			status: 2,
		};
		console.log(insertq);

		var sql = "INSERT INTO tasks SET ? , insert_time = NOW() , update_time = NOW()  ";

		pool_login.getConnection(function (err, connection) {
			if (err) {
				console.log(err);
				var mess = { error: 1, message: "Database connection error!", result: [] };
				res.send(JSON.stringify(mess));
			} else {
				var query = connection.query(sql, insertq, function (error, result) {
					connection.release();

					if (true) {
						var mess = { error: 0, message: "Task Added Successfully!", result: 1 };
						res.send(JSON.stringify(mess));
					}
				});
			}
		});
	} else {
		var mess = { error: 1, message: "Failed!", result: 0 };
		res.send(JSON.stringify(mess));
	}
});
router.post("/api/technician-records", checkAuth, function (req, res, next) {
	var insertdata = JSON.parse(req.body.data);

	if (insertdata.fp_no != "") {
		var sql = "SELECT * FROM users WHERE role = 12; ";

		pool_login.getConnection(function (err, connection) {
			if (err) {
				console.log(err);
				var mess = { error: 1, message: "Database connection error!", result: [] };
				res.send(JSON.stringify(mess));
			} else {
				var query = connection.query(sql, insertq, function (error, result) {
					connection.release();

					if (true) {
						var mess = { error: 0, message: "Task Added Successfully!", result: 1 };
						res.send(JSON.stringify(mess));
					}
				});
			}
		});
	} else {
		var mess = { error: 1, message: "Failed!", result: 0 };
		res.send(JSON.stringify(mess));
	}
});
router.post("/api/task-record", checkAuth, function (req, res, next) {
	var sql =
		"SELECT t.*, u.username as username FROM tasks t LEFT JOIN users u ON u.id = t.user_id WHERE insert_time > now() - INTERVAL 30 day ORDER BY id DESC; ";

	pool_login.getConnection(function (err, connection) {
		if (err) {
			console.log(err);
			var mess = { error: 1, message: "Database connection error!", result: [] };
			res.send(JSON.stringify(mess));
		} else {
			var query = connection.query(sql, function (error, result) {
				connection.release();

				if (true) {
					var o = {
						tasks: result,
					};
					var mess = { error: 0, message: "Task Loaded!", result: o };
					res.send(JSON.stringify(mess));
				}
			});
		}
	});
});
router.post("/api/ccms-testing", checkAuth, function (req, res, next) {
	POOLDB[req.hostname].getConnection(function (err, connection) {
		if (err) console.log(err);

		var sql = "SELECT * FROM ccms_testing ORDER BY id DESC LIMIT 14";

		connection.query(sql, function (error, result) {
			connection.release();

			if (error) {
				console.log(error);
			}
			var mess = { error: 0, message: "CCMS records!", result: result };
			res.send(JSON.stringify(mess));
		});
	});
});

router.post("/api/live-tracking", checkAuth, function (req, res, next) {
	var sql = "SELECT * FROM master_tracking;";
	pool_login.getConnection(function (err, connection) {
		if (err) {
			console.log(err);
			var mess = { error: 1, message: "Database connection error!", result: [] };
			res.send(JSON.stringify(mess));
		} else {
			var query = connection.query(sql, function (error, result) {
				connection.release();

				if (true) {
					var o = { records: result, time: new Date() };
					var mess = { error: 0, message: "Live Tracking!", result: o };
					res.send(JSON.stringify(mess));
				}
			});
		}
	});
});
router.post("/api/user-tracking", checkAuth, function (req, res, next) {
	var sql =
		'SELECT latitude lat, longitude lng, data FROM user_tracking_2 WHERE user_id=135 AND insert_time >= DATE_FORMAT("2021-10-28 17:00:00", "%y-%m-%d %H:%i:%s") AND insert_time <= DATE_FORMAT("2021-10-28 23:59:59", "%y-%m-%d %H:%i:%s")';
	pool_login.getConnection(function (err, connection) {
		if (err) {
			console.log(err);
			var mess = { error: 1, message: "Database connection error!", result: [] };
			res.send(JSON.stringify(mess));
		} else {
			var query = connection.query(sql, function (error, result) {
				connection.release();

				if (true) {
					var o = { records: result, time: new Date() };
					var mess = { error: 0, message: "Live Tracking!", result: o };
					res.send(JSON.stringify(mess));
				}
			});
		}
	});
});

function a() {
	return 10;
}
function b() {
	return 20;
}

function sqlrun(req, query, data, callback = "") {
	POOLDB[req.hostname].getConnection(function (err, connection) {
		if (err) {
			console.log(err);
			callback(err, "");
		} else {
			connection.query(query, data, function (error, result) {
				connection.release();

				if (error) {
					console.log(error);
					callback(error, "");
				} else {
					callback("", result);
				}
			});
		}
	});
}
function reportError(req, id, callback) {
	var updateq = {
		status: 2,
	};
	var sql = 'UPDATE daily_reports SET ? WHERE id="' + id + '"';

	POOLDB[req.hostname].getConnection(function (err, connection) {
		if (err) {
			console.log(err);
			callback(err);
		} else {
			connection.query(sql, updateq, function (error, result) {
				connection.release();
				if (error) {
					callback(error);
				} else {
					callback(result);
				}
			});
		}
	});
}
function generateReports(data, header, filename, callback) {
	const fastcsv = require("fast-csv");
	const path = require("path");
	const fs = require("fs");

	var csvpath = path.join(__dirname, "../public/exports/" + filename + ".csv");
	var pdfpath = path.join(__dirname, "../public/exports/" + filename + ".pdf");
	const ws = fs.createWriteStream(csvpath);

	const jsonData = JSON.parse(JSON.stringify(data));

	//console.log(jsonData);

	var o = {};
	var i = 0;
	for (const [key, value] of Object.entries(jsonData[0])) {
		o[key] = header[i];
		i++;
	}
	jsonData.unshift(o);

	fastcsv
		.write(jsonData, { headers: false })
		.on("finish", function () {
			//console.log("Write to "+filename+".csv successfully!");

			var fonts = {
				Roboto: {
					normal: "fonts/Roboto-Regular.ttf",
					bold: "fonts/Roboto-Medium.ttf",
					italics: "fonts/Roboto-Italic.ttf",
					bolditalics: "fonts/Roboto-MediumItalic.ttf",
				},
			};

			var PdfPrinter = require("pdfmake");
			var printer = new PdfPrinter(fonts);

			var pdfdata = [];

			jsonData.forEach((line) => {
				pdfdata.push(Object.values(line));
			});
			//console.log(pdfdata);

			var docDefinition = {
				pageOrientation: "landscape",
				content: [
					{
						style: "tableExample",
						table: {
							headerRows: 1,
							body: pdfdata,
						},
					},
				],
				styles: {
					tableExample: {
						fontSize: 8,
						margin: [0, 5, 0, 15],
					},
				},
			};
			var pdfDoc = printer.createPdfKitDocument(docDefinition);
			pdfDoc.pipe(fs.createWriteStream(pdfpath));
			pdfDoc.end();

			callback(1);
		})
		.pipe(ws);
}

function generatePdf(sourcecsv, newcsvpath, targetpdf, callback) {
	var fs = require("fs");
	fs.copyFile(sourcecsv, newcsvpath, (err) => {
		if (err) {
			console.log(err);
			callback(0);
		} else {
			var fonts = {
				Roboto: {
					normal: "fonts/Roboto-Regular.ttf",
					bold: "fonts/Roboto-Medium.ttf",
					italics: "fonts/Roboto-Italic.ttf",
					bolditalics: "fonts/Roboto-MediumItalic.ttf",
				},
			};

			var PdfPrinter = require("pdfmake");
			var printer = new PdfPrinter(fonts);
			var fs = require("fs");

			var pdfdata = [];

			const data = fs.readFileSync(newcsvpath, "UTF-8");
			const lines = data.split(/\r?\n/);
			lines.forEach((line) => {
				if (line.split(",").length > 1) {
					pdfdata.push(line.split(","));
				}
			});

			var docDefinition = {
				pageOrientation: "landscape",
				content: [
					{
						style: "tableExample",
						table: {
							headerRows: 1,
							body: pdfdata,
						},
					},
				],
				styles: {
					tableExample: {
						fontSize: 8,
						margin: [0, 5, 0, 15],
					},
				},
			};
			var pdfDoc = printer.createPdfKitDocument(docDefinition);
			pdfDoc.pipe(fs.createWriteStream(targetpdf));
			pdfDoc.end();

			callback(1);
		}
	});
}
function getImeiFromFeederPillar(req, feeder_pillar_no, callback) {
	var sql = "SELECT imei_no FROM master_device WHERE feeder_pillar_no=" + feeder_pillar_no;
	POOLDB[req.hostname].getConnection(function (err, connection) {
		if (err) {
			console.log(err);
			callback(0);
		} else {
			connection.query(sql, function (error, result) {
				connection.release();
				if (error) {
					callback(0);
				} else {
					callback(result[0]["imei_no"]);
				}
			});
		}
	});
}

function HexToRev2Decimal(data) {
	var _arr = new Array();
	for (var i = 0; i < 4; i++) {
		_arr.push(data.substr(i * 2, 2));
	}
	return HexToDecimal(_arr.reverse().join(""));
}
function Pad(str, max) {
	str = str.toString();
	return str.length < max ? Pad("0" + str, max) : str;
}
function HexToFloat(value) {
	return new Buffer(value, "hex").readFloatBE(0).toFixed(3);
}
function HexToDecimal(value) {
	return parseInt(Pad(value, 4), 16);
}
function HexToBin(value) {
	var bytes = "";
	for (var i = 0; i < value.length; i++) {
		bytes += Pad(parseInt(value.substr(i, 1), 16).toString(2), 4);
	}
	return bytes;
}
function HexToBinary(value) {
	var bytes = "";
	for (var i = 0; i < value.length; i++) {
		bytes += Pad(parseInt(value.substr(i, 1), 16).toString(2), 4);
	}
	return bytes;
}
function getHexToDecimal(v1, v2) {
	return String(HexToDecimal(String(v2) + String(v1))); //+String(HexToDecimal(v2));
	//return String(HexToFloat(v1))+String(HexToFloat(v2));
}
function DecToHex(dec) {
	var number = Number(dec).toString(16).toUpperCase();
	if (number.length % 2 > 0) {
		number = "0" + number;
	}
	return number;
}
function HexToDec(value) {
	return parseInt(value, 16);
}

module.exports = router;
