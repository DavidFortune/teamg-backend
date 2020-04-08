import * as admin from 'firebase-admin';

const db = admin.firestore();

export function processData(arr: any[]){
    arr.sort(function(a, b){return b - a});  //sort
    arr.shift();  //takeoof the biggest value
    arr.pop(); //takeoof the lowest value
    let sum = 0;
    for (const value of arr) {
        sum += value;
    }
    return sum / arr.length;
}

export async function sendNotifications(sensorData: any){

    const usersRef = await db.collection(`sensors/${sensorData.sensorId}/users`).get();

    usersRef.forEach(async (userRef) => {

        const user = userRef.data();

        const belowTreshold = checkTreshold(sensorData.processed, user.tresholds);

        if(belowTreshold && user.uid){
            const message = {
                notification: getMessage(user.plantname, belowTreshold.type, belowTreshold.treshold, belowTreshold.treshold.value),
                topic: user.uid
            };

            // Send a message to devices subscribed to the provided topic.
            await admin.messaging().send(message)
                .then(async (response) => {
                    await db.collection(`notifications`).add({
                        ...message,
                        messageId: response,
                        sensorId: sensorData.sensorId,
                        type: belowTreshold.type,
                        timestamp: new Date()
                    });
                    // Response is a message ID string.
                    console.log('Successfully sent message:', response);
                })
                .catch((error) => {
                    console.log('Error sending message:', error);
                });
        }
        
    });
}

function checkTreshold(processed: any, tresholds: any){

    const now = new Date();
    console.log('Current time', now.getHours(), processed, tresholds);

    if(processed.soilValue > tresholds.moisture){

        let treshold = (tresholds.moisture / 2500) * 100;
        treshold = 100 - Math.round(treshold);

        let value = (processed.soilValue / 2500) * 100;
        value = 100 - Math.round(value) * 2;
        
        return {
            type: 'moisture',
            treshold: treshold,
            value: value
        };
    }
    else if(processed.temp < tresholds.temperature){
        return {
            type: 'temperature',
            treshold: tresholds.temperature,
            value: processed.temp
        };
    }
    else if((processed.solarValue < tresholds.luminosity) && (16 < now.getHours()) && (now.getHours() < 23) ){

        let treshold = (tresholds.luminosity / 2000) * 100;
        treshold = Math.round(treshold);

        let value = (processed.solarValue / 2000) * 100;
        value = Math.round(value);

        return {
            type: 'luminosity',
            treshold: treshold,
            value: value
        };
    }
    else if(processed.humidity < tresholds.humidity){
        return {
            type: 'humidity',
            treshold: tresholds.humidity,
            value: processed.humidity
        };
    }

    return false;
}

/*async function checkLastNotification(sensorId: string, uid: string, type: string){


}*/

function getMessage(name: string, type: string, treshold: number, value: number){

    let message = {};
    let plantname = name;

    if(!plantname){
        plantname = 'No name';
    }

    if(type === 'temperature'){
        message = {
            title: 'Increase room temperature',
            body: `Plant: ${plantname} - Temperature is below ${treshold} °C for the past 6 hours.`
        };
    }

    if(type === 'moisture'){
        message = {
            title: 'Time to water your plant',
            body: `Plant: ${plantname} - Soil moisture is below ${treshold}% for the past 6 hours.`
        };
    }

    if(type === 'humidity'){
        message = {
            title: 'Increase air humidity in room',
            body: `Plant: ${plantname} - Air humidity is below ${treshold}% for the past 6 hours.`
        };
    }

    if(type === 'luminosity'){
        message = {
            title: 'Insufficient luminosity',
            body: `Plant: ${plantname} - Your plant is not receiving ${treshold}% of sunlight for the past 6 hours.`
        };
    }

    return message;
}