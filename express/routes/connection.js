"use strict";

require("dotenv").config();
const mysql = require("mysql");

let pool = mysql.createPool({
	host: "127.0.0.1",
	// port: parseInt(3306),
	user: "ccms_usr",
	password: "ah8vx61mxrbv",
	database: "ccms_wdms",
	connectionLimit: 50,
	dateStrings: ["DATE", "DATETIME"],
	supportBigNumbers: true,
	bigNumberStrings: true,
	multipleStatements: true,
});

function doQuery(query, user_data_arr = []) {
	return new Promise((resolve, reject) => {
		pool.query(query, user_data_arr, function selectCb(err, results) {
			if (err) {
				console.log(err);
				return reject(err);
			} else {
				return resolve(results);
			}
		});
	});
}

function wait(ms) {
	return new Promise((resolve, reject) => {
		setTimeout(() => {
			resolve(`Resolved after ${ms / 1000} second`);
		}, ms);
	});
}

// (async () => {
// 	let result = await doQuery("SELECT * FROM locality WHERE zone_id = ? ORDER BY areacode ASC;", 5);
// 	console.log("results are: ", result);
// })();

module.exports = doQuery;
