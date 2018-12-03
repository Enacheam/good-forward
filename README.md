# good-forward

Http client for good process monitor which allows for customization of how event(s) are forwarded to any backend such as graylog and splunk using http. 

It is a fork of the original good-http (good-http-ext) but modified to allow for custom payload.

Credit goes to the original author [Adam Bretz](https://github.com/arb) 

## Usage

`good-forward` is a write stream use to send event to remote endpoints in batches. It makes a "POST" request with a JSON payload to the supplied `endpoint`. It will make a final "POST" request to the endpoint to flush the rest of the data on "finish".

## Good Forward
### GoodForward (endpoint, config)

Creates a new GoodForward object where:

- `endpoint` - full path to remote server to transmit logs.
- `config` - configuration object
  - `[threshold]` - number of events to hold before transmission. Defaults to `20`. Set to `0` to have every event start transmission instantly. It is strongly suggested to have a set threshold to make data transmission more efficient.
  - `[errorThreshold]` - number of consecutive failed transmissions allowed (`ECONNRESET`, `ECONNREFUSED`, etc). Defaults to `0`. Failed events will be included in the next transmission until they are successfully logged or the threshold is reached (whichever comes first) at which point they will be cleared. Set to `null` to ignore all errors and always clear events.
  - `useCustomPayload` - boolean (true/false) to indicate to GoodForward if you will like to use a custom payload instead of the predefined payload. This is necessary because some backend requires specific payload formart which the predecessor `good-http` doesn't support or difficult to do. Especially in the case of removing unwanted data from the default generated schema.
  - `append`	- Object of key value pairs to be combined as the payload to send to the backend. 
  - `payloadProp`	- Is a special key or property required as the main key which will hold your payload to be sent to the backend. 
  - `[wreck]` - configuration object to pass into [`wreck`](https://github.com/hapijs/wreck#advanced). Defaults to `{ timeout: 60000, headers: {} }`. `content-type` is always "application/json".

  
### Example (How to configure and use good-forward)
Suppose you have your server setup, then you can register [`good`](https://github.com/hapijs/good#readme) and add support for `good-forward` in this way,


```
const someSplunkURL = 'http://localhost:8000/services/collector/event'

server.register([{
	register: good,
	options: {
		includes : ['headers', 'payload'],
		response : ['payload']
	},
	reporters : {
		myAwesomeAppHTTPReporter: [{
			module: 'good-forward',
			args : [someSplunkURL, {
				threshold : 15,
				useCustomPayload : true, // use false if you will like the default payload generated
				payloadProp : 'event',
				append: {
				  sourcetype: '_json',
				  index : 'awesome_app_splunk_index',
				  host : 'os-hostname'
				},
				wreck : {
				 //wreck options
				}
			}]
		}]
	}
}]);
```


### Default Schema generated

Each POST will match the following schema. The payload that is POSTed to the `endpoint` has the following schema:

```json
{
  "host":"servername.home",
  "schema":"good-http",
  "timeStamp":1412710565121,
  "events":[
      {
        "event":"request",
        "timestamp":1413464014739,
        ...
      },
      {
        "event":"request",
        "timestamp":1414221317758,
        ...
      },
      {
        "event":"request",
        "timestamp":1415088216608,
        ...
      }
      {
        "event":"log",
        "timestamp":1415180913160,
        ...
      },
      {
        "event":"log",
        "timestamp":1422493874390,
        ...
      }
  ]
}
```
