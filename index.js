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
const redRef = admin.database().ref('Red');

let options = {
    scriptPath: 'C:/Users/konto/',
};

// redRef.once('value').then((snapshot) => {
//     console.log(snapshot.val())
// })

// app.get('/', (req, res) => {
//     dbRef.once("value", function (snapshot) {
//         res.send(snapshot.val());
//     });
// })

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
    weekRef.add(result)
})


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
        error.add({ type: "Danger", data: data.rr.data, date: dateTime(), type: "RR" })
    } else if (data.rr.data <= 24 && data.rr.data >= 21) {
        error.add({ type: "Warning", data: data.rr.data, date: dateTime(), type: "RR" })
        console.log("RR Warning")

    }

    if (data.hr.data >= 131 || data.hr.data <= 40) {
        error.add({ type: "Danger", data: data.hr.data, date: dateTime(), type: "Hr" })
        console.log("HR Danger")

    } else if (data.hr.data <= 130 && data.hr.data >= 111) {
        console.log("HR Warning")
        error.add({ type: "Warning", data: data.hr.data, date: dateTime(), type: "Hr" })
    }

    if (data.spo2.data <= 91) {
        error.add({ type: "Danger", data: data.spo2.data, date: dateTime(), type: "Spo2" })
        console.log("Spo2 Danger")
    } else if (data.spo2.data <= 93 && data.spo2.data >= 92) {
        error.add({ type: "Warning", data: data.spo2.data, date: dateTime(), type: "Spo2" })
        console.log("Spo2 Warning")
    }

    if (data.bodytemp.data <= 35) {
        error.add({ type: "Danger", data: data.bodytemp.data, date: dateTime(), type: "BodyTemp" })
        console.log("Bodytemp Danger")
    } else if (data.bodytemp.data >= 39.1) {
        error.add({ type: "Warning", data: data.bodytemp.data, date: dateTime(), type: "BodyTemp" })
        console.log("Bodytemp Warning")
    }
    // res.status(400).send(result)
    // const result = getAverageDay().then((result) => { console.log("result", result) });

});

redRef.on('value', (snapshot) => {
    const data = snapshot.val().value;
    //Open when we want to use the python script
    console.log(data)
    if (data != undefined) {
        const length = Object.keys(data).length;

        if (length > 998) {
            PythonShell.run('DetectChange.py', options).then(messages => {
                console.log('return msg', messages)
                dbRef.update({ rr: { data: String(messages[0]) } })
            });
        }
        console.log(length)

        // Update the corresponding Firestore document
        // console.log("change");
        // console.log(data.value)
        // const result = getAverageDay().then((result) => { console.log("result", result) });
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

    return sum = Object.assign(sum, { rr: parseInt(rr / values.length), hr: parseInt(hr / values.length), spo2: parseInt(spo2 / values.length), bodytemp: parseInt(bodytemp / values.length), date: date() })
}

app.get('/week', async (req, res) => {
    const result = await getAverageWeek()
    weekRef.add(result)
    res.status(400).send(result)
})

//Week will get average of each day
async function getAverageWeek() {
    const querySnapshot = await eachDay.get();
    let rr = 0;
    let hr = 0;
    let spo2 = 0;
    let bodytemp = 0;
    let sum = {}
    const values = []
    querySnapshot.forEach(doc => {
        const data = doc.data();
        rr += parseInt(data.rr);
        hr += parseInt(data.hr);
        spo2 += parseInt(data.spo2);
        bodytemp += parseInt(data.bodytemp);
        values.push(data.rr)

    });
    return sum = Object.assign(sum, { rr: parseInt(rr / values.length), hr: parseInt(hr / values.length), spo2: parseInt(spo2 / values.length), bodytemp: parseInt(bodytemp / values.length), date: getWeekOfMonth() })
}

const date = () => {
    let ts = Date.now();
    let date_ob = new Date(ts);
    let date = date_ob.getDate();
    let month = date_ob.getMonth() + 1;
    let year = date_ob.getFullYear();
    return storeDate = year + "-" + month + "-" + date;
}

const dateTime = () => {
    let ts = Date.now();
    let date_ob = new Date(ts);
    let date = date_ob.getDate();
    let month = date_ob.getMonth() + 1;
    let year = date_ob.getFullYear();
    let hours = date_ob.getHours();
    let minutes = date_ob.getMinutes();
    return storeDate = year + "-" + month + "-" + date + " " + hours + ":" + minutes;
}

const getWeekOfMonth = () => {
    let ts = Date.now();
    let date_ob = new Date(ts);
    let month = date_ob.getMonth() + 1;
    let adjustedDate = date_ob.getDate() + date_ob.getDay();
    let prefixes = ['0', '1', '2', '3', '4', '5'];
    return "Week " + prefixes[0 | adjustedDate / 7] + '-' + month;
}

app.listen(3030, function () {
    console.log("Server started");
});

