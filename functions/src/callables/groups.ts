import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

/************   GROUP CALLABLES  ************/
export const getGroups = functions.https.onCall( (data, context) => {

    return  db.collection(`groups`).where('uid', '==', context.auth?.uid).get();

});


export const getGroup = functions.https.onCall( (data, context) => {

    if(data.id){
        return db.doc(`groups/${data.id}`).get();
    }

    return  false;
});


export const addGroup = functions.https.onCall(async (data, context) => {

    if(data.name){

        const groupRef =  await db.collection(`groups`).add({
            ...data,
            uid: context.auth?.uid,
            createdAt: new Date()
        });

        return groupRef.id;
    }

    return false;
});


export const updateGroup = functions.https.onCall(async (data, context) => {

    if(data.id){

        const groupRef = await db.doc(`groups/${data.id}`).get();

        if(groupRef.exists){

            const group = groupRef.data();

            if(group && (group.uid === context.auth?.uid)){
                await db.doc(`groups/${data.id}`).update({
                    ...data,
                    updatedAt: new Date()
                });
            }

            return true;
        }
    }

    return false;
});


export const removeGroup = functions.https.onCall( (data, context) => {

    if(data.id){
        return db.doc(`groups/${data.id}`).delete();
    }

    return false;
});

