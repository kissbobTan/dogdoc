const common = require("./common");
const config = require("../../config");

let swaggerDB = {};
let errors = [];

module.exports = {
  getSwaggerDB: function () {
    return swaggerDB;
  },
  geterrors: function () {
    return errors;
  },
  getApi: function (swaggerData) {
    let apis = {};
    for (let path in swaggerData.paths) {
      let api = {};
      api.path = path;
      for (let method in swaggerData.paths[path]) {
        api.method = method;
        for (let type in swaggerData.paths[path][method]) {
          if (type == "tags") {
            api.tags = swaggerData.paths[path][method][type].join(",");
          } else if (type == "summary") {
            api.summary = swaggerData.paths[path][method][type];
          } else if (type == "requestBody") {
            let content = swaggerData.paths[path][method][type]["content"];
            if (content != undefined) {
              if (content["application/json"] == undefined) {
                api.bodyTypeName = content[0];
                continue;
              }
              let modelByType = this.getModelByType(
                content,
                swaggerData.components.schemas
              );
              api.bodyTypeName = modelByType.typeName;
              api.bodyModel = modelByType.model;
            }
          } else if (type == "responses") {
            for (let status in swaggerData.paths[path][method][type]) {
              if (
                "success" ==
                swaggerData.paths[path][method][type][
                  status
                ].description.toLowerCase()
              ) {
                let content =
                  swaggerData.paths[path][method][type][status]["content"];
                if (content != undefined) {
                  let modelByType = this.getModelByType(
                    content,
                    swaggerData.components.schemas
                  );
                  api.resultTypeName = modelByType.typeName;
                  api.resultModel = modelByType.model;
                }
              }
            }
          } else if (type == "parameters") {
            api.header = [];
            api.params = [];
            for (let index in swaggerData.paths[path][method][type]) {
              let model = swaggerData.paths[path][method][type][index];
              if (model["in"] != undefined) {
                let temp = {
                  name: model.name,
                  description: model.description,
                };
                if (model.in == "query") {
                  if (model["schema"] != undefined) {
                    temp.type = model["schema"]["type"];
                    if (model["schema"]["format"] != undefined) {
                      temp.type = model["schema"]["format"];
                    }
                    if (model["schema"]["nullable"] != undefined) {
                      temp.nullable = model["schema"]["nullable"];
                    }
                  }

                  api.params.push(temp);
                } else if (model.in == "header") {
                  api.header.push(temp);
                }
              }
            }
          }
        }
      }

      apis[api.path] = api;
    }
    return apis;
  },
  getModelByType: function (content, schemas) {
    //root level
    let result = {
      typeName: "",
      model: null,
    };
    let param = content["application/json"]["schema"];
    if (param["$ref"] != undefined) {
      result.typeName = param["$ref"].substring(
        param["$ref"].lastIndexOf("/") + 1,
        param["$ref"].length + 1
      );
    } else if (param["type"] != undefined) {
      let temp = { name: "*" };
      temp.type = param["type"];
      if (param["description"] != undefined) {
        temp.description = param["description"];
      }
      if (param["nullable"] != undefined) {
        temp.nullable = param["nullable"];
      }

      if (param["items"] != undefined) {
        if (param["items"]["$ref"] != undefined) {
          let tempTypeName = param["items"]["$ref"].substring(
            param["items"]["$ref"].lastIndexOf("/") + 1,
            param["items"]["$ref"].length + 1
          );
          temp.type = temp.type + "(" + tempTypeName + ")";
          temp.children = this.getModel(tempTypeName, schemas);
        } else {
          temp.type = temp.type + "(" + param["items"]["type"] + ")";
        }
      } else {
        //普通类型
        if (param["format"] != undefined) {
          temp.type = param["format"];
        }
      }
      result.model = temp;
    }
    return result;
  },
  getModel: function (name, schemas) {
    let result = [];
    if (schemas[name]["type"] == "object") {
      let model = schemas[name]["properties"];

      for (let propertyName in model) {
        let temp = {};
        temp.name = propertyName;
        for (let item in model[propertyName]) {
          if (item == "type") {
            temp.type = model[propertyName][item];
          } else if (item == "description") {
            temp.description = model[propertyName][item];
          } else if (item == "nullable") {
            temp.nullable = model[propertyName][item];
          } else if (item == "format") {
            temp.type = model[propertyName][item];
          } else if (item == "items") {
            let child = model[propertyName][item];
            let childTypeName = "";
            if (child.$ref != undefined) {
              let typeName = child.$ref.substring(
                child.$ref.lastIndexOf("/") + 1,
                child.$ref.length + 1
              );
              childTypeName = typeName;
              if (name != typeName) {
                temp.children = this.getModel(typeName, schemas);
              }
            } else if (child.type != undefined) {
              childTypeName = child.type;
            }
            if (childTypeName != "") {
              temp.type = temp.type + "(" + childTypeName + ")";
            }
          } else if (item == "$ref") {
            let type = model[propertyName][item];
            let typeName = type.substring(
              type.lastIndexOf("/") + 1,
              type.length + 1
            );
            temp.type = typeName;
            if (name != typeName) {
              let childModel = this.getModel(typeName, schemas);
              if (childModel instanceof Array && childModel.length > 0) {
                temp.children = childModel;
              } else if (typeof childModel == "object") {
                temp.type = temp.type + "(" + childModel.type + ")";
                temp.description = childModel.description;
              }
            }
          }
        }
        result.push(temp);
      }
    } else if (schemas[name]["type"] == "integer") {
      let temp = {};
      if (schemas[name]["enum"] != undefined) {
        temp.type = "enum";
      }
      temp.description = schemas[name]["description"];
      return temp;
    }

    return result;
  },
  getSwaggerPath: async function () {
    if (config.sources.length == 0) {
      fastify.log.info(`please set config.js`);
      return;
    }
    let asyncs = [];
    for (let index in config.sources) {
      let url = config.sources[index].url;
      asyncs.push(common.get(url));
    }
    let urls = [];
    let swaggerPaths = [];
    await Promise.all(asyncs).then((results) => {
      let wildcard = /\/swagger\/[^/]+\/[\w]+.json/g;
      for (let index = 0; index < results.length; index++) {
        let content = results[index];
        let list = content.match(wildcard);
        for (let i = 0; i < list.length; i++) {
          let url = list[i];
          let host = this.getHost(config.sources[index].url);
          let swaggerPath = {
            swaggerUrl: host + url,
            swaggerName: config.sources[index].name,
          };
          if (urls.indexOf(swaggerPath.swaggerUrl) < 0) {
            urls.push(swaggerPath.swaggerUrl);
            swaggerPaths.push(swaggerPath);
          }
        }
      }
    });
    return swaggerPaths;
  },
  loadData: async function (fastify) {
    errors = [];
    fastify.log.info(`loadData:` + new Date());
    let swaggerPaths = await this.getSwaggerPath();
    if (swaggerPaths.length == 0) {
      return;
    }
    let infos = {};
    let results = [];
    for (let index in swaggerPaths) {
      let swaggerModel = swaggerPaths[index];
      let url = swaggerModel.swaggerUrl;
      infos[url] = { apiUrl: url, apiName: swaggerModel.swaggerName };
      results.push(common.get(url));
    }
    await Promise.all(results)
      .then((results) => {
        for (let index in results) {
          let url = swaggerPaths[index].swaggerUrl;
          if (results[index].code == "ERR_INVALID_URL") {
            //fail
            fastify.log.error(
              "This is an error log." + infos[url].apiUrl + "fail"
            );
            infos[url].success = false;
          } else {
            //success
            if (results[index].url == undefined || results[index].url == null) {
              try {
                infos[url].pulltime = new Date();
                infos[url].url = this.getHost(infos[url].apiUrl);
                infos[url].apis = this.getApi(results[index]);
                infos[url].schemas = results[index].components.schemas;
                infos[url].success = true;
              } catch (error1) {
                console.error("error1:" + new Date());
                console.error(error1);
                errors.push(
                  "current error server address，please quickly recover it,we will get it again next：" +
                    url
                );
              }
            } else {
              errors.push(
                "current error server address，please quickly recover it,we will get it again next：" +
                  results[index].url
              );
            }
          }
        }
        swaggerDB = infos;
      })
      .catch((error) => {
        console.error(new Date());
        console.error(error);
      });
  },
  updateData: function (fastify) {
    let updateCycle = 10;
    if (config.updateCycle != undefined) {
      updateCycle = config.updateCycle;
    }
    setInterval(async () => {
      await this.loadData(fastify);
    }, updateCycle * 60 * 1000);
  },
  getHost: function (url) {
    let prefix = "";
    if (url.indexOf("http://") == 0) {
      prefix = "http://";
    } else if (url.indexOf("https://") == 0) {
      prefix = "https://";
    }
    url = url.replace(prefix, "");
    url = url.substring(0, url.indexOf("/"));
    return prefix + url;
  },
};
