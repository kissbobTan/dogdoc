const swagger = require("./swagger");

module.exports = {
  getmenu: function () {
    let swaggerDB = swagger.getSwaggerDB();
    //return swaggerDB;
    let menus = [];
    for (let apiUrl in swaggerDB) {
      //一级目录
      let first = {};
      let one = swaggerDB[apiUrl];
      //first.apiUrl = apiUrl;
      first.url = one.url;
      first.name = one.apiName;
      first.success = one.success;
      let exists = false;
      if (one.success) {
        first.children = [];
        for (let i = 0; i < menus.length; i++) {
          if (menus[i].url == first.url) {
            first = menus[i];
            exists = true;
            break;
          }
        }

        //二级目录
        let second = { children: [] };
        let currentSecondName = "";
        for (let apiIndex in one.apis) {
          let apiOne = one.apis[apiIndex];
          if (currentSecondName == "") {
            currentSecondName = apiOne.tags;
            second.name = currentSecondName;
            second.show = false;
            second.children.push({
              name: apiOne.summary,
              path: apiOne.path,
              show: false,
              apiUrl: apiUrl,
            });
          } else if (currentSecondName == apiOne.tags) {
            second.children.push({
              name: apiOne.summary,
              path: apiOne.path,
              show: false,
              apiUrl: apiUrl,
            });
          } else if (currentSecondName != apiOne.tags) {
            first.children.push(second);
            second = { children: [] };
            currentSecondName = apiOne.tags;
            second.name = currentSecondName;
            second.show = false;
            second.children.push({
              name: apiOne.summary,
              path: apiOne.path,
              show: false,
              apiUrl: apiUrl,
            });
          }
        }
        first.children.push(second);
      }
      if (exists) {
        for (let i = 0; i < menus.length; i++) {
          if (menus[i].url == first.url) {
            menus[i] = first;
            break;
          }
        }
      } else {
        menus.push(first);
      }
    }
    return menus;
  },
  getApiInfo: function (apiUrl, path) {
    let swaggerDB = swagger.getSwaggerDB();
    let model = swaggerDB[apiUrl].apis[path];
    let result = {};
    if (model != null && model != undefined) {
      result.name = model.summary;
      result.time = swaggerDB[apiUrl].pulltime;
      result.url = model.path;
      result.type = model.method;

      if (model.header != null && model.header != undefined) {
        result.header = model.header;
      }
      if (model.params != null && model.params != undefined) {
        result.params = model.params;
      }
      if (
        model.bodyTypeName != null &&
        model.bodyTypeName != undefined &&
        model.bodyTypeName != ""
      ) {
        result.bodyParam = [
          {
            name: "*",
            type: model.bodyTypeName,
            children: swagger.getModel(
              model.bodyTypeName,
              swaggerDB[apiUrl].schemas
            ),
          },
        ];
      } else if (model.bodyModel != null) {
        result.bodyParam = [model.bodyModel];
      }
      if (
        model.resultTypeName != null &&
        model.resultTypeName != undefined &&
        model.resultTypeName != ""
      ) {
        result.requestResult = [
          {
            name: "*",
            type: model.resultTypeName,
            children: swagger.getModel(
              model.resultTypeName,
              swaggerDB[apiUrl].schemas
            ),
          },
        ];
      } else if (model.resultModel != null) {
        result.requestResult = [model.resultModel];
      }

      result.name = model.summary;
    }
    return result;
  },
  getAll: function () {
    return swagger.getSwaggerDB();
  },
};
