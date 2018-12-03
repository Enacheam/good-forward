'use strict';
// Load modules

const Stream = require('stream');
const Os = require('os');

const Stringify = require('fast-safe-stringify');
const Wreck = require('wreck');

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
    host: Os.hostname()
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
                schema: this._settings.schema,
                timeStamp: Date.now(),
                events: this._data
            };
        }else{
            this._data.forEach((d)=>{
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


module.exports = GoodHttp;
