import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

/************   GROUP MEMBERS CALLABLES  ************/

export const getGroupMembers = functions.https.onCall( (data, context) => {

    if(data.groupId){

        //TO DO: only group members can get member list
        return db.collection(`groups/${data.groupId}/members`).get();
    }

    return  false;
});


export const addGroupMembers = functions.https.onCall(async (data, context) => {

    if(data.memberEmail && data.groupId){

        const groupRef = await db.doc(`groups/${data.groupId}`).get();

        if(groupRef.exists) {

            const group = groupRef.data();
            if( group && (group.uid == context.auth?.uid)){ //only owner can add to sensor to group
                const groupMemberRef = await db.collection(`groups/${data.groupId}/members`).where('email', '==', data.memberEmail).get();

                if(groupMemberRef.empty){
                    const memberRef = await db.collection(`groups/${data.groupId}/members`).add({
                        email: data.memberEmail,
                        createdAt: new Date()
                    });

                    return memberRef.id;
                }
            }
        }
    }

    return false;
});


export const removeGroupMember = functions.https.onCall( async (data, context) => {

    if(data.groupId && data.memberId){

        const groupRef = await db.doc(`groups/${data.groupId}`).get();

        if(groupRef.exists) {
            const group = groupRef.data();

            if( group && (group.uid == context.auth?.uid)){ //only owner can add to sensor to group
                return db.doc(`groups/${data.groupId}/members/${data.memberId}`).delete();
            }
        }
    }

    return false;
});

