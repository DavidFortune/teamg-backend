import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

export const pairSensor = functions.https.onCall(async (data, context) => {

    if(data.uid){

        const userRef =  await db.doc(`sensors/${data.id}/users/${context.auth?.uid}`).get();

        if(!userRef.exists){
            await db.doc(`sensors/${data.id}/users/${context.auth?.uid}`).set({
                ...data,
                createdAt: new Date()
            });
        }
        else{
            await db.doc(`sensors/${data.id}/users/${context.auth?.uid}`).update({
                ...data,
                updatedAt: new Date()
            });
        }

        return true;
    }

    return false;
});

export const unpairSensor = functions.https.onCall(async (data, context) => {

    if(data.uid){

        const userRef =  await db.doc(`sensors/${data.id}/users/${context.auth?.uid}`).get();

        if(userRef.exists){
            await db.doc(`sensors/${data.id}/users/${context.auth?.uid}`).delete();
            return true;
        }
    }

    return false;
});


export const updateSensor = functions.https.onCall(async (data, context) => {

    if(data.uid){

        const userRef =  await db.doc(`sensors/${data.id}/users/${context.auth?.uid}`).get();

        if(userRef.exists){
            await db.doc(`sensors/${data.id}/users/${context.auth?.uid}`).update({
                ...data,
                updatedAt: new Date()
            });

            return true;
        } 
    }

    return false;
});