const express = require("express");
const bodyParser = require("body-parser");
const serviceAccount = require('./admin.json');
const app = express();
const admin = require('firebase-admin');
const schedule = require('node-schedule')
const { PythonShell } = require('python-shell');
app.use(bodyParser.urlencoded({ extended: true }));
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    // The database URL depends on the location of the database
    databaseURL: "https://fluted-arch-341414-default-rtdb.asia-southeast1.firebasedatabase.app"
});


// Get a reference to your Realtime Database location
const dbRef = admin.database().ref('Sensor');
const irRef = admin.database().ref('Red');

let options = {
    scriptPath: 'C:/Users/konto/',
};

// Get a reference to your Firestore location
const firestore = admin.firestore();
const dayRef = firestore.collection('day');
const eachDay = firestore.collection('eachDay');
const weekRef = firestore.collection('week');
const error = firestore.collection('error');
// run everyday at midnight
schedule.scheduleJob('0 0 0 * * *', async () => {
    console.log("midnight!!")
    const result = await getAverageDay()
    eachDay.add(result)
})

schedule.scheduleJob('0 0 0 * * 7', async () => {
    console.log("Average Week!!")
    const result = await getAverageWeek()
    if (result != undefined) {
        weekRef.add(result)
    }
})

// getAverageWeek();

// Listen for changes in the Realtime Database
dbRef.on('value', async (snapshot) => {
    const data = snapshot.val();
    // Update the corresponding Firestore document
    const result = await getAverageWeek()
    weekRef.add(result)

    data.rr.data = parseInt(data.rr.data);
    dayRef.add(data);
    if (data.rr.data >= 25 || data.rr.data <= 8) {
        console.log("RR Danger")
        error.add({ level: "Danger", data: data.rr.data, date: date(), type: "RR", time: Time() })
    } else if (data.rr.data <= 24 && data.rr.data >= 21) {
        error.add({ level: "Warning", data: data.rr.data, date: date(), type: "RR", time: Time() })
        console.log("RR Warning")

    }

    if (data.hr.data >= 131 || data.hr.data <= 40) {
        error.add({ level: "Danger", data: data.hr.data, date: date(), type: "Hr", time: Time() })
        console.log("HR Danger")

    } else if (data.hr.data <= 130 && data.hr.data >= 111) {
        console.log("HR Warning")
        error.add({ level: "Warning", data: data.hr.data, date: date(), type: "Hr", time: Time() })
    }

    if (data.spo2.data <= 91) {
        error.add({ level: "Danger", data: data.spo2.data, date: date(), type: "Spo2", time: Time() })
        console.log("Spo2 Danger")
    } else if (data.spo2.data <= 93 && data.spo2.data >= 92) {
        error.add({ level: "Warning", data: data.spo2.data, date: date(), type: "Spo2", time: Time() })
        console.log("Spo2 Warning")
    }

    if (data.bodytemp.data <= 35) {
        error.add({ level: "Danger", data: data.bodytemp.data, date: date(), type: "BodyTemp", time: Time() })
        console.log("Bodytemp Danger")
    } else if (data.bodytemp.data >= 39.1) {
        error.add({ level: "Warning", data: data.bodytemp.data, date: date(), type: "BodyTemp", time: Time() })
        console.log("Bodytemp Warning")
    }
    // res.status(400).send(result)
    // const result = getAverageDay().then((result) => { console.log("result", result) });

});

irRef.on('value', (snapshot) => {
    const data = snapshot.val().value;
    //Open when we want to use the python script
    if (data != undefined) {
        const length = Object.keys(data).length;
        if (length > 1400) {
            PythonShell.run('DetectChange.py', options).then(messages => {
                console.log('return msg', messages)
                dbRef.update({ rr: { data: String(messages[0]) } })
            });
        }
        console.log(length)
    }

});



//FIND AVG
//Maybe we have to separate the function to get the average of period of time month, day or week
async function getAverageDay() {
    const querySnapshot = await dayRef.get();
    let rr = 0;
    let hr = 0;
    let spo2 = 0;
    let bodytemp = 0;
    const values = []
    let sum = {}

    querySnapshot.forEach(doc => {
        const data = doc.data();
        rr += parseInt(data.rr.data);
        hr += parseInt(data.hr.data);
        spo2 += parseInt(data.spo2.data);
        bodytemp += parseInt(data.bodytemp.data);
        values.push(data.rr.data)

    });
    dayRef.get()
        .then((querySnapshot) => {
            // Delete each document in the collection
            const batch = firestore.batch();
            querySnapshot.forEach((doc) => {
                batch.delete(doc.ref);
            });
            return batch.commit();
        })
        .then(() => {
            console.log('Collection cleared successfully');
        })
        .catch((error) => {
            console.error('Error clearing collection:', error);
        });
    return sum = Object.assign(sum, { rr: parseInt(rr / values.length), hr: parseInt(hr / values.length), spo2: parseInt(spo2 / values.length), bodytemp: parseInt(bodytemp / values.length), date: date() })
}


//Week will get average of each day
async function getAverageWeek() {
    const querySnapshot = await eachDay.get();
    let rr = 0;
    let hr = 0;
    let spo2 = 0;
    let bodytemp = 0;
    let sum = {}
    let DOM = 0;
    const values = []
    querySnapshot.forEach(doc => {
        const data = doc.data();
        let ts = Date.now();
        let currentWeek = getWeekOfMonthFromData(ts);
        DOM = getWeekOfMonthFromData(data.date);
        if (currentWeek == DOM) {
            rr += parseInt(data.rr);
            hr += parseInt(data.hr);
            spo2 += parseInt(data.spo2);
            bodytemp += parseInt(data.bodytemp);
            values.push(data.rr)
        }

    });
    if (values.length == 0) {
        return undefined
    } else {
        return sum = Object.assign(sum, { rr: parseInt(rr / values.length), hr: parseInt(hr / values.length), spo2: parseInt(spo2 / values.length), bodytemp: parseInt(bodytemp / values.length), date: getWeekOfMonth() })
    }
}

const date = () => {
    let ts = Date.now();
    let date_ob = new Date(ts);
    let date = date_ob.getDate();
    let month = date_ob.getMonth() + 1;
    let year = date_ob.getFullYear();
    return storeDate = year + "-" + month + "-" + date;
}

const Time = () => {
    let ts = Date.now();
    let date_ob = new Date(ts);
    let hours = date_ob.getHours();
    let minutes = date_ob.getMinutes();
    return storeDate = hours + ":" + minutes;
}

const getWeekOfMonth = () => {
    let ts = Date.now();
    let date_ob = new Date(ts);
    let monthStart = new Date(date_ob.getFullYear(), date_ob.getMonth(), 1);
    let firstWeekDay = (monthStart.getDay() + 6) % 7; // 0 = Sunday, 1 = Monday, etc.
    let daysBeforeFirstWeek = (7 - firstWeekDay) % 7;
    let daysSinceFirstWeek = date_ob.getDate() - 1 - daysBeforeFirstWeek;
    let weekOfMonth = Math.floor(daysSinceFirstWeek / 7) + 1;
    let month = date_ob.getMonth() + 1;
    return "Week " + weekOfMonth + '-' + month;
}

const getWeekOfMonthFromData = (date) => {
    let date_ob = new Date(date);
    let monthStart = new Date(date_ob.getFullYear(), date_ob.getMonth(), 1);
    let firstWeekDay = (monthStart.getDay() + 6) % 7; // 0 = Sunday, 1 = Monday, etc.
    let daysBeforeFirstWeek = (7 - firstWeekDay) % 7;
    let daysSinceFirstWeek = date_ob.getDate() - 1 - daysBeforeFirstWeek;
    let weekOfMonth = Math.floor(daysSinceFirstWeek / 7) + 1;
    let month = date_ob.getMonth() + 1;
    return weekOfMonth + '-' + month;
}

app.listen(3030, function () {
    console.log("Server started");
});

