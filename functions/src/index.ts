import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as express from 'express';
import * as cors from 'cors';

admin.initializeApp();
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
            body,
            createdAt: new Date()
        });
        return res.status(200).send(body);
    }
    else{
        const doc = await db.collection(`sensors`).add({
            body,
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

    await db.doc(`sensors/${id}`).update(body);
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

    if(id){
        const doc = await db.collection(`sensors/${id}/data`).add({
            ...body,
            createdAt: new Date()
        });
        const sensorObj = {id: doc.id, ...body};
        return res.status(200).send(sensorObj);
    }
    
    return res.status(404).send({'error': `No record found for sensor id ${id}.`});
});

export const api = functions.https.onRequest(app);