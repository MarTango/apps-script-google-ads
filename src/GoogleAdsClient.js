var GoogleAdsClient = (function () {
  var ENDPOINT = 'https://googleads.googleapis.com';
  var DEFAULT_API_VERSION = 'v1';

  /**
   * @param {String} accessToken
   * @param {String} developerToken
   * @param {String} loginCustomerId
   * @param {String} version
   */
  function GoogleAdsClient(
    accessToken,
    developerToken,
    loginCustomerId,
    version
  ) {
    this.accessToken = accessToken;
    this.developerToken = developerToken;
    this.loginCustomerId = loginCustomerId;
    this.version = version || DEFAULT_API_VERSION;
  }

  /**
   * @param {String} resource
   */
  GoogleAdsClient.prototype.get = function (resource) {
    return this._fetch([ENDPOINT, this.version, resource].join('/'), {});
  };

  /**
   * @param {String} resource
   * @param {Object|String} payload
   */
  GoogleAdsClient.prototype.post = function (resource, payload) {
    if (typeof payload === 'object') {
      payload = JSON.stringify(payload);
    }
    return this._fetch([ENDPOINT, this.version, resource].join('/'), {
      method: 'post',
      payload: payload
    });
  };

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

  var _serviceClasses = (function generateServices() {
    /**
     * @param {GoogleAdsClient} client
     */
    function GoogleAdsService(client) {
      this.client = client;
      this.endpoint = "customers/%s/googleAds";
    }
    GoogleAdsService.prototype.search = function (request) {
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
    };
    /**
     * @param {GoogleAdsClient} client
     */
    function CustomerService(client) {
      this.client = client;
      this.endpoint = "customers";
      this.getCustomer = client.get;
    }
    CustomerService.prototype.listAccessibleCustomers = function () {
      return this.client.get("customers:listAccessibleCustomers");
    };
    return {
      GoogleAdsService: GoogleAdsService,
      CustomerService: CustomerService
    };
  })();

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
    if (this.loginCustomerId) {
      request.headers['login-customer-id'] = this.loginCustomerId;
    }

    request.headers['Content-Type'] = 'application/json';
    request.headers['Accept'] = 'application/json';
    request.muteHttpExceptions = true;
    return request;
  };

  return GoogleAdsClient;
}());
