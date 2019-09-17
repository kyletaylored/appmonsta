function getAuthType() {
  var cc = DataStudioApp.createCommunityConnector();
//  cc.AuthType()
  var response = { type: 'NONE' };
  return response;
}

function getConfig(request) {
  var cc = DataStudioApp.createCommunityConnector();
  var config = cc.getConfig();
  
  config.newInfo()
    .setId('instructions')
    .setText('Enter npm package names to fetch their download count.');
  
  config.newTextInput()
    .setId('package')
    .setName('Enter a single package name')
    .setHelpText('e.g. googleapis or lightouse')
    .setPlaceholder('googleapis');
  
  config.setDateRangeRequired(true);
  
  return config.build();
}

function getFields(request) {
  var cc = DataStudioApp.createCommunityConnector();
  var fields = cc.getFields();
  var types = cc.FieldType;
  var aggregations = cc.AggregationType;
  
  fields.newDimension()
    .setId('packageName')
    .setType(types.TEXT);
  
  fields.newMetric()
    .setId('downloads')
    .setType(types.NUMBER)
    .setAggregation(aggregations.SUM);
  
  fields.newDimension()
    .setId('day')
    .setType(types.YEAR_MONTH_DAY);
  
  return fields;
}

function getSchema(request) {
  var fields = getFields(request).build();
  return { schema: fields };
}

function responseToRows(requestedFields, response, packageName) {
  // Transform parsed data and filter for requested fields
  return response.map(function(dailyDownload) {
    var row = [];
    requestedFields.asArray().forEach(function (field) {
      switch (field.getId()) {
        case 'day':
          return row.push(dailyDownload.day.replace(/-/g, ''));
        case 'downloads':
          return row.push(dailyDownload.downloads);
        case 'packageName':
          return row.push(packageName);
        default:
          return row.push('');
      }
    });
    return { values: row };
  });
}

function getData(request) {
  var requestedFieldIds = request.fields.map(function(field) {
    return field.name;
  });
  var requestedFields = getFields().forIds(requestedFieldIds);

  // Fetch and parse data from API
  var url = [
    'https://api.npmjs.org/downloads/range/',
    request.dateRange.startDate,
    ':',
    request.dateRange.endDate,
    '/',
    request.configParams.package
  ];
  var response = UrlFetchApp.fetch(url.join(''));
  var parsedResponse = JSON.parse(response).downloads;
  var rows = responseToRows(requestedFields, parsedResponse, request.configParams.package);

  return {
    schema: requestedFields.build(),
    rows: rows
  };
}