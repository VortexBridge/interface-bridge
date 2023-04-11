/* eslint-disable */ 
import axios from "axios";

export class Request {
  constructor({ url = "" }) {
    this._url = url;
  }

  getPrepared(extenderURL, query, headers = {}, params = {}) {
    return this.__manual({
      method: "GET",
      url: this.urlTxtResolver(extenderURL, query),
      headers: Object.assign({ "Content-Type": "application/json"}, headers),
      params: params
    })
  }
  

  async __manual(req, timeOUT = true) {
    let id_timeOUT;
    return new Promise((resolve, reject) => {
      if(timeOUT) {
        id_timeOUT = setTimeout(() => {
          reject(new Error("TIME_OUT"))
        }, 20000)
      }
      axios(req).then(response => {
        if(timeOUT) { clearTimeout(id_timeOUT) }
        resolve(response.data)
      }).catch((err) => {
        if(timeOUT) { clearTimeout(id_timeOUT) }
        reject(err)
      })
    })
  }

  urlTxtResolver (extenderURL, query) {
    let resQuery = "";
    const endpointUrl = this._simplexUrl(extenderURL);
    if (
      query &&
      query !== null &&
      ((typeof(query) === "object" && Object.keys(query).length > 0) || Array.isArray(query))) {
      resQuery += endpointUrl.indexOf("?") >= 0 ? "&" : "?";
      resQuery += this.loopQuerier(query);
      resQuery = resQuery.substr(0, resQuery.length - 1); // Deleting last "&"
    }
    return `${ endpointUrl + resQuery }`;
  }

  loopQuerier(query) {
    let resQuery = "";
    if ( Array.isArray(query) && query.length) {
      for (let i = 0; i < query.length; i++) {
        const indQuery = query[i];
        resQuery += this.loopQuerier(indQuery);
      }
    } else if (typeof query === "object" && Object.keys(query).length) {
      for (const key in query) {
        if (query.hasOwnProperty(key)) {
          resQuery += 
            Array.isArray((query[key])) ||
            (query[key] !== null && typeof(query[key]) === "object") ? // Is array or is object?
              this.loopQuerier(query[key]) : // Recycle if is iterable, if is object ignore actual key
              (key !== "_code" ? `${key}=${query[key]}&` : "");
        }
      }
    }
    return resQuery;
  }

  _simplexUrl(endpoint){
    return `${this._url ? this._url : ""}${endpoint && typeof endpoint == "string" ? (
      endpoint[0] === "/" && this._url && this._url[this._url.length - 1] === "/" ? endpoint.substr(1) : 
        (endpoint[0] !== "/" && this._url && this._url[this._url.length - 1] !== "/" ? `/${endpoint}` : endpoint)
    ) : ""}`
  }

}