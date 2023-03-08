const express = require("express");
const bodyParser = require("body-parser");
const serviceAccount = require('./admin.json');
const app = express();
const admin = require('firebase-admin');

app.use(bodyParser.urlencoded({ extended: true }));
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    // The database URL depends on the location of the database
    databaseURL: "https://fluted-arch-341414-default-rtdb.asia-southeast1.firebasedatabase.app"
});


// Get a reference to your Realtime Database location
const dbRef = admin.database().ref('Sensor');

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



// Listen for changes in the Realtime Database
dbRef.on('value', (snapshot) => {
    const data = snapshot.val();
    // Update the corresponding Firestore document
    console.log("change");
    dayRef.add(data);
    // const result = getAverageDay().then((result) => { console.log("result", result) });

});


app.get("/history", async (req, res) => {
    const result = await getAverageDay()
    eachDay.add(result)
})
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
        console.log(data.rr);
        rr += parseInt(data.rr.data);
        hr += parseInt(data.hr.data);
        spo2 += parseInt(data.spo2.data);
        bodytemp += parseInt(data.bodytemp.data);
        values.push(data.rr.data)

        // hr += data.hr;
        // spo2 += data.spo2;
        // temp += data.temp;
    });
    return sum = Object.assign(sum, { rr: rr / values.length, hr: hr / values.length, spo2: spo2 / values.length, bodytemp: bodytemp / values.length })
}

app.get('/week', async (req, res) => {
    const result = await getAverageWeek()
    weekRef.add(result)
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

        // hr += data.hr;
        // spo2 += data.spo2;
        // temp += data.temp;
    });
    return sum = Object.assign(sum, { rr: rr / values.length, hr: hr / values.length, spo2: spo2 / values.length, bodytemp: bodytemp / values.length })
}


app.listen(3030, function () {
    console.log("Server started");
});



