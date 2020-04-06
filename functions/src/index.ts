import * as admin from 'firebase-admin';
admin.initializeApp();

//API
export { api } from './api';

//Callables
export * from './callables/sensors';
export * from './callables/groups';
export * from './callables/groupMembers';
export * from './callables/groupSensors';