export const awaitTimeout = (delay, reason) => {
  return new Promise((resolve, reject) =>
    setTimeout(
      () => (reason === undefined ? resolve() : reject(reason)),
      delay
    )
  );
}

export const wrapPromise = (promise, delay, reason) => {
  return Promise.race([promise, awaitTimeout(delay, reason)]);
}