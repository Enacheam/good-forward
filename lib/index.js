'use strict';
// Load modules

const Stream = require('stream');
const Os = require('os');

const Stringify = require('fast-safe-stringify');
const Wreck = require('wreck');

const networkInterfaces = Os.networkInterfaces();
let ethernet = [];

if(networkInterfaces.hasOwnProperty('eth0')){
    ethernet = networkInterfaces.eth0;
}else if(networkInterfaces.hasOwnProperty('en0')){
    ethernet = networkInterfaces.en0;
}

const getIPAddress = (familyType)=>{
    const copyOfFamilyType = familyType;
    const result = ethernet.find((data)=>{
        return data.family.toLowerCase() === copyOfFamilyType.toLowerCase();
    });

    return result && (result.address);
};

const IPv4 = getIPAddress('IPv4');
const IPv6 = getIPAddress('IPv6');

// Declare internals

const internals = {
    defaults: {
        threshold: 20,
        errorThreshold: 0,
        schema: 'good-http',
        wreck: {
            timeout: 60000,
            headers: {}
        }
    },
    host: Os.hostname(),
    IPv4: IPv4,
    IPv6: IPv6
};

class GoodForward extends Stream.Writable {
    constructor(endpoint, config) {

        config = config || {};
        const settings = Object.assign({}, internals.defaults, config);

        if (settings.errorThreshold === null) {
            settings.errorThreshold = -Infinity;
        }

        super({ objectMode: true, decodeStrings: false });
        this._settings = settings;
        this._endpoint = endpoint;
        this._data = [];
        this._failureCount = 0;

        // Standard users
        this.once('finish', () => {

            this._sendMessages();
        });
    }
    _write(data, encoding, callback) {

        this._data.push(data);
        if (this._data.length >= this._settings.threshold) {
            this._sendMessages((err) => {

                if (err && this._failureCount < this._settings.errorThreshold) {
                    this._failureCount++;
                    return callback();
                }

                this._data = [];
                this._failureCount = 0;

                return callback(this._settings.errorThreshold !== -Infinity && err);
            });
        }
        else {
            setImmediate(callback);
        }
    }
    _sendMessages(callback) {

        const appenders = this._settings.append || {};
        const useCustomPayload = this._settings.useCustomPayload === true ? true : false;
        let envelope = {};
        let combinedEnvlope = {};
        let spread = {};

        if(!useCustomPayload){
            envelope = {
                host: internals.host,
                IPv4: internals.IPv4,
                IPv6: internals.IPv6,
                schema: this._settings.schema,
                timeStamp: Date.now(),
                events: this._data
            };
        }else{
            this._data.forEach((d)=>{
                d.IPv4 = internals.IPv4;
                d.IPv6 = internals.IPv6;
                spread = Object.assign({}, d);
            });
            envelope[this._settings.payloadProp] = spread;
        }

        combinedEnvlope = Object.assign({}, envelope, appenders);

        const wreckOptions = Object.assign({}, this._settings.wreck, {
            payload: Stringify(combinedEnvlope)
        });

        // Prevent this from user tampering
        wreckOptions.headers['content-type'] = 'application/json';
        Wreck.request('post', this._endpoint, wreckOptions, callback);
    }
}


module.exports = GoodForward;
