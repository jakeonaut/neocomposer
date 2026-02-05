import fetch from 'node-fetch'

const response = fetch("https://public-api.wordpress.com/wpcom/v2/work-with-us", {
  headers: { "X-future": "automattician" }
});
const awaitedResponse = await response;
console.log(awaitedResponse);
const body = awaitedResponse.json();
console.log(body);
