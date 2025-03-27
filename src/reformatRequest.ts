import * as path from "path";
import * as fs from "fs";

import {
  GotRequest,
  RequestSpec,
  constructGotRequest,
  getCurlRequest,
  replaceVariablesInRequest,
} from "zzapi";
import { getWorkingDir } from "./utils/pathUtils";

import { getVarStore } from "./variables";

// function replaceFileContents(body: any, replaceWithFileRef?: boolean): any {
//   if (typeof body !== "string"){
//     return replaceFileMultiPart;
//   }

//   /*
//   finds all file:// instances with atleast 1 succeeding word character
//   matches the file-name referred to by this instance
//   */
//   const fileRegex = /file:\/\/([^\s]+)/g;
//   return body.replace(fileRegex, (match, givenFilePath) => {
//     if (match !== body) return match; // we only perform a replacement if file:// is the ENTIRE body

//     if (replaceWithFileRef === true) return `@${givenFilePath}`;
//     const filePath = path.resolve(getWorkingDir(), givenFilePath);
//     return fs.readFileSync(filePath, "utf-8");
//   });
// }

function getFileFromPath(pathName : string) {
  /*
  finds all file:// instances with atleast 1 succeeding word character
  matches the file-name referred to by this instance
  */
  const fileRegex = /file:\/\/([^\s]+)/g;
  if(fileRegex.test(pathName)){
    console.log("pathname",pathName)
    const filePath = pathName.replace(fileRegex, (match, givenFilePath) => {
      if (match !== pathName) return match; // we only perform a replacement if file:// is the ENTIRE body
  
      return path.resolve(getWorkingDir(), givenFilePath);
    });
    return filePath;
  }else{
    return pathName;
  }

}

function formatAndReplaceVars(
  request: RequestSpec,
  extensionVersion: string,
  curlReq?: boolean,
): string[] {
  const autoHeaders: { [key: string]: string } = {};
  if (!curlReq) autoHeaders["user-agent"] = "zzAPI-vscode/" + extensionVersion;

  if (request.httpRequest.body && typeof request.httpRequest.body == "object")
    autoHeaders["content-type"] = "application/json";
  request.httpRequest.headers = Object.assign(autoHeaders, request.httpRequest.headers);
  request.httpRequest.body = replaceFileMultiPart(request.httpRequest.body);
  return replaceVariablesInRequest(request, getVarStore().getAllVariables());
}



export function replaceFileMultiPart(body? : any){
  if(Array.isArray(body)){
    for (let i = 0; i < body.length; i++) {
      body[i] = getFileFromPath(body[i])
    }
  }else if(typeof body == 'object'){
    for (const key in body) {
      if (Object.prototype.hasOwnProperty.call(body, key)) {
        const element = body[key];
        if(typeof element == "string"){
          body[key] = getFileFromPath(element)
        }
        else if(Array.isArray(element)){
          replaceFileMultiPart(element)
        }
      }
    }
  }else if(typeof body == 'string'){
      /*
  finds all file:// instances with atleast 1 succeeding word character
  matches the file-name referred to by this instance
  */
  const fileRegex = /file:\/\/([^\s]+)/g;
  return body.replace(fileRegex, (match, givenFilePath) => {
    if (match !== body) return match; // we only perform a replacement if file:// is the ENTIRE body
    const filePath = path.resolve(getWorkingDir(), givenFilePath);
    return fs.readFileSync(filePath, "utf-8");
  });
  }
  return body;
}


export function getGotRequest(
  request: RequestSpec,
  extensionVersion: string,
): { gotRequest: GotRequest; undefinedVars: string[] } {
  const undefs = formatAndReplaceVars(request, extensionVersion);
  const currHttpRequest = constructGotRequest(request);

  return { gotRequest: currHttpRequest, undefinedVars: undefs };
}

export function getCurlOfReq(
  request: RequestSpec,
  extensionVersion: string,
): { curlRequest: string; undefinedVars: string[] } {
  const undefs = formatAndReplaceVars(request, extensionVersion, true);
  const curlCommand = getCurlRequest(request);

  return { curlRequest: curlCommand, undefinedVars: undefs };
}