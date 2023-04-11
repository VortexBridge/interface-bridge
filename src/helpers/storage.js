export default {
  settings: function (update) {
    let settings = {};
    try {
      settings = this.getItemDevice("settings");
      if(!settings) {
        settings = {};
      } else {
        settings = JSON.parse(settings)
      }
      settings = Object.assign(settings, update);
    } catch (error) {
      console.log(error) 
    }
    this.setItemDevice("settings", JSON.stringify(settings));
    return settings;
  },
  custom_tokens: function(update) {
    let custom_tokens = []
    try {
      custom_tokens = this.getItemDevice("custom_tokens");
      if(!custom_tokens) {
        custom_tokens = [];
      } else {
        custom_tokens = JSON.parse(custom_tokens)
      }
      custom_tokens = update;
    } catch (error) {
      console.log(error) 
    }
    this.setItemDevice("custom_tokens", JSON.stringify(custom_tokens));
    return update;
  },
  custom_positions: function(update) {
    let custom_positions = []
    try {
      custom_positions = this.getItemDevice("custom_positions");
      if(!custom_positions) {
        custom_positions = [];
      } else {
        custom_positions = JSON.parse(custom_positions)
      }
      custom_positions = update;
    } catch (error) {
      console.log(error) 
    }
    this.setItemDevice("custom_positions", JSON.stringify(custom_positions));
    return update;
  },
  getItemDevice: function(key) {
    return localStorage.getItem(`koindx_${key}`);
  },
  setItemDevice: function(key, value) {
    return localStorage.setItem(`koindx_${key}`, value);
  },
  removeItemDevice: function(key) {
    return localStorage.removeItem(`koindx_${key}`);
  }
};
