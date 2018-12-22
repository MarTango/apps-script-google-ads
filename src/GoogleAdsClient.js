var GoogleAdsClient = (function () {
  var ENDPOINT = 'https://googleads.googleapis.com';
  var APIVERSION = 'v0';
  /** HashMap of [service name (string) -> class] */
  var _serviceClasses = {};

  /**
   * Register the "GoogleAdsService" service into serviceClasses.
   */
  (function (scope) {
    /**
     * @typedef {Object} ServiceMetadata
     * @prop {string} name
     * @prop {string} endpoint
     * @prop {Object[]} methods
     */

    /**
     * Return class for service described by serviceMeta
     * @param {ServiceMetadata} serviceMeta
     */
    function serviceGenerator(serviceMeta) {
      var cls = function(client) {
        this.client = client;
        this.endpoint = serviceMeta.endpoint;
      };

      Object.keys(serviceMeta.methods).forEach(function (methodName) {
        cls.prototype[methodName] = serviceMeta.methods[methodName];
      });
      return cls;
    };

    /** @type {ServiceMetadata[]} */
    var SERVICES = [{
      name: 'GoogleAdsService',
      endpoint: 'customers/%s/googleAds',
      methods: {
        search: function (request) {
          var payload = {
            query: request.query,
          };
          if (request.pageSize) {
            payload.page_size = request.pageSize;
          }
          if (request.pageToken) {
            payload.page_token = request.pageToken;
          }

          return this.client.post(
            Utilities.formatString(this.endpoint + ':search', request.customerId),
            payload
          );
        }
      }
    }];

    SERVICES.forEach(function (service) {
      scope[service.name] = serviceGenerator(service);
    });

  }(_serviceClasses));

  function GoogleAdsClient(accessToken, developerToken) {
    this.accessToken = accessToken || ScriptApp.getOAuthToken();
    this.developerToken = developerToken;
  }

  /**
   * Check 
   * @param {string} serviceName
   */
  GoogleAdsClient.prototype.getService = function(serviceName) {
    var Service = _serviceClasses[serviceName];

    if (Service) {
      return new Service(this);
    }

    var cls = serviceFactory(serviceName);
    _serviceClasses[serviceName] = cls;
    return new cls(this);
  };
  
  GoogleAdsClient.prototype.get = function (resource) {
    return this._fetch([ENDPOINT, APIVERSION, resource].join('/'), {});
  };
  
  GoogleAdsClient.prototype.post = function (resource, payload) {
    if (typeof payload === 'object') {
      payload = JSON.stringify(payload);
    }
    return this._fetch([ENDPOINT, APIVERSION, resource].join('/'), {
      method: 'post',
      payload: payload
    });
  };

  /**
   * Return a class for service `serviceName` {BlahService}, by
   * guessing the endpoint based on service name
   * {/customers/customer_id/blahs}, and assuming the service has
   * methods "getBlah" and "mutateBlahs".
   */
  function serviceFactory(serviceName) {
    var name = serviceName.slice(0, -('Service'.length));
    var endpoint = 'customers/%s/' + name[0].toLowerCase() + name.slice(1) + 's';

    function ServiceClass(client) {
      this.client = client;
      this.endpoint = endpoint;
    }

    ServiceClass.prototype['get' + name] = function (customerId, entityId) {
      return this.client.get(Utilities.formatString(this.endpoint, customerId) + '/' + entityId);
    };

    ServiceClass.prototype['mutate' + name + 's'] = function (request) {
      return this.client.post(
        Utilities.formatString(this.endpoint, request.customerId) + ':mutate',
        {operations: request.operations}
      );
    };
    return ServiceClass;
  };

  GoogleAdsClient.prototype._fetch = function (url, params) {
    var response = UrlFetchApp.fetch(url, this._prepareRequestOptions(params));
    if (response.getResponseCode() !== 200) {
      throw new Error(response.getContentText());
    }
    return JSON.parse(response.getContentText());;
  };
    
  /**
   * @return {GoogleAppsScript.URL_Fetch.URLFetchRequestOptions}
   */
  GoogleAdsClient.prototype._prepareRequestOptions = function (request) {
    request.headers = request.headers || {};
    request.headers.Authorization = 'Bearer ' + this.accessToken;
    request.headers['developer-token'] = this.developerToken;
    request.headers['Content-Type'] = 'application/json';
    request.headers.Accept = 'application/json';
    request.muteHttpExceptions = true;
    return request;
  };

  return GoogleAdsClient;
}());
