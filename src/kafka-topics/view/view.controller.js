angularAPP.controller('ViewTopicCtrl', function ($scope, $rootScope, $filter, $routeParams, $log, $mdToast, $location, $mdDialog, $http, KafkaRestProxyFactory, UtilsFactory, HttpFactory, charts, env) {

  $log.info("Starting kafka-topics controller : view ( topic = " + $routeParams.topicName + " )");

  var topicName = $routeParams.topicName;
  var selectedTabIndex = $routeParams.selectedTabIndex
  var topicCategoryUrl = $routeParams.topicCategoryUrl;

  $scope.showSpinner = true;
  $mdToast.hide(); // ?

  HttpFactory.getTopicSummary(topicName).then(function success(topic){
        $scope.topic = topic;
        getTopicData(topicName, topic.valueType);
//     $http.get(env.KAFKA_BACKEND()+ "/topics/chart/"+ topic.topicName) //TODO also put it in HttpFactory, //iF topic found / then get chart + data
//           .then(function response(response){
//                  charts.getFullChart(topicName, response);
//           });
  }, function failure(error) { $scope.topic = {}; }); //TODO error message cannot get topic


/*******************************
 *
 * topic-toolbar.html
 *
********************************/
 
  $scope.showDownloadDiv = false;
  $scope.showList = true;

  $scope.toggleList = function () {
     $scope.showList = !$scope.showList;
  };

  $scope.downloadData = function (topicName, data) {
    $log.info("Download requested for " + data.length + " bytes ");
    var json = data;
    var blob = new Blob([json], {type: "application/json;charset=utf-8;"});
    var downloadLink = angular.element('<a></a>');
    downloadLink.attr('href', window.URL.createObjectURL(blob));
    downloadLink.attr('download', topicName + '.json');
    downloadLink[0].click();
  };

/*******************************
 *
 * topic-configuration.html
 *
********************************/
 
  $scope.showMoreDesc = [];

  $scope.toggleMoreDesc = function (index) {
      $scope.showMoreDesc[index] = !$scope.showMoreDesc[index];
  };


/*******************************
 *
 * data-chart.html
 *
********************************/

  $scope.showChart = true;

  $scope.toggleChart = function () {
     $scope.showChart = !$scope.showChart;
  }

  $scope.kcqlRequest = function() {
      if (!$scope.kcql) { $scope.kcql='SELECT * FROM ' + topicName }
      var kcqlQuery = $scope.kcql.split(' ').join('+');
      $http.get("http://fast-data-backend.demo.landoop.com/api/rest/topics/kcql?query="+kcqlQuery).
      then(function response(response){
        $log.info('KCQL Responce: ',response)
      });
  } //tODO hardcoded!

/*******************************
 *
 * topic data / Tabs handling
 *
********************************/

  $scope.selectedTabNnumber = setSelectedDataTab(selectedTabIndex);

  $scope.onTabChanges = function(currentTabIndex, cluster){
    $location.path ("cluster/"+ cluster.NAME + "/topic/" +  topicCategoryUrl + "/" + topicName + "/" + currentTabIndex, false);
  };

  function setSelectedDataTab(selectedTabIndex) {
    switch(selectedTabIndex) {
        case "topic": return 0;
        case "table": return 1;
        case "rawdata": return 2;
        default: return 0;
    }
  }


/*******************************
 *
 * still Depends on Kafka Rest
 *
********************************/

  /****************** SUPER CLEAN UP REQUIRED HERE / STARTS (this is the only dep to KAFKA_REST) *****************/
  //If data is empty don't try to deserialize
  function getTopicData(topicName, topicType) {

        if ((topicType == "json") || (topicType == "binary") || (topicType == "avro")) {
          KafkaRestProxyFactory.consumeKafkaRest(topicType, topicName).then(function (allData) {
             setTopicMessages(allData, topicType);
          }, function (error) { getDeserializationErrorMessage(error, topicType); });
        } else {
          // If we don't know we need to guess by trying Avro -> JSon -> Binary
          KafkaRestProxyFactory.consumeKafkaRest("avro", topicName).then(
             function (allData) {
                if (JSON.stringify(allData).indexOf("error") > 0) {
                  KafkaRestProxyFactory.consumeKafkaRest("json", topicName).then(
                      function (allData) {
                          if (JSON.stringify(allData).indexOf("error_code") > 0) {
                            KafkaRestProxyFactory.consumeKafkaRest("binary", topicName).then(
                              function (allData) { setTopicMessages(allData, 'binary'); },
                              function (error) { getDeserializationErrorMessage(error, 'binary') });
                          } else {
                            setTopicMessages(allData, 'json');
                          }
                    }, function (error) { getDeserializationErrorMessage(error, 'json') });
                } else {
                  setTopicMessages(allData,'avro')
                }
          }, function (error) { getDeserializationErrorMessage(error, 'avro') });
        }
  }

  function setTopicMessages(allData, topicType) {
     $scope.rows = allData;
     $scope.showSpinner = false;
  }

  function getDeserializationErrorMessage(reason, type) {
      return 'Failed with '+ type +' type :(  (' + reason + ')';
  }

  /****************** SUPER CLEAN UP REQUIRED HERE / ENDS *****************/


      //MOCKING

  //      var mockedTopic = {
  //
  //            keyType : "empty",
  //            valueType : "avro",
  //            totalMessages : 1,
  //            replication : 1,
  //            topicName : "yahoo-fx",
  //            isControlTopic: false,
  //            customConfig : [
  //              {
  //                configuration: "cleanup.policy",
  //                value : "compact",
  //                defaultValue : "delete",
  //                documentation : "A string that is either \"delete\" or \"compact\". This string designates the retention policy to use on old log segments. The default policy (\"delete\") will discard old segments when their retention time or size limit has been reached. The \"compact\" setting will enable log compaction on the topic."
  //              }
  //            ],
  //            partitions : 1,
  //            isControlTopic : true,
  //            messagesPerPartition : [ ]
  //          }
  //      $scope.topic = mockedTopic;

});
