import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as express from 'express';
import * as cors from 'cors';

const db = admin.firestore();

const app = express();
app.use(express.json());
app.use(cors({ origin: true }));

//get all sensors
app.get('/sensor', async (req: any, res: any) => {

    const sensorArr = new Array();
    const sensorRef = await db.collection(`sensors`).get();
    sensorRef.forEach(doc => {
        const sensorObj = { id: doc.id, ...doc.data() };
        sensorArr.push(sensorObj);
    });

    const payload = {
        data: sensorArr
    }

    return res.status(200).send(payload);
});

//get one sensor
app.get('/sensor/:id', async (req: any, res: any) => {

    const id = req.params.id; 

    const sensorRef = await db.doc(`sensors/${id}`).get();
    if(sensorRef.exists){
        const sensorObj = { id: sensorRef.id, ...sensorRef.data()}
        return res.status(200).send(sensorObj);
    }

    return res.status(404).send({'error': `No record found for sensor id ${id}.`});
});

//create a sensor
app.post('/sensor', async (req: any, res: any) => {

    const body = req.body;

    if(body.id){
        await db.doc(`sensors/${body.id}`).set({
            ...body,
            createdAt: new Date()
        });
        return res.status(200).send(body);
    }
    else{
        const doc = await db.collection(`sensors`).add({
            ...body,
            createdAt: new Date()
        });
        const sensorObj = {id: doc.id, ...body};
        return res.status(200).send(sensorObj);
    }
});

//update sensor
app.put('/sensor/:id', async (req: any, res: any) => {

    const id = req.params.id;
    const body = req.body;

    await db.doc(`sensors/${id}`).update({...body, updatedAt: new Date()});
    return res.status(200).send({'result': 'Sensor was updated successfully'});
});

//delete a sensor
app.delete('/sensor/:id', async (req, res) => {
    const id = req.params.id;
    await db.doc(`sensors/${id}`).delete();
    
    return res.status(200).send({'result': 'Sensor was deleted successfully'});
});


//get data of a sensor
app.get('/sensor/:id/data', async (req: any, res: any) => {

    const id = req.params.id; 

    const dataRef = await db.collection(`sensors/${id}/data`).get();
    if(!dataRef.empty){

        const sensorArr = new Array();
        dataRef.forEach(doc => {
            const sensorObj = { id: doc.id, ...doc.data() };
            sensorArr.push(sensorObj);
        });
    
        const payload = {
            data: sensorArr
        }
    
        return res.status(200).send(payload);
    }

    return res.status(404).send({'error': `No record found for sensor id ${id}.`});
});


async function sendNotifications(sensorId: string, notification: any){

    const userRef = await db.collection(`sensors/${sensorId}/users`).get();

    userRef.forEach(async (user) => {
        const message = {
            notification: notification,
            topic: user.id
        }

        // Send a message to devices subscribed to the provided topic.
        await admin.messaging().send(message)
            .then((response) => {

                //TODO: Add message to notifications
                // Response is a message ID string.
                console.log('Successfully sent message:', response);
            })
            .catch((error) => {
                console.log('Error sending message:', error);
            });
    });
}

function processData(arr: any[]){
    arr.sort(function(a, b){return b - a});  //sort
    arr.shift();  //takeoof the biggest value
    arr.pop(); //takeoof the lowest value
    let sum = 0;
    for (const value of arr) {
        sum += value;
    }
    return sum / arr.length;
}


//store data of a sensor
app.post('/sensor/:id/data', async (req: any, res: any) => {

    const id = req.params.id; 
    const body = req.body;
    const lastReadings: number = 6;
    const arrHumidity: Array<number> = new Array();
    const arrTemp: Array<number> = new Array();
    const arrSoilValue: Array<number> = new Array();
    const arrSolarValue: Array<number> = new Array();
    const processed: any = {};

    //check if an id was passed
    if(id){

        //check it the id exists, otherwise add it to sensors collection.
        const sensorRef = await db.doc(`sensors/${id}`).get();
        if(!sensorRef.exists){
            await db.doc(`sensors/${id}`).set({
                createdAt: new Date()
            });
        }

        //push the last values recieved in arrays
        arrHumidity.push(body.rawHumidity);
        arrTemp.push(body.rawTemp);
        arrSoilValue.push(body.rawSoilValue);
        arrSolarValue.push(body.rawSolarValue);
       
        //push 5 previous readings in arrays
        const dataRef = await db.collection(`sensors/${id}/data`).orderBy('createdAt', 'desc').limit(lastReadings - 1).get();
        dataRef.forEach( data => {
            arrHumidity.push(data.get('rawHumidity'));
            arrTemp.push(data.get('rawTemp'));
            arrSoilValue.push(data.get('rawSoilValue'));
            arrSolarValue.push(data.get('rawSolarValue'));
        });  
        
        //Process data out of last x readings
        processed.humidity = processData(arrHumidity);
        processed.temp = processData(arrTemp);
        processed.soilValue = processData(arrSoilValue);
        processed.solarValue = processData(arrSolarValue);

        //save readings and processed data
        const doc = await db.collection(`sensors/${id}/data`).add({
            ...body,
            processed: processed,
            createdAt: new Date()
        });

        const sensorObj = {
            id: doc.id, 
            ...body,
            processed: processed,
            createdAt: new Date()
        };

        await res.status(200).send(sensorObj);


        //TO DO: CUSTOMIZABLE TRESHOLDS
        if(processed.temp < 20){
            await sendNotifications(id, {
                title: 'Increase room temperature',
                body: 'Temperature is below 20 degrees celcius for the past 6 hours.'
            });

            return true;
        }

        if(processed.solarValue === 0){

            await sendNotifications(id, {
                title: 'Insufficient Light Exposure',
                body: 'Your plant is not receiving enough sun for the past 6 hours.'
            });

            return true;
        }

        if(processed.soilValue < 2400){

            await sendNotifications(id, {
                title: 'Time to water your plant',
                body: 'Humidity of soil is being too low for the past 6 hours.'
            });

            return true;
        }
    }
    
    return res.status(404).send({'error': `No record found for sensor id ${id}.`});
});


//store data of a sensor
app.post('/message/:topic', async (req: any, res: any) => {

    const topic = req.params.topic; 
    const notification = req.body;

    const message = {
        notification: notification,
        topic: topic
    }

    // Send a message to devices subscribed to the provided topic.
    admin.messaging().send(message)
        .then((response) => {
            // Response is a message ID string.
            console.log('Successfully sent message:', response);
            return res.status(200).send({'response': response});

        })
        .catch((error) => {
            console.log('Error sending message:', error);
            return res.status(404).send({'error': error});
        });
});

export const api = functions.https.onRequest(app);