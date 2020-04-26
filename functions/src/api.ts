import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as express from 'express';
import * as cors from 'cors';
import * as helper from './helper';

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
        processed.humidity = helper.processData(arrHumidity);
        processed.temp = helper.processData(arrTemp);
        processed.soilValue = helper.processData(arrSoilValue);
        processed.solarValue = helper.processData(arrSolarValue);

        //save readings and processed data
        const doc = await db.collection(`sensors/${id}/data`).add({
            ...body,
            processed: processed,
            createdAt: new Date()
        });

        const sensorData = (await doc.get()).data();
        const sensorObj = {
            dataId: doc.id, 
            sensorId: id,
            ...sensorData 
        };

        await helper.sendNotifications(sensorObj);

        return res.status(200).send(sensorObj);
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


//fix notifications
/*app.get('/fixnotifications', async (req: any, res: any) => {

    const notificationRef = await db.collection('notifications').get();
    console.log('test');
    notificationRef.forEach(async (doc) => {

        const data = doc.data();
        data.category = data.type;
        delete data.type;
        if(!data.category){
            data.category = 'moisture';
        }

        console.log('Notification', doc.id, data);
        await db.doc(`notifications/${doc.id}`).set({...data});
    });

    const payload = {
        status: 'success'
    }

    return res.status(200).send(payload);
});*/

export const api = functions.https.onRequest(app);