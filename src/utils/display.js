const shortedAddress = (address) => {
  return `${address.substring(0, 5)}...${address.substring(address.length - 5)}`;
};

export default shortedAddress