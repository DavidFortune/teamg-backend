import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

/************   GROUP SENSORS CALLABLES  ************/

export const getGroupSensors = functions.https.onCall( (data, context) => {

    if(data.groupId){

        //TO DO: only group members can get sensor list
        return db.collection(`groups/${data.groupId}/sensors`).get();
    }

    return  false;
});


export const addGroupSensors = functions.https.onCall(async (data, context) => {

    if(data.sensorId && data.groupId){

        const groupRef = await db.doc(`groups/${data.groupId}`).get();

        if(groupRef.exists) {

            const group = groupRef.data();
            if( group && (group.uid == context.auth?.uid)){  //only owner can add to sensor to group
                const groupSensorRef = await db.collection(`groups/${data.groupId}/sensors`).where('sensorId', '==', data.sensorId).get();

                if(groupSensorRef.empty){
                    const sensorRef = await db.collection(`groups/${data.groupId}/sensors`).add({
                        sensorId: data.sensorId,
                        createdAt: new Date()
                    });

                    return sensorRef.id;
                }
            }
        }
    }

    return false;
});


export const removeGroupSensor = functions.https.onCall( async (data, context) => {

    if(data.groupId && data.sensorId){

        const groupRef = await db.doc(`groups/${data.groupId}`).get();

        if(groupRef.exists) {
            const group = groupRef.data();

            if( group && (group.uid == context.auth?.uid)){ //only owner can add to sensor to group
                return db.doc(`groups/${data.groupId}/sensors/${data.sensorId}`).delete();
            }
        }
    }

    return false;
});

