var GoogleAdsClient = (function () {
  var ENDPOINT = 'https://googleads.googleapis.com';
  var APIVERSION = 'v1';

  var _serviceClasses = (function generateServices() {
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
    }, {
      name: 'CustomerService',
      endpoint: 'customers',
      methods: {
        listAccessibleCustomers: function () {
          return this.client.get(
            this.endpoint + ':listAccessibleCustomers'
          );
        },
        /**
         * @param {String} resourceName
         */
        getCustomer: function (resourceName) {
          return this.client.get(resourceName);
        }

      }
    }];

    /**
     * @typedef {Object} Service
     * @prop {GoogleAdsClient} client
     */
    var serviceGenerator = function (service) {
      var cls = function(client) {
        this.client = client;
        this.endpoint = service.endpoint;
      };

      Object.keys(service.methods).forEach(function (methodName) {
        cls.prototype[methodName] = service.methods[methodName];
      });
      return cls;
    };

    return SERVICES.reduce(function (x, service) {
      x[service] = serviceGenerator(service);
      return x;
    });
  })();

  /**
   * @param {String} accessToken
   * @param {String} developerToken
   * @param {String} loginCustomerId
   */
  function GoogleAdsClient(
    accessToken,
    developerToken,
    loginCustomerId
  ) {
    this.accessToken = accessToken;
    this.developerToken = developerToken;
    this.loginCustomerId = loginCustomerId;
  }

  /**
   * @param {string} serviceName
   */
  GoogleAdsClient.prototype.getService = function(serviceName) {
    var ServiceClass = _serviceClasses[serviceName];

    if (!ServiceClass) {
      ServiceClass = serviceFactory(serviceName);
      _serviceClasses[serviceName] = ServiceClass;
    }

    return new ServiceClass(this);
  };

  /**
   * @param {String} resource
   */
  GoogleAdsClient.prototype.get = function (resource) {
    return this._fetch([ENDPOINT, APIVERSION, resource].join('/'), {});
  };

  /**
   * @param {String} resource
   * @param {Object|String} payload
   */
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
   * Return class for service `serviceName`, where service only
   * contains "get" and "mutate" methods.
   *
   * @param {String} serviceName "AdGroupService", "CampaignService", ...
   */
  function serviceFactory(serviceName) {
    var name = serviceName.slice(0, -('Service'.length));
    var endpoint = 'customers/%s/' + name[0].toLowerCase() + name.slice(1) + 's';

    /**
     * @param {GoogleAdsClient} client
     */
    function ServiceClass(client) {
      this.client = client;
      this.endpoint = endpoint;
    }

    /**
     * @param {String} customerId
     * @param {String} entityId
     */
    ServiceClass.prototype['get' + name] = function (customerId, entityId) {
      return this.client.get(Utilities.formatString(this.endpoint, customerId) + '/' + entityId);
    };

    /**
     * @param {Object<string, any>} request
     */
    ServiceClass.prototype['mutate' + name + 's'] = function (request) {
      return this.client.post(
        Utilities.formatString(this.endpoint, request.customerId) + ':mutate',
        {operations: request.operations}
      );
    };
    return ServiceClass;
  };

  /**
   * @param {String} url
   * @param {Object} params
   */
  GoogleAdsClient.prototype._fetch = function (url, params) {
    var response = UrlFetchApp.fetch(url, this._prepareRequestOptions(params));
    if (response.getResponseCode() !== 200) {
      throw new Error(response.getContentText());
    }
    return JSON.parse(response.getContentText());;
  };

  /**
   * @param {GoogleAppsScript.URL_Fetch.URLFetchRequestOptions} request
   * @return {GoogleAppsScript.URL_Fetch.URLFetchRequestOptions}
   */
  GoogleAdsClient.prototype._prepareRequestOptions = function (request) {
    request.headers = request.headers || {};
    request.headers['Authorization'] = 'Bearer ' + this.accessToken;
    request.headers['developer-token'] = this.developerToken;
    request.headers['login-customer-id'] = this.loginCustomerId;
    request.headers['Content-Type'] = 'application/json';
    request.headers['Accept'] = 'application/json';
    request.muteHttpExceptions = true;
    return request;
  };

  return GoogleAdsClient;
}());
